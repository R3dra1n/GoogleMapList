import {readGoogleList,validListURL} from './google-list.mjs';
import {ApiError} from './community.mjs';
const pending=new Map(),saved=new Map();
export async function listPlaces(url,fetcher=fetch){
 const source=url.searchParams.get('url');if(!validListURL(source)||source.length>4096)throw new ApiError('請使用公開 Google Maps 清單的 HTTPS 網址。',400);
 const cached=saved.get(source);if(cached&&cached.until>Date.now())return cached.data;
 if(pending.has(source))return pending.get(source);
 if(pending.size>=12)throw new ApiError('景點讀取繁忙，請稍後再試。',429);
 const task=(async()=>{try{const data=await readGoogleList(source,fetcher);if(saved.size>=200)saved.delete(saved.keys().next().value);saved.set(source,{data,until:Date.now()+300000});return data;}catch{throw new ApiError('暫時無法讀取景點，請確認清單已公開；仍可開啟原地圖。',422);}finally{pending.delete(source);}})();pending.set(source,task);return task;
}
export async function mapData(url,fetcher=fetch){const id=url.searchParams.get('mid');if(!/^[\w-]{10,200}$/.test(id||''))throw new ApiError('地圖識別碼無效。',400);const response=await fetcher('https://www.google.com/maps/d/kml?mid='+encodeURIComponent(id)+'&forcekml=1',{signal:AbortSignal.timeout(15000)});if(!response.ok)throw new ApiError('地圖暫時無法讀取。',422);const xml=await response.text();if(xml.length>2000000||!xml.includes('<kml'))throw new ApiError('地圖資料格式無效。',422);return {xml};}
