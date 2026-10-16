import test from 'node:test';
import assert from 'node:assert/strict';
import {mapEntries,youtubeId} from '../public/catalog-model.js';
import {myMapId} from '../public/model.js';
test('published personal media maps to detail page video and My Maps entries, including legacy lists',async()=>{
 const previousFetch=globalThis.fetch,previousLocation=globalThis.location;
 globalThis.location={hostname:'pocket-atlas-auth.huayang-hsu.workers.dev',pathname:'/'};
 const media={id:'a',title:'Trip',url:'https://maps.app.goo.gl/example',creator:{id:'alice',name:'Alice'},myMapsUrl:'https://www.google.com/maps/d/viewer?mid=abcdefghijklmno',youtubeUrl:'https://youtu.be/J5vKPysXJTw'};
 globalThis.fetch=async path=>Response.json({items:path.includes('creators')?[]:[media,{...media,id:'legacy',myMapsUrl:undefined,youtubeUrl:undefined}],hasMore:false});
 try{const {communityData}=await import('../public/community-data.js');const {community}=await communityData();assert.equal(youtubeId(community[0].videos[0].url),'J5vKPysXJTw');assert.equal(myMapId(mapEntries(community[0],'community')[1].url),'abcdefghijklmno');assert.equal(community[1].videos.length,0);assert.equal(community[1].mapEntries.length,1);}finally{globalThis.fetch=previousFetch;if(previousLocation===undefined)delete globalThis.location;else globalThis.location=previousLocation;}
});
