import {ApiError,readJSON} from './community.mjs';
const plain=s=>String(s||'').replace(/<[^>]*>/g,'').replace(/&(?:amp|lt|gt|quot|apos|#39);/g,s=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&#39;':"'"}[s])).trim();
const trustedImage=value=>{try{const u=new URL(value);return u.protocol==='https:'&&['upload.wikimedia.org','thumb.wikimedia.org'].includes(u.hostname)&&!u.username&&!u.password&&!u.port&&u.pathname.startsWith('/wikipedia/commons/');}catch{return false;}};
export function photoCandidate(page){
 const info=page.imageinfo?.[0],meta=info?.extmetadata;if(!info||!meta||!['image/jpeg','image/png','image/webp'].includes(info.mime))return null;
 const license=plain(meta.LicenseShortName?.value);let licenseUrl=String(meta.LicenseUrl?.value||'').replace(/^http:/,'https:');if(licenseUrl.startsWith('//'))licenseUrl='https:'+licenseUrl;
 if(!/^https:\/\/creativecommons\.org\/(?:licenses\/by(?:-sa)?\/(?:1\.0|2\.0|2\.5|3\.0|4\.0)|publicdomain\/(?:zero\/1\.0|mark\/1\.0))\/?$/.test(licenseUrl))return null;
 const imageUrl=info.thumburl||info.url;if(!trustedImage(imageUrl)||!Number.isSafeInteger(page.pageid))return null;
 const artist=plain(meta.Artist?.value);if(!license||!artist||artist.length>500)return null;
 return {pageId:page.pageid,title:plain(page.title).replace(/^File:/,''),url:imageUrl,source:`https://commons.wikimedia.org/wiki/Special:Redirect/page/${page.pageid}`,artist,license,licenseUrl,description:plain(meta.ImageDescription?.value).slice(0,500),mime:info.thumbmime||info.mime};
}
async function commons(params,fetcher){
 const url=new URL('https://commons.wikimedia.org/w/api.php');url.search=new URLSearchParams({action:'query',format:'json',formatversion:'2',prop:'imageinfo',iiprop:'url|mime|extmetadata',iiurlwidth:'960',...params});
 const response=await fetcher(url.href,{headers:{'User-Agent':'WilliamPocketAtlas/1.0 (https://r3dra1n.github.io/GoogleMapList/)'},signal:AbortSignal.timeout(15000)});if(!response.ok)throw new ApiError('Wikimedia search is temporarily unavailable',502);const json=await response.json();if(json.error)throw new ApiError('Wikimedia search failed',502);return (json.query?.pages||[]).map(photoCandidate).filter(Boolean);
}
export async function searchPhotos(query,fetcher){if(!query||query.length>160)throw new ApiError('Search needs 1–160 characters');return {items:await commons({generator:'search',gsrsearch:query,gsrnamespace:'6',gsrlimit:'18'},fetcher)};}
export function githubClient(env,token,fetcher){return async(path,body,method)=>{
 const response=await fetcher(`https://api.github.com/repos/${env.GITHUB_REPO}/${path}`,{method:method||(body?'POST':'GET'),headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','Content-Type':'application/json','User-Agent':'PocketAtlas-CMS','X-GitHub-Api-Version':'2022-11-28'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw new ApiError(response.status===422||response.status===409?'Content changed. Refresh and choose again.':'GitHub request failed',response.status===422||response.status===409?409:502);return response.status===204?{}:response.json();
};}
const fromBase64=value=>new TextDecoder().decode(Uint8Array.from(atob(value.replace(/\s/g,'')),c=>c.charCodeAt(0)));
const toBase64=bytes=>{let text='';for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(text);};
const contentPath=(kind,id)=>{if(!['countries','cities'].includes(kind)||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id||''))throw new ApiError('Invalid destination');return `content/${kind}/${id}.json`;};
export async function destinations(github,offset=0,snapshot=''){
 if(!Number.isSafeInteger(offset)||offset<0||offset>100000||snapshot&&!/^[a-f0-9]{40}$/.test(snapshot))throw new ApiError('Invalid destination page');
 const revision=snapshot||(await github('git/ref/heads/main')).object.sha;
 const tree=await github(`git/trees/${revision}?recursive=1`);if(tree.truncated)throw new ApiError('Destination directory too large',503);
 const files=tree.tree.filter(f=>/^content\/(continents|countries|cities)\/[a-z0-9-]+\.json$/.test(f.path)).sort((a,b)=>a.path.localeCompare(b.path));
 const page=files.slice(offset,offset+24),entries=[];
 for(let i=0;i<page.length;i+=8)entries.push(...await Promise.all(page.slice(i,i+8).map(async f=>({path:f.path,sha:f.sha,...JSON.parse(fromBase64((await github(`git/blobs/${f.sha}`)).content))}))));
 return {snapshot:revision,nextOffset:offset+24<files.length?offset+24:null,items:entries.map(x=>({id:x.id,name:x.name,english:x.english,kind:x.path.split('/')[1],sha:x.sha,image:x.image||'',parentId:x.country||x.continent||''}))};
}
export async function importPhoto(request,github,fetcher){
 const body=await readJSON(request);const path=contentPath(body.kind,body.id);if(!Number.isSafeInteger(body.pageId)||body.pageId<=0||typeof body.expectedSha!=='string')throw new ApiError('Invalid photo');
 const alt=typeof body.alt==='string'?body.alt.trim():'';if(!alt||alt.length>500)throw new ApiError('Image description required (max 500 characters)');
 let stage='確認圖片授權';
 try{
 const photo=(await commons({pageids:String(body.pageId)},fetcher))[0];if(!photo)throw new ApiError('Photo has no supported, verifiable license');
 stage='讀取目的地';
 const ref=await github('git/ref/heads/main');const current=await github(`contents/${path}?ref=${ref.object.sha}`);if(current.sha!==body.expectedSha)throw new ApiError('Content changed. Refresh and choose again.',409);
 const data=JSON.parse(fromBase64(current.content));if(data.id!==body.id)throw new ApiError('Invalid content');
 stage='下載 Wikimedia 圖片';
 let downloadUrl=photo.url,response;
 for(let redirects=0;redirects<=3;redirects++){
  if(!trustedImage(downloadUrl))throw new ApiError('圖片下載跳轉至不受信任的來源，請換一張照片。',502);
  response=await fetcher(downloadUrl,{redirect:'manual',headers:{'User-Agent':'WilliamPocketAtlas/1.0 (https://r3dra1n.github.io/GoogleMapList/)'},signal:AbortSignal.timeout(20000)});
  if(![301,302,303,307,308].includes(response.status))break;
  const location=response.headers.get('location');await response.body?.cancel();
  if(!location||redirects===3)throw new ApiError('圖片下載跳轉次數過多，請換一張照片。',502);
  downloadUrl=new URL(location,downloadUrl).href;
 }
 if(!response.ok||!['image/jpeg','image/png','image/webp'].includes(response.headers.get('content-type')?.split(';')[0]))throw new ApiError('Unable to download image',502);
 if(Number(response.headers.get('content-length'))>2500000)throw new ApiError('Image too large; choose another photo');
 const reader=response.body.getReader();let count=0,chunks=[];while(true){const {done,value}=await reader.read();if(done)break;count+=value.length;if(count>2500000){await reader.cancel();throw new ApiError('Image too large; choose another photo');}chunks.push(value);}
 stage='處理圖片';
 const bytes=new Uint8Array(count);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 const mime=response.headers.get('content-type').split(';')[0],ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[mime];
 const image=`uploads/commons-${body.pageId}-${crypto.randomUUID()}.${ext}`;data.image=image;data.imageAlt=alt;data.imageCredit=`${photo.artist} / ${photo.license}`;data.imageSource=photo.source;data.imageLicense=photo.licenseUrl;
 for(const suffix of ['Hans','En','Ja','Ko'])data['imageAlt'+suffix]='';
 stage='保存圖片到 GitHub';
 const imageBlob=await github('git/blobs',{content:toBase64(bytes),encoding:'base64'});const contentBlob=await github('git/blobs',{content:JSON.stringify(data,null,2)+'\n',encoding:'utf-8'});
 stage='提交封面修改';
 const parent=await github(`git/commits/${ref.object.sha}`);const tree=await github('git/trees',{base_tree:parent.tree.sha,tree:[{path:'public/'+image,mode:'100644',type:'blob',sha:imageBlob.sha},{path,mode:'100644',type:'blob',sha:contentBlob.sha}]});
 const commit=await github('git/commits',{message:`content: update Wikimedia cover for ${data.name}`,tree:tree.sha,parents:[ref.object.sha]});await github('git/refs/heads/main',{sha:commit.sha,force:false},'PATCH');
 return {ok:true,image,sha:contentBlob.sha,commit:commit.sha};
 }catch(error){if(error instanceof ApiError)throw error;console.error(JSON.stringify({operation:'photo-import',stage,type:error?.name||'Error'}));throw new ApiError(stage+'失敗，請稍後重試。',502);}
}
