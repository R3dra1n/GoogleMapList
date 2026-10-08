import test from 'node:test';import assert from 'node:assert/strict';
import {setup} from './helpers/accounts-env.mjs';import {api} from '../worker/api.mjs';
import {heroOptions} from '../public/admin/hero-picker.js';
test('member records require editor permission and count site membership separately from public profiles',async()=>{
 const {env,db}=setup();env.SITE_ORIGIN='https://cms.test';env.GITHUB_REPO='owner/repo';
 try{
 for(const [id,suspended,age]of [['alice',0,0],['bob',0,40],['carol',1,0]]){db.prepare('INSERT INTO creator_users VALUES(?,?,?,?)').run(id,id+'@example.test',suspended,Math.floor(Date.now()/1000)-age*86400);db.prepare('INSERT INTO creator_profiles(user_id,creator_id,name,updated_at) VALUES(?,?,?,1)').run(id,id,id.toUpperCase());}
 for(const id of ['alice','carol'])db.prepare("INSERT INTO pilot_profiles VALUES(?,?,?,1,1)").run(id,id,'{}');
 for(const id of ['alice','bob','carol'])db.prepare("INSERT INTO pilot_lists(id,user_id,draft,published,visible,version,updated_at) VALUES(?,?,?, ?,1,1,1)").run(id,id,'{}','{}');
 const req=(token,q='')=>new Request('https://worker.test/api/admin/members'+q,{headers:{Origin:env.SITE_ORIGIN,...(token?{Authorization:'Bearer '+token}:{})}});
 const editor=async()=>Response.json({permissions:{push:true}});
 assert.equal((await api(req(),env,editor)).status,401);
 assert.equal((await api(req('reader'),env,async()=>Response.json({permissions:{push:false}}))).status,403);
 const result=await (await api(req('editor'),env,editor)).json();
 assert.deepEqual(result.summary,{total:3,recent:2,suspended:1,publicCreators:1,publicLists:1});
 assert.equal(result.items.length,3);assert.equal(result.items.find(x=>x.id==='bob').publicLists,0);
 assert.equal((await (await api(req('editor','?q=ALICE'),env,editor)).json()).items.length,1);
 assert.equal((await api(req('editor','?offset=-1'),env,editor)).status,400);
 assert(!JSON.stringify(result).includes('csrf'));
 }finally{db.close();}
});
test('hero picker shows named editorial lists with covers without exposing community identities',()=>{
 const result=heroOptions({cities:[{id:'a',name:'花蓮',image:'a.jpg'},{id:'b',name:'空白'}],themes:[{id:'t',name:'咖啡',image:'t.jpg'}],community:[{_kind:'community',_id:'x',name:'User',image:'x.jpg'}]});
 assert.deepEqual(result.map(x=>x.value),['cities/a','themes/t']);assert.match(result[1].label,/咖啡/);
});
test('homepage save does not demand an author name or a content folder',async()=>{
 const {readFile}=await import('node:fs/promises');const {runInNewContext}=await import('node:vm');
 const source=await readFile(new URL('../public/admin/admin.js',import.meta.url),'utf8');
 const start=source.indexOf("handler:async({entry})=>{")+8,end=source.indexOf("\n}});",start);
 const handler=runInNewContext('('+source.slice(start,end)+'\n})',{readSession:()=>'',status:{textContent:''}});
 const home={heroList:'themes/coffee',destinations:['taiwan']};
 const data={get:key=>key==='home'?{toJS:()=>home}:undefined};
 assert.equal(await handler({entry:{get:key=>key==='data'?data:'homepage'}}),data);
});
