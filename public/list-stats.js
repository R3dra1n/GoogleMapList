import {myMapId} from './model.js';
import {listEntries} from './list-keys.js';
import {t} from './i18n.js';
import {language} from './i18n.js';
const words={
 'zh-Hant':['本站收藏','取消收藏','使用瀏覽器','收藏','統計暫時不可用','依瀏覽器去重，並非 Google 收藏數或真實人數。清除瀏覽器資料會重置身分；收藏不跨裝置同步。約每 60 秒更新。'],
 'zh-Hans':['本站收藏','取消收藏','使用浏览器','收藏','统计暂时不可用','按浏览器去重，并非 Google 收藏数或真实人数。清除浏览器数据会重置身份；收藏不跨设备同步。约每 60 秒更新。'],
 en:['Save here','Unsave','browsers used','saved here','Statistics unavailable','Unique browsers, not people or Google saves. Clearing browser data resets identity; saves do not sync across devices. Refreshes about every 60 seconds.'],
 ja:['サイト内で保存','保存を解除','利用ブラウザ','サイト内保存','統計を取得できません','ブラウザ別の集計です。人数や Google の保存数ではありません。データ消去で識別がリセットされ、端末間では同期されません。約60秒ごとに更新。'],
 ko:['사이트에 저장','저장 취소','이용 브라우저','사이트 저장','통계를 불러올 수 없습니다','브라우저별 집계이며 사람 수나 Google 저장 수가 아닙니다. 브라우저 데이터를 지우면 초기화되며 기기 간 동기화되지 않습니다. 약 60초마다 갱신됩니다.']};
let basePromise,refreshing=false;const base=()=>basePromise??=fetch('./admin/connection.json').then(r=>r.json()).then(c=>new URL(c.authBaseUrl).origin);
function saved(){try{return JSON.parse(localStorage.getItem('atlas-saves')||'{}')}catch{return {}}}
function visitor(){let id=localStorage.getItem('atlas-visitor');if(!id){id=crypto.randomUUID();localStorage.setItem('atlas-visitor',id)}return id;}
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function statMarkup(item,kind){const w=words[language];return listEntries(item,kind).map(entry=>`<div class="list-stats" data-list="${entry.id}" data-url="${escape(entry.url)}" data-slot="${entry.slot}"><span>${escape(['food','sights','myMap'].includes(entry.slot)?t(entry.slot):entry.slot==='link'?item.name:entry.slot)}</span><button type="button" class="save-list"></button><small class="stats-count" role="status">…</small><details><summary>ⓘ</summary><p>${w[5]}</p></details></div>`).join('');}
function paint(root,row){const w=words[language];root.querySelector('.stats-count').textContent=`${row.used} ${w[2]} · ${row.saved} ${w[3]}`;}
async function call(id,action){const r=await fetch((await base())+'/api/stats',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,action,visitor:visitor()}),keepalive:true});if(!r.ok)throw Error();return r.json();}
function roots(){return [...document.querySelectorAll('.list-stats')].filter(x=>!x.closest('[hidden]'));}
export function bindStats(){
 const w=words[language];for(const root of roots()){
  const id=root.dataset.list,button=root.querySelector('button');button.textContent=saved()[id]?w[1]:w[0];button.setAttribute('aria-pressed',String(Boolean(saved()[id])));root.title=w[5];
  button.onclick=async()=>{button.disabled=true;try{const row=await call(id,saved()[id]?'unsave':'save');const state=saved();state[id]=row.isSaved;localStorage.setItem('atlas-saves',JSON.stringify(state));paint(root,row);button.textContent=row.isSaved?w[1]:w[0];button.setAttribute('aria-pressed',String(row.isSaved));}catch{root.querySelector('small').textContent=w[4]}finally{button.disabled=false}};
  const card=root.closest('article');for(const link of [...card.querySelectorAll('a[target="_blank"]')].filter(a=>a.getAttribute('href')===root.dataset.url||(root.dataset.slot==='myMap'&&myMapId(a.href)&&myMapId(a.href)===myMapId(root.dataset.url))))link.addEventListener('click',()=>{call(id,'use').then(row=>{if(root.isConnected)paint(root,row)}).catch(()=>{})},{once:true});
 }
 refresh();
}
async function refresh(){if(refreshing||document.visibilityState!=='visible')return;const nodes=roots();if(!nodes.length)return;refreshing=true;try{
 const ids=[...new Set(nodes.map(n=>n.dataset.list))];for(let i=0;i<ids.length;i+=24){const r=await fetch((await base())+'/api/stats?ids='+encodeURIComponent(ids.slice(i,i+24).join(',')),{cache:'no-store'});if(!r.ok)throw Error();const data=await r.json();for(const row of data.items)for(const n of nodes)if(n.isConnected&&n.dataset.list===row.list_id)paint(n,row);}
 }catch{for(const n of nodes)if(n.isConnected)n.querySelector('small').textContent=words[language][4]}finally{refreshing=false}}
setInterval(refresh,60000);window.addEventListener('focus',refresh);
