import test from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {readFile} from 'node:fs/promises';
import {sendNotifications,notificationStatus} from '../worker/notifications.mjs';
import {api} from '../worker/api.mjs';import {photoCandidate,importPhoto} from '../worker/photos.mjs';
const schema=await readFile(new URL('../worker/migrations/0001_recommendations.sql',import.meta.url),'utf8');
const notificationSchema=await readFile(new URL('../worker/migrations/0002_notifications.sql',import.meta.url),'utf8');
function environment(){
 const db=new DatabaseSync(':memory:');db.exec(schema);db.exec(notificationSchema);
 return {SITE_ORIGIN:'https://owner.github.io',GITHUB_REPO:'owner/repo',RATE_SALT:'test-only',DB:{
  prepare(sql){
   const stmt=db.prepare(sql);let args=[];
   return {
    bind(...values){args=values;return this;},
    async first(){return stmt.get(...args)||null;},
    async all(){return {results:stmt.all(...args)};},
    async run(){return {meta:{changes:stmt.run(...args).changes}};}
   };
  }
 }};
}
const payload=()=>({id:crypto.randomUUID(),country:'台灣',city:'花蓮',name:'測試景點',category:'sights',mapUrl:'https://maps.app.goo.gl/abc123',reason:'海景',email:'reader@example.com',consent:true});
const request=(path,method='GET',body,extra={})=>new Request('https://auth.example'+path,{method,headers:{Origin:'https://owner.github.io',...(body?{'Content-Type':'application/json'}:{}),...extra},...(body?{body:JSON.stringify(body)}:{})});
const writer=async()=>Response.json({permissions:{push:true}});
test('recommendations are private, validated, idempotent and editable only with write permission',async()=>{
 const env=environment(),item=payload();const submit=()=>api(request('/api/recommendations','POST',item,{'CF-Connecting-IP':'192.0.2.1'}),env,writer);
 assert.equal((await submit()).status,201);assert.equal((await submit()).status,201);
 assert.equal((await api(request('/api/admin/recommendations'),env,writer)).status,401);
 assert.equal((await api(request('/api/admin/recommendations','GET',null,{Authorization:'Bearer read-only'}),env,async()=>Response.json({permissions:{push:false}}))).status,403);
 const list=await (await api(request('/api/admin/recommendations','GET',null,{Authorization:'Bearer editor'}),env,writer)).json();assert.equal(list.items.length,1);assert.equal(list.items[0].email,item.email);
 assert.equal((await api(request('/api/admin/recommendations','PATCH',{id:item.id,status:'accepted'},{Authorization:'Bearer editor'}),env,writer)).status,200);
 assert.equal((await (await api(request('/api/admin/recommendations','GET',null,{Authorization:'Bearer editor'}),env,writer)).json()).items.length,0);
 assert.equal((await api(request('/api/admin/recommendations','DELETE',{id:item.id},{Authorization:'Bearer editor'}),env,writer)).status,200);
 assert.equal((await api(request('/api/recommendations','POST',{...payload(),mapUrl:'javascript:alert(1)'},{'CF-Connecting-IP':'192.0.2.1'}),env,writer)).status,400);
});
test('origin, consent, size, honeypot and rate controls fail closed',async()=>{
 const env=environment();assert.equal((await api(request('/api/recommendations','POST',payload(),{Origin:'https://evil.test'}),env,writer)).status,403);
 assert.equal((await api(request('/api/recommendations','POST',{...payload(),consent:false},{'CF-Connecting-IP':'192.0.2.2'}),env,writer)).status,400);
 assert.equal((await api(request('/api/recommendations','POST',{...payload(),reason:'x'.repeat(15000)},{'CF-Connecting-IP':'192.0.2.2'}),env,writer)).status,413);
 assert.equal((await api(request('/api/recommendations','POST',{...payload(),website:'bot'},{'CF-Connecting-IP':'192.0.2.2'}),env,writer)).status,201);
 for(let i=0;i<5;i++)assert.equal((await api(request('/api/recommendations','POST',payload(),{'CF-Connecting-IP':'192.0.2.2'}),env,writer)).status,201);
 assert.equal((await api(request('/api/recommendations','POST',payload(),{'CF-Connecting-IP':'192.0.2.2'}),env,writer)).status,429);
 const cors=await api(request('/api/admin/recommendations','OPTIONS'),env,writer);assert.equal(cors.headers.get('Access-Control-Allow-Origin'),env.SITE_ORIGIN);
});
const photo={pageid:123,title:'File:Coast.jpg',imageinfo:[{mime:'image/jpeg',thumburl:'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Coast.jpg/960px-Coast.jpg',extmetadata:{Artist:{value:'<a href="https://example.com">Photographer</a>'},LicenseShortName:{value:'CC BY-SA 4.0'},LicenseUrl:{value:'https://creativecommons.org/licenses/by-sa/4.0/'}}}]};
test('Wikimedia candidates require supported images, a trusted host and a verified license URL',()=>{
 assert.equal(photoCandidate(photo).artist,'Photographer');const bad=structuredClone(photo);bad.imageinfo[0].extmetadata.LicenseUrl.value='https://example.com/license';assert.equal(photoCandidate(bad),null);bad.imageinfo[0].extmetadata.LicenseUrl.value='https://creativecommons.org/licenses/by/4.0/';bad.imageinfo[0].thumburl='https://evil.test/image.jpg';assert.equal(photoCandidate(bad),null);
});
test('photo import atomically commits image, attribution and content without force pushing',async()=>{
 const calls=[];const body={kind:'cities',id:'coast',expectedSha:'old-blob',pageId:123,alt:'海岸風景'};
 const github=async(path,data,method)=>{calls.push({path,data,method});if(path==='git/ref/heads/main')return {object:{sha:'head'}};if(path.startsWith('contents/'))return {sha:'old-blob',content:btoa(JSON.stringify({id:'coast',name:'Coast',imageAltEn:'Old caption'}))};if(path==='git/commits/head')return {tree:{sha:'base-tree'}};if(path==='git/trees')return {sha:'tree'};if(path==='git/commits')return {sha:'commit'};if(path==='git/blobs')return {sha:'blob-'+calls.length};return {};};
 const fetcher=async url=>String(url).includes('w/api.php')?Response.json({query:{pages:[photo]}}):new Response(new Uint8Array([255,216,255,217]),{headers:{'Content-Type':'image/jpeg'}});
 const result=await importPhoto(request('/api/admin/photos/import','POST',body),github,fetcher);assert.equal(result.commit,'commit');const content=JSON.parse(calls.find(x=>x.path==='git/blobs'&&x.data.encoding==='utf-8').data.content);assert.equal(content.imageCredit,'Photographer / CC BY-SA 4.0');assert.equal(content.imageAltEn,'');assert.equal(content.imageAlt,'海岸風景');assert.equal(calls.at(-1).data.force,false);assert.equal(calls.find(x=>x.path==='git/trees').data.tree.length,2);
 let downloaded=[];
 const redirected=async(url,opts)=>{if(String(url).includes('w/api.php'))return fetcher(url);downloaded.push(url);assert.equal(opts.redirect,'manual');return downloaded.length===1?new Response(null,{status:302,headers:{Location:'https://thumb.wikimedia.org/wikipedia/commons/Coast.jpg'}}):fetcher(url);};
 await importPhoto(request('/api/admin/photos/import','POST',body),github,redirected);assert.equal(downloaded.length,2);
 downloaded=[];calls.length=0;const hostile=async url=>{if(String(url).includes('w/api.php'))return fetcher(url);downloaded.push(url);return new Response(null,{status:302,headers:{Location:'https://evil.test/steal'}});};
 await assert.rejects(()=>importPhoto(request('/api/admin/photos/import','POST',body),github,hostile),/不受信任/);assert.equal(downloaded.length,1);assert.ok(!calls.some(x=>x.path==='git/blobs'));
 calls.length=0;await assert.rejects(()=>importPhoto(request('/api/admin/photos/import','POST',{...body,expectedSha:'outdated'}),github,fetcher),e=>e.status===409);assert.ok(!calls.some(x=>x.path==='git/blobs'));
});

test('only place name and consent are required; optional links still validated',async()=>{
 const env=environment(),headers={'CF-Connecting-IP':'192.0.2.9'};
 const minimal={id:crypto.randomUUID(),name:'推薦地點',consent:true};
 assert.equal((await api(request('/api/recommendations','POST',minimal,headers),env,writer)).status,201);
 for(const change of [{name:'   '},{mapUrl:'https://evil.test/'},{email:'invalid'}])assert.equal((await api(request('/api/recommendations','POST',{...minimal,id:crypto.randomUUID(),...change},headers),env,writer)).status,400);
});

test('notification outbox keeps recommendations private, retries and avoids duplicate delivery',async()=>{
 const env=environment(),item=payload();await api(request('/api/recommendations','POST',item,{'CF-Connecting-IP':'192.0.2.3'}),env,writer);
 let calls=[];const provider=async(url,opts)=>{calls.push({url,opts});return calls.length===1?new Response('',{status:503}):Response.json({id:'mail-123'});};
 await sendNotifications(env,provider,100);assert.equal(calls.length,0);
 Object.assign(env,{RESEND_API_KEY:'test-secret',NOTIFICATION_EMAIL:'owner@example.com'});
 await sendNotifications(env,provider,100);assert.equal((await notificationStatus(env)).counts.pending,1);
 await sendNotifications(env,provider,101);assert.equal(calls.length,1);
 await Promise.all([sendNotifications(env,provider,3700),sendNotifications(env,provider,3700)]);assert.equal(calls.length,2);assert.equal((await notificationStatus(env)).counts.sent,1);
 const mail=JSON.parse(calls[1].opts.body);assert.deepEqual(mail.to,['owner@example.com']);assert.ok(!mail.text.includes(item.email));assert.ok(!mail.text.includes(item.reason));assert.equal(calls[0].opts.headers['Idempotency-Key'],calls[1].opts.headers['Idempotency-Key']);
 await sendNotifications(env,provider,8000);assert.equal(calls.length,2);
 await api(request('/api/admin/recommendations','DELETE',{id:item.id},{Authorization:'Bearer editor'}),env,writer);assert.deepEqual((await notificationStatus(env)).counts,{});
});
