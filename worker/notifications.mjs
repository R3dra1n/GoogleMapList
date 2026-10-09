import {reserve,record,utcDay} from './usage.mjs';
export const notificationReady=env=>Boolean(env.RESEND_API_KEY&&env.NOTIFICATION_EMAIL);
// A durable outbox isolates reader submissions from provider failures.
// Only receipt IDs and a private inbox link leave the database.
export async function sendNotifications(env,fetcher=fetch,now=Math.floor(Date.now()/1000)){
 if(!notificationReady(env)||!env.DB)return;
 await env.DB.prepare("UPDATE notification_outbox SET status='failed',last_error='retry_window_expired' WHERE status='pending' AND first_attempt IS NOT NULL AND first_attempt < ?").bind(now-23*3600).run();
 const {results}=await env.DB.prepare("SELECT recommendation_id FROM notification_outbox WHERE status='pending' AND attempts < 6 AND next_attempt <= ? ORDER BY next_attempt LIMIT 5").bind(now).all();
 for(const {recommendation_id:id} of results){
  const claim=await env.DB.prepare("UPDATE notification_outbox SET attempts=attempts+1,first_attempt=COALESCE(first_attempt,?),next_attempt=? WHERE recommendation_id=? AND status='pending' AND attempts < 6 AND next_attempt <= ? RETURNING attempts").bind(now,now+3600,id,now).first();
  if(!claim)continue;
  try{
   await reserve(env,'email_month_attempts',2500,utcDay().slice(0,7)+'-01');
   await reserve(env,'email_attempts',90);
   const response=await fetcher('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`recommendation/${id}`},body:JSON.stringify({from:env.NOTIFICATION_FROM||'口袋地圖 <onboarding@resend.dev>',to:[env.NOTIFICATION_EMAIL],subject:'口袋地圖收到新的地點推薦',text:`你收到一筆新的地點推薦。\n收件編號：${id}\n請使用 GitHub 登入私人收件箱查看：\nhttps://r3dra1n.github.io/GoogleMapList/admin/tools.html\n\n此通知不包含訪客 Email 或推薦全文。`}),signal:AbortSignal.timeout(15000)});
   if(!response.ok){await response.body?.cancel();throw Error(`provider_http_${response.status}`);}
   const result=await response.json();if(typeof result.id!=='string')throw Error('invalid_provider_response');
   await record(env,'email_provider_accepted');
   await env.DB.prepare("UPDATE notification_outbox SET status='sent',provider_id=?,last_error=NULL WHERE recommendation_id=?").bind(result.id,id).run();
  }catch(error){if(error.status===429){await env.DB.prepare("UPDATE notification_outbox SET attempts=attempts-1,first_attempt=CASE WHEN attempts=1 THEN NULL ELSE first_attempt END,next_attempt=? WHERE recommendation_id=?").bind(Math.floor(Date.now()/86400000+1)*86400,id).run();continue;}const code=/^provider_http_\d{3}$/.test(error.message)?error.message:'delivery_unconfirmed';await env.DB.prepare("UPDATE notification_outbox SET status=?,last_error=? WHERE recommendation_id=?").bind(claim.attempts>=6?'failed':'pending',code,id).run();}
 }
}
export async function notificationStatus(env){
 const {results}=await env.DB.prepare('SELECT status,COUNT(*) AS count FROM notification_outbox GROUP BY status').all();
 return {configured:notificationReady(env),counts:Object.fromEntries(results.map(r=>[r.status,r.count]))};
}
