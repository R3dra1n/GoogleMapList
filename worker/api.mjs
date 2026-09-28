import {notificationStatus} from './notifications.mjs';
import {ApiError,submitRecommendation,manageRecommendations} from './community.mjs';
import {githubClient,destinations,searchPhotos,importPhoto} from './photos.mjs';
export async function api(request,env,fetcher){
 const url=new URL(request.url),origin=request.headers.get('Origin');
 const allowed=env.SITE_ORIGIN;
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',Vary:'Origin',...(origin===allowed?{'Access-Control-Allow-Origin':allowed,'Access-Control-Allow-Methods':'GET, POST, PATCH, DELETE, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Max-Age':'600'}:{})};
 const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
 if(origin&&origin!==allowed)return json({error:'Origin not allowed'},403);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 try{
  if(url.pathname==='/api/recommendations'&&request.method==='POST'){
   if(origin!==allowed)throw new ApiError('Origin required',403);
   return json(await submitRecommendation(request,env),201);
  }
  if(!url.pathname.startsWith('/api/admin/'))throw new ApiError('Not found',404);
  const token=request.headers.get('Authorization')?.match(/^Bearer ([^\s]+)$/)?.[1];if(!token)throw new ApiError('Please sign in',401);
  const check=await fetcher(`https://api.github.com/repos/${env.GITHUB_REPO}`,{headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','User-Agent':'PocketAtlas-CMS'},signal:AbortSignal.timeout(15000)});
  if(check.status===401)throw new ApiError('Please sign in again',401);
  if(!check.ok||!(await check.json()).permissions?.push)throw new ApiError('Editor access required',403);
  const github=githubClient(env,token,fetcher);
  if(url.pathname==='/api/admin/notifications'&&request.method==='GET')return json(await notificationStatus(env));
  if(url.pathname==='/api/admin/recommendations')return json(await manageRecommendations(request,env,url));
  if(url.pathname==='/api/admin/destinations'&&request.method==='GET')return json(await destinations(github,Number(url.searchParams.get('offset')||0),url.searchParams.get('snapshot')||''));
  if(url.pathname==='/api/admin/photos/search'&&request.method==='GET')return json(await searchPhotos(url.searchParams.get('q')?.trim(),fetcher));
  if(url.pathname==='/api/admin/photos/import'&&request.method==='POST')return json(await importPhoto(request,github,fetcher));
  throw new ApiError('Not found',404);
 }catch(error){return json({error:error instanceof ApiError?error.message:'Service temporarily unavailable'},error instanceof ApiError?error.status:502);}
}
