import {myMapId} from './model.js';
import {listEntries} from './list-keys.js';
import {language} from './i18n.js';
const labels={'zh-Hant':'人氣','zh-Hans':'人气',en:'Popularity',ja:'人気',ko:'인기도'};
let basePromise,refreshing=false;
const counts=new Map(),bound=new WeakSet();
const base=()=>basePromise??=fetch('./admin/connection.json').then(r=>r.json()).then(c=>new URL(c.authBaseUrl).origin);
function visitor(){let id=localStorage.getItem('atlas-visitor');if(!id){id=crypto.randomUUID();localStorage.setItem('atlas-visitor',id)}return id;}
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const entries=root=>JSON.parse(root.dataset.entries);
export function statMarkup(item,kind){const lists=listEntries(item,kind);return lists.length?`<div class="list-stats" data-entries="${escape(JSON.stringify(lists))}"><small class="stats-count" role="status">${labels[language]} …</small></div>`:'';}
function paint(root){const values=entries(root).map(e=>counts.get(e.id));root.querySelector('.stats-count').textContent=`${labels[language]} ${values.every(Number.isFinite)?values.reduce((a,b)=>a+b,0).toLocaleString(): '—'}`;}
async function call(id){const r=await fetch((await base())+'/api/stats',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,action:'use',visitor:visitor()}),keepalive:true});if(!r.ok)throw Error();return r.json();}
function roots(){return [...document.querySelectorAll('.list-stats')].filter(x=>!x.closest('[hidden]'));}
export function bindStats(){
 if(window.ATLAS_PREVIEW){for(const root of roots()){root.parentElement.append(root);root.querySelector('.stats-count').textContent=labels[language]+' —';}return;}
 for(const root of roots()){
  // One total at the end of each card/article, including My Maps and alternative links.
  root.parentElement.append(root);paint(root);
  for(const link of root.closest('article').querySelectorAll('a[target="_blank"]')){
   const entry=entries(root).find(e=>link.getAttribute('href')===e.url||(e.slot==='myMap'&&myMapId(link.href)&&myMapId(link.href)===myMapId(e.url)));
   if(!entry||bound.has(link))continue;bound.add(link);
   link.addEventListener('click',()=>{call(entry.id).then(row=>{if(Number.isFinite(row.used)){counts.set(entry.id,row.used);roots().forEach(paint);}}).catch(()=>{})},{once:true});
  }
 }
 refresh();
}
async function refresh(){if(window.ATLAS_PREVIEW)return;if(refreshing||document.visibilityState!=='visible')return;const nodes=roots();if(!nodes.length)return;refreshing=true;try{
 const ids=[...new Set(nodes.flatMap(n=>entries(n).map(e=>e.id)))];for(let i=0;i<ids.length;i+=24){const batch=ids.slice(i,i+24),r=await fetch((await base())+'/api/stats?ids='+encodeURIComponent(batch.join(',')),{cache:'no-store'});if(!r.ok)throw Error();const data=await r.json();for(const id of batch){const row=data.items.find(x=>x.list_id===id);if(Number.isFinite(row?.used))counts.set(id,row.used);else counts.delete(id);}}
 for(const n of roots())paint(n);
 }catch{for(const n of roots())n.querySelector('.stats-count').textContent=`${labels[language]} —`;}finally{refreshing=false}}
setInterval(refresh,60000);window.addEventListener('focus',refresh);
