import {language} from './i18n.js';
// Keep pagination local to the current result set; filtering replaces the cards.
export function setupCardPagination(grid){
 const media=matchMedia('(max-width: 600px)');
 const button=document.createElement('button');
 button.className='cards-more';button.type='button';button.hidden=true;
 button.setAttribute('aria-controls',grid.id);grid.after(button);
 let shown=6;
 const cards=()=>Array.from(grid.children).filter(el=>el.matches('.destination-card'));
 const update=()=>{const items=cards();items.forEach((el,i)=>{el.hidden=media.matches&&i>=shown;});button.hidden=grid.hidden||!media.matches||items.length<=shown;button.textContent=({'zh-Hant':'查看更多','zh-Hans':'查看更多',en:'Show more',ja:'もっと見る',ko:'더 보기'}[language]||'Show more');};
 button.onclick=()=>{const first=cards()[shown];shown+=6;update();first?.querySelector('a')?.focus({preventScroll:true});};
 new MutationObserver(()=>{shown=6;update();}).observe(grid,{childList:true,attributes:true,attributeFilter:['hidden']});
 media.addEventListener('change',update);update();
}
