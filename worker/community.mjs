import {mapProvider} from '../public/model.js';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export class ApiError extends Error {constructor(message,status=400){super(message);this.status=status;}}
export async function readJSON(request,max=14000){
 if(!request.headers.get('content-type')?.startsWith('application/json'))throw new ApiError('Expected JSON',415);
 const reader=request.body?.getReader();if(!reader)throw new ApiError('Missing body');let size=0,chunks=[];
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw new ApiError('Request too large',413);}chunks.push(value);}
 try{const bytes=new Uint8Array(size);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length;}const value=JSON.parse(new TextDecoder().decode(bytes));if(!value||typeof value!=='object'||Array.isArray(value))throw Error();return value;}catch{throw new ApiError('Invalid JSON');}
}
export function recommendation(body){
 const values={};const limits={country:100,city:100,name:160,mapUrl:2000,reason:3000,email:254,category:20};
 for(const [key,max] of Object.entries(limits)){if(body[key]!=null&&typeof body[key]!=='string')throw new ApiError('Invalid field');values[key]=(body[key]||'').trim();if(values[key].length>max)throw new ApiError('Field too long');}
 if(!uuid.test(body.id||'')||body.consent!==true)throw new ApiError('Invalid submission');
 for(const key of ['name'])if(!values[key])throw new ApiError('Missing required field');
 values.category ||= 'other';
 if(!['food','sights','other'].includes(values.category)||(values.mapUrl&&!mapProvider(values.mapUrl)))throw new ApiError('Invalid category or Google Maps link');
 if(values.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email))throw new ApiError('Invalid email');
 return {...values,id:body.id};
}
const digest=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),n=>n.toString(16).padStart(2,'0')).join('');
export async function submitRecommendation(request,env){
 if(!env.DB||!env.RATE_SALT)throw new ApiError('Service not ready',503);
 const body=await readJSON(request);if(body.website)return {ok:true,id:body.id};
 const item=recommendation(body);const signature=await digest(JSON.stringify(item));
 const old=await env.DB.prepare('SELECT payload_hash FROM recommendations WHERE id = ?').bind(item.id).first();
 if(old){if(old.payload_hash!==signature)throw new ApiError('Submission changed; retry with a new ID',409);return {ok:true,id:item.id};}
 const ip=request.headers.get('CF-Connecting-IP');if(!ip)throw new ApiError('Unable to verify connection',400);
 const now=Math.floor(Date.now()/1000),window=Math.floor(now/3600);const bucket=await digest(`${env.RATE_SALT}:${ip}:${window}`);
 await env.DB.prepare('DELETE FROM submission_limits WHERE expires_at < ?').bind(now).run();
 const limit=await env.DB.prepare('INSERT INTO submission_limits(bucket,count,expires_at) VALUES (?,1,?) ON CONFLICT(bucket) DO UPDATE SET count=count+1 RETURNING count').bind(bucket,(window+1)*3600).first();
 if(limit.count>5)throw new ApiError('Too many submissions; try again later',429);
 await env.DB.prepare('INSERT OR IGNORE INTO recommendations(id,payload_hash,created_at,country,city,name,category,map_url,reason,email) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(item.id,signature,new Date().toISOString(),item.country,item.city,item.name,item.category,item.mapUrl,item.reason,item.email).run();
 // Re-check a simultaneous retry before reporting success.
 const saved=await env.DB.prepare('SELECT payload_hash FROM recommendations WHERE id = ?').bind(item.id).first();
 if(saved?.payload_hash!==signature)throw new ApiError('Submission conflict',409);
 return {ok:true,id:item.id};
}
export async function manageRecommendations(request,env,url){
 if(!env.DB)throw new ApiError('Service not ready',503);
 if(request.method==='GET'){
  const status=url.searchParams.get('status')||'pending';if(!['pending','accepted','dismissed'].includes(status))throw new ApiError('Invalid status');
  const offset=Number(url.searchParams.get('offset')||0);if(!Number.isSafeInteger(offset)||offset<0||offset>100000)throw new ApiError('Invalid page');
  const rows=await env.DB.prepare('SELECT id,created_at,country,city,name,category,map_url,reason,email,status FROM recommendations WHERE status=? ORDER BY created_at DESC,id DESC LIMIT 51 OFFSET ?').bind(status,offset).all();
  return {items:rows.results.slice(0,50),nextOffset:rows.results.length>50?offset+50:null};
 }
 const body=await readJSON(request);if(!uuid.test(body.id||''))throw new ApiError('Invalid ID');
 let result;
 if(request.method==='PATCH'){if(!['pending','accepted','dismissed'].includes(body.status))throw new ApiError('Invalid status');result=await env.DB.prepare('UPDATE recommendations SET status=? WHERE id=?').bind(body.status,body.id).run();}
 else if(request.method==='DELETE')result=await env.DB.prepare('DELETE FROM recommendations WHERE id=?').bind(body.id).run();
 else throw new ApiError('Method not allowed',405);
 if(!result.meta.changes)throw new ApiError('Not found',404);return {ok:true};
}
