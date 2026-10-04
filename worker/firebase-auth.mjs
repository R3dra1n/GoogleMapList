import {createLocalJWKSet,jwtVerify} from 'jose';
import {ProfileError} from './creator-profile.mjs';
const caches=new WeakMap();
export function firebaseConfig(env){
 if(!env.FIREBASE_PROJECT_ID||!env.FIREBASE_API_KEY||!env.FIREBASE_APP_ID)return null;
 return {projectId:env.FIREBASE_PROJECT_ID,apiKey:env.FIREBASE_API_KEY,appId:env.FIREBASE_APP_ID,authDomain:env.FIREBASE_PROJECT_ID+'.firebaseapp.com'};
}
export async function verifyFirebase(token,env,fetcher=fetch){
 const config=firebaseConfig(env);if(!config)throw new ProfileError('Firebase 尚未設定',503);
 if(typeof token!=='string'||token.length>16000)throw new ProfileError('登入憑證無效',401);
 try{
  let cached=caches.get(fetcher);
  if(!cached||cached.expires<Date.now()){
   const r=await fetcher('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com',{signal:AbortSignal.timeout(10000)});
   if(!r.ok)throw Error('keys unavailable');
   const maxAge=Number(r.headers.get('cache-control')?.match(/max-age=(\d+)/)?.[1]||300);
   cached={keys:createLocalJWKSet(await r.json()),expires:Date.now()+Math.min(maxAge,3600)*1000};caches.set(fetcher,cached);
  }
  const {payload:p}=await jwtVerify(token,cached.keys,{algorithms:['RS256'],issuer:'https://securetoken.google.com/'+config.projectId,audience:config.projectId,requiredClaims:['exp','iat','auth_time','sub']});
  const now=Math.floor(Date.now()/1000);
  if(typeof p.sub!=='string'||!p.sub||p.sub.length>128||p.iat>now||typeof p.auth_time!=='number'||p.auth_time>now||now-p.auth_time>300||p.email_verified!==true||typeof p.email!=='string'||!['google.com','password'].includes(p.firebase?.sign_in_provider))throw Error('invalid claims');
  // The signed JWT establishes project identity; lookup also rejects disabled/deleted users and revoked credentials.
  const r=await fetcher('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key='+encodeURIComponent(config.apiKey),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken:token}),signal:AbortSignal.timeout(10000)});
  if(!r.ok)throw Error('account unavailable');const {users}=await r.json();const user=users?.[0];
  if(!user||user.localId!==p.sub||user.disabled||user.emailVerified!==true||user.email?.toLowerCase()!==p.email.toLowerCase()||Number(user.validSince||0)>p.auth_time)throw Error('account changed');
  return {uid:p.sub,email:p.email.toLowerCase(),expires:Math.min(p.exp,now+3600)};
 }catch{throw new ProfileError('登入失效或信箱尚未驗證，請重新登入',401);}
}
