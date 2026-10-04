import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandler} from '../worker/index.mjs';
test('production serves homepage, preserves CMS origin and reads released editorial updates',async()=>{
 const env={ASSETS:{fetch:async()=>new Response('bundled')}};
 const handle=createHandler(async()=>Response.json({applicationVersion:'1.2.0',cities:[]}));
 assert.equal(await (await handle(new Request('https://site.test/'),env)).text(),'bundled');
 assert.equal((await handle(new Request('https://site.test/admin/'),env)).headers.get('location'),'https://r3dra1n.github.io/GoogleMapList/admin/');
 assert.equal((await (await handle(new Request('https://site.test/data.json'),env)).json()).applicationVersion,'1.2.0');
 const fallback=createHandler(async()=>{throw Error('offline')});
 assert.equal(await (await fallback(new Request('https://site.test/data.json'),env)).text(),'bundled');
});
