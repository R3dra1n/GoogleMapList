const COOKIE='__Host-pocket_oauth';
const securityHeaders={'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY'};
const text=(message,status=200)=>new Response(message,{status,headers:{...securityHeaders,'Content-Type':'text/plain; charset=utf-8'}});
const cookie=(value,maxAge=600)=>`${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
const configured=env=>Boolean(env.GITHUB_CLIENT_ID&&env.GITHUB_CLIENT_SECRET&&env.GITHUB_REPO&&env.SITE_ORIGIN);
export function validState(request,state){const value=request.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);return /^[a-f0-9]{64}$/.test(state||'')&&value===state;}
export function popup(origin,token){
 const nonce=crypto.randomUUID();const payload=JSON.stringify(`authorization:github:success:${JSON.stringify({token,provider:'github'})}`).replace(/</g,'\\u003c');
 const html=`<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>登入完成</title><p>登入成功，正在返回清單管理頁面…</p><script nonce="${nonce}">const origin=${JSON.stringify(origin)};const receive=(event)=>{if(event.origin!==origin||event.source!==window.opener||event.data!=='authorizing:github')return;window.opener.postMessage(${payload},origin);window.removeEventListener('message',receive);window.close();};window.addEventListener('message',receive);if(window.opener)window.opener.postMessage('authorizing:github',origin);</script></html>`;
 return new Response(html,{headers:{...securityHeaders,'Content-Type':'text/html; charset=utf-8','Set-Cookie':cookie('',0),'Content-Security-Policy':`default-src 'none'; script-src 'nonce-${nonce}'; base-uri 'none'; frame-ancestors 'none'`}});
}
export function createHandler(fetcher=fetch){return async(request,env)=>{
 const url=new URL(request.url);
 if(request.method!=='GET')return text('Method not allowed',405);
 if(url.pathname==='/health')return Response.json({ready:configured(env)},{headers:securityHeaders});
 if(!['/auth','/callback'].includes(url.pathname))return text('Not found',404);
 if(!configured(env))return text('管理員登入尚未完成設定。網站清單仍可正常瀏覽。',503);
 const origin=new URL(env.SITE_ORIGIN).origin;
 if(url.pathname==='/auth'){
  if(url.searchParams.get('provider')&&url.searchParams.get('provider')!=='github')return text('Unsupported provider',400);
  const siteId=url.searchParams.get('site_id');if(siteId&&siteId!==new URL(origin).hostname)return text('Unknown site',400);
  const state=Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('');
  const github=new URL('https://github.com/login/oauth/authorize');github.search=new URLSearchParams({client_id:env.GITHUB_CLIENT_ID,redirect_uri:url.origin+'/callback',scope:'public_repo',state}).toString();
  return new Response(null,{status:302,headers:{...securityHeaders,Location:github.href,'Set-Cookie':cookie(state)}});
 }
 if(!validState(request,url.searchParams.get('state')))return text('登入驗證已失效，請關閉此視窗並重新登入。',403);
 if(url.searchParams.has('error')||!url.searchParams.get('code'))return text('登入已取消，請關閉此視窗後重試。',400);
 try{
  const result=await fetcher('https://github.com/login/oauth/access_token',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify({client_id:env.GITHUB_CLIENT_ID,client_secret:env.GITHUB_CLIENT_SECRET,code:url.searchParams.get('code'),redirect_uri:url.origin+'/callback'})});
  if(!result.ok)return text('登入服務暫時無法使用，請重試。',502);
  const auth=await result.json();if(!auth.access_token)return text('登入授權失敗，請重試。',401);
  const permission=await fetcher(`https://api.github.com/repos/${env.GITHUB_REPO}`,{headers:{Authorization:`Bearer ${auth.access_token}`,Accept:'application/vnd.github+json','User-Agent':'PocketAtlas-CMS','X-GitHub-Api-Version':'2022-11-28'}});
  if(!permission.ok||!(await permission.json()).permissions?.push)return text('此 GitHub 帳號沒有清單管理權限。',403);
  return popup(origin,auth.access_token);
 }catch{return text('登入服務暫時無法使用，請重試。',502);}
};}
export default {fetch:createHandler()};
