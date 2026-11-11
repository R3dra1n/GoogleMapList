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

test('legacy workers.dev public pages redirect to the custom domain while API and account routes stay', async()=>{
 const handler=createHandler(async()=>new Response('{}'));const env={ASSETS:{fetch:async()=>new Response('asset')}};
 const moved=await handler(new Request('https://pocket-atlas-auth.huayang-hsu.workers.dev/lists/cities/busan/?x=1'),env);
 assert.equal(moved.status,301);assert.equal(moved.headers.get('location'),'https://mapspot.hellohsu.com/lists/cities/busan/?x=1');
 assert.equal((await handler(new Request('https://pocket-atlas-auth.huayang-hsu.workers.dev/health'),env)).status,200);
 assert.equal((await handler(new Request('https://pocket-atlas-auth.huayang-hsu.workers.dev/account/'),env)).status===301,false);
 assert.equal((await handler(new Request('https://mapspot.hellohsu.com/'),env)).status,200);
});

test('static files revalidate while images are cached',async()=>{
 const env={ASSETS:{fetch:async()=>new Response('x',{headers:{'Cache-Control':'no-store'}})}};const handler=createHandler(async()=>new Response('{}'));
 assert.equal((await handler(new Request('https://mapspot.hellohsu.com/app.js'),env)).headers.get('cache-control'),'public, max-age=0, must-revalidate');
 assert.equal((await handler(new Request('https://mapspot.hellohsu.com/icon-192.png'),env)).headers.get('cache-control'),'public, max-age=86400');
});
