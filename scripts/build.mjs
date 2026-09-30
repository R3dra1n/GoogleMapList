import {validateCatalog,publicCatalog} from '../public/catalog-model.js';
import {buildPages} from './pages.mjs';
import {optimizeImages} from './images.mjs';
import {createHash} from 'node:crypto';
import { readdir, readFile, writeFile, mkdir, cp, rm, access } from 'node:fs/promises';
import { validate, visibleData, kinds } from '../public/model.js';
const data={};
for(const kind of kinds){data[kind]=await Promise.all((await readdir(`content/${kind}`)).filter(f=>f.endsWith('.json')).sort().map(async f=>{const entry=JSON.parse(await readFile(`content/${kind}/${f}`,'utf8'));if(f!==`${entry.id}.json`)throw new Error(`ID 與檔名不同：${f}`);return entry;}));}
data.creators=await Promise.all((await readdir('content/creators')).filter(f=>f.endsWith('.json')).map(async f=>JSON.parse(await readFile('content/creators/'+f,'utf8'))));
data.featured=JSON.parse(await readFile('content/site.json','utf8')).featured;
validate(data);validateCatalog(data);
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
const pkg=JSON.parse(await readFile('package.json','utf8'));
const preview=pkg.version.includes('-');
const publicCreators=new Set(data.creators.filter(c=>c.published).map(c=>c.id));
const filtered={...data};for(const kind of ['countries','cities','themes'])filtered[kind]=data[kind].filter(c=>!c.owner||publicCreators.has(c.owner));
const payload={...visibleData(filtered),...publicCatalog(data),applicationVersion:pkg.version,version:process.env.GITHUB_SHA||'local-'+Date.now(),builtAt:new Date().toISOString()};
await writeFile('dist/data.json',JSON.stringify(payload));
await mkdir('dist/vendor',{recursive:true});await cp('node_modules/fuse.js/dist/fuse.mjs','dist/vendor/fuse.mjs');await cp('node_modules/fuse.js/LICENSE','dist/vendor/FUSE-LICENSE');
await buildPages(payload,preview);
if(preview){const admin=await readFile('dist/admin/index.html','utf8');await writeFile('dist/admin/index.html',admin.replace('<head>','<head><script>window.ATLAS_PREVIEW=true;</script>'));}
await writeFile('dist/.nojekyll','');
console.log(`Built ${data.cities.length} destinations → dist/`);
