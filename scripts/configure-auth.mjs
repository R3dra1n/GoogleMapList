import {readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
const text=await readFile('worker/.dev.vars','utf8');
const secrets={};
for(const key of ['GITHUB_CLIENT_ID','GITHUB_CLIENT_SECRET']) {
  const match=text.match(new RegExp(`^${key}\\s*=\\s*["']?([a-zA-Z0-9_]+)["']?\\s*$`,'m'));
  if(!match)throw new Error(`${key} 尚未填寫，請在 worker/.dev.vars 中填入並儲存。`);
  secrets[key]=match[1];
}
const child=spawn('wrangler',['secret','bulk','--config','worker/wrangler.toml'],{stdio:['pipe','inherit','inherit']});
child.stdin.end(JSON.stringify(secrets));
const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);});
if(code!==0)throw new Error('上傳認證設定失敗，請檢查 Cloudflare 登入狀態。');
console.log('認證設定已安全上傳；未輸出任何密鑰。');
