import {ApiError,readJSON} from './community.mjs';
import {isMapsLink} from '../public/model.js';
const decode=s=>s.replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
export function previewDescription(html){
 for(const tag of html.match(/<meta\b[^>]*>/gi)||[]){
  const attrs={};for(const m of tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/gs))attrs[m[1].toLowerCase()]=decode(m[3]);
  if(!['og:description','description'].includes((attrs.property||attrs.name||'').toLowerCase()))continue;
  const value=attrs.content?.trim();
  if(value&&value.length<=2000&&!/find local businesses|view maps|get driving directions|尋找本地商家|查找本地商家|google maps|google 地圖|google 地图/i.test(value))return value;
 }
 return '';
}
function safeUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&(['maps.app.goo.gl','maps.google.com'].includes(u.hostname)||['www.google.com','www.google.com.tw','www.google.co.jp','www.google.co.uk'].includes(u.hostname)&&u.pathname.startsWith('/maps'));}catch{return false}}
export async function fetchDescription(source,fetcher){
 let url=source;
 for(let i=0;i<6;i++){
  if(!safeUrl(url))throw new ApiError('Google 連結跳轉至未支援的頁面，請手動貼上說明。');
  const r=await fetcher(url,{redirect:'manual',signal:AbortSignal.timeout(12000)});
  if([301,302,303,307,308].includes(r.status)){const next=r.headers.get('location');await r.body?.cancel();if(!next)break;url=new URL(next,url).href;continue}
  if(!r.ok)throw new ApiError('Google 未提供可讀取的公開內容，請手動貼上說明。',502);
  const reader=r.body.getReader();let bytes=0,html='';const decoder=new TextDecoder();while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>2000000){await reader.cancel();throw new ApiError('公開頁面過大，請手動貼上說明。')}html+=decoder.decode(value,{stream:true})}html+=decoder.decode();
  return {text:previewDescription(html),resolvedUrl:url};
 }
 throw new ApiError('Google 連結跳轉過多，請手動貼上說明。');
}
export async function importDescription(request,github,fetcher){
 const body=await readJSON(request,6000);
 if(!['cities','countries','themes'].includes(body.kind)||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(body.id||''))throw new ApiError('Invalid destination');
 const path=`content/${body.kind}/${body.id}.json`,file=await github(`contents/${path}?ref=main`);
 const data=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(file.content.replace(/\s/g,'')),c=>c.charCodeAt(0))));
 const links=[...new Set([data.food,data.sights,data.link].filter(x=>x&&isMapsLink(x)))];
 if(body.mode==='info')return {links,description:data.description||'',sha:file.sha};
 if(!links.includes(body.source))throw new ApiError('請選擇此清單已有的 Google 來源連結。');
 if(body.mode==='preview'){const result=await fetchDescription(body.source,fetcher);return {...result,source:body.source,notice:result.text?'這是公開頁面預覽文字，請與原清單核對；不保證是清單原始說明。':'未取得清單原始說明；請開啟 Google 清單後手動複製。'}}
 if(body.mode!=='save'||body.confirmed!==true||!['manual-copy','public-preview-reviewed'].includes(body.method))throw new ApiError('請先核對來源與說明。');
 if(file.sha!==body.expectedSha)throw new ApiError('內容已變更，請重新讀取。',409);
 if(data.description?.trim())throw new ApiError('已有簡介，保留原文。若要替換，請到清單後台自行編輯。',409);
 if(typeof body.text!=='string'||!body.text.trim()||body.text.length>2000)throw new ApiError('說明需要 1–2000 字。');
 data.description=body.text.trim();data.descriptionSource=body.source;data.descriptionImportedAt=new Date().toISOString();data.descriptionImportMethod=body.method;
 const encoded=btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(data,null,2)+'\n')));
 const result=await github(`contents/${path}`,{message:'content: import reviewed list description',content:encoded,sha:file.sha,branch:'main'},'PUT');
 return {ok:true,commit:result.commit.sha};
}
