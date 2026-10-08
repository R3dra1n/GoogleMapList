import {mapProvider,myMapId} from './model.js';
export function youtubeId(value){try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.port)return null;let id;if(u.hostname==='youtu.be')id=u.pathname.slice(1);else if(['youtube.com','www.youtube.com','m.youtube.com'].includes(u.hostname)){id=u.pathname==='/watch'?u.searchParams.get('v'):u.pathname.match(/^\/(?:embed|shorts)\/([^/]+)$/)?.[1];}return /^[\w-]{11}$/.test(id||'')?id:null;}catch{return null;}}
export function entryPlatform(url){if(myMapId(url))return 'mymaps';const old=mapProvider(url);if(old)return old;try{const u=new URL(url);if(u.protocol!=='https:'||u.username||u.password||u.port)return null;if(u.hostname==='maps.apple.com')return 'apple';if(['map.naver.com','maps.naver.com','naver.me'].includes(u.hostname))return 'naver';if(['map.kakao.com','kko.to'].includes(u.hostname))return 'kakao';if(u.hostname==='earth.google.com'&&u.pathname.startsWith('/web'))return 'earth';}catch{}return null;}
export function mapEntries(item,kind){
 if(Array.isArray(item.mapEntries))return item.mapEntries;
 return (kind==='themes'?['link','myMap','amap','baidu']:['food','sights','myMap','amap','baidu']).filter(key=>item[key]).map(id=>({id,url:item[id],purpose:['food','sights','myMap'].includes(id)?id:'collection',label:''}));
}
export function catalogItems(data){return [...data.cities.map(item=>({...item,_kind:item._region?'countries':'cities',_id:item._region?item.country:item.id})),...(data.themes||[]).map(item=>({...item,_kind:'themes',_id:item.id})),...(data.community||[])].map(item=>({...item,key:`${item._kind}/${item._id}`,owner:item.owner||'william'}));}
export function validateCatalog(data){
 const home=data.home;
 if(home){if(typeof home!=='object'||Array.isArray(home))throw Error('首頁設定無效');
 if(home.heroList&&!/^(cities|countries|themes)\/[a-z0-9-]+$/.test(home.heroList))throw Error('首頁主圖清單識別碼無效');
 if(home.destinations&&(!Array.isArray(home.destinations)||home.destinations.length>6||new Set(home.destinations).size!==home.destinations.length||home.destinations.some(id=>!data.countries.some(c=>c.id===id))))throw Error('首頁目的地請選擇最多六個不同國家');
 for(const key of ['title','description'])for(const suffix of ['','Hans','En','Ja','Ko'])if(home[key+suffix]!=null&&(typeof home[key+suffix]!=='string'||home[key+suffix].length>400))throw Error('首頁文案過長或格式錯誤');
 }
 const creators=data.creators||[],ids=new Set();
 for(const c of creators){if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(c.id)||ids.has(c.id)||typeof c.name!=='string'||!c.name.trim()||typeof c.published!=='boolean')throw Error('創作者識別碼、名稱或公開狀態無效');ids.add(c.id);for(const l of c.links||[]){const u=new URL(l.url);if(u.protocol!=='https:'||u.username||u.password)throw Error('創作者連結必須是 HTTPS');}}
 for(const kind of ['cities','countries','themes'])for(const item of data[kind]||[]){
  if(item.curated!=null&&typeof item.curated!=='boolean')throw Error('精選狀態無效');
  if(item.originalAuthor!=null&&(typeof item.originalAuthor!=='string'||item.originalAuthor.length>120))throw Error('原作者名稱無效');
  if(item.originalAuthorSource){const source=new URL(item.originalAuthorSource);if(source.protocol!=='https:'||source.username||source.password)throw Error('原作者來源須為 HTTPS');}
  for(const id of [item.owner,...(item.sources||[])].filter(Boolean))if(!ids.has(id))throw Error('找不到創作者：'+id);
  for(const id of item.destinations||[])if(!data.countries.some(x=>x.id===id)&&!data.cities.some(x=>x.id===id))throw Error('找不到目的地：'+id);
  for(const field of ['tags','keywords','locationNames'])if(item[field]&&(!Array.isArray(item[field])||item[field].some(x=>typeof x!=='string'||x.length>80)))throw Error(field+' 必須為文字列表');
  const seen=new Set();for(const e of mapEntries(item,kind)){if(!/^[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*$/.test(e.id||'')||seen.has(e.id)||!entryPlatform(e.url)||!['food','sights','myMap','collection','guide','reviews'].includes(e.purpose))throw Error('地圖入口識別碼或網址無效');seen.add(e.id);}
  for(const v of item.videos||[])if(!youtubeId(v.url)||!Number.isInteger(v.start||0)||(v.start||0)<0||typeof(v.title||'')!=='string')throw Error('YouTube 網址或起播秒數無效');
  for(const p of item.places||[])if(typeof p.name!=='string'||!p.name.trim()||(p.url&&!entryPlatform(p.url))||(p.source&&!/^https:\/\//.test(p.source))||(p.keywords&&(!Array.isArray(p.keywords)||p.keywords.some(x=>typeof x!=='string'))))throw Error('景點名稱、關鍵字或來源無效');
 }
 for(const ref of data.featured||[])if(!/^(cities|countries|themes)\/[a-z0-9-]+$/.test(ref))throw Error('精選識別碼無效');
}
export function publicCatalog(data){const creators=(data.creators||[]).filter(c=>c.published);return {creators,featured:data.featured||[],home:data.home||{}};}
// Taipei calendar day: stable across refreshes; rotates independently of source order.
export function dailySelection(items,now=new Date(),limit=6){
 const pool=[...items].sort((a,b)=>a.key<b.key?-1:a.key>b.key?1:0);
 if(!pool.length)return [];
 const day=Math.floor((now.getTime()+8*3600000)/86400000);
 const start=((day*limit)%pool.length+pool.length)%pool.length;
 return Array.from({length:Math.min(limit,pool.length)},(_,i)=>pool[(start+i)%pool.length]);
}
