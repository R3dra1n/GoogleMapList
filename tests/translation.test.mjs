import test from 'node:test';import assert from 'node:assert/strict';
import {translateEntries,planTranslations,decodeTranslation} from '../scripts/translate-content.mjs';
const entries=()=>[{path:'cities/test.json',data:{name:'花蓮',description:'看海',english:'Hualien'}}];
function mock(calls){return async(url,options)=>{calls.push({url,...options});const body=JSON.parse(options.body);return Response.json({data:{translations:body.q.map(q=>({translatedText:`${body.target}:${q}`}))}});};}
test('persists four languages in actual CMS fields, preserves manual translations, never translates links',async()=>{
 const data=entries();data[0].data.food='https://maps.app.goo.gl/example';const calls=[];const out=await translateEntries(data,{}, {apiKey:'test-key',fetcher:mock(calls)});
 assert.equal(data[0].data.english,'Hualien');assert.equal(data[0].data.nameJa,'ja:花蓮');assert.equal(data[0].data.descriptionKo,'ko:看海');assert.equal(calls.length,4);
 assert.ok(calls.every(c=>!c.body.includes('https://maps')));assert.ok(calls.every(c=>JSON.parse(c.body).model==='nmt'));assert.equal(out.characters,14);
 const secondCalls=[];const repeat=await translateEntries(data,out.state,{apiKey:'test-key',fetcher:mock(secondCalls)});assert.equal(repeat.characters,0);assert.equal(secondCalls.length,0);
});
test('updates changed machine translations and protects human corrections',async()=>{
 const data=entries();const first=await translateEntries(data,{}, {apiKey:'key',fetcher:mock([])});data[0].data.descriptionJa='人工修正';data[0].data.description='登山';const calls=[];const next=await translateEntries(data,first.state,{apiKey:'key',fetcher:mock(calls)});
 assert.equal(data[0].data.descriptionJa,'人工修正');assert.equal(data[0].data.descriptionKo,'ko:登山');assert.equal(next.characters,6);
 data[0].data.description='';await translateEntries(data,next.state,{apiKey:'key',fetcher:mock([])});assert.equal(data[0].data.descriptionKo,'');assert.equal(data[0].data.descriptionJa,'人工修正');
});
test('deduplicates identical phrases and restores cleared translations from cache without API calls',async()=>{
 const data=entries();data.push({path:'cities/other.json',data:{name:'花蓮',description:'看海',english:'Hualien'}});const first=await translateEntries(data,{}, {apiKey:'key',fetcher:mock([])});assert.equal(first.characters,14);data[1].data.descriptionJa='';
 const plan=planTranslations(data,first.state);assert.equal(plan.characters,0);assert.equal(data[1].data.descriptionJa,'ja:看海');
});
test('rejects over-limit text and API failures without exposing credentials',async()=>{
 let calls=0;const fetcher=async()=>{calls++;throw Error('secret-key');};await assert.rejects(()=>translateEntries(entries(),{},{apiKey:'secret-key',maxCharacters:1,fetcher}),/未呼叫 Google/);assert.equal(calls,0);
 const data=entries();data[0].data.article='字'.repeat(5001);await assert.rejects(()=>translateEntries(data,{},{apiKey:'secret-key',fetcher}),/5,000/);assert.equal(calls,0);
 await assert.rejects(()=>translateEntries(entries(),{},{apiKey:'secret-key',fetcher}),e=>!e.message.includes('secret-key'));
 await assert.rejects(()=>translateEntries(entries(),{},{apiKey:'key',fetcher:async()=>new Response('',{status:403})}),/HTTP 403/);
 await assert.rejects(()=>translateEntries(entries(),{},{apiKey:'key',fetcher:async()=>Response.json({data:{translations:[]}})}),/不完整/);
});
test('decodes Google HTML entities once, retaining literal text',()=>{assert.equal(decodeTranslation('Tom &amp; Jerry &#39;海&#39; &#x1F30D;'),'Tom & Jerry \'海\' 🌍');assert.equal(decodeTranslation('&amp;lt;script&amp;gt;'),'&lt;script&gt;');});
