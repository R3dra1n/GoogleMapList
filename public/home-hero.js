import {language,localized} from './i18n.js';
import {catalogItems} from './catalog-model.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const titles={'zh-Hant':'跟著喜歡的人，\n走進新的風景。','zh-Hans':'跟着喜欢的人，\n走进新的风景。',en:'Follow your favorite people.\nDiscover somewhere new.',ja:'好きな人の足跡をたどり、\n新しい景色へ。',ko:'좋아하는 사람을 따라,\n새로운 풍경으로.'};
export function homeHero(data,metadata=()=> ''){
 const settings=data.home||{},items=catalogItems(data),item=items.find(x=>x.key===(settings.heroList||'cities/hualien'))||items.find(x=>x.image);
 const title=localized(settings,'title')||titles[language]||titles.en,photo=item?.image||'',caption=item?localized(item,'name'):'',country=data.countries.find(c=>c.id===item?.country),href=item?'#/lists/'+item.key:'#/search';
 return `<section class="editorial-hero ${photo?'':'hero-no-photo'}">${photo?`<div class="hero-photo"><img src="${esc(photo)}" alt="${esc(localized(item,'imageAlt')||caption)}" fetchpriority="high" decoding="async"></div>`:''}<div class="hero-copy"><p class="eyebrow">${language.startsWith('zh')?'把喜歡的地方，放進下一趟旅行。':'YOUR FAVORITE PLACES. YOUR NEXT JOURNEY.'}</p><h1>${esc(title).replace(/\n/g,'<br>')}</h1><div class="hero-actions"><a class="hero-primary" href="${esc(href)}">${language.startsWith('zh')?'探索這份口袋地圖':'Explore this collection'}</a></div></div>${item?`<div class="photo-caption"><span>⌖ ${esc(item.locationNames?.join('・')||localized(country||{},'name'))}</span><h2>${esc(caption)}</h2><p>${esc(localized(item,'description'))}</p>${metadata(item,data)}</div>`:''}${item?.imageCredit?`<small class="photo-credit">${esc(item.imageCredit)}</small>`:''}</section>`;
}
