import {ApiError} from './community.mjs';
import {reserve} from './usage.mjs';
export const placeKey=p=>JSON.stringify([p.name.normalize('NFKC').trim().toLowerCase(),Number.isFinite(p.lat)?p.lat.toFixed(5):'',Number.isFinite(p.lng)?p.lng.toFixed(5):'']);
const now=()=>Math.floor(Date.now()/1000);
export async function queuePhotoSources(env){
 const {results}=await env.DB.prepare('SELECT source_url,payload,fetched_at FROM saved_map_places WHERE payload IS NOT NULL AND fetched_at>photo_queued_at ORDER BY photo_queued_at LIMIT 3').all();
 for(const row of results){const points=(JSON.parse(row.payload).places||[]).filter(p=>!p.photo&&Number.isFinite(p.lat)&&Number.isFinite(p.lng)).map(p=>({key:placeKey(p),name:p.name,lat:p.lat,lng:p.lng}));if(points.length)await env.DB.prepare("INSERT OR IGNORE INTO place_photo_cache(place_key,name,lat,lng) SELECT json_extract(value,'$.key'),json_extract(value,'$.name'),json_extract(value,'$.lat'),json_extract(value,'$.lng') FROM json_each(?)").bind(JSON.stringify(points)).run();await env.DB.prepare('UPDATE saved_map_places SET photo_queued_at=? WHERE source_url=? AND fetched_at=?').bind(row.fetched_at,row.source_url,row.fetched_at).run();}
}
export async function claimPhotoJobs(env){
 await queuePhotoSources(env);const time=now();const {results}=await env.DB.prepare("SELECT place_key,name,lat,lng FROM place_photo_cache WHERE (state='pending' OR state IN ('missing','failed') AND retry_at<=? OR state='processing' AND lease_until<?) ORDER BY checked_at,place_key LIMIT 12").bind(time,time).all();const jobs=[];
 for(const row of results){try{await reserve(env,'place_photo_search_attempts',300)}catch{break}const lease=crypto.randomUUID();const claimed=await env.DB.prepare("UPDATE place_photo_cache SET state='processing',lease=?,lease_until=? WHERE place_key=? AND (state='pending' OR state IN ('missing','failed') AND retry_at<=? OR state='processing' AND lease_until<?) RETURNING place_key").bind(lease,time+600,row.place_key,time,time).first();if(claimed)jobs.push({...row,lease});}return {jobs};
}
// Photo results are reported only by the scoped repository job. Verify metadata again, never trust arbitrary URLs.
export function validPhoto(p){if(!p||!Number.isSafeInteger(p.pageId)||p.pageId<=0||typeof p.artist!=='string'||!p.artist.trim()||p.artist.length>500||typeof p.title!=='string'||p.title.length>500||typeof p.license!=='string'||p.license.length>80)return false;try{const u=new URL(p.url);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&['upload.wikimedia.org','thumb.wikimedia.org'].includes(u.hostname)&&u.pathname.startsWith('/wikipedia/commons/')&&p.source==='https://commons.wikimedia.org/wiki/Special:Redirect/page/'+p.pageId&&/^https:\/\/creativecommons\.org\/(?:licenses\/by(?:-sa)?\/(?:1\.0|2\.0|2\.5|3\.0|4\.0)|publicdomain\/(?:zero\/1\.0|mark\/1\.0))\/?$/.test(p.licenseUrl)&&p.url.length<4096;}catch{return false;}}
export async function completePhotoJob(env,input){
 if(typeof input?.place_key!=='string'||typeof input.lease!=='string')throw new ApiError('Invalid photo job');
 if(input.photo&&!validPhoto(input.photo))throw new ApiError('Unverified photo metadata');
 const photo=input.photo?Object.fromEntries(['pageId','title','url','source','artist','license','licenseUrl'].map(k=>[k,input.photo[k]])):null;
 const time=now();const result=await env.DB.prepare("UPDATE place_photo_cache SET state=?,photo=?,checked_at=?,retry_at=?,lease='',lease_until=0 WHERE place_key=? AND state='processing' AND lease=? RETURNING place_key").bind(photo?'ready':input.failed?'failed':'missing',photo?JSON.stringify(photo):null,time,time+(input.failed?86400:30*86400),input.place_key,input.lease).first();if(!result)throw new ApiError('Photo job no longer active',409);return {ok:true};
}
export async function withPlacePhotos(env,points,listKey=''){
 const keys=points.map(placeKey),photos=new Map();if(keys.length){const {results}=await env.DB.prepare('SELECT place_key,photo FROM place_photo_cache WHERE photo IS NOT NULL AND place_key IN (SELECT value FROM json_each(?))').bind(JSON.stringify(keys)).all();for(const r of results)photos.set(r.place_key,JSON.parse(r.photo));}
 let overrides=new Map();if(listKey){const {results}=await env.DB.prepare('SELECT place_key,mode,credit,source FROM place_photo_overrides WHERE list_key=?').bind(listKey).all();overrides=new Map(results.map(x=>[x.place_key,x]));}
 return points.map((p,i)=>{const key=keys[i],override=overrides.get(key),mode=override?.mode,photo=mode==='hidden'?null:mode==='upload'?{url:'/api/place-photo?list='+encodeURIComponent(listKey)+'&place='+encodeURIComponent(key),artist:override?.credit||'清單作者提供',source:override?.source||'',license:'作者提供'}:p.photo||photos.get(key)||null;return {...p,key,photo};});
}
export function validateUpload(image){if(typeof image!=='string'||image.length>175000||!/^data:image\/webp;base64,[A-Za-z0-9+/]+=*$/.test(image))throw new ApiError('請使用 128 KB 以內的 WebP 圖片');let bytes;try{bytes=atob(image.split(',')[1])}catch{throw new ApiError('Invalid image')};if(bytes.length>131072||bytes.slice(0,4)!=='RIFF'||bytes.slice(8,12)!=='WEBP')throw new ApiError('Invalid WebP image');return image;}
export async function updatePhotoOverride(env,listKey,points,input){
 if(typeof input?.place!=='string'||!points.some(p=>placeKey(p)===input.place))throw new ApiError('景點不存在，請重新整理',404);
 if(!['upload','hidden','auto'].includes(input.mode))throw new ApiError('Invalid photo action');
 if(input.mode==='auto')await env.DB.prepare('DELETE FROM place_photo_overrides WHERE list_key=? AND place_key=?').bind(listKey,input.place).run();else{
 const image=input.mode==='upload'?validateUpload(input.image):null,size=image?.length||0;
 const credit=input.mode==='upload'?(input.credit||'清單作者提供'):'',source=input.mode==='upload'?(input.source||''):'';
 if(typeof credit!=='string'||credit.length>200||typeof source!=='string'||source.length>2048)throw new ApiError('圖片署名或來源過長');
 if(source){let u;try{u=new URL(source)}catch{throw new ApiError('來源請使用 HTTPS 網址')}if(u.protocol!=='https:'||u.username||u.password)throw new ApiError('來源請使用 HTTPS 網址');}

 const saved=await env.DB.prepare(`INSERT INTO place_photo_overrides(list_key,place_key,mode,image,credit,source,updated_at) SELECT ?,?,?,?,?,?,? WHERE
 (SELECT COALESCE(SUM(length(image)),0) FROM place_photo_overrides)-COALESCE((SELECT length(image) FROM place_photo_overrides WHERE list_key=? AND place_key=?),0)+?<=41943040 AND
 (SELECT COALESCE(SUM(length(image)),0) FROM place_photo_overrides WHERE list_key=?)-COALESCE((SELECT length(image) FROM place_photo_overrides WHERE list_key=? AND place_key=?),0)+?<=4194304
 ON CONFLICT(list_key,place_key) DO UPDATE SET mode=excluded.mode,image=excluded.image,credit=excluded.credit,source=excluded.source,updated_at=excluded.updated_at RETURNING place_key`).bind(listKey,input.place,input.mode,image,credit,source,now(),listKey,input.place,size,listKey,listKey,input.place,size).first();
 if(!saved)throw new ApiError('照片儲存空間已達上限，請先移除不需要的照片或聯絡管理員。',409);
 }return {ok:true};
}
export async function publicListVisible(env,key,fetcher=fetch){
 if(key.startsWith('community/'))return !!await env.DB.prepare('SELECT l.id FROM pilot_lists l JOIN pilot_profiles p ON p.user_id=l.user_id JOIN creator_users u ON u.id=l.user_id WHERE l.id=? AND l.visible=1 AND p.visible=1 AND u.suspended=0 AND NOT EXISTS(SELECT 1 FROM list_moderation m WHERE m.list_id=l.id AND m.hidden=1)').bind(key.slice(10)).first();
 const [kind,id]=key.split('/');if(!['cities','themes','countries'].includes(kind)||!/^[a-z0-9-]+$/.test(id||''))return false;
 const response=await fetcher('https://r3dra1n.github.io/GoogleMapList/data.json',{signal:AbortSignal.timeout(5000)});if(!response.ok)return false;const data=await response.json();return (data[kind]||[]).some(x=>x.id===id&&x.published!==false);
}
export async function publicPlaceImage(env,url,fetcher){const key=url.searchParams.get('list')||'',place=url.searchParams.get('place')||'';if(key.length>200||place.length>1000||!await publicListVisible(env,key,fetcher))throw new ApiError('Not found',404);const row=await env.DB.prepare("SELECT image FROM place_photo_overrides WHERE list_key=? AND place_key=? AND mode='upload'").bind(key,place).first();if(!row?.image)throw new ApiError('Not found',404);return new Response(Uint8Array.from(atob(row.image.split(',')[1]),c=>c.charCodeAt(0)),{headers:{'Content-Type':'image/webp','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
