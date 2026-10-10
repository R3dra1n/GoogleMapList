import test from 'node:test';
import assert from 'node:assert/strict';
globalThis.document={documentElement:{dataset:{}}};
globalThis.matchMedia=()=>({matches:false,addEventListener(){}});
const {homeHero}=await import('../public/home-hero.js');
const {setLanguage}=await import('../public/i18n.js');
const data={continents:[{id:'asia'}],countries:[{id:'taiwan',name:'台灣',english:'Taiwan',continent:'asia'}],cities:[{id:'hualien',name:'花蓮',country:'taiwan',image:'assets/coast.jpg',imageCredit:'Photographer',_imageVariants:[{path:'media/coast.webp'}]}],themes:[]};
test('homepage uses full resolution cover and selected list link',()=>{
 const html=homeHero({...data,home:{heroList:'cities/hualien',destinations:['taiwan']}});
 assert.match(html,/src="assets\/coast.jpg"/);assert.match(html,/href="#\/lists\/cities\/hualien"/);
});
test('missing/unpublished hero references fall back and text is escaped',()=>{
 const html=homeHero({...data,home:{heroList:'themes/missing',title:'<script>\nnext',description:'<b>text</b>'}});
 assert.match(html,/&lt;script&gt;<br>next/);assert.doesNotMatch(html,/<script>/);
 assert.match(html,/cities\/hualien/);
 assert.doesNotThrow(()=>homeHero({...data,cities:[]}));
});
test('default homepage text follows language',()=>{
 setLanguage('en');assert.match(homeHero(data),/Follow your favorite people/);
 setLanguage('zh-Hant');assert.match(homeHero(data),/跟著喜歡的人/);
});
