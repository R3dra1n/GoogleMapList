import {language,localized} from './i18n.js';
import {catalogItems} from './catalog-model.js';
const langs=['zh-Hant','zh-Hans','en','ja','ko'];
const copy={
 title:['下一站，\n跟著喜歡的人出發。','下一站，\n跟着喜欢的人出发。','Your next stop.\nInspired by your people.','次の旅は、\n好きな人のおすすめから。','다음 여행은,\n좋아하는 사람의 추천으로.'],
 description:['跟著喜歡的創作者，找到想去的地方。\n也把你的口袋清單，分享給下一個出發的人。','跟着喜欢的创作者，找到想去的地方。\n也把你的口袋清单，分享给下一个出发的人。','Discover places through creators you love.\nShare your favorites with the next person setting out.','好きなクリエイターと、行きたい場所を見つけよう。\nあなたのお気に入りも、次に旅立つ誰かへ。','좋아하는 크리에이터와 가고 싶은 곳을 찾아보세요.\n나만의 장소도 다음 여행자에게 나눠주세요.'],
 explore:['探索口袋清單','探索口袋清单','Explore collections','リストを探す','여행 목록 탐색'],
 creators:['認識創作者','认识创作者','Meet the creators','クリエイターを見る','크리에이터 만나기'],
 next:['下一站，想去哪？','下一站，想去哪？','Where to next?','次はどこへ？','다음은 어디로?'],
 all:['所有目的地','所有目的地','All destinations','すべての旅先','모든 여행지']
};
const word=k=>copy[k][Math.max(0,langs.indexOf(language))];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function homeHero(data){
 const settings=data.home||{};
 const items=catalogItems(data);
 const item=items.find(x=>x.key===(settings.heroList||'cities/hualien'))||items.find(x=>x.image);
 const countries=(settings.destinations||['taiwan','korea','vietnam']).map(id=>data.countries.find(c=>c.id===id)).filter(Boolean);
 const title=localized(settings,'title')||word('title'),description=localized(settings,'description')||word('description');
 const photo=item?item._imageVariants?.at(-1)?.path||item.image:'';
 const caption=item?localized(item,'name'):'';
 const country=item&&data.countries.find(c=>c.id===item.country);
 const href=item?'#/lists/'+item.key:'#/search';
 return `<section class="editorial-hero ${photo?'':'hero-no-photo'}"><div class="hero-copy"><p class="eyebrow">GOOD PLACES. YOUR PEOPLE.</p><h1>${esc(title).replace(/\n/g,'<br>')}</h1><p class="hero-description">${esc(description).replace(/\n/g,'<br>')}</p><div class="hero-actions"><a class="hero-primary" href="#/search">${word('explore')} <span>↗</span></a><a href="#/creators">${word('creators')} →</a></div></div>${photo?`<a class="hero-photo" href="${esc(href)}" aria-label="${esc(caption)}"><img src="${esc(photo)}" alt="${esc(localized(item,'imageAlt')||caption)}" fetchpriority="high" decoding="async"><div class="photo-caption"><span>${esc([country?.english,item.english].filter(Boolean).join(' / '))}</span><p>${esc(caption)} <b>↗</b></p></div>${item.imageCredit?`<span class="photo-credit">${esc(item.imageCredit)}</span>`:''}</a>`:''}</section><nav class="destination-ribbon" aria-label="${word('next')}" style="--destination-count:${countries.length+1}"><span>${word('next')}<small>FIND YOUR NEXT STOP</small></span>${countries.map(c=>`<a href="#/${esc(c.continent)}/${esc(c.id)}">${esc(localized(c,'name'))} <b>↗</b></a>`).join('')}<a href="#/${esc(data.continents[0]?.id||'asia')}">${word('all')} <b>→</b></a></nav>`;
}
