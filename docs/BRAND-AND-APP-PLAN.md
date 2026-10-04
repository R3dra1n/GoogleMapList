# 品牌、網域與 App · 2026-10-04

## 網域
開發/測試不需要購買，自有網域不是 Firebase Email 註冊前提。正式公開建議品牌確定後再買一個網域，統一首頁、登入、支援與政策網址；網域不會自動完成 Google 品牌驗證。不要先為暫定名稱花費購買。

## 品牌語義與候選（創意草案，未做商標/域名可用性查核）
- go-to places：自己常去/信任的地方；比 go-to list 更貼近產品語意。
- saved places：已收藏地點，功能清楚，感情較少。
- hidden gems：冷門寶藏，不涵蓋熱門景點。
- bucket list：人生想完成的願望，不等於日常餐廳推薦。
- GoByYou：因你推薦而出發，短而帶人際感；創造型品牌，不是固定英文片語。
- Pocketfolk：口袋裡的人與好地方，社群溫度強；需副標交代旅行。
- Places We Keep：值得收進口袋的地方，文藝但較長。
- Your Next Place：從別人的收藏找到下一站，清楚直觀但較描述性。
- Trailnote：沿著他人的足跡與筆記走，偏旅遊，也可能讓人想到健行。
最貼近既有核心的創意方向：GoByYou；最貼近文藝收藏感：Places We Keep。
英文核心文案：Share your favorite places. Follow the people who inspire you.

## App 路線
先完成 Web 整合與帳號、刪除、管理/檢舉、API 邊界及測試，之後再評估共用程式碼的跨平台 App。不要只有包裝網頁：設計適合手機的地圖跳轉、分享接收、離線閱讀與通知（依使用者需求決定，不預設新增收藏功能）。
- iOS：Apple Developer Program 99 USD/年（依地區）；bundle ID、簽章、真機/TestFlight、截圖、審核帳號、隱私揭露與帳號刪除；Google 社群登入需評估 4.8 等效隱私登入，通常規劃 Sign in with Apple。
- Android：Play Console 一次 25 USD；package ID、簽章與發布金鑰、資料安全表、帳號刪除、真機測試；符合新個人帳號條件者需至少 12 人連續 14 天封閉測試，再申請正式發布。
- Firebase 加入 Android/iOS app 設定與原生登入設定，沿用相同 Firebase 專案/UID；不能把 Web Cookie 作為原生 App 全部登入方案。
- 隱私頁/支援頁/刪除請求頁仍需要可用網頁；App 並不消除網頁與網域規劃。

官方：
https://developer.apple.com/programs/enroll/
https://developer.apple.com/app-store/review/guidelines/
https://support.google.com/googleplay/android-developer/answer/6112435
https://support.google.com/googleplay/android-developer/answer/14151465
https://support.google.com/googleplay/android-developer/answer/13327111

## 2026-10-04 preliminary name check
- Go2List: readable as “go-to list”, memorable and functional; spoken spelling ambiguous (2/to/two). Exact web and indexed App Store/Play searches did not surface a clear same-name travel app. This is not trademark clearance.
- go2list.com is already registered: authoritative Verisign RDAP returned HTTP 200; registration 2008-06-16, expiration 2027-06-16. Do not present it as available. Source: https://rdap.verisign.com/com/v1/domain/go2list.com
- Pocket Atlas: existing map product https://pocketatlas.in/
- GoWithMe: existing travel companion https://gowithme.app/ and destination planner https://go-with.me/
- TrailNote: existing travel journal https://apps.apple.com/us/app/trailnote-travel-journal/id6786872295 and map workspace https://trailnote.co/
- PocketFolk: existing community platform https://pocketfolk.com/
- FollowGo: existing production tool https://www.up2blu.com/en
- Places We Keep: similar The Places We Keep store surfaced at https://theplaceswekeep.com/password; direct fetch failed, treat as search indication only.
- GoByYou: no clear same-name product in this limited search, but meaning/pronunciation less direct than Go2List; do not equate search absence with availability.
- New creative options: Palpin (pal + pin, two syllables, social map idea; surname/other uses surfaced), ByYourMap (clear “following your map” idea, longer). Neither cleared for domains or trademarks.
- Recommendation shortlist: Go2List for clarity; Palpin for compact brand sound. Keep current brand until user decides.
- Free apps can monetize optional creator subscriptions, clearly labeled affiliate travel bookings, or sponsorship. Developer enrollment fees are publisher overhead, not per-download user charges.
- Official fees: Apple $99/year https://developer.apple.com/programs/enroll/; Google Play $25 once https://support.google.com/googleplay/android-developer/answer/6112435.
- New personal Play accounts (after 2023-11-13): 12 continuously opted-in testers for 14 days, then production access application with testing/feedback details; not 24-hour running or automatic approval. Web pilot friends do not count toward Play testing until joining its closed track. https://support.google.com/googleplay/android-developer/answer/14151465

## Additional creative candidates (2026-10-04)
Coinages, not literal translations or cleared trademarks:
- Palpin: pal + pin; compact social-map identity.
- Pockami: pocket fragment + French ami (friend); friendly pocket-sharing concept.
- Tabipal: Japanese tabi (journey) + pal; travel with trusted people's recommendations.
- Tabinook: tabi + nook; collected travel corners.
- Pinamigo: pin + Spanish amigo (friend); friends' map pins.
- Tomopin: Japanese tomo (friend) + pin; existing handles surfaced, no clear same-name travel product in this limited search.
- Pinomi: pin + invented melodic suffix; six letters, surname uses surfaced. No claim that “omi” translates to friend.
Exact-name web searches found no clear travel product for Pockami, Tabipal, Tabinook or Pinamigo. This is preliminary search only; no domain/trademark availability established.
Rejected from this brainstorming: Pockora (expense app pockora.com), Roamori (travel roamorijapan.com), Mappami (mapping app apps.apple.com/it/app/mappami-eu/id6757313047), Viafolk (community viafolk.com), Palnook (palnook.com), Pinpals (travel app).
Language roots: https://dictionary.cambridge.org/dictionary/japanese-english/旅 ; https://dictionary.cambridge.org/ja/dictionary/japanese-english/友 ; https://dictionary.cambridge.org/us/dictionary/french-english/ami

## Correction after deeper exact-name searches
- Remove Palpin: existing Android app records https://apprecs.com/android/com.palpinapp.app/palpin and https://palpin.apk.watch/1.0.1 . Prior search was incomplete, not proof of availability.
- Remove Tabipal: actual Japanese tour company confirmed at https://tabipal.co.jp/ .
- Under user's stricter desire to avoid names already used, also set aside Pockami (existing creator alias), Tomopin (existing handles), Pinomi (existing creator channel and names).
- Retain only preliminary creative shortlist Tabinook (Japanese tabi + English nook) and Pinamigo (pin + Spanish amigo). No clear exact same-name product surfaced in current search; domain/trademark clearance remains unperformed. Do not present them as unused or registrable with certainty.
