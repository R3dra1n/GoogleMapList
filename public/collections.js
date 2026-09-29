import {language} from './i18n.js';
import {mapProvider} from './model.js';
const words={themes:['主題精選','主题精选','Collections','テーマ特集','테마 모음'],empty:['主題清單整理中，敬請期待。','主题清单整理中，敬请期待。','Collections are coming soon.','テーマ特集は準備中です。','테마 모음을 준비하고 있습니다.'],open:['開啟清單','打开清单','Open collection','リストを開く','목록 열기'],google:['Google Maps','Google Maps','Google Maps','Google Maps','Google Maps'],amap:['高德地圖','高德地图','Amap','高徳地図','가오더 지도'],baidu:['百度地圖','百度地图','Baidu Maps','百度地図','바이두 지도'],tip:['選擇可用的地圖平台開啟；收藏方式依平台而異。','选择可用的地图平台打开；收藏方式依平台而异。','Open an available map platform; saving options vary by provider.','利用可能な地図を選んで開いてください。保存方法はサービスによって異なります。','사용 가능한 지도를 선택하세요. 저장 방법은 서비스마다 다릅니다.']};
export const collectionText=key=>words[key][['zh-Hant','zh-Hans','en','ja','ko'].indexOf(language)];
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function providerButton(url){const provider=mapProvider(url);return provider?`<a class="map-button secondary" href="${escape(url)}" target="_blank" rel="noopener noreferrer">${collectionText(provider)} ↗</a>`:'';}
export function alternativeMaps(item){const links=['amap','baidu'].filter(p=>item[p]&&item[p]!==item.link).map(p=>providerButton(item[p])).join('');return links?`<div class="alternative-maps">${links}</div>`:'';}
