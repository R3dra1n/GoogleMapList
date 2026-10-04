import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {catalogItems} from '../public/catalog-model.js';
const escape=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function buildPages(data,preview){
 const template=await readFile('dist/index.html','utf8'),base='https://pocket-atlas-auth.huayang-hsu.workers.dev/';
 async function page(path,route,name,description,image){
  let html=template.replace('<html lang="zh-Hant">',`<html lang="zh-Hant" data-route="${escape(route)}">`).replace('<head>',`<head><base href="${path?'../'.repeat(path.split('/').filter(Boolean).length):'./'}">${preview?'<meta name="robots" content="noindex,nofollow"><script>window.ATLAS_PREVIEW=true;const originalFetch=window.fetch;window.fetch=(input,options={})=>{const method=options.method||(input instanceof Request?input.method:"GET");const target=new URL(input instanceof Request?input.url:input,location.href);const account=location.pathname.startsWith("/preview/")&&target.origin===location.origin&&target.pathname.startsWith("/account/api/");if(!account&&!["GET","HEAD"].includes(method.toUpperCase()))return Promise.reject(new Error("預覽版不送出或修改正式資料"));return originalFetch(input,options);};</script>':''}`);
  html=html.replace(/<title>.*?<\/title>/,`<title>${escape(name)}｜口袋地圖</title>`);
  const values={'description':description,'og:title':name,'og:description':description,'og:url':base+path,'og:site_name':'口袋地圖','og:image':base+(image||'assets/share-cover.jpg'),'og:image:alt':name,'twitter:title':name,'twitter:description':description,'twitter:image':base+(image||'assets/share-cover.jpg'),'twitter:image:alt':name};
  for(const [key,value] of Object.entries(values))html=html.replace(new RegExp(`(<meta (?:name|property)="${key}" content=")[^"]*(">)`),(_,a,b)=>a+escape(value)+b);
  html=html.replace(/(<link rel="canonical" href=")[^"]*/,(_,a)=>a+base+path);
  if(preview)html=html.replace('<body>',`<body><aside class="preview-banner">v${escape(data.applicationVersion)} · 整合預覽版 · 正式首頁尚未切換</aside>`);
  if(!preview&&process.env.SITE_DEPLOY_TARGET!=='worker')html=`<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>口袋地圖 v${escape(data.applicationVersion)}</title><link rel="canonical" href="${base+path}"><script>location.replace(${JSON.stringify(base+path)}+location.search+location.hash);</script><body><p>口袋地圖已更新至 v${escape(data.applicationVersion)}。</p><a href="${base+path}">前往口袋地圖</a></body></html>`;
  await mkdir('dist/'+path,{recursive:true});await writeFile('dist/'+path+'index.html',html);
 }
 await page('','#/','口袋地圖','分享你的口袋世界，跟著喜歡的人出發。');
 for(const item of catalogItems(data))await page(`lists/${item._kind}/${item._id}/`,`#/lists/${item._kind}/${item._id}`,item.name,item.description,item.image);
 for(const c of data.creators)await page(`creators/${c.id}/`,`#/creators/${c.id}`,c.name,c.description);
 if(preview)for(const file of ['index.html','tools.html']){try{await writeFile('dist/admin/'+file,'<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><title>預覽版管理後台</title><body style="font:18px system-ui;max-width:650px;margin:80px auto;padding:24px;color:#152945"><h1>預覽版不寫入正式資料</h1><p>新欄位與內容可在本機內容檔編輯後重新建置。正式管理後台仍維持目前版本。</p><a href="../">返回預覽首頁</a></body></html>');}catch{}}
}
