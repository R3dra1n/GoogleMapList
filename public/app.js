import {renderCatalog,chips} from './catalog-view.js';
import {statMarkup,bindStats} from './list-stats.js';
import {collectionText,providerButton,alternativeMaps} from './collections.js';
import {refreshRecommendationUI} from './recommendations.js';
import {language,setLanguage,localized,t,suffixes} from './i18n.js';
import {readPreference,savePreference,applyTheme} from './preferences.js';
import {visibleData,resolveRoute,myMapId} from './model.js';
const $=id=>document.getElementById(id);
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const display=(item,key)=>{const destination=key==='name'&&language==='en'?'english':key+suffixes[language];const value=escape(localized(item,key));return language!=='zh-Hant'&&item._machineFields?.includes(destination)?`<span lang="${language}-x-mtfrom-zh-TW">${value}</span>`:value;};
const icons={pin:'<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',food:'<path d="M5 3v7m4-7v7M3 3v5a4 4 0 0 0 8 0V3M7 12v9M19 3c-3 3-4 7-4 10h4m0-10v18"/>',sights:'<rect x="3" y="6" width="18" height="14" rx="3"/><path d="m8 6 2-3h4l2 3"/><circle cx="12" cy="13" r="4"/>'};
const icon=name=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
const path=(a,c)=>`#/${a}${c?`/${c}`:''}`;
function cover(item,label){return `<div class="cover"><div class="cover-fallback" ${item.image?'hidden':''} aria-hidden="true">${escape(localized(item,'name'))}</div>${item.image?`<img src="./${escape(item.image)}" alt="${escape(localized(item,'imageAlt'))}" ${item._imageVariants?`srcset="${item._imageVariants.map(v=>`./${escape(v.path)} ${v.width}w`).join(', ')}" sizes="(max-width: 640px) 100vw, (max-width: 1000px) 50vw, 33vw"`:""} decoding="async" loading="lazy" width="720" height="440">`:''}<span class="region-tag">${escape(label)}</span></div>`;}
function mapButton(url,label,name){return url?`<a class="map-button ${name==='sights'?'secondary':''}" href="${escape(url)}" target="_blank" rel="noopener noreferrer" aria-label="${escape(label)}，${t('mapsOpen')}">${icon(name)}${label}<span aria-hidden="true">↗</span></a>`:`<button class="map-button" disabled>${icon(name)}${label}・${t('soon')}</button>`;}
const hasStory=item=>['myMap','article','articleEn','articleHans','articleJa','articleKo'].some(key=>item[key]);
let data;let version;let pendingData;
function render(moveFocus=false){
 queueMicrotask(()=>{document.querySelectorAll('#cards .card-title,#cards .card-description').forEach(e=>e.title=e.textContent);bindStats();const first=document.querySelector('.cover img');if(first){first.loading='eager';first.fetchPriority='high';}});
 document.querySelector('.save-tip').hidden=false;
 if(renderCatalog(location.hash||document.documentElement.dataset.route||'#/',data,{cover,display,statMarkup,bind:()=>{bindStats();document.querySelectorAll('.cover img').forEach(img=>img.addEventListener('error',()=>{img.hidden=true;img.previousElementSibling.hidden=false;},{once:true}));}})){ $('cards').setAttribute('aria-busy','false');if(moveFocus)$('section-title').focus({preventScroll:true});return;}
 const route=resolveRoute(location.hash,data);$('cards').setAttribute('aria-busy','false');$('story').hidden=true;$('cards').hidden=false;
 $('continents').innerHTML=data.continents.map(a=>`<a class="continent-tab" href="${path(a.id)}" ${route?.continent?.id===a.id?'aria-current="page"':''}>${escape(localized(a,'name'))}</a>`).join('');

 if(route?.themes){
 if(route.theme){document.title=localized(route.theme,'name')+'｜'+t('brand');$('section-kicker').textContent='CURATED COLLECTIONS';renderStory(route.theme,null,null);return;}
 document.title=collectionText('themes')+'｜'+t('brand');$('breadcrumbs').textContent=collectionText('themes');$('section-title').textContent=collectionText('themes');$('section-count').textContent=String((data.themes||[]).length);$('section-kicker').textContent='CURATED COLLECTIONS';
 $('cards').innerHTML=(data.themes||[]).map(item=>`<article class="destination-card theme-card">${cover(item,collectionText('themes'))}<div class="card-body"><h3 class="card-title">${display(item,'name')}</h3><p class="card-description">${display(item,'description')}</p><div class="actions">${providerButton(item.link)||(hasStory(item)?'':`<button class="map-button" disabled>${t('soon')}</button>`)}</div>${alternativeMaps(item)}${chips(item,data)}${statMarkup(item,'themes')}${true?`<a class="story-link" href="./lists/themes/${item.id}/">${[item.myMap?t('myMap'):'', t('story')].filter(Boolean).join(' · ')} →</a>`:''}</div></article>`).join('')||`<p class="empty">${collectionText('empty')}</p>`;
 document.querySelectorAll('.cover img').forEach(img=>img.addEventListener('error',()=>{img.hidden=true;img.previousElementSibling.hidden=false;},{once:true}));
document.querySelector('.save-tip p').textContent=collectionText('tip');if(moveFocus)$('section-title').focus({preventScroll:true});return;
 }
 document.querySelector('.save-tip p').textContent=collectionText('tip');
 if(!route){$('breadcrumbs').innerHTML=`<a href="./">首頁</a><span aria-hidden="true">/</span><a href="#/asia">${t('destinations')}</a>`;$('section-title').textContent=t('missing');$('section-count').textContent='';$('cards').innerHTML=`<p class="empty">${t('unavailable')}<br><a href="#/">${t('back')}</a></p>`;return;}
 const {continent:a,country:c,city}=route;
 document.title=`${localized(city||c||a,'name')}｜${t('brand')}`;
 $('breadcrumbs').innerHTML=`<a href="./">首頁</a><span aria-hidden="true">/</span><a href="#/asia">${t('destinations')}</a><span aria-hidden="true">/</span>${c?`<a href="${path(a.id)}">${escape(localized(a,'name'))}</a><span aria-hidden="true">/</span><span aria-current="page">${escape(localized(c,'name'))}</span>`:`<span aria-current="page">${escape(localized(a,'name'))}</span>`}`;
 $('section-title').textContent=c?`${t('next')}${localized(c,'name')}`:`${t('discover')}${localized(a,'name')}`;
 $('section-kicker').textContent=c?'YOUR NEXT STOP':'THE DESTINATIONS';
 if(city){renderStory(city,a,c);if(moveFocus)$('section-title').focus({preventScroll:true});return;}
 const items=c?data.cities.filter(x=>x.country===c.id):data.countries.filter(x=>x.continent===a.id);
 $('section-count').textContent=`${items.length} ${t(c?'cities':'countries')}`;
 $('cards').innerHTML=items.map(item=>c?`<article class="destination-card city-card">${cover(item,localized(c,'name'))}<div class="card-body"><div class="card-top"><h3 class="card-title">${display(item,'name')}</h3>${icon('pin')}</div><p class="card-english">${escape(item.english)}</p><p class="card-description">${display(item,'description')}</p>${item.food&&item.food===item.sights?`<span class="combined">${t('combined')}</span>`:''}<div class="actions">${mapButton(item.food,t('food'),'food')}${mapButton(item.sights,t('sights'),'sights')}</div>${alternativeMaps(item)}${chips(item,data)}${statMarkup(item,'cities')}${true?`<a class="story-link" href="./lists/${item._region?'countries':'cities'}/${item._region?item.country:item.id}/">${item.myMap?t('myMap'):t('story')} →</a>`:''}</div></article>`:`<article class="destination-card country-card"><a href="${path(a.id,item.id)}" aria-label="${t('discover')}${escape(localized(item,'name'))}">${cover(item,localized(a,'name'))}<div class="card-body"><div class="card-top"><h3 class="card-title">${display(item,'name')}</h3><span class="card-arrow" aria-hidden="true">↗</span></div><p class="card-english">${escape(item.english)}</p><p class="card-description">${display(item,'description')}</p><div class="card-meta">${icon('pin')}<span>${data.cities.filter(x=>x.country===item.id).map(x=>escape(localized(x,'name'))).join('・')}</span></div></div></a></article>`).join('');
 document.querySelectorAll('.cover img').forEach(img=>img.addEventListener('error',()=>{img.hidden=true;img.previousElementSibling.hidden=false;},{once:true}));
 if(moveFocus)$('section-title').focus({preventScroll:true});
}

function renderStory(city,a,c){
 $('cards').hidden=true;$('story').hidden=false;
 $('section-title').textContent=localized(city,'name');$('section-count').textContent=t('story');
 $('breadcrumbs').innerHTML=!a?`<a href="#/themes">${collectionText('themes')}</a><span>/</span><span aria-current="page">${escape(localized(city,'name'))}</span>`:`<a href="./">首頁</a><span aria-hidden="true">/</span><a href="#/asia">${t('destinations')}</a><span>/</span><a href="${path(a.id)}">${escape(localized(a,'name'))}</a><span>/</span><a href="${path(a.id,c.id)}">${escape(localized(c,'name'))}</a><span>/</span><span aria-current="page">${escape(localized(city,'name'))}</span>`;
 const mid=myMapId(city.myMap);const body=localized(city,'article');const suffix=suffixes[language];
 $('story').innerHTML=`<article class="travel-story">${cover(city,c?localized(c,'name'):collectionText('themes'))}<div class="story-body"><p class="card-description">${display(city,'description')}</p><div class="actions">${a?mapButton(city.food,t('food'),'food')+mapButton(city.sights,t('sights'),'sights'):providerButton(city.link)}</div>${alternativeMaps(city)}${chips(city,data)}${statMarkup(city,a?'cities':'themes')}${body?`${language!=='zh-Hant'&&!city['article'+suffix]?`<p class="translation-note">${t('fallback')}</p>`:''}<div class="story-prose" lang="${language!=='zh-Hant'&&city._machineFields?.includes('article'+suffix)?language+'-x-mtfrom-zh-TW':language}">${body.split(/\n\s*\n/).map(p=>`<p>${escape(p)}</p>`).join('')}</div>`:''}${mid?`<section class="embedded-map"><h3>${t('myMap')}</h3><p>${t('mapNotice')}</p><button id="load-map" class="map-button" type="button">${t('loadMap')}</button><a class="story-link" href="https://www.google.com/maps/d/viewer?mid=${mid}" target="_blank" rel="noopener noreferrer">${t('openMap')}</a><div id="map-frame"></div></section>`:''}</div></article>`;
 if(mid)$('load-map').addEventListener('click',()=>{const frame=document.createElement('iframe');frame.src=`https://www.google.com/maps/d/embed?mid=${mid}`;frame.title=`${localized(city,'name')} — ${t('myMap')}`;frame.loading='lazy';frame.referrerPolicy='strict-origin-when-cross-origin';$('map-frame').replaceChildren(frame);$('load-map').hidden=true;});
 document.querySelectorAll('#story .cover img').forEach(img=>img.addEventListener('error',()=>{img.hidden=true;img.previousElementSibling.hidden=false;},{once:true}));
}
function translateUI(){
 setLanguage(language);refreshRecommendationUI();
 $('update-label').textContent=t('update');$('refresh-content').textContent=t('refresh');
 const texts={'.skip':'skip','.intro h1':'heading','.intro-text':'intro','.save-tip strong':'saveTitle','.save-tip p':'saveText','.site-footer strong':'brand','.site-footer>div>span':'footer','#credits-button':'credits','.footer-links a':'admin','.dialog-head h2':'credits'};
 for(const [selector,key] of Object.entries(texts))document.querySelector(selector).textContent=t(key);
 if(['zh-Hant','zh-Hans'].includes(language)){const heading=document.querySelector('.intro h1');const [first,rest]=t('heading').split('，');heading.replaceChildren(document.createTextNode(first+'，'),Object.assign(document.createElement('br'),{className:'mobile-break'}),document.createTextNode(rest));}
 const brand=document.querySelector('.brand>span:last-child');brand.firstChild.textContent=t('brand');document.querySelector('.brand').setAttribute('aria-label',t('brand'));
 $('close-credits').setAttribute('aria-label',t('close'));$('theme').setAttribute('aria-label',t('theme'));$('language').setAttribute('aria-label',t('language'));$('continents').setAttribute('aria-label',t('destinations'));$('breadcrumbs').setAttribute('aria-label',t('destinations'));
 for(const option of $('theme').options)option.textContent=t(option.value);
 if(!data)return;
 const suffix=suffixes[language];$('translation-notice').hidden=language==='zh-Hant'||![...data.continents,...data.countries,...data.cities,...(data.themes||[])].some(item=>item._machineFields?.some(key=>language==='en'&&key==='english'||suffix&&key.endsWith(suffix)));
 const entries=[...data.countries,...data.cities,...(data.themes||[])].filter(x=>x.imageCredit);const seen=new Set();
 $('credits-list').innerHTML=entries.filter(x=>{if(seen.has(x.image))return false;seen.add(x.image);return true;}).map(x=>`<p><strong>${escape(localized(x,'name'))}</strong><br>${escape(x.imageCredit)}<br>${x.imageSource?`<a href="${escape(x.imageSource)}" target="_blank" rel="noopener noreferrer">${t('original')}</a>`:''} ${x.imageLicense?`· <a href="${escape(x.imageLicense)}" target="_blank" rel="noopener noreferrer">${t('license')}</a>`:''}<br>${t('edited')}</p>`).join('')||`<p>${t('noPhotos')}</p>`;
}
$('language').value=language;$('theme').value=readPreference('atlas-theme','system');translateUI();
$('language').addEventListener('change',e=>{setLanguage(e.target.value);savePreference('atlas-language',language);translateUI();if(data)render();});
$('theme').addEventListener('change',e=>{savePreference('atlas-theme',e.target.value);applyTheme(e.target.value);});
try{const response=await fetch('./data.json',{cache:'no-store'});if(!response.ok)throw new Error('load');const payload=await response.json();version=payload.version;data={...visibleData(payload),creators:payload.creators||[],featured:payload.featured||[]};$('release-version').textContent='v'+(payload.applicationVersion||'1.0.0');translateUI();render();window.addEventListener('hashchange',()=>render(true));}catch{$('cards').setAttribute('aria-busy','false');$('cards').innerHTML=`<p class="empty">${t('loadError')}</p>`;}
$('credits-button').addEventListener('click',()=>$('credits').showModal());$('close-credits').addEventListener('click',()=>$('credits').close());$('credits').addEventListener('click',e=>{if(e.target===$('credits')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});

// Check when returning to a previously opened tab; never discard the active route.
let checking=false;
async function checkUpdates(){
 if(checking||document.visibilityState!=='visible'||!version)return;
 checking=true;
 try{const response=await fetch('./data.json',{cache:'no-store'});if(!response.ok)return;const next=await response.json();if(next.version!==version){pendingData=next;$('content-update').hidden=false;}}catch{}finally{checking=false;}
}
$('refresh-content').addEventListener('click',()=>{if(!pendingData)return;data={...visibleData(pendingData),creators:pendingData.creators||[],featured:pendingData.featured||[]};version=pendingData.version;pendingData=null;$('content-update').hidden=true;translateUI();render(true);});
window.addEventListener('focus',checkUpdates);document.addEventListener('visibilitychange',checkUpdates);setInterval(checkUpdates,60000);
