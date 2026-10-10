import {enqueueSources,processPlaces,readSaved,claimGoogleJobs,completeGoogleJob} from './saved-places.mjs';
import {listOverview,moderateList} from './list-admin.mjs';
import {memberOverview} from './member-admin.mjs';
import {costMonitor,monitorSettings} from './cost-monitor.mjs';
import {importDescription} from './import-description.mjs';
import {stats} from './stats.mjs';
import {usage,reserve} from './usage.mjs';
import {generateDescription} from './descriptions.mjs';
import {notificationStatus} from './notifications.mjs';
import {ApiError,submitRecommendation,manageRecommendations} from './community.mjs';
import {githubClient,destinations,searchPhotos,importPhoto} from './photos.mjs';
export async function api(request,env,fetcher,ctx){
 const url=new URL(request.url),origin=request.headers.get('Origin');
 const allowed=origin===url.origin?url.origin:env.SITE_ORIGIN;
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',Vary:'Origin',...(origin===allowed?{'Access-Control-Allow-Origin':allowed,'Access-Control-Allow-Methods':'GET, POST, PATCH, DELETE, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Max-Age':'600'}:{})};
 const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
 if(origin&&origin!==allowed)return json({error:'Origin not allowed'},403);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 try{
  if(url.pathname==='/api/recommendations'&&request.method==='POST'){
   if(origin!==allowed)throw new ApiError('Origin required',403);
   return json(await submitRecommendation(request,env),201);
  }
  if(url.pathname==='/api/stats'){if(request.method==='POST'&&origin!==allowed)throw new ApiError('Origin required',403);return json(await stats(request,env,fetcher));}
  if(url.pathname==='/api/list-places'&&request.method==='GET')return json(await readSaved(env,url.searchParams.get('url')));
  if(url.pathname==='/api/saved-places'&&request.method==='GET')return json(await readSaved(env,url.searchParams.get('url')));
  if(!url.pathname.startsWith('/api/admin/'))throw new ApiError('Not found',404);
  const token=request.headers.get('Authorization')?.match(/^Bearer ([^\s]+)$/)?.[1];if(!token)throw new ApiError('Please sign in',401);
  const check=await fetcher(`https://api.github.com/repos/${env.GITHUB_REPO}`,{headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','User-Agent':'PocketAtlas-CMS'},signal:AbortSignal.timeout(15000)});
  if(check.status===401)throw new ApiError('Please sign in again',401);
  if(!check.ok||!(await check.json()).permissions?.push)throw new ApiError('Editor access required',403);
  if(url.pathname==='/api/admin/map-places/jobs'&&request.method==='GET')return json(await claimGoogleJobs(env));
  if(url.pathname==='/api/admin/map-places/result'&&request.method==='POST'){if(origin!==allowed)throw new ApiError('Origin required',403);return json(await completeGoogleJob(env,await request.json()));}
  if(url.pathname==='/api/admin/map-places'&&request.method==='POST'){
   if(origin!==allowed)throw new ApiError('Origin required',403);
   const data=await request.json();if(!Array.isArray(data.urls)||data.urls.length>20||data.urls.some(x=>typeof x!=='string'||x.length>4096))throw new ApiError('Invalid sources',400);
   const queued=await enqueueSources(env,data.urls,{refresh:true});if(ctx)ctx.waitUntil(processPlaces(env,fetcher,2,{myMapsOnly:true}).catch(()=>console.error('MAP_PLACES_SYNC_FAILED')));return json({queued},202);
  }
  if(url.pathname==='/api/admin/members'&&request.method==='GET')return json(await memberOverview(url,env));
  if(url.pathname==='/api/admin/lists'){
   if(request.method==='GET')return json(await listOverview(url,env));
   if(request.method==='PATCH'){
    if(origin!==allowed)throw new ApiError('Origin required',403);
    const actorResponse=await fetcher('https://api.github.com/user',{headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','User-Agent':'PocketAtlas-CMS'},signal:AbortSignal.timeout(15000)});
    const actor=actorResponse.ok?await actorResponse.json():null;if(!actor?.login)throw new ApiError('無法確認管理員身分',403);
    return json(await moderateList(request,env,actor.login));
   }
  }
  const github=githubClient(env,token,fetcher);
  if(url.pathname==='/api/admin/import-description'&&request.method==='POST')return json(await importDescription(request,github,fetcher));
  if(url.pathname==='/api/admin/cost-monitor'&&request.method==='GET')return json(await costMonitor(request,env,fetcher));
  if(url.pathname==='/api/admin/cost-settings'&&request.method==='POST')return json(await monitorSettings(request,env));
  if(url.pathname==='/api/admin/usage'&&request.method==='GET')return json(await usage(env,github));
  if(url.pathname==='/api/admin/descriptions'&&request.method==='POST')return json(await generateDescription(request,env,github,token));
  if(url.pathname==='/api/admin/notifications'&&request.method==='GET')return json(await notificationStatus(env));
  if(url.pathname==='/api/admin/recommendations')return json(await manageRecommendations(request,env,url));
  if(url.pathname==='/api/admin/destinations'&&request.method==='GET')return json(await destinations(github,Number(url.searchParams.get('offset')||0),url.searchParams.get('snapshot')||''));
  if(url.pathname==='/api/admin/photos/search'&&request.method==='GET'){await reserve(env,'photo_search_attempts',300);return json(await searchPhotos(url.searchParams.get('q')?.trim(),fetcher,Number(url.searchParams.get('offset')||0)));}
  if(url.pathname==='/api/admin/photos/import'&&request.method==='POST')return json(await importPhoto(request,github,fetcher));
  throw new ApiError('Not found',404);
 }catch(error){return json({error:error instanceof ApiError?error.message:'Service temporarily unavailable'},error instanceof ApiError?error.status:502);}
}
