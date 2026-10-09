import {listEntries} from '../public/list-keys.js';
import {ApiError,readJSON} from './community.mjs';
import {reserve} from './usage.mjs';
let cached;
export function publishedLists(data){
 const ids=new Set();
 for(const c of data.cities||[])if(c.published!==false)listEntries(c).forEach(x=>ids.add(x.id));
 for(const t of data.themes||[])if(t.published!==false)listEntries(t,'themes').forEach(x=>ids.add(x.id));
 return ids;
}
async function allowed(env,fetcher){
 const url=env.PUBLIC_DATA_URL||'https://r3dra1n.github.io/GoogleMapList/data.json';
 if(cached?.url===url&&cached.until>Date.now())return cached.ids;
 const response=await fetcher(url,{signal:AbortSignal.timeout(10000)});if(!response.ok)throw new ApiError('清單資料暫時無法讀取',503);
 const ids=publishedLists(await response.json());cached={url,ids,until:Date.now()+60000};return ids;
}
async function isKnown(id,known,env){
 if(typeof id!=='string')return false;
 if(!id.startsWith('community/'))return known.has(id);
 const match=id.match(/^community\/([a-zA-Z0-9-]+)\/collection$/);if(!match)return false;
 return !!await env.DB.prepare('SELECT l.id FROM pilot_lists l JOIN pilot_profiles p ON p.user_id=l.user_id JOIN creator_users u ON u.id=l.user_id WHERE l.id=? AND l.visible=1 AND NOT EXISTS(SELECT 1 FROM list_moderation m WHERE m.list_id=l.id AND m.hidden=1) AND l.published IS NOT NULL AND p.visible=1 AND u.suspended=0').bind(match[1]).first();
}
const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),v=>v.toString(16).padStart(2,'0')).join('');
export async function stats(request,env,fetcher){
 const url=new URL(request.url),known=await allowed(env,fetcher);
 if(request.method==='GET'){
  const ids=[...new Set((url.searchParams.get('ids')||'').split(','))];
  if(ids.length>24||!(await Promise.all(ids.map(id=>isKnown(id,known,env)))).every(Boolean))throw new ApiError('Invalid lists');
  const {results}=await env.DB.prepare(`SELECT list_id,used FROM list_totals WHERE list_id IN (${ids.map(()=>'?').join(',')})`).bind(...ids).all();
  return {items:ids.map(id=>results.find(r=>r.list_id===id)||{list_id:id,used:0}),updatedAt:new Date().toISOString()};
 }
 if(request.method!=='POST')throw new ApiError('Method not allowed',405);
 const body=await readJSON(request,1500);
 if(!await isKnown(body.id,known,env)||body.action!=='use'||!/^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/.test(body.visitor||''))throw new ApiError('Invalid interaction');
 if(!env.RATE_SALT)throw new ApiError('Statistics not configured',503);
 const bucket='stats-'+await hash(env.RATE_SALT+':'+(request.headers.get('CF-Connecting-IP')||'unknown')+':'+Math.floor(Date.now()/3600000));
 const rate=await env.DB.prepare('INSERT INTO submission_limits(bucket,count,expires_at) VALUES (?,1,?) ON CONFLICT(bucket) DO UPDATE SET count=count+1 RETURNING count').bind(bucket,Math.floor(Date.now()/1000)+3600).first();
 if(rate.count>60)throw new ApiError('操作頻繁，請稍後再試',429);
 await reserve(env,'stats_attempts',2000);
 const visitor=await hash(env.RATE_SALT+':visitor:'+body.visitor);
 await env.DB.prepare('INSERT INTO list_visitors(list_id,visitor,used,saved) VALUES (?,?,1,0) ON CONFLICT(list_id,visitor) DO UPDATE SET used=1').bind(body.id,visitor).run();
 return await env.DB.prepare('SELECT list_id,used FROM list_totals WHERE list_id=?').bind(body.id).first();
}
