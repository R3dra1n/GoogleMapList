import test from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {readFile} from 'node:fs/promises';
import {searchPhotos} from '../worker/photos.mjs';import {api} from '../worker/api.mjs';import {reserve} from '../worker/usage.mjs';import {reserveTranslation} from '../scripts/translation-budget.mjs';import {previewDescription,fetchDescription,importDescription} from '../worker/import-description.mjs';
const schemas=await Promise.all(['0001_recommendations','0002_notifications','0003_usage_stats','0004_cost_monitor'].map(n=>readFile(new URL('../worker/migrations/'+n+'.sql',import.meta.url),'utf8')));
function env(){const db=new DatabaseSync(':memory:');schemas.forEach(s=>db.exec(s));return {SITE_ORIGIN:'https://site.test',RATE_SALT:'test',PUBLIC_DATA_URL:'https://site.test/data.json',GITHUB_REPO:'owner/repo',DB:{prepare(sql){const stmt=db.prepare(sql);let args=[];return {bind(...a){args=a;return this},async first(){return stmt.get(...args)||null},async all(){return {results:stmt.all(...args)}},async run(){return stmt.run(...args)}}}}}}
const request=(path,body,headers={})=>new Request('https://worker.test'+path,{method:body?'POST':'GET',headers:{Origin:'https://site.test','Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1',...headers},...(body?{body:JSON.stringify(body)}:{})});
const fixture={cities:[{id:'busan',food:'https://maps.app.goo.gl/test',sights:'https://maps.app.goo.gl/test',published:true}],themes:[]};
const fetcher=async()=>Response.json(fixture);
test('popularity counts distinct browsers and rejects removed save actions',async()=>{
 const e=env(),body={id:'cities/busan/food',visitor:crypto.randomUUID(),action:'use'};
 const post=async change=>{const response=await api(request('/api/stats',{...body,...change}),e,fetcher);assert.equal(response.status,200);return response.json()};
 assert.equal((await post()).used,1);assert.equal((await post()).used,1);
 assert.equal((await post({visitor:crypto.randomUUID()})).used,2);
 const totals=await (await api(request('/api/stats?ids=cities/busan/food'),e,fetcher)).json();assert.equal(totals.items[0].used,2);assert.equal('saved' in totals.items[0],false);
 for(const action of ['save','unsave'])assert.equal((await api(request('/api/stats',{...body,action}),e,fetcher)).status,400);
 assert.equal((await api(request('/api/stats',{...body,id:'cities/private/food'}),e,fetcher)).status,400);
 assert.equal((await api(request('/api/stats',body,{Origin:'https://evil.test'}),e,fetcher)).status,403);
 for(let i=0;i<60;i++)await api(request('/api/stats',body),e,fetcher);
 assert.equal((await api(request('/api/stats',body),e,fetcher)).status,429);
});
test('daily reservation is atomic and admin metrics require write permission',async()=>{
 const e=env();const results=await Promise.allSettled(Array.from({length:6},()=>reserve(e,'test',3)));assert.equal(results.filter(r=>r.status==='fulfilled').length,3);
 assert.equal((await api(request('/api/admin/usage'),e,fetcher)).status,401);
 assert.equal((await api(request('/api/admin/usage',null,{Authorization:'Bearer test'}),e,async()=>Response.json({permissions:{push:false}}))).status,403);
});
test('translation reservations survive failed runs and reset at the month boundary',()=>{
 const state=reserveTranslation({},399999,'2026-09');assert.equal(state.months['2026-09'].confirmedCharacters,0);
 assert.throws(()=>reserveTranslation(state,2,'2026-09'),/預算/);assert.equal(reserveTranslation(state,2,'2026-10').months['2026-10'].reservedCharacters,2);
});
const photo=id=>({pageid:id,index:id,title:'File:Photo.jpg',imageinfo:[{mime:'image/jpeg',thumburl:'https://upload.wikimedia.org/wikipedia/commons/a/ab/photo.jpg',extmetadata:{Artist:{value:'Photographer'},LicenseShortName:{value:'CC BY 4.0'},LicenseUrl:{value:'https://creativecommons.org/licenses/by/4.0/'}}}]});
test('Wikimedia pagination exposes continuation even for completely filtered pages',async()=>{
 const calls=[];const f=async url=>{calls.push(new URL(url));return Response.json(calls.length===1?{query:{pages:[{pageid:1}]},continue:{gsroffset:50}}:{query:{pages:[photo(2),photo(2),photo(3)]}})};
 const first=await searchPhotos('Hong Kong',f);assert.equal(first.items.length,0);assert.equal(first.nextOffset,50);const second=await searchPhotos('Hong Kong',f,50);assert.equal(second.items.length,2);assert.equal(second.nextOffset,null);assert.equal(calls[1].searchParams.get('gsroffset'),'50');assert.equal(calls[0].searchParams.get('iiurlwidth'),'320');assert.equal(calls[0].searchParams.get('gsrlimit'),'50');
 await assert.rejects(()=>searchPhotos('HK',async()=>Response.json({error:{code:'failed'}})),/failed/);await assert.rejects(()=>searchPhotos('HK',f,-1),/Invalid/);
});
test('description previews reject boilerplate and unsafe redirects; manual content is protected',async()=>{
 assert.equal(previewDescription('<meta property="og:description" content="Find local businesses, view maps and get driving directions in Google Maps.">'),'');
 assert.equal(previewDescription('<meta content="Coffee &amp; walks" property="og:description">'),'Coffee & walks');
 let calls=0;await assert.rejects(()=>fetchDescription('https://maps.app.goo.gl/test',async()=>{calls++;return new Response(null,{status:302,headers:{location:'https://evil.test'}})}),/跳轉/);assert.equal(calls,1);
 let writes=0;const data={id:'busan',food:'https://maps.app.goo.gl/test',description:'Manual text'};const github=async(path,body)=>{if(body){writes++;return {commit:{sha:'commit'}}}return {sha:'old',content:btoa(JSON.stringify(data))}};
 const body={mode:'save',kind:'cities',id:'busan',source:data.food,text:'Copied text',confirmed:true,expectedSha:'old',method:'manual-copy'};
 await assert.rejects(()=>importDescription(request('/x',body),github,fetcher),/已有簡介/);assert.equal(writes,0);
 data.description='';await assert.rejects(()=>importDescription(request('/x',{...body,expectedSha:'stale'}),github,fetcher),e=>e.status===409);
 const capture=async(path,b)=>{if(b){const saved=JSON.parse(Buffer.from(b.content,'base64'));assert.equal(saved.descriptionSource,data.food);assert.equal(saved.description,'Copied text');return {commit:{sha:'commit'}}}return github(path)};
 assert.equal((await importDescription(request('/x',body),capture,fetcher)).ok,true);
});
