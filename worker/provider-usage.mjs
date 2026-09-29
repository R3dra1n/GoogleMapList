// Read-only provider metrics. Empty/malformed/failed responses never become zero.
const number=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0?value:null;
const unavailable=(reason,status='unavailable')=>({status,reason,metrics:[]});
export function cfQuery(service,account,from,to){
 const a=JSON.stringify(account),start=JSON.stringify(from),end=JSON.stringify(to);
 const ranges=`datetime_geq:${start},datetime_leq:${end}`;
 const node={
  workers:`workersInvocationsAdaptive(limit:1,filter:{${ranges}}){sum{requests cpuTimeUs errors}}`,
  d1:`d1AnalyticsAdaptiveGroups(limit:1,filter:{date_geq:${JSON.stringify(from.slice(0,10))},date_leq:${JSON.stringify(to.slice(0,10))}}){sum{rowsRead rowsWritten}}`,
  storage:`d1StorageAdaptiveGroups(limit:10000,filter:{date:${JSON.stringify(to.slice(0,10))}}){dimensions{databaseId} max{databaseSizeBytes}}`,
  ai:`aiInferenceAdaptiveGroups(limit:1,filter:{${ranges}}){sum{totalNeurons totalInputTokens totalOutputTokens}}`
 }[service];
 return `{viewer{accounts(filter:{accountTag:${a}}){${node}}}}`;
}
export async function readCloudflare(env,service,period,fetcher=fetch,now=new Date()){
 if(!env.CF_USAGE_TOKEN||!env.CF_ACCOUNT_ID)return unavailable('需要設定 CF_USAGE_TOKEN（唯讀）與 CF_ACCOUNT_ID。','not_configured');
 const day=now.toISOString().slice(0,10),from=(period==='day'?day:day.slice(0,7)+'-01')+'T00:00:00Z';
 try{
  const response=await fetcher('https://api.cloudflare.com/client/v4/graphql',{method:'POST',headers:{Authorization:`Bearer ${env.CF_USAGE_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({query:cfQuery(service,env.CF_ACCOUNT_ID,from,now.toISOString())}),signal:AbortSignal.timeout(15000)});
  if(!response.ok)return unavailable(`Cloudflare HTTP ${response.status}；請檢查唯讀權限。`);
  const body=await response.json();if(body.errors?.length)return unavailable('Cloudflare 拒絕查詢；請核對 Analytics 權限、方案與資料保留範圍。');
  const account=body.data?.viewer?.accounts?.[0];const field={workers:'workersInvocationsAdaptive',d1:'d1AnalyticsAdaptiveGroups',storage:'d1StorageAdaptiveGroups',ai:'aiInferenceAdaptiveGroups'}[service];const rows=account?.[field];
  if(!Array.isArray(rows)||!rows.length)return unavailable('供應商尚無此期間資料；可能仍在彙整，不能視為零。','no_data');
  if(service==='storage'){
   if(rows.length>=10000||rows.some(r=>number(r.max?.databaseSizeBytes)===null))return unavailable('容量資料不完整。');
   return {status:'ok',source:'Cloudflare Analytics',scope:'帳號全部 D1',period,from,through:now.toISOString(),sampled:true,metrics:[{key:'storage',label:'D1 儲存容量（今日峰值合計）',value:rows.reduce((n,r)=>n+r.max.databaseSizeBytes,0),unit:'bytes',referenceLimit:5e9}]};
  }
  const fields={workers:[['requests','後端請求','次',period==='day'?100000:1e7],['cpuTimeUs','CPU 使用量','µs',period==='month'?3e10:null]],d1:[['rowsRead','D1 讀取列','列',period==='day'?5e6:25e9],['rowsWritten','D1 寫入列','列',period==='day'?1e5:5e7]],ai:[['totalNeurons','AI 用量','neurons',period==='day'?10000:null],['totalInputTokens','AI 輸入','tokens',null],['totalOutputTokens','AI 輸出','tokens',null]]}[service];
  if(fields.some(([key])=>number(rows[0].sum?.[key])===null))return unavailable('供應商缺少必要計量欄位。');
  return {status:'ok',source:'Cloudflare Analytics（可能抽樣）',scope:'帳號全部服務，包含其他專案',period,from,through:now.toISOString(),sampled:true,metrics:fields.map(([key,label,unit,referenceLimit])=>({key,label,unit,referenceLimit,value:rows[0].sum[key]}))};
 }catch{return unavailable('Cloudflare 統計讀取失敗；未使用零取代。');}
}
export async function readResend(env,fetcher=fetch){
 const token=env.RESEND_USAGE_API_KEY||env.RESEND_API_KEY;
 if(!token)return unavailable('尚未設定 RESEND_USAGE_API_KEY 或 RESEND_API_KEY。','not_configured');
 try{
  const r=await fetcher('https://api.resend.com/usage',{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(15000)});
  if(!r.ok)return unavailable(`Resend HTTP ${r.status}；發信專用 key 可能沒有帳號用量讀取權限。`);
  const data=await r.json();const metrics=[];
  for(const period of ['daily','monthly']){const row=data.emails?.[period];if(number(row?.used)===null||!(row.limit===null||number(row.limit)!==null))return unavailable('Resend 回應缺少用量欄位。');metrics.push({key:period,label:period==='daily'?'今日 Email':'本期 Email',value:row.used,unit:'封',referenceLimit:row.limit,resetsAt:row.resets_at});}
  return {status:'ok',source:'Resend /usage',scope:'整個 Resend 帳號，包含其他程式',metrics};
 }catch{return unavailable('Resend 用量讀取失敗。');}
}
export async function providerUsage(env,fetcher=fetch,now=new Date()){
 const result={};
 // Sequential requests avoid exhausting Workers' six simultaneous connections.
 for(const service of ['workers','d1','ai'])for(const period of ['day','month'])result[service+'_'+period]=await readCloudflare(env,service,period,fetcher,now);
 result.storage=await readCloudflare(env,'storage','day',fetcher,now);
 result.email=await readResend(env,fetcher);
 return {checkedAt:now.toISOString(),providers:result,bill:null,plan:'尚未核對帳號訂閱；參考配額不是已確認剩餘額度。'};
}
