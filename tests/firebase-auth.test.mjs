import test from 'node:test';import assert from 'node:assert/strict';
import {generateKeyPair,exportJWK,SignJWT} from 'jose';
import {verifyFirebase} from '../worker/firebase-auth.mjs';import {accounts} from '../worker/accounts.mjs';import {setup} from './helpers/accounts-env.mjs';
const {privateKey,publicKey}=await generateKeyPair('RS256');const jwk={...await exportJWK(publicKey),kid:'test-key',alg:'RS256',use:'sig'};
const project='test-project',time=()=>Math.floor(Date.now()/1000);
const envConfig={AUTH_PROVIDER:'firebase',FIREBASE_PROJECT_ID:project,FIREBASE_API_KEY:'test-key',FIREBASE_APP_ID:'test-app'};
async function token(changes={}){return new SignJWT({email:'alice@example.com',email_verified:true,auth_time:time(),firebase:{sign_in_provider:'google.com'},iss:'https://securetoken.google.com/'+project,aud:project,sub:'alice-uid',iat:time(),exp:time()+3600,...changes}).setProtectedHeader({alg:'RS256',kid:'test-key'}).sign(privateKey);}
function provider(changes={}){return async url=>url.includes('/jwk/')?Response.json({keys:[jwk]}):Response.json({users:[{localId:'alice-uid',email:'alice@example.com',emailVerified:true,...changes}]});}
const request=(path,data,headers={})=>new Request('https://auth.example.com/account/api/'+path,{method:data?'POST':'GET',headers:{Origin:'https://auth.example.com',...headers},...(data?{body:JSON.stringify(data)}:{})});
test('Firebase verifies signature, issuer, audience, time, email and provider',async()=>{
 assert.equal((await verifyFirebase(await token(),envConfig,provider())).uid,'alice-uid');
 // Sign each negative token rather than merely passing a promise.
 for(const claims of [{aud:'other-project'},{iss:'https://evil.test'},{exp:time()-1},{iat:time()+100},{auth_time:time()-600},{email_verified:false},{sub:''},{firebase:{sign_in_provider:'anonymous'}}]){const t=await token(claims);await assert.rejects(()=>verifyFirebase(t,envConfig,provider()),e=>e.status===401);}
 const t=await token();await assert.rejects(()=>verifyFirebase(t.slice(0,-8)+'tampered',envConfig,provider()));
});
test('Firebase rejects disabled, deleted, revoked or mismatched accounts',async()=>{const t=await token();for(const change of [{disabled:true},{validSince:time()+10},{localId:'different'},{emailVerified:false},{email:'another@example.com'}])await assert.rejects(()=>verifyFirebase(t,envConfig,provider(change)));});
test('Firebase exchange is invite-gated, creates stable owner and disables legacy paths',async()=>{
 const {env,db}=setup();Object.assign(env,envConfig);const t=await token();const p=provider();
 assert.equal((await accounts(request('firebase/session',{idToken:t}),env,p)).status,403);
 db.prepare('INSERT INTO creator_invitations(email) VALUES(?)').run('alice@example.com');
 const first=await accounts(request('firebase/session',{idToken:t}),env,p);assert.equal(first.status,200);assert.match(first.headers.get('set-cookie'),/HttpOnly; Secure/);assert.match(first.headers.get('set-cookie'),/Max-Age=3\d\d\d/);
 assert.equal((await accounts(request('firebase/session',{idToken:t}),env,p)).status,200);assert.equal(db.prepare('SELECT COUNT(*) n FROM creator_users').get().n,1);
 assert.equal((await accounts(request('email/start',{email:'alice@example.com'}),env,p)).status,410);
 assert.equal((await accounts(request('google/start',{}),env,p)).status,410);
 assert.equal((await accounts(request('firebase/session',{idToken:t},{Origin:'https://evil.test'}),env,p)).status,403);
 db.prepare('UPDATE creator_users SET suspended=1').run();assert.equal((await accounts(request('firebase/session',{idToken:t}),env,p)).status,403);
});
test('open registration is explicit, not a default, and no email-based legacy merge',async()=>{
 const {env,db}=setup();Object.assign(env,envConfig,{CREATOR_REGISTRATION:'open'});
 assert.equal((await accounts(request('firebase/session',{idToken:await token()}),env,provider())).status,200);
 assert.equal((await(await accounts(request('config'),env)).json()).invitationOnly,false);
 db.prepare("UPDATE creator_firebase_identities SET subject='original-uid'").run();
 assert.equal((await accounts(request('firebase/session',{idToken:await token()}),env,provider())).status,409);
});
