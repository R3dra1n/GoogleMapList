import {optimizeImages} from './images.mjs';
import {createHash} from 'node:crypto';
import { readdir, readFile, writeFile, mkdir, cp, rm, access } from 'node:fs/promises';
import { validate, visibleData, kinds } from '../public/model.js';
const data={};
for(const kind of kinds){data[kind]=await Promise.all((await readdir(`content/${kind}`)).filter(f=>f.endsWith('.json')).sort().map(async f=>{const entry=JSON.parse(await readFile(`content/${kind}/${f}`,'utf8'));if(f!==`${entry.id}.json`)throw new Error(`ID 與檔名不同：${f}`);return entry;}));}
validate(data);
let translationState={};try{translationState=JSON.parse(await readFile('translation/state.json','utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
for(const kind of kinds)for(const item of data[kind]){
 item._machineFields=[];
 for(const [key,value] of Object.entries(item))if(typeof value==='string'){
  const record=translationState.fields?.[`content/${kind}/${item.id}.json:${key}`];
  if(record&&record.output===createHash('sha256').update(value).digest('hex'))item._machineFields.push(key);
 }
}

for(const kind of kinds)for(const item of data[kind])if(item.image)await access(`public/${item.image}`);
await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});await cp('public','dist',{recursive:true});
await optimizeImages(data);
await writeFile('dist/data.json',JSON.stringify({...visibleData(data),version:process.env.GITHUB_SHA||'local',builtAt:new Date().toISOString()}));
await writeFile('dist/.nojekyll','');
console.log(`Built ${data.cities.length} destinations → dist/`);
