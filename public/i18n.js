import {readPreference} from './preferences.js';
export const languages=['zh-Hant','zh-Hans','en','ja','ko'];
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
const extra={
brand:['William の旅マップ','William의 여행 지도'],explore:['旅先を探す','여행지 둘러보기'],heading:['次の旅は、この地図から。','다음 여행은 이 지도에서 시작하세요.'],intro:['行きたい場所も、食べたいものも。\n旅先を選んで、自分のペースで歩こう。','가고 싶은 곳과 먹고 싶은 음식.\n여행지를 고르고 천천히 둘러보세요.'],destinations:['旅先','여행지'],next:['次の旅先：','다음 여행지: '],discover:['探索：','둘러보기: '],food:['グルメ','맛집'],sights:['観光','명소'],soon:['準備中','준비 중'],combined:['グルメ・観光の共通リスト','맛집과 명소 통합 목록'],cities:['か所の旅先','개 여행지'],countries:['か国・地域','개 국가 / 지역'],saveTitle:['お気に入りを、自分の地図に。','마음에 드는 장소를 내 지도에 저장하세요.'],saveText:['Google マップでリストを開き、「保存／フォロー」を選んでください。','Google 지도에서 목록을 열고 저장 또는 팔로우를 선택하세요.'],footer:['素敵な場所を、少しずつ。次の旅で会いましょう。','좋은 장소를 조금씩 나눠요. 다음 여행에서 만나요.'],credits:['写真の出典','사진 출처'],admin:['リスト管理','목록 관리'],close:['閉じる','닫기'],original:['元の写真','원본 사진'],license:['ライセンス','라이선스'],edited:['画像は縮小・トリミングされています。元のライセンスが適用されます。','사진은 크기 조정 및 자르기가 적용되었으며 원본 라이선스를 따릅니다.'],noPhotos:['標準の表紙を使用しています。','기본 표지를 사용 중입니다.'],missing:['この旅先はまだ公開されていません','아직 공개되지 않은 여행지입니다'],unavailable:['未公開の旅先か、変更されたリンクです。','공개되지 않은 여행지이거나 주소가 변경되었습니다.'],back:['旅先一覧に戻る','여행지 목록으로 돌아가기'],loadError:['読み込めませんでした。ページを再読み込みしてください。','목록을 불러올 수 없습니다. 새로고침해 주세요.'],theme:['外観','화면 모드'],system:['システム','시스템 설정'],light:['ライト','라이트'],dark:['ダーク','다크'],language:['言語','언어'],skip:['旅先へスキップ','여행지로 건너뛰기'],mapsOpen:['Google マップを新しいタブで開く','새 탭에서 Google 지도 열기'],story:['旅のメモと地図','여행 노트와 지도'],myMap:['マイマップ','내 지도'],mapNotice:['Google が提供する地図です。読み込むと Google に接続します。表示できない場合は新しいタブで開いてください。','Google에서 제공하는 지도입니다. 불러오면 Google에 연결됩니다. 표시되지 않으면 새 탭에서 여세요.'],loadMap:['地図を読み込む','지도 불러오기'],openMap:['地図全体を開く ↗','전체 지도 열기 ↗'],fallback:['翻訳がないため原文を表示しています。','아직 번역이 없어 원문을 표시합니다.']
};
for(const [key,value] of Object.entries(extra))words[key].push(...value);
words.update=['有新的目的地內容','有新的目的地内容','New destination updates','旅先情報が更新されました','여행지 정보가 업데이트되었습니다'];
words.refresh=['載入最新內容','加载最新内容','Load updates','最新情報を読み込む','업데이트 불러오기'];
export const suffixes={'zh-Hant':'','zh-Hans':'Hans',en:'En',ja:'Ja',ko:'Ko'};
export const t=key=>words[key]?.[languages.indexOf(language)]||key;
export function localized(item,key){const suffix=suffixes[language];return suffix?(item[key+suffix]||(key==='name'&&language==='en'?item.english:'')||item[key]||''):(item[key]||'');}

words.brand=['口袋地圖','口袋地图','Pocket Atlas','旅のポケットマップ','포켓 지도'];
