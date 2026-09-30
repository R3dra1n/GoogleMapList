import test from 'node:test';
import assert from 'node:assert/strict';
import {youtubeId,mapEntries,entryPlatform,validateCatalog} from '../public/catalog-model.js';
test('YouTube embed accepts recognized hosts and exact IDs, rejects disguised URLs',()=>{assert.equal(youtubeId('https://youtu.be/dQw4w9WgXcQ'),'dQw4w9WgXcQ');for(const url of ['https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ','javascript:alert(1)','https://user@youtube.com/watch?v=dQw4w9WgXcQ'])assert.equal(youtubeId(url),null);});
test('legacy map entries preserve popularity keys and an explicitly empty list stays empty',()=>{assert.deepEqual(mapEntries({food:'https://maps.app.goo.gl/test',myMap:'x'},'cities').map(x=>x.id),['food','myMap']);assert.deepEqual(mapEntries({food:'x',mapEntries:[]},'cities'),[]);assert.equal(entryPlatform('https://maps.apple.com/?q=Taipei'),'apple');});
test('catalog rejects missing author relations and invalid video input',()=>{const data={creators:[{id:'william',name:'William',published:true}],countries:[],cities:[],themes:[{id:'test',owner:'missing'}]};assert.throws(()=>validateCatalog(data),/創作者/);data.themes[0]={id:'test',videos:[{url:'https://example.com',start:0}]};assert.throws(()=>validateCatalog(data),/YouTube/);});

test('daily discovery is stable, independent of input order and rotates without duplicates',async()=>{
 const {dailySelection}=await import('../public/catalog-model.js');const pool=Array.from({length:23},(_,i)=>({key:'themes/'+i}));const day=new Date('2026-09-30T03:00:00Z');
 assert.deepEqual(dailySelection(pool,day),dailySelection([...pool].reverse(),day));
 assert.equal(new Set(dailySelection(pool,day).map(x=>x.key)).size,6);
 assert.notDeepEqual(dailySelection(pool,day),dailySelection(pool,new Date('2026-10-01T03:00:00Z')));
 assert.deepEqual(dailySelection([],day),[]);assert.equal(dailySelection(pool.slice(0,2),day).length,2);
});
