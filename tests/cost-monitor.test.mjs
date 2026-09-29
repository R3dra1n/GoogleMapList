import test from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {readFile} from 'node:fs/promises';
import {readCloudflare,readResend} from '../worker/provider-usage.mjs';
import {alertsFor,monitorSnapshot,monitorSettings,sendUsageAlerts} from '../worker/cost-monitor.mjs';
const schemas=await Promise.all(['0001_recommendations','0003_usage_stats','0004_cost_monitor'].map(n=>readFile(new URL('../worker/migrations/'+n+'.sql',import.meta.url),'utf8')));
function environment(){const db=new DatabaseSync(':memory:');schemas.forEach(s=>db.exec(s));return {RESEND_API_KEY:'test',NOTIFICATION_EMAIL:'owner@example.com',DB:{prepare(sql){const stmt=db.prepare(sql);let args=[];return {bind(...a){args=a;return this},async first(){return stmt.get(...args)||null},async all(){return {results:stmt.all(...args)}},async run(){return stmt.run(...args)}}}}};}
const env={CF_USAGE_TOKEN:'private',CF_ACCOUNT_ID:'test-account'};
test('provider usage preserves unknowns, real zeros, CPU units and API failures',async()=>{
 assert.equal((await readCloudflare({},'workers','day')).status,'not_configured');
 const response=body=>async()=>Response.json(body);
 const cf=async body=>readCloudflare(env,'workers','day',response(body));
 assert.equal((await cf({errors:[{message:'private'}]})).status,'unavailable');
 assert.equal((await cf({data:{viewer:{accounts:[{workersInvocationsAdaptive:[]}]}}})).status,'no_data');
 assert.equal((await cf({data:{viewer:{accounts:[{workersInvocationsAdaptive:[{sum:{requests:0,cpuTimeUs:0}}]}]}}})).metrics[0].value,0);
 assert.equal((await cf({data:{viewer:{accounts:[{workersInvocationsAdaptive:[{sum:{requests:0}}]}]}}})).status,'unavailable');
 const r=await readResend({RESEND_API_KEY:'test'},response({emails:{daily:{used:80,limit:100,resets_at:'2026-09-30'},monthly:{used:200,limit:3000,resets_at:'2026-10-01'}}}));assert.equal(r.metrics[0].referenceLimit,100);assert.equal(r.metrics[1].value,200);
 assert.equal((await readResend({RESEND_API_KEY:'test'},async()=>new Response('',{status:403}))).status,'unavailable');
});
test('warnings use known metrics only, escalate and deduplicate by period',()=>{
 const snapshot={checkedAt:'2026-09-29T05:00:00Z',providers:{test:{status:'ok',period:'day',source:'provider',scope:'account',metrics:[{key:'n',label:'Usage',value:80,referenceLimit:100,unit:'requests'}]},unknown:{status:'unavailable',metrics:[]}}};
 const a=alertsFor(snapshot);assert.equal(a.length,1);assert.equal(a[0].level,80);assert.equal(alertsFor(snapshot)[0].id,a[0].id);
 snapshot.providers.test.metrics[0].value=99;assert.equal(alertsFor(snapshot)[0].level,95);snapshot.providers.test.metrics[0].value=100;assert.equal(alertsFor(snapshot)[0].level,100);
 snapshot.providers.test.metrics[0].referenceLimit=null;assert.deepEqual(alertsFor(snapshot),[]);
});
test('snapshot caches provider calls; alerts require opt in and send idempotently',async()=>{
 const e=environment();let providerCalls=0,emails=0;
 const f=async(url,options)=>{
  if(url==='https://api.resend.com/usage'){providerCalls++;return Response.json({emails:{daily:{used:80,limit:100,resets_at:'2026-10-01'},monthly:{used:80,limit:3000,resets_at:'2026-10-01'}}})}
  if(String(url).includes('raw.githubusercontent.com'))return Response.json({months:{[new Date().toISOString().slice(0,7)]:{reservedCharacters:0,confirmedCharacters:0}}});
  if(url==='https://api.resend.com/emails'){emails++;assert.ok(options.headers['Idempotency-Key'].startsWith('usage-'));assert.deepEqual(JSON.parse(options.body).to,['owner@example.com']);return Response.json({id:'email-test'})}
  throw Error('unexpected provider');
 };
 const first=await monitorSnapshot(e,f);assert.equal(first.warnings.length,1);await monitorSnapshot(e,f);assert.equal(providerCalls,1);
 await sendUsageAlerts(e,f);assert.equal(emails,0);
 await monitorSettings(new Request('https://test/settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({emailEnabled:true})}),e);
 await Promise.all([sendUsageAlerts(e,f),sendUsageAlerts(e,f)]);assert.equal(emails,1);await sendUsageAlerts(e,f);assert.equal(emails,1);
});
