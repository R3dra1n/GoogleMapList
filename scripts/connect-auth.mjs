import {readFile,writeFile} from 'node:fs/promises';
const raw=process.argv[2];if(!raw)throw Error('請提供已部署的 Worker HTTPS 網址');
const url=new URL(raw);if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw Error('請輸入 Worker 的 HTTPS origin');
const response=await fetch(url.origin+'/health');if(!response.ok||!(await response.json()).ready)throw Error('Worker 尚未就緒，請先設定 GitHub OAuth secrets');
await writeFile('public/admin/connection.json',JSON.stringify({authBaseUrl:url.origin},null,2)+'\n');
const config=await readFile('public/admin/config.yml','utf8');await writeFile('public/admin/config.yml',config.replace(/^  base_url:.*$/m,`  base_url: ${url.origin}`));
console.log('認證網址已設定。請建置、提交並推送更新。');
