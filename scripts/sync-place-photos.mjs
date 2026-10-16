import {findPlacePhoto} from './find-place-photo.mjs';
const token=process.env.MAP_PLACES_SYNC_KEY;if(!token)throw Error('Map sync credential required');
const base='https://pocket-atlas-auth.huayang-hsu.workers.dev';
async function call(path,body){const r=await fetch(base+'/api/background/map-places/photos/'+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,Origin:base,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('Photo background API '+r.status);return r.json();}
const {jobs}=await call('jobs');let matched=0,missing=0,failed=0;
for(const job of jobs){let photo=null,error=false;try{photo=await findPlacePhoto({name:job.name,lat:job.lat,lng:job.lng});}catch{error=true;}await call('result',{place_key:job.place_key,lease:job.lease,photo,failed:error});if(photo)matched++;else if(error)failed++;else missing++;}
console.log(JSON.stringify({claimed:jobs.length,matched,missing,failed}));
