import test from 'node:test';import assert from 'node:assert/strict';
import {setup} from './helpers/accounts-env.mjs';import {stats} from '../worker/stats.mjs';
import {readFile} from 'node:fs/promises';import vm from 'node:vm';
test('relation update tolerates missing state and refreshes changed options',async()=>{
 const source=await readFile('public/admin/admin.js','utf8');const body=source.match(/class ParentRelation[\s\S]*?\n}/)[0];
 const Parent=vm.runInNewContext(body+';ParentRelation',{relation:{control:class{shouldComponentUpdate(){return false}}}});const c=new Parent();
 assert.equal(c.shouldComponentUpdate({},undefined),false);assert.equal(c.shouldComponentUpdate({},{initialOptions:['a']}),true);
});
test('community popularity deduplicates visitors and rejects hidden profiles, lists and suspended authors',async()=>{
 const {env,db}=setup();env.PUBLIC_DATA_URL='https://community-stats.test/data.json';
 db.prepare('INSERT INTO creator_users(id,primary_email,created_at) VALUES(?,?,0)').run('alice','a@example.com');
 db.prepare('INSERT INTO pilot_profiles(user_id,creator_id,payload,published_at,visible) VALUES(?,?,?,?,1)').run('alice','alice','{}',1);
 db.prepare('INSERT INTO pilot_lists(id,user_id,draft,published,visible,updated_at) VALUES(?,?,?,?,1,0)').run('abc','alice','{}','{}');
 const id='community/abc/collection',visitor=crypto.randomUUID(),fetcher=async()=>Response.json({});
 const get=()=>stats(new Request('https://test/api/stats?ids='+id),env,fetcher);
 const post=()=>stats(new Request('https://test/api/stats',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,visitor,action:'use'})}),env,fetcher);
 assert.equal((await get()).items[0].used,0);assert.equal((await post()).used,1);assert.equal((await post()).used,1);
 for(const [table,key] of [['pilot_lists','visible'],['pilot_profiles','visible'],['creator_users','suspended']]){
 db.exec(`UPDATE ${table} SET ${key}=${key==='suspended'?1:0}`);await assert.rejects(get);await assert.rejects(post);db.exec(`UPDATE ${table} SET ${key}=${key==='suspended'?0:1}`);
 }
 db.close();
});
