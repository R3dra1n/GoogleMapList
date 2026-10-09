import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandler} from '../worker/index.mjs';
test('new CMS uploads and optimized images follow published editorial content without redeploy',async()=>{
 for(const path of ['/uploads/new-cover.jpg','/media/new-cover-480.webp','/assets/existing.jpg']){
  let requested;const response=await createHandler(async url=>{requested=url;return new Response('new image',{headers:{'Content-Type':'image/webp'}})})(new Request('https://site.example'+path),{ASSETS:{fetch(){throw Error('stale bundle must not be used')}}});
  assert.equal(requested,'https://r3dra1n.github.io/GoogleMapList'+path);assert.equal(await response.text(),'new image');assert.equal(response.headers.get('content-type'),'image/webp');
 }
});
test('editorial media falls back to bundled copy during upstream outage',async()=>{
 const response=await createHandler(async()=>new Response('',{status:503}))(new Request('https://site.example/media/old.webp'),{ASSETS:{fetch:async()=>new Response('bundled')}});assert.equal(await response.text(),'bundled');
});
