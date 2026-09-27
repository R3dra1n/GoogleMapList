import {createHash} from 'node:crypto';
import {readFile,writeFile,readdir,mkdir,rename} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const hash=value=>createHash('sha256').update(value).digest('hex');
const targets=[['zh-CN','Hans'],['en','En'],['ja','Ja'],['ko','Ko']];
const fields=['name','description','imageAlt','article'];
const outputField=(field,suffix)=>field==='name'&&suffix==='En'?'english':field+suffix;
export function decodeTranslation(value){return value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|#39);/gi,(entity,key)=>{const named={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"};if(named[key])return named[key];const n=key[1]?.toLowerCase()==='x'?parseInt(key.slice(2),16):parseInt(key.slice(1),10);return Number.isInteger(n)&&n>0&&n<=0x10ffff&&!(n>=0xd800&&n<=0xdfff)?String.fromCodePoint(n):entity;});}
export function planTranslations(entries,previous={}){
 const state=structuredClone(previous);state.fields??={};state.cache??={};const jobs=new Map();let cleared=0;
 for(const {path,data} of entries)for(const field of fields)for(const [target,suffix] of targets){
  const destination=outputField(field,suffix),id=`${path}:${destination}`;
  const source=data[field]||'',current=data[destination]||'',record=state.fields[id];
  if(record&&current&&hash(current)!==record.output){delete state.fields[id];continue;}
  if(current&&!record)continue; // Existing translations belong to the editor.
  if(!source.trim()) {if(record){data[destination]='';delete state.fields[id];cleared++;}continue;}
  const key=hash(JSON.stringify(['nmt','zh-TW',target,source]));
  if(record?.source===key&&current)continue;
  const apply=text=>{data[destination]=text;state.fields[id]={source:key,output:hash(text)};};
  if(typeof state.cache[key]==='string'){apply(state.cache[key]);continue;}
  if(!jobs.has(key))jobs.set(key,{key,target,source,apply:[]});jobs.get(key).apply.push(apply);
 }
 return {state,jobs:[...jobs.values()],cleared,characters:[...jobs.values()].reduce((n,j)=>n+[...j.source].length,0)};
}
export async function translateEntries(entries,previous,{apiKey,fetcher=fetch,maxCharacters=50000}={}){
 const plan=planTranslations(entries,previous);
 if(plan.characters>maxCharacters)throw new Error(`本次需要翻譯 ${plan.characters} 字符，超過單次上限 ${maxCharacters}；未呼叫 Google。`);
 if(plan.jobs.some(j=>[...j.source].length>5000))throw new Error('單一文字欄位超過 5,000 字符，請縮短或分篇後重試；未呼叫 Google。');
 if(plan.jobs.length&&!apiKey)throw new Error('尚未設定 GOOGLE_TRANSLATE_API_KEY。');
 for(const [target] of targets){
  const jobs=plan.jobs.filter(j=>j.target===target);let batch=[],size=0;
  const send=async()=>{
   if(!batch.length)return;
   let response;try{response=await fetcher('https://translation.googleapis.com/language/translate/v2',{method:'POST',headers:{'Content-Type':'application/json','X-Goog-Api-Key':apiKey},body:JSON.stringify({q:batch.map(j=>j.source),source:'zh-TW',target,format:'text',model:'nmt'}),signal:AbortSignal.timeout(45000)});}catch{throw new Error('Google 翻譯連線失敗；原始內容未修改。');}
   if(!response.ok)throw new Error(`Google 翻譯失敗（HTTP ${response.status}）；請核對 API、結算與配額。`);
   let result;try{result=await response.json();}catch{throw new Error('Google 翻譯回應無效。');}
   const translations=result.data?.translations;
   if(!Array.isArray(translations)||translations.length!==batch.length||translations.some(x=>typeof x.translatedText!=='string'||!x.translatedText.trim()))throw new Error('Google 翻譯回應不完整；未儲存部分結果。');
   batch.forEach((job,i)=>{const value=decodeTranslation(translations[i].translatedText);plan.state.cache[job.key]=value;job.apply.forEach(apply=>apply(value));});batch=[];size=0;
  };
  for(const job of jobs){const length=[...job.source].length;if(length>5000)throw new Error('單一文字欄位超過 5,000 字符，請縮短或分篇後重試。');if(size+length>5000||batch.length>=100)await send();batch.push(job);size+=length;}await send();
 }
 return {state:plan.state,characters:plan.characters,requests:plan.jobs.length};
}
async function atomicJSON(path,value){await writeFile(path+'.tmp',JSON.stringify(value,null,2)+'\n');await rename(path+'.tmp',path);}
async function main(){
 const entries=[];
 for(const kind of ['continents','countries','cities'])for(const name of (await readdir(`content/${kind}`)).filter(n=>n.endsWith('.json')).sort()){const path=`content/${kind}/${name}`;const original=await readFile(path,'utf8');entries.push({path,original,data:JSON.parse(original)});}
 const statePath='translation/state.json';let state={};try{state=JSON.parse(await readFile(statePath,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
 if(process.argv.includes('--check')){const plan=planTranslations(entries,state);console.log(`待翻譯 ${plan.jobs.length} 個不重複文字項目，${plan.characters} 字符；未呼叫 API、未修改檔案。`);return;}
 if(!process.env.GOOGLE_TRANSLATE_API_KEY){console.log('::notice::Google 翻譯尚未連接；保留現有內容與譯文。');return;}
 const limit=Number(process.env.TRANSLATION_MAX_CHARACTERS||50000);if(!Number.isSafeInteger(limit)||limit<1)throw Error('翻譯字符上限無效。');
 const result=await translateEntries(entries,state,{apiKey:process.env.GOOGLE_TRANSLATE_API_KEY,maxCharacters:limit});
 for(const entry of entries)if(JSON.stringify(JSON.parse(entry.original))!==JSON.stringify(entry.data))await atomicJSON(entry.path,entry.data);
 await mkdir('translation',{recursive:true});await atomicJSON(statePath,result.state);
 console.log(`譯文已寫入內容欄位。本次送出 ${result.characters} 字符；既有人工譯文保持不變。`);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(error=>{console.error(error.message);process.exitCode=1;});
