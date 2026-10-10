// One-off release backfill. Imports only public sources; never overwrites a saved snapshot.
import {readFile,writeFile} from 'node:fs/promises';
import {mapEntries} from '../public/catalog-model.js';
import {sourceURL,readSource} from '../worker/saved-places.mjs';
const output=process.argv[2];if(!output)throw Error('Provide an output SQL path');
const data=JSON.parse(await readFile(new URL('../dist/data.json',import.meta.url),'utf8'));
const sources=['cities','countries','themes'].flatMap(kind=>(data[kind]||[]).flatMap(item=>mapEntries(item,kind).map(e=>e.url)));
for(let page=0;page<100;page++){const response=await fetch('https://pocket-atlas-auth.huayang-hsu.workers.dev/account/api/pilot/feed?page='+page);if(!response.ok)throw Error('Public feed unavailable');const result=await response.json();sources.push(...result.items.map(x=>x.url));if(!result.hasMore)break;}
const quote=x=>"'"+String(x).replaceAll("'","''")+"'",sql=[];let ready=0,failed=0;
for(const source of new Set(sources.map(sourceURL).filter(Boolean))){const time=Math.floor(Date.now()/1000);try{const snapshot=await readSource(source);if(snapshot.complete===false||(!snapshot.places.length&&snapshot.total!==0))throw Error('Incomplete');sql.push(`INSERT INTO saved_map_places(source_url,state,payload,fetched_at,queued_at) VALUES(${quote(source)},'ready',${quote(JSON.stringify(snapshot))},${time},${time}) ON CONFLICT(source_url) DO UPDATE SET state='ready',payload=excluded.payload,fetched_at=excluded.fetched_at,error='',lease_until=0 WHERE saved_map_places.payload IS NULL;`);ready++;console.log('Saved',snapshot.places.length,'places');}catch{sql.push(`INSERT INTO saved_map_places(source_url,queued_at) VALUES(${quote(source)},${time}) ON CONFLICT(source_url) DO NOTHING;`);failed++;console.log('Queued unavailable source');}}
await writeFile(output,sql.join('\n')+'\n');console.log(JSON.stringify({ready,queued:failed,total:ready+failed}));
