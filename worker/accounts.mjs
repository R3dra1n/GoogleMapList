import {pilotApi} from './pilot-api.mjs';
import {pilotPage} from './pilot-page.mjs';
import {firebaseConfig,verifyFirebase} from './firebase-auth.mjs';
import {validateProfile,ProfileError} from './creator-profile.mjs';
import {reserve,record,utcDay} from './usage.mjs';
import {accountPage} from './account-ui.mjs';
const SESSION='__Host-atlas_session',FLOW='__Host-atlas_flow';
const now=()=>Math.floor(Date.now()/1000);
const random=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('');
export const digest=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),x=>x.toString(16).padStart(2,'0')).join('');
const cookie=(name,value,age)=>`${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`;
const readCookie=(req,name)=>req.headers.get('Cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='))?.slice(name.length+1)||'';
const security={'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY'};
const fail=(message,status=400)=>{throw new ProfileError(message,status)};
const json=(body,status=200,extra={})=>Response.json(body,{status,headers:{...security,...extra}});
const email=value=>{if(typeof value!=='string'||value.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(value))fail('請填寫有效 Email');return value.trim().toLowerCase()};
const googleReady=e=>Boolean(e.GOOGLE_LOGIN_CLIENT_ID&&e.GOOGLE_LOGIN_CLIENT_SECRET);
const mailReady=e=>Boolean(e.RESEND_API_KEY&&e.LOGIN_EMAIL_FROM&&!/resend\.dev/i.test(e.LOGIN_EMAIL_FROM));
async function boundedBytes(req,limit){
 if(Number(req.headers.get('Content-Length'))>limit)fail('內容過大',413);
 const reader=req.body?.getReader();if(!reader)return new Uint8Array();
 const chunks=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();fail('內容過大',413);}chunks.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}return bytes;
}
async function body(req,limit=8192){const text=new TextDecoder().decode(await boundedBytes(req,limit));try{const value=JSON.parse(text);if(!value||typeof value!=='object'||Array.isArray(value))fail('資料格式錯誤');return value;}catch{fail('資料格式錯誤')}}
async function session(req,env,required=true){const token=readCookie(req,SESSION);const row=/^[a-f0-9]{64}$/.test(token)?await env.DB.prepare('SELECT s.*,u.suspended FROM creator_sessions s JOIN creator_users u ON u.id=s.user_id WHERE s.hash=? AND s.expires_at>?').bind(await digest(token),now()).first():null;if(!row||row.suspended){if(required)fail('請先登入',401);return null}return row;}
async function csrf(req,env){const s=await session(req,env);if(req.headers.get('X-CSRF-Token')!==s.csrf)fail('登入驗證失效，請重新整理',403);return s;}
async function challenge(env,kind,browser,details={}){const token=random();await env.DB.prepare('INSERT INTO creator_challenges(hash,kind,browser_hash,email,verifier,target_user,expires_at) VALUES(?,?,?,?,?,?,?)').bind(await digest(token),kind,await digest(browser),details.email||null,details.verifier||null,details.target||null,now()+600).run();return token;}
async function consume(req,env,token,kind){if(!/^[a-f0-9]{64}$/.test(token||''))fail('驗證連結無效或已過期');const browser=readCookie(req,FLOW);if(!/^[a-f0-9]{64}$/.test(browser))fail('請在要求登入連結的同一瀏覽器完成驗證');const row=await env.DB.prepare('DELETE FROM creator_challenges WHERE hash=? AND kind=? AND browser_hash=? AND expires_at>? RETURNING *').bind(await digest(token),kind,await digest(browser),now()).first();if(!row)fail('驗證連結無效、已使用或已過期');if(row.target_user){const s=await session(req,env);if(s.user_id!==row.target_user)fail('請回到原登入帳號再綁定',403);}return row;}
async function identify(env,provider,subject,address,target){
 const table=provider==='firebase'?'creator_firebase_identities':'creator_identities';
 const existing=await env.DB.prepare(`SELECT * FROM ${table} WHERE provider=? AND subject=?`).bind(provider,subject).first();
 if(target){if(existing&&existing.user_id!==target)fail('此登入方式已綁定其他帳號',409);if(!existing)await env.DB.prepare(`INSERT INTO ${table}(provider,subject,user_id,email) VALUES(?,?,?,?)`).bind(provider,subject,target,address).run();return target;}
 if(existing)return existing.user_id;
 const invited=await env.DB.prepare('SELECT email FROM creator_invitations WHERE email=? AND enabled=1').bind(address).first();if(!invited&&env.CREATOR_REGISTRATION!=='open')fail('目前採邀請制，請聯絡網站管理員',403);
 if(await env.DB.prepare('SELECT id FROM creator_users WHERE primary_email=?').bind(address).first())fail('此 Email 已有帳號，請用原登入方式登入後再綁定',409);
 const id=crypto.randomUUID();await env.DB.batch([
 env.DB.prepare('INSERT INTO creator_users(id,primary_email,created_at) VALUES(?,?,?)').bind(id,address,now()),
 env.DB.prepare(`INSERT INTO ${table}(provider,subject,user_id,email) VALUES(?,?,?,?)`).bind(provider,subject,id,address),
 env.DB.prepare('INSERT INTO creator_profiles(user_id,creator_id,name,updated_at) VALUES(?,?,?,?)').bind(id,crypto.randomUUID(),'旅行者',now())]);return id;
}
async function login(req,env,id,age=7*86400){const user=await env.DB.prepare('SELECT suspended FROM creator_users WHERE id=?').bind(id).first();if(!user||user.suspended)fail('帳號暫停使用',403);const token=random();const old=readCookie(req,SESSION);if(old)await env.DB.prepare('DELETE FROM creator_sessions WHERE hash=?').bind(await digest(old)).run();await env.DB.prepare('INSERT INTO creator_sessions(hash,user_id,csrf,expires_at) VALUES(?,?,?,?)').bind(await digest(token),id,random(),now()+age).run();return cookie(SESSION,token,age);}
async function limit(req,env,address=''){if(!env.RATE_SALT)fail('登入服務尚未設定',503);const bucket=await digest(env.RATE_SALT+':'+(address||req.headers.get('CF-Connecting-IP')||'unknown'));await reserve(env,'account_'+bucket, address?5:30);}
export async function cleanAccounts(env){if(env.CREATOR_ACCOUNTS_ENABLED!=='true')return;await env.DB.batch([env.DB.prepare('DELETE FROM creator_challenges WHERE expires_at<?').bind(now()),env.DB.prepare('DELETE FROM creator_sessions WHERE expires_at<?').bind(now())]);}
export async function accounts(req,env,fetcher=fetch,ctx){
 const url=new URL(req.url),path=url.pathname;
 if(path==='/account/community'&&req.method==='GET'){const nonce=random();return new Response(pilotPage(nonce),{headers:{...security,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':`default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; img-src 'self' data: blob:; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'`}});}
 if(path==='/account'||path==='/account/'||path==='/account/verify'){if(req.method!=='GET')return json({error:'Method not allowed'},405);const nonce=random();return new Response(accountPage(nonce,env.AUTH_PROVIDER==='firebase'),{headers:{...security,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':`default-src 'none'; script-src 'nonce-${nonce}' https://www.gstatic.com https://apis.google.com; frame-src https://${env.FIREBASE_PROJECT_ID||'unconfigured'}.firebaseapp.com https://accounts.google.com; style-src 'nonce-${nonce}'; img-src 'self' blob:; connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://${env.FIREBASE_PROJECT_ID||'unconfigured'}.firebaseapp.com; base-uri 'none'; form-action 'self'; frame-ancestors 'none'`}});}
 if(path==='/account/api/config'&&req.method==='GET'){const enabled=env.CREATOR_ACCOUNTS_ENABLED==='true';return json({enabled,google:enabled&&googleReady(env),email:enabled&&mailReady(env),invitationOnly:env.CREATOR_REGISTRATION!=='open',firebase:env.AUTH_PROVIDER==='firebase'?firebaseConfig(env):null});}
 if(env.CREATOR_ACCOUNTS_ENABLED!=='true'||!env.DB)return json({error:'創作者登入尚未開放'},503);
 try{
  if(['POST','PATCH','DELETE'].includes(req.method)&&req.headers.get('Origin')!==url.origin)fail('Origin not allowed',403);
  if(path.startsWith('/account/api/pilot/'))return await pilotApi(req,env,{session,csrf,body,json,fetcher,ctx});
  if(env.AUTH_PROVIDER==='firebase'&&(/\/api\/(google|email)\//.test(path)||path==='/account/google/callback'))fail('請使用新版登入頁',410);
  if(path==='/account/api/firebase/session'&&req.method==='POST'){
   if(env.AUTH_PROVIDER!=='firebase')fail('Firebase 尚未啟用',503);
   await limit(req,env);const input=await body(req,18000);const identity=await verifyFirebase(input.idToken,env,fetcher);
   const id=await identify(env,'firebase',identity.uid,email(identity.email),null);
   return json({ok:true},200,{'Set-Cookie':await login(req,env,id,Math.max(1,identity.expires-now()))});
  }
  if(req.method==='GET'&&path==='/account/api/me'){const s=await session(req,env);const p=await env.DB.prepare('SELECT * FROM creator_profiles WHERE user_id=?').bind(s.user_id).first();const identityTable=env.AUTH_PROVIDER==='firebase'?'creator_firebase_identities':'creator_identities';const {results:identities}=await env.DB.prepare(`SELECT provider,email FROM ${identityTable} WHERE user_id=?`).bind(s.user_id).all();return json({csrf:s.csrf,profile:{creatorId:p.creator_id,name:p.name,description:p.description,links:JSON.parse(p.links),version:p.version},identities});}
  if(req.method==='POST'&&path==='/account/api/logout'){const s=await csrf(req,env);await env.DB.prepare('DELETE FROM creator_sessions WHERE hash=?').bind(s.hash).run();return json({ok:true},200,{'Set-Cookie':cookie(SESSION,'',0)});}
  if(req.method==='PATCH'&&path==='/account/api/profile'){const s=await csrf(req,env);const input=await body(req);if(!Number.isInteger(input.version)||input.version<0)fail('版本無效');const {version,...fields}=input;const profile=validateProfile(fields);const updated=await env.DB.prepare('UPDATE creator_profiles SET name=?,description=?,links=?,version=version+1,updated_at=? WHERE user_id=? AND version=? RETURNING version').bind(profile.name,profile.description,JSON.stringify(profile.links),now(),s.user_id,version).first();if(!updated)fail('內容已更新，請重新載入再編輯',409);return json({ok:true,version:updated.version});}
  if(path==='/account/api/email/start'&&req.method==='POST'){
   if(!mailReady(env))fail('Email 登入尚未設定',503);await limit(req,env);const input=await body(req);const address=email(input.email);const target=input.link?(await csrf(req,env)).user_id:null;await limit(req,env,address);
   const browser=random();const known=target||await env.DB.prepare('SELECT email FROM creator_invitations WHERE email=? AND enabled=1 UNION SELECT email FROM creator_identities WHERE provider=\'email\' AND subject=?').bind(address,address).first();
   if(known){const token=await challenge(env,'email',browser,{email:address,target});await reserve(env,'email_month_attempts',2500,utcDay().slice(0,7)+'-01');await reserve(env,'email_attempts',90);await record(env,'login_email_attempts');const response=await fetcher('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':await digest(token)},body:JSON.stringify({from:env.LOGIN_EMAIL_FROM,to:[address],subject:'口袋地圖登入驗證',text:`請在要求登入的同一瀏覽器開啟並按下確認，連結 10 分鐘內有效且只能使用一次。\n${url.origin}/account/verify#token=${token}\n如果不是你要求登入，請忽略此信。`}),signal:AbortSignal.timeout(15000)});if(!response.ok){await response.body?.cancel();await env.DB.prepare('DELETE FROM creator_challenges WHERE hash=?').bind(await digest(token)).run();fail('寄信服務暫時無法使用',502);}await response.body?.cancel();await record(env,'email_provider_accepted');}
   return json({message:'若此地址已獲邀或已註冊，將收到驗證信。請在同一瀏覽器開啟。'},200,{'Set-Cookie':cookie(FLOW,browser,600)});
  }
  if(path==='/account/api/email/finish'&&req.method==='POST'){await limit(req,env);const input=await body(req);const flow=await consume(req,env,input.token,'email');const id=await identify(env,'email',flow.email,flow.email,flow.target_user);return json({ok:true},200,{'Set-Cookie':await login(req,env,id)});}
  if(path==='/account/api/google/start'&&req.method==='POST'){
   if(!googleReady(env))fail('Google 登入尚未設定',503);await limit(req,env);const input=await body(req);const target=input.link?(await csrf(req,env)).user_id:null;const browser=random(),verifier=random();const state=await challenge(env,'google',browser,{target,verifier});const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier)));const pkce=btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');const auth=new URL('https://accounts.google.com/o/oauth2/v2/auth');auth.search=new URLSearchParams({client_id:env.GOOGLE_LOGIN_CLIENT_ID,redirect_uri:url.origin+'/account/google/callback',response_type:'code',scope:'openid email profile',state,code_challenge:pkce,code_challenge_method:'S256',prompt:'select_account'}).toString();return json({url:auth.href},200,{'Set-Cookie':cookie(FLOW,browser,600)});
  }
  if(path==='/account/google/callback'&&req.method==='GET'){
   if(!googleReady(env))fail('Google 登入尚未設定',503);const flow=await consume(req,env,url.searchParams.get('state'),'google');const code=url.searchParams.get('code');if(!code||url.searchParams.has('error'))fail('Google 登入已取消');const r=await fetcher('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:env.GOOGLE_LOGIN_CLIENT_ID,client_secret:env.GOOGLE_LOGIN_CLIENT_SECRET,code,redirect_uri:url.origin+'/account/google/callback',grant_type:'authorization_code',code_verifier:flow.verifier}),signal:AbortSignal.timeout(15000)});if(!r.ok)fail('Google 授權失敗',401);const token=await r.json();if(typeof token.access_token!=='string')fail('Google 授權失敗',401);
   const u=await fetcher('https://openidconnect.googleapis.com/v1/userinfo',{headers:{Authorization:`Bearer ${token.access_token}`},signal:AbortSignal.timeout(15000)});if(!u.ok)fail('無法確認 Google 身份',401);const profile=await u.json();if(typeof profile.sub!=='string'||!profile.sub||profile.email_verified!==true)fail('需要已驗證的 Google Email',401);const address=email(profile.email);const id=await identify(env,'google',profile.sub,address,flow.target_user);return new Response(null,{status:303,headers:{...security,Location:'/account/','Set-Cookie':await login(req,env,id)}});
  }
  if(path.startsWith('/account/api/media/')){
   const slot=path.split('/').pop();if(!['avatar','banner'].includes(slot))fail('Not found',404);
   if(req.method==='GET'){const s=await session(req,env);const file=await env.DB.prepare('SELECT mime,bytes FROM creator_media WHERE user_id=? AND slot=?').bind(s.user_id,slot).first();if(!file)fail('Not found',404);return new Response(Array.isArray(file.bytes)?new Uint8Array(file.bytes):file.bytes,{headers:{...security,'Content-Type':file.mime,'Content-Security-Policy':"default-src 'none'"}});}
   if(req.method==='POST'){const s=await csrf(req,env);await reserve(env,'creator_media_uploads',100);const max=slot==='avatar'?256*1024:1024*1024;if(Number(req.headers.get('Content-Length'))>max)fail('圖片過大',413);const bytes=await boundedBytes(req,max);if(bytes.length>max||bytes.length<12)fail('圖片過大或格式不正確',413);const sig=String.fromCharCode(...bytes.slice(0,12));const mime=bytes[0]===255&&bytes[1]===216&&bytes[2]===255?'image/jpeg':bytes.slice(0,8).join(',')==='137,80,78,71,13,10,26,10'?'image/png':sig.startsWith('RIFF')&&sig.slice(8)==='WEBP'?'image/webp':null;if(!mime||req.headers.get('Content-Type')!==mime)fail('只支援 JPG、PNG、WebP');await env.DB.prepare('INSERT INTO creator_media(user_id,slot,mime,bytes,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(user_id,slot) DO UPDATE SET mime=excluded.mime,bytes=excluded.bytes,updated_at=excluded.updated_at').bind(s.user_id,slot,mime,bytes.buffer,now()).run();return json({ok:true});}
  }
  fail('Not found',404);
 }catch(e){return json({error:e instanceof ProfileError?e.message:e.status===429?'今日操作額度已達上限':'登入服務暫時無法使用'},e instanceof ProfileError?e.status:e.status===429?429:502);}
}
