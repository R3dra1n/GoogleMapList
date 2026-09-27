import {readPreference} from './preferences.js';
export const languages=['zh-Hant','zh-Hans','en'];
export let language=readPreference('atlas-language','zh-Hant');
if(!languages.includes(language))language='zh-Hant';
export function setLanguage(value){language=languages.includes(value)?value:'zh-Hant';document.documentElement.lang=language;}
const words={
 brand:['William 的口袋地圖','William 的口袋地图',"William’s Pocket Atlas"],
 explore:['探索目的地','探索目的地','Explore destinations'],
 heading:['下一站，從口袋清單出發。','下一站，从口袋清单出发。','Your next stop starts here.'],
 intro:['想吃的、想去的，都收在這裡。\n選一個目的地，帶著地圖慢慢探索。','想吃的、想去的，都收在这里。\n选一个目的地，带着地图慢慢探索。','Places to eat. Places to wander.\nChoose a destination and take your time.'],
 destinations:['目的地','目的地','Destinations'],
 next:['下一站，','下一站，','Next stop: '],
 discover:['探索','探索','Explore '],
 food:['美食','美食','Food'],sights:['景點','景点','Sights'],soon:['整理中','整理中','Coming soon'],
 combined:['綜合清單 · 美食與景點共用','综合清单 · 美食与景点共用','Combined food & sights list'],
 cities:['個目的地','个目的地','destinations'],countries:['個國家／地區','个国家／地区','countries / regions'],
 saveTitle:['把喜歡的地方，放進你的地圖。','把喜欢的地方，放进你的地图。','Keep your favourite places close.'],
 saveText:['打開清單後，在 Google Maps 點「儲存／追蹤」，下次出門就能找到。','打开清单后，在 Google Maps 点「保存／关注」，下次出门就能找到。','Open a list in Google Maps, then choose Save or Follow to find it on your next trip.'],
 footer:['一點收集，一點分享，下一站見。','一点收集，一点分享，下一站见。','A few good places, shared. See you at the next stop.'],
 credits:['影像來源','影像来源','Photo credits'],admin:['管理清單','管理清单','Manage lists'],close:['關閉','关闭','Close'],
 original:['原始照片','原始照片','Original photo'],license:['授權條款','授权条款','License'],edited:['圖片經縮放與版面裁切；授權沿用原作。','图片经缩放与版面裁切；授权沿用原作。','Images resized and cropped; original licenses apply.'],
 noPhotos:['目前使用預設封面。','目前使用默认封面。','Default covers are in use.'],
 missing:['這個目的地還沒收進口袋','这个目的地还没收进口袋','This destination is not available yet'],
 unavailable:['此區域尚未公開，或網址已變更。','此区域尚未公开，或网址已变更。','This destination is unpublished or the link has changed.'],
 back:['回到目的地目錄','回到目的地目录','Back to destinations'],loadError:['暫時無法載入清單，請重新整理再試一次。','暂时无法载入清单，请刷新再试一次。','Unable to load the lists. Please refresh and try again.'],
 theme:['外觀','外观','Appearance'],system:['跟隨系統','跟随系统','System'],light:['淺色','浅色','Light'],dark:['深色','深色','Dark'],
 language:['語言','语言','Language'],skip:['跳至目的地','跳至目的地','Skip to destinations'],
 mapsOpen:['在 Google Maps 開啟新分頁','在 Google Maps 打开新标签页','Open Google Maps in a new tab'],
 story:['旅行筆記與地圖','旅行笔记与地图','Travel notes & map'],myMap:['我的地圖','我的地图','My Maps'],
 mapNotice:['地圖由 Google 提供，載入後會連線至 Google。若無法顯示，請用新分頁開啟。','地图由 Google 提供，加载后会连接至 Google。如果无法显示，请用新标签页打开。','This map is hosted by Google. Loading it connects to Google. If it is unavailable, open it in a new tab.'],
 loadMap:['載入互動地圖','加载互动地图','Load interactive map'],openMap:['開啟完整地圖 ↗','打开完整地图 ↗','Open full map ↗'],
 fallback:['尚未提供此語言版本，以下顯示原文。','尚未提供此语言版本，以下显示原文。','This translation is not available yet. Showing the original text.']
};
export const t=key=>words[key]?.[languages.indexOf(language)]||key;
export function localized(item,key){const suffix=language==='en'?'En':language==='zh-Hans'?'Hans':'';return suffix?(item[key+suffix]||(key==='name'&&language==='en'?item.english:'')||item[key]||''):(item[key]||'');}
