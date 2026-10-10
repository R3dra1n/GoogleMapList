import {readGoogleList} from '../worker/google-list.mjs';
const token=process.env.GITHUB_TOKEN;if(!token)throw Error('Repository token required');
const base='https://pocket-atlas-auth.huayang-hsu.workers.dev';
async function call(path,body){const response=await fetch(base+'/api/admin/map-places/'+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,Origin:base,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('Background job API returned '+response.status);return response.json();}
const {jobs}=await call('jobs');let saved=0,failed=0;
for(const job of jobs){let data;try{data=await readGoogleList(job.source);if(data.complete===false||(!data.places.length&&data.total!==0))throw Error('Incomplete source');}catch{failed++;await call('result',{...job});continue;}await call('result',{...job,data});saved++;}
console.log(JSON.stringify({claimed:jobs.length,saved,unavailable:failed}));
