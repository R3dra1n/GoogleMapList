import {myMapId} from './model.js';
import {listEntries} from './list-keys.js';
import {t} from './i18n.js';
import {language} from './i18n.js';
const words={
 'zh-Hant':['人氣','此清單由本站開啟的去重瀏覽器數，不是 Google 收藏數或真人數。約每 60 秒更新。'],
 'zh-Hans':['人气','此清单从本站打开的去重浏览器数，不是 Google 收藏数或真人数。约每 60 秒更新。'],
 en:['Popularity','Distinct browsers opening this list from this site; not Google saves or people. Refreshes about every 60 seconds.'],
 ja:['人気','このサイトから開いたブラウザの重複を除いた数です。Google の保存数や人数ではありません。約60秒ごとに更新。'],
 ko:['인기도','이 사이트에서 목록을 연 고유 브라우저 수입니다. Google 저장 수나 사람 수가 아닙니다. 약 60초마다 갱신됩니다.']};
let basePromise,refreshing=false;const base=()=>basePromise??=fetch('./admin/connection.json').then(r=>r.json()).then(c=>new URL(c.authBaseUrl).origin);
function visitor(){let id=localStorage.getItem('atlas-visitor');if(!id){id=crypto.randomUUID();localStorage.setItem('atlas-visitor',id)}return id;}
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function statMarkup(item,kind){const w=words[language];return listEntries(item,kind).map(entry=>`<div class="list-stats" data-list="${entry.id}" data-url="${escape(entry.url)}" data-slot="${entry.slot}"><span>${escape(['food','sights','myMap'].includes(entry.slot)?t(entry.slot):entry.slot==='link'?item.name:entry.slot)}</span><small class="stats-count" role="status">…</small><details><summary>ⓘ</summary><p>${w[1]}</p></details></div>`).join('');}
function paint(root,row){const w=words[language];root.querySelector('.stats-count').textContent=`${w[0]} ${row.used}`;}
async function call(id,action){const r=await fetch((await base())+'/api/stats',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,action,visitor:visitor()}),keepalive:true});if(!r.ok)throw Error();return r.json();}
function roots(){return [...document.querySelectorAll('.list-stats')].filter(x=>!x.closest('[hidden]'));}
export function bindStats(){
 const w=words[language];for(const root of roots()){
  const id=root.dataset.list;root.title=w[1];
  const card=root.closest('article');for(const link of [...card.querySelectorAll('a[target="_blank"]')].filter(a=>a.getAttribute('href')===root.dataset.url||(root.dataset.slot==='myMap'&&myMapId(a.href)&&myMapId(a.href)===myMapId(root.dataset.url))))link.addEventListener('click',()=>{call(id,'use').then(row=>{if(root.isConnected)paint(root,row)}).catch(()=>{})},{once:true});
 }
 refresh();
}
async function refresh(){if(refreshing||document.visibilityState!=='visible')return;const nodes=roots();if(!nodes.length)return;refreshing=true;try{
 const ids=[...new Set(nodes.map(n=>n.dataset.list))];for(let i=0;i<ids.length;i+=24){const r=await fetch((await base())+'/api/stats?ids='+encodeURIComponent(ids.slice(i,i+24).join(',')),{cache:'no-store'});if(!r.ok)throw Error();const data=await r.json();for(const row of data.items)for(const n of nodes)if(n.isConnected&&n.dataset.list===row.list_id)paint(n,row);}
 }catch{for(const n of nodes)if(n.isConnected)n.querySelector('small').textContent='—'}finally{refreshing=false}}
setInterval(refresh,60000);window.addEventListener('focus',refresh);
