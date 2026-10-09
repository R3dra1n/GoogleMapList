import {providerUsage} from './provider-usage.mjs';
import {reserve,record} from './usage.mjs';
import {readJSON,ApiError} from './community.mjs';
const jsonRead=async(env,key)=>{const row=await env.DB.prepare('SELECT value,updated_at FROM monitor_cache WHERE key=?').bind(key).first();return row?{...JSON.parse(row.value),updatedAt:row.updated_at}:null;};
const save=async(env,key,value)=>env.DB.prepare('INSERT INTO monitor_cache(key,value,updated_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at').bind(key,JSON.stringify(value),Date.now()).run();
export function alertsFor(snapshot){
 const warnings=[];
 for(const [service,provider] of Object.entries(snapshot.providers)){
  if(provider.status!=='ok')continue;
  for(const metric of provider.metrics){
   const limit=metric.referenceLimit;if(!(limit>0))continue;
   const ratio=metric.value/limit,level=ratio>=1?100:ratio>=.95?95:ratio>=.8?80:0;if(!level)continue;
   const period=metric.resetsAt||((provider.period==='month')?snapshot.checkedAt.slice(0,7):snapshot.checkedAt.slice(0,10));
   warnings.push({id:`${service}/${metric.key}/${period}/${level}`,level,message:`${metric.label} 已達參考門檻 ${level}%：${metric.value.toLocaleString('en-US')} / ${limit.toLocaleString('en-US')} ${metric.unit}。${provider.source}，${provider.scope}。`});
  }
 }
 return warnings;
}
export async function monitorSnapshot(env,fetcher=fetch){
 const old=await jsonRead(env,'snapshot');if(old&&Date.now()-old.updatedAt<15*60000)return old;
 // One refresh lease across worker isolates; a crashed refresh expires after a minute.
 const lock=await env.DB.prepare("INSERT INTO monitor_cache(key,value,updated_at) VALUES ('lease','{}',?) ON CONFLICT(key) DO UPDATE SET updated_at=excluded.updated_at WHERE updated_at < ? RETURNING key").bind(Date.now(),Date.now()-60000).first();
 if(!lock)return old||{checkedAt:null,providers:{},warnings:[],pending:true};
 const data=await providerUsage(env,fetcher);
 try{const r=await fetcher('https://raw.githubusercontent.com/R3dra1n/GoogleMapList/main/translation/usage.json',{signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error();const state=await r.json(),row=state.months?.[data.checkedAt.slice(0,7)];if(!row||!Number.isSafeInteger(row.reservedCharacters)||!Number.isSafeInteger(row.confirmedCharacters))throw Error();data.providers.translation={status:'ok',period:'month',source:'本站 Git 翻譯預算記錄（非 Google 帳單）',scope:'僅本站，啟用前與其他 API 使用未知',metrics:[{key:'characters',label:'翻譯預留字符',value:row.reservedCharacters,unit:'字符',referenceLimit:400000},{key:'confirmed',label:'翻譯成功批次字符',value:row.confirmedCharacters,unit:'字符',referenceLimit:null}]};}catch{data.providers.translation={status:'unavailable',reason:'翻譯記錄無法讀取；不視為零。',metrics:[]};}
 data.warnings=alertsFor(data);
 for(const alert of data.warnings)await env.DB.prepare('INSERT OR IGNORE INTO usage_alerts(id,created_at,message) VALUES (?,?,?)').bind(alert.id,data.checkedAt,alert.message).run();
 await save(env,'snapshot',data);return data;
}
export async function monitorSettings(request,env){
 if(request.method==='POST'){const body=await readJSON(request,500);if(typeof body.emailEnabled!=='boolean')throw new ApiError('Invalid setting');if(body.emailEnabled&&(!env.RESEND_API_KEY||!env.NOTIFICATION_EMAIL))throw new ApiError('請先設定發信服務與接收地址。');await save(env,'settings',{emailEnabled:body.emailEnabled});}
 return {emailEnabled:Boolean((await jsonRead(env,'settings'))?.emailEnabled),emailConfigured:Boolean(env.RESEND_API_KEY&&env.NOTIFICATION_EMAIL)};
}
export async function sendUsageAlerts(env,fetcher=fetch){
 if(!(await jsonRead(env,'settings'))?.emailEnabled||!env.RESEND_API_KEY||!env.NOTIFICATION_EMAIL)return;
 const now=Math.floor(Date.now()/1000),day=new Date().toISOString().slice(0,10);
 const alert=await env.DB.prepare("SELECT * FROM usage_alerts WHERE status='pending' AND next_attempt<=? AND created_at>=? AND attempts<3 ORDER BY created_at LIMIT 1").bind(now,new Date(Date.now()-23*3600000).toISOString()).first();if(!alert)return;
 const claimed=await env.DB.prepare("UPDATE usage_alerts SET attempts=attempts+1,next_attempt=? WHERE id=? AND next_attempt<=? RETURNING id").bind(now+3600,alert.id,now).first();if(!claimed)return;
 try{
  await reserve(env,'usage_alert_email_attempts',6);
  await reserve(env,'email_month_attempts',2500,day.slice(0,7)+'-01');await reserve(env,'email_attempts',90);
  const idBytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(alert.id));const id=Array.from(new Uint8Array(idBytes),v=>v.toString(16).padStart(2,'0')).join('');
  const r=await fetcher('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':'usage-'+id},body:JSON.stringify({from:env.NOTIFICATION_FROM||'口袋地圖 <onboarding@resend.dev>',to:[env.NOTIFICATION_EMAIL],subject:'口袋地圖用量警示',text:alert.message+'\n此為用量警示，不是最終帳單，告警不會停止供應商計費。\nhttps://r3dra1n.github.io/GoogleMapList/admin/tools.html#usage'}),signal:AbortSignal.timeout(15000)});
  if(!r.ok){await r.body?.cancel();throw Error();}const result=await r.json();if(typeof result.id!=='string')throw Error();
  await env.DB.prepare("UPDATE usage_alerts SET status='sent' WHERE id=?").bind(alert.id).run();await record(env,'email_provider_accepted');
 }catch(error){if(error.status===429)await env.DB.prepare('UPDATE usage_alerts SET attempts=attempts-1,next_attempt=? WHERE id=?').bind(Math.floor(Date.now()/86400000+1)*86400,alert.id).run();}
}
export async function costMonitor(request,env,fetcher=fetch){
 const snapshot=await monitorSnapshot(env,fetcher),settings=await monitorSettings(request,env);
 const {results}=await env.DB.prepare('SELECT created_at,message,status,attempts FROM usage_alerts ORDER BY created_at DESC LIMIT 20').all();
 return {...snapshot,settings,notifications:results,stale:!snapshot.checkedAt||Date.now()-Date.parse(snapshot.checkedAt)>30*60000};
}
