import {enqueueSources,processPlaces} from './saved-places.mjs';
import {reserve} from './usage.mjs';
import {ProfileError} from './creator-profile.mjs';
const bad=(message,status=400)=>{throw new ProfileError(message,status)};
const now=()=>Math.floor(Date.now()/1000);
export function validatePilotList(input){
 if(!input||typeof input!=='object'||Array.isArray(input))bad('Invalid list');
 for(const key of Object.keys(input))if(!['title','description','url','destination','tags','cover','coverAlt','role','sourceName','sourceUrl'].includes(key))bad('Unsupported field');
 const out={cover:'',coverAlt:'',role:input.role||'author',sourceName:'',sourceUrl:''};if(!['author','curator','sharer'].includes(out.role))bad('Invalid role');if(out.role==='sharer'){if(typeof input.sourceName!=='string'||!input.sourceName.trim()||input.sourceName.length>100)bad('Original author required');out.sourceName=input.sourceName.trim();if(input.sourceUrl){let source;try{source=new URL(input.sourceUrl)}catch{bad('Invalid source URL')}if(source.protocol!=='https:'||source.username||source.password||input.sourceUrl.length>2048)bad('Invalid source URL');out.sourceUrl=source.href;}}
 if(input.cover){if(typeof input.cover!=='string'||input.cover.length>180000||!/^data:image\/webp;base64,[A-Za-z0-9+/]+=*$/.test(input.cover))bad('Invalid cover image');let bytes;try{bytes=atob(input.cover.split(',')[1])}catch{bad('Invalid cover image')}if(bytes.length>131072||bytes.slice(0,4)!=='RIFF'||bytes.slice(8,12)!=='WEBP')bad('Use a WebP cover under 128 KB');out.cover=input.cover;}
 if(input.coverAlt!==undefined){if(typeof input.coverAlt!=='string'||input.coverAlt.length>160)bad('Invalid image description');out.coverAlt=input.coverAlt.trim();}
 for(const [field,max]of [['title',100],['description',1500],['url',2048],['destination',100]]){
  if(typeof input[field]!=='string'||input[field].length>max)bad('Invalid '+field);out[field]=input[field].trim();
 }
 if(!out.title)bad('Title is required');let u;try{u=new URL(out.url)}catch{bad('Invalid URL')}
 if(u.protocol!=='https:'||u.username||u.password)bad('Use an HTTPS link without credentials');out.url=u.href;
 if(!Array.isArray(input.tags)||input.tags.length>5||input.tags.some(x=>typeof x!=='string'||!x.trim()||x.length>30))bad('Use up to 5 tags, 30 characters each');out.tags=[...new Set(input.tags.map(x=>x.trim()))];return out;
}
export async function pilotApi(req,env,{session,csrf,body,json,fetcher,ctx}){
 const queue=async source=>{try{await enqueueSources(env,[source],{refresh:true});if(ctx)ctx.waitUntil(processPlaces(env,fetcher,1).catch(()=>console.error('MAP_PLACES_SYNC_FAILED')));}catch{console.error('MAP_PLACES_QUEUE_FAILED');}};
 const url=new URL(req.url),path=url.pathname.slice('/account/api/pilot'.length);
 if(req.method==='GET'&&path==='/creators'){
  const page=Number(url.searchParams.get('page')||0);if(!Number.isSafeInteger(page)||page<0||page>1000)bad('Invalid page');
  const {results}=await env.DB.prepare('SELECT p.creator_id,p.payload FROM pilot_profiles p JOIN creator_users u ON u.id=p.user_id WHERE p.visible=1 AND u.suspended=0 ORDER BY p.creator_id LIMIT 51 OFFSET ?').bind(page*50).all();
  return json({items:results.slice(0,50).map(p=>({id:p.creator_id,...JSON.parse(p.payload)})),hasMore:results.length>50});
 }
 if(req.method==='GET'&&path==='/feed'){
  const creator=url.searchParams.get('creator')||'';if(creator.length>60)bad('Invalid creator');
  const page=Number(url.searchParams.get('page')||0);if(!Number.isSafeInteger(page)||page<0||page>1000)bad('Invalid page');
  const {results}=await env.DB.prepare(`SELECT l.id,l.published,l.published_at,p.creator_id,p.payload FROM pilot_lists l JOIN pilot_profiles p ON p.user_id=l.user_id JOIN creator_users u ON u.id=l.user_id WHERE l.visible=1 AND NOT EXISTS(SELECT 1 FROM list_moderation m WHERE m.list_id=l.id AND m.hidden=1) AND p.visible=1 AND u.suspended=0 AND (?='' OR p.creator_id=?) ORDER BY l.published_at DESC,l.id DESC LIMIT 13 OFFSET ?`).bind(creator,creator,page*12).all();
  return json({items:results.slice(0,12).map(r=>({id:r.id,...publicList(JSON.parse(r.published),r.id),publishedAt:r.published_at,creator:{id:r.creator_id,name:JSON.parse(r.payload).name}})),hasMore:results.length>12});
 }
 if(req.method==='GET'&&path.startsWith('/covers/')){const row=await env.DB.prepare('SELECT l.published FROM pilot_lists l JOIN pilot_profiles p ON p.user_id=l.user_id JOIN creator_users u ON u.id=l.user_id WHERE l.id=? AND l.visible=1 AND NOT EXISTS(SELECT 1 FROM list_moderation m WHERE m.list_id=l.id AND m.hidden=1) AND p.visible=1 AND u.suspended=0').bind(path.slice(8)).first();const cover=row&&JSON.parse(row.published).cover;if(!cover)bad('Not found',404);return new Response(Uint8Array.from(atob(cover.split(',')[1]),c=>c.charCodeAt(0)),{headers:{'Content-Type':'image/webp','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
 if(req.method==='GET'&&path.startsWith('/creators/')){
  const parts=path.split('/'),id=parts[2];const p=await env.DB.prepare('SELECT p.* FROM pilot_profiles p JOIN creator_users u ON u.id=p.user_id WHERE p.creator_id=? AND p.visible=1 AND u.suspended=0').bind(id).first();if(!p)bad('Profile not published',404);
  if(parts.length===3)return json({id:p.creator_id,...JSON.parse(p.payload),publishedAt:p.published_at});
  if(parts.length===4&&['avatar','banner'].includes(parts[3])){const file=await env.DB.prepare('SELECT mime,bytes FROM pilot_media WHERE user_id=? AND slot=?').bind(p.user_id,parts[3]).first();if(!file)bad('Not found',404);return new Response(Array.isArray(file.bytes)?new Uint8Array(file.bytes):file.bytes,{headers:{'Content-Type':file.mime,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'"}});}
  bad('Not found',404);
 }
 const actor=req.method==='GET'?await session(req,env):await csrf(req,env);
 if(req.method!=='GET')await reserve(env,'pilot_writes_'+actor.user_id,300);
 if(req.method==='GET'&&path==='/mine'){
  const {results}=await env.DB.prepare("SELECT l.id,l.draft,l.visible,l.version,l.published_at,COALESCE(m.hidden,0) AS moderated,COALESCE(m.reason,'') AS moderationReason FROM pilot_lists l LEFT JOIN list_moderation m ON m.list_id=l.id WHERE l.user_id=? ORDER BY l.updated_at DESC,l.id").bind(actor.user_id).all();
  const p=await env.DB.prepare('SELECT creator_id,visible,published_at FROM pilot_profiles WHERE user_id=?').bind(actor.user_id).first();
  return json({profile:p?{id:p.creator_id,visible:!!p.visible,publishedAt:p.published_at}:null,items:results.map(x=>({id:x.id,...JSON.parse(x.draft),visible:!!x.visible&&!x.moderated,moderated:!!x.moderated,moderationReason:x.moderationReason,version:x.version}))});
 }
 if(req.method==='POST'&&path==='/profile/publish'){
  const input=await body(req);const p=await env.DB.prepare('SELECT * FROM creator_profiles WHERE user_id=?').bind(actor.user_id).first();if(!p||!p.name.trim())bad('Save your profile first');if(input.version!==p.version)bad('Profile changed. Reload and review before publishing.',409);
  const payload=JSON.stringify({name:p.name,description:p.description,links:JSON.parse(p.links)});
  await env.DB.batch([
   env.DB.prepare('INSERT INTO pilot_profiles(user_id,creator_id,payload,published_at,visible) VALUES(?,?,?,?,1) ON CONFLICT(user_id) DO UPDATE SET payload=excluded.payload,published_at=excluded.published_at,visible=1').bind(actor.user_id,p.creator_id,payload,now()),
   env.DB.prepare('DELETE FROM pilot_media WHERE user_id=?').bind(actor.user_id),
   env.DB.prepare('INSERT INTO pilot_media(user_id,slot,mime,bytes) SELECT user_id,slot,mime,bytes FROM creator_media WHERE user_id=?').bind(actor.user_id)
  ]);return json({ok:true,id:p.creator_id});
 }
 if(req.method==='POST'&&path==='/profile/unpublish'){await env.DB.prepare('UPDATE pilot_profiles SET visible=0 WHERE user_id=?').bind(actor.user_id).run();return json({ok:true});}
 if(req.method==='POST'&&path==='/lists'){
  const data=validatePilotList(await body(req,200000));const count=await env.DB.prepare('SELECT COUNT(*) AS n FROM pilot_lists WHERE user_id=?').bind(actor.user_id).first();if(count.n>=20)bad('Pilot limit: 20 lists per account',409);
  const id=crypto.randomUUID();const inserted=await env.DB.prepare('INSERT INTO pilot_lists(id,user_id,draft,updated_at) SELECT ?,?,?,? WHERE (SELECT COUNT(*) FROM pilot_lists WHERE user_id=?)<20 RETURNING id').bind(id,actor.user_id,JSON.stringify(data),now(),actor.user_id).first();if(!inserted)bad('Pilot limit: 20 lists per account',409);await queue(data.url);return json({id,version:1});
 }
 const match=path.match(/^\/lists\/([a-f0-9-]{36})(?:\/(publish|unpublish))?$/);
 if(match){const list=await env.DB.prepare('SELECT * FROM pilot_lists WHERE id=? AND user_id=?').bind(match[1],actor.user_id).first();if(!list)bad('Not found',404);const input=await body(req,200000);if(input.version!==list.version)bad('List changed. Reload before saving.',409);
  if(req.method==='PATCH'&&!match[2]){const {version,...values}=input;const data=validatePilotList(values);const changed=await env.DB.prepare('UPDATE pilot_lists SET draft=?,version=version+1,updated_at=? WHERE id=? AND user_id=? AND version=? RETURNING version').bind(JSON.stringify(data),now(),list.id,actor.user_id,version).first();if(!changed)bad('List changed. Reload before saving.',409);await queue(data.url);return json({ok:true,version:changed.version});}
  if(req.method==='POST'&&match[2]){
   if(match[2]==='publish'&&await env.DB.prepare('SELECT list_id FROM list_moderation WHERE list_id=? AND hidden=1').bind(list.id).first())bad('清單已由管理員下架；修改可儲存為草稿，請聯絡管理員申請恢復。',403);
   if(match[2]==='publish'&&!await env.DB.prepare('SELECT user_id FROM pilot_profiles WHERE user_id=? AND visible=1').bind(actor.user_id).first())bad('Publish your profile first',409);
   const publish=match[2]==='publish';const changed=await env.DB.prepare(publish?'UPDATE pilot_lists SET published=draft,visible=1,published_at=?,version=version+1 WHERE id=? AND user_id=? AND version=? RETURNING version':'UPDATE pilot_lists SET visible=0,version=version+1 WHERE ? IS NOT NULL AND id=? AND user_id=? AND version=? RETURNING version').bind(now(),list.id,actor.user_id,input.version).first();if(!changed)bad('List changed. Reload before publishing.',409);return json({ok:true,version:changed.version});
  }
 }
 bad('Not found',404);
}

function publicList(data,id){const {cover,...rest}=data;return {...rest,coverUrl:cover?'/account/api/pilot/covers/'+id:''};}
