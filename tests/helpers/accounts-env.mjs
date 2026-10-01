import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';
const schemas=await Promise.all(['0001_recommendations.sql','0003_usage_stats.sql','0005_creator_accounts.sql'].map(f=>readFile(new URL('../../worker/migrations/'+f,import.meta.url),'utf8')));
export function setup(){
 const db=new DatabaseSync(':memory:');for(const schema of schemas)db.exec(schema);
 const env={CREATOR_ACCOUNTS_ENABLED:'true',RATE_SALT:'test',RESEND_API_KEY:'test',LOGIN_EMAIL_FROM:'Atlas <login@example.com>',GOOGLE_LOGIN_CLIENT_ID:'test-client',GOOGLE_LOGIN_CLIENT_SECRET:'test-secret'};
 env.DB={prepare(sql){let args=[];return {
 bind(...values){args=values.map(v=>v instanceof ArrayBuffer?new Uint8Array(v):v);return this;},
 async first(){return db.prepare(sql).get(...args)||null;},
 async all(){return {results:db.prepare(sql).all(...args)};},
 async run(){return {meta:{changes:db.prepare(sql).run(...args).changes}};}
 };}};
 env.DB.batch=async statements=>{db.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());db.exec('COMMIT');return results}catch(e){db.exec('ROLLBACK');throw e}};
 return {env,db};
}
