import {readFile} from 'node:fs/promises';import {spawn} from 'node:child_process';
const file=await readFile('.env.translation','utf8');const match=file.match(/^GOOGLE_TRANSLATE_API_KEY\s*=\s*["']?([A-Za-z0-9_-]+)["']?\s*$/m);
if(!match)throw new Error('請先在 .env.translation 填入 GOOGLE_TRANSLATE_API_KEY；不要提交或分享此檔。');
const child=spawn('gh',['secret','set','GOOGLE_TRANSLATE_API_KEY','--repo','R3dra1n/GoogleMapList'],{stdio:['pipe','inherit','inherit']});child.stdin.end(match[1]);const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve)});if(code!==0)throw new Error('無法保存 GitHub secret。');console.log('翻譯憑證已保存到 GitHub Actions，沒有輸出密鑰。');
