import { readdir, readFile, writeFile, mkdir, cp, rm, access } from 'node:fs/promises';
import { validate, visibleData, kinds } from '../public/model.js';
const data={};
for(const kind of kinds){data[kind]=await Promise.all((await readdir(`content/${kind}`)).filter(f=>f.endsWith('.json')).sort().map(async f=>{const entry=JSON.parse(await readFile(`content/${kind}/${f}`,'utf8'));if(f!==`${entry.id}.json`)throw new Error(`ID 與檔名不同：${f}`);return entry;}));}
validate(data);
for(const kind of kinds)for(const item of data[kind])if(item.image)await access(`public/${item.image}`);
await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});await cp('public','dist',{recursive:true});
await writeFile('dist/data.json',JSON.stringify({...visibleData(data),version:process.env.GITHUB_SHA||'local',builtAt:new Date().toISOString()}));
await writeFile('dist/.nojekyll','');
console.log(`Built ${data.cities.length} destinations → dist/`);
