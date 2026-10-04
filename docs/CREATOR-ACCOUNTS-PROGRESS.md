# 創作者帳號階段進度

基準：已部署 v1.1.0，GitHub Actions 36749777453 成功，正式提交 0db3fba。
開發分支：codex/creator-accounts。當前開發版 v1.2.0-preview.2，尚未部署。下方 preview.1 記錄為舊登入方案。

已完成：
- Worker 同源 `/account/` 登入／個人頁編輯介面。
- Google OAuth code + PKCE/state；Email 瀏覽器綁定、10 分鐘一次性連結。
- 邀請制、伺服器 Session、登出撤銷、CSRF、已登入帳號綁定第二方式；相同 Email 不自動合併。
- 姓名／簡介／社群連結私有草稿存入 D1，版本衝突檢查、跨帳號權限隔離。
- 頭像／Banner 瀏覽器壓縮、後端大小／檔頭驗證、私有媒體讀取。
- migration 0005 僅本機 SQLite 測試；既有 GitHub CMS 授權保持分開。
- 預設關閉，未購買資源、未新增付費服務、未執行雲端 migration。

待完成：
- Google 登入 Client ID / Secret；現有 GitHub OAuth 憑證不可替代。
- Resend 自有寄件網域驗證及 LOGIN_EMAIL_FROM；一般 Gmail 可收信，不能作為自有驗證網域。
- 憑證就緒後進行供應商真實登入／收信、雲端 D1 驗收與試用部署。
- 公開個人頁發布／內容審核／清單所有權與管理員策展為下一階段；目前只儲存私有草稿。

操作說明見 CREATOR-LOGIN-SETUP.md。測試使用模擬供應商，沒有真的寄信或向 Google 取得使用者授權。

驗證結果（2026-10-01）：56 項 Node 單元／API 測試全部通過；Chrome 模擬服務整合測試涵蓋 Email 登入、文字安全預覽、資料儲存／重新載入、WebP 頭像上傳、390px 手機版無橫向溢出、登出，全部通過。`npm run build` 成功。

## v1.2.0-preview.2 — Firebase 整合（2026-10-01）

登入方案改為 Firebase Google + Email/密碼；前述自建 OAuth/Resend 為保留的舊模式，不是新模式的部署需求。
- Firebase ID token 經 RS256、project audience/issuer、到期及近期登入驗證，再查帳號停用/撤銷狀態；僅接受已驗證信箱。
- Firebase UID 獨立關聯 D1 使用者，不因同名信箱自動合併舊帳號。
- 邀請制限制「創作者後台存取」；Firebase 端可能已建立帳號。CREATOR_REGISTRATION=open 可改開放。
- 本站 Session 最長一小時；Firebase 撤銷不會立即中斷既有本站 Session，本地停權會立即阻擋。
- Google、註冊、驗證信箱、密碼重設及個人頁草稿介面已接入；姓名、簡介、社群連結、頭像、Banner 保留。
- 尚未實作公開個人頁發布、清單所有權移轉及 Firebase 多登入方式綁定 UI。
- 60 項 Node 測試通過；模擬 Firebase SDK 的 Chrome 測試通過註冊/驗證、Google 登入、草稿儲存重載、手機版及登出；build 成功。這不等於供應商真實登入驗收。
- 雲端尚未啟用、migration 0006 尚未套用、尚未部署。GoogleMapList 專案已綁帳單，Firebase 導入會變 Blaze；使用者選擇解除帳單，目前等待確認該新專案沒有其他付費資源，停在 Google 的停用計費確認視窗。

## 恢復點（2026-10-02）
- 使用者指出翻譯 API 可能屬於其他專案，已取消停用計費確認，未解除帳單。
- 已讀取 GoogleMapList（robust-episode-510303-c7）完整 23 項已啟用 API 清單，未見 Cloud Translation API；當時一天流量無資料。這支持翻譯不在該專案，但不是實際 GitHub secret 所屬專案的完整證明。
- 翻譯工作流程使用 GitHub Actions GOOGLE_TRANSLATE_API_KEY，呼叫 Translation v2；程式未硬編碼專案 ID。GitHub 不提供讀回 secret 值。
- 下一步需從 Google Cloud 憑證與翻譯服務頁核對實際 key 所屬專案，再決定帳單解除。尚未確認 gmail-506417 是否為翻譯專案。
- Firebase 預設寄信網域可支援 Email/密碼註冊、驗證與密碼重設，無須購買自有網域；App 亦然。

## Firebase 設定接續
- 使用者已回覆停用 GoogleMapList（robust-episode-510303-c7）的計費；此狀態為使用者確認，尚未從控制台獨立驗證。gmail-506417 的翻譯服務維持原設定。
- 下一步在 Firebase 重新讀取專案並確認 Spark，完成既有專案匯入（不启用 Analytics/Gemini），再設定 Google/Email-password Authentication 和 Web App 公開 SDK config。
- 尚未部署或套用雲端 migration。

## pocket Firebase config 已接入（2026-10-02）
- 使用使用者提供的 pocket-540c0 Web config 設定 worker/wrangler.toml；AUTH_PROVIDER=firebase，invite 模式，功能開關仍 false。
- 唯讀呼叫 Identity Toolkit projects 成功 HTTP 200，專案號 449491437429；authorizedDomains 僅 localhost、pocket-540c0.firebaseapp.com、pocket-540c0.web.app。
- 尚需加入 pocket-atlas-auth.huayang-hsu.workers.dev，確認 Google / Email-password providers 啟用後，才能真實登入驗收。
- 本輪 npm test 60/60、npm run build 通過。未部署、未執行雲端 migrations、未建立真實使用者。

## 邀請制試用已部署（2026-10-02）
- Firebase authorizedDomains 已唯讀確認包含 pocket-atlas-auth.huayang-hsu.workers.dev。
- D1 備份 /tmp/pocket-before-firebase.sql；0005、0006 migrations 成功，已加入管理者試用信箱邀請。
- Worker 版本 5df6e132-cd26-458c-b8a5-bacb93576802 已部署，CREATOR_ACCOUNTS_ENABLED=true，invite 模式。
- 線上 /account/ 200、config 200 且 Firebase pocket-540c0 / invitationOnly=true；未登入 me 401、無效 token 401。
- 真實 Google/Email 登入及雲端草稿儲存尚待使用者完成驗收。公開網站仍 v1.1.0，帳號功能屬 v1.2.0-preview.2 試用；個人頁仍為私人草稿。

## v1.2.0-preview.3（2026-10-02）
- Firebase 帳號頁新增逐筆社群連結表單（名稱/HTTPS 網址、最多五筆、可移除），保留後端驗證與資料格式。
- 私人個人頁預覽可展開及返回編輯，包含姓名、簡介、圖片與社群連結；仍未提供公開分享網址。預覽包含尚未儲存的編輯，需按儲存才持久化。
- 登入與編輯介面調整留白、按鈕層級、手機版；繁體中文/English 手動切換，首次按瀏覽器語言選擇（非中文預設英文），不自動翻譯使用者內容。
- 60 項測試、build、Chrome 模擬 Firebase 註冊/登入/連結儲存重載/預覽切換/語言持久化/手機版檢查通過。

## v1.2.0-preview.4（2026-10-02）
- 儲存按鈕旁顯示已修改/儲存中/已儲存/未完整儲存（繁中及英文）；儲存期間再編輯仍標為已修改。圖片處理完成前停用儲存。
- 頭像遺失診斷：線上 creator_media 存有 avatar WebP BLOB 11620 bytes，未刪除。D1 讀取 BLOB 回傳 number[]，原本 Response(array) 會轉成文字，現轉 Uint8Array 傳回圖片。
- SQLite mock 改為符合 D1 的 Array 讀取格式；媒體回傳逐位元組驗證、Chrome 實際圖片上傳/儲存/登出/再登入解碼測試通過。60 項單元/API 測試及 build 通過。
- 正式首頁尚未整合帳號/個人頁發布，維持私有草稿試用。

## v1.2.0-preview.5 社群測試站
- 新增 /account/community 首頁與 #manage 個人清單管理，沿用 Firebase 帳號；帳號頁返回測試首頁並新增發布入口。
- 0007_creator_pilot.sql 新增私人清單、已發布個人頁/圖片/清單快照；不自動公開已有資料。
- 個人頁明確確認發布、清單草稿/發布/取消發布、作者專屬頁、最新排序與分頁、多帳號隔離。
- 每帳號20份、每天300次寫入；既有正式GitHub Pages不變。詳細流程與限制見 COMMUNITY-PILOT.md。
- D1 部署前備份：/tmp/pocket-before-community.sql。

## 2026-10-03 恢復與部署完成
- 前次部署因額度導致自動核准審查未完成，沒有執行；本次正常部署成功。
- Worker version: dade872a-3a77-4aec-a53f-654ade590853，應用版本 v1.2.0-preview.5。
- 線上 community 200 並含正確版本；account 頁含發布入口；公開 feed 200 且 items=[]；未登入 mine 401。
- 上輪 63 項測試及兩帳號 Chrome 模擬發布流程已通過，程式未另修改，未重跑重複測試。
- 尚待使用者真實發布驗收、提供受邀測試者 Email。未發送邀請信、未自動發布現有私人草稿。

## 2026-10-03 · v1.2.0-preview.6
- 社群後台改為編輯與即時卡片預覽雙欄；手機單欄。個人頁頭像與 Banner 重疊。
- 清單支援 WebP 封面、介紹、目的地與標籤，公開列表改為照片卡片。圖片使用既有 D1，不新增服務。
- 個人頁按儲存即公開；清單改為公開／隱藏選擇與單次儲存，預設公開。初次公開清單會公開已儲存個人頁。
- 64 項單元/API 測試、Firebase 瀏覽器流程、雙帳號社群瀏覽器流程通過；建置成功。測試使用本機資料，未替使用者發布內容。
- 正式 GitHub Pages 仍與此測試站分開；邀請制不變。

## 2026-10-03 · v1.2.0-preview.7
- 卡片標題連結延伸整張卡片，移入浮起；作者與編輯按鈕保留各自操作。移除重複地圖按鈕。
- 編輯個人資料只保留頂部一處，不附加帳號名稱。卡片署名標明整理者。
- 圖片描述改名為圖片替代文字，標明非可見圖說。表單保留單一儲存動作；新增入口移至已儲存清單區，僅開空白表單。

## 2026-10-03 · v1.2.0-preview.8
- 我的清單預設總覽，新增/編輯開啟表單與預覽，提供返回總覽；移除重複公開個人頁區塊。
- 頭像下拉選單提供編輯資料、我的清單、實際登出，支援 Escape 與外部點擊關閉。
- 缺圖/載入失敗優先显示替代文字。新清單署名預設作者，可選整理者/分享者；分享者需原作者，來源網址選填並驗證 HTTPS。既有缺省角色仍顯示整理者。
- 65 項 API/單元測試通過。Chrome 雙帳號測試涵蓋總覽、新增、替代文字、公開/隱藏、選單登出與 session 刪除。

## 2026-10-03 · 開放測試註冊
- 依使用者明確要求，CREATOR_REGISTRATION 改為 open，允許未受邀的已驗證 Firebase 帳號首次建立本站使用者。
- Google 與 Email/密碼原有流程不變，Email 驗證、所有權、停權、限流與清單上限保留。無新增付費資源。
- 65 項測試通過，包含未受邀 open 註冊、重複登入不重建使用者、未驗證帳號拒絕。

## 2026-10-03 · v1.2.0-preview.9
- Google/Email 完成登入後導向測試首頁；已登入者仍可透過選單進入個人資料編輯。
- 個人編輯頁頭像選單統一提供編輯資料、我的清單與登出，移除重複發布清單入口。
- 卡片署名加入作者小頭像，缺圖以姓名首字替代。LINE WebView 顯示改用 Safari/Chrome 的提示，不繞過 Google OAuth 限制。
- 尚未提供 Google/密碼登入方式綁定介面，不建立同 Email 第二個本站使用者。

## 2026-10-03 · v1.2.0-preview.10 / 首頁設計決策
- 卡片署名順序：角色文字 → 小頭像 → 名稱。
- 使用者明確要求：正式首頁沿用原 GitHub Pages 首頁的版式與視覺，不使用目前簡化社群測試首頁取代。
- 後續整合新版卡片資訊：角色/頭像/名稱、地點、Tag、右下角人氣。人氣只沿用有真實來源的統計，無資料不得補造。
- 此次只部署測試卡片署名順序；正式首頁整合與社群資料串接仍待後續實作。

## 2026-10-04 · v1.2.0-preview.11
- 原首頁資產以既有 Worker ASSETS 部署於 /preview/，所有帳號 Cookie/API 同源；GitHub Pages 正式版未切換。
- 原導航、每日發現、創作者、精選與搜尋保留；新增首頁社群區，分頁讀取公開清單，卡片含角色/頭像/名稱、目的地與 Tag。未捏造社群人氣。
- 登入後前往 /preview/，個人資料頁與管理頁的測試首頁入口更新。首頁頭像選單可編輯、管理與實際登出。
- 原靜態資料搜尋與社群清單搜尋/創作者目錄目前尚未合併，社群作者點入仍為測試個人頁。此版為整合驗收版，不等於所有正式發布缺口已完成。
- 65 項測試通過；整合 Chrome 驗證原首頁卡片、同源 session 選單/登出、390px 無橫向溢出。線上 /preview/、app.js、data.json、Fuse 模組均 200 且類型正確。
- deploy:auth 現在會先 build，避免 Worker 與資產版本不同步。

## 2026-10-04 — v1.2.0-preview.12
- Remove standalone community section; normalize public community snapshots into original catalog renderer, search, detail routes and creator directory.
- Six daily discoveries share one grid: up to three community slots (more when editorial pool is short); remaining slots editorial, stable Taipei-day rotation within each pool. No fabricated popularity for community entries.
- All catalog cards show author avatar/initial and destination when available. No duplicate open-list button.
- New paginated public creator directory excludes hidden/suspended profiles and exposes only published public payloads, never email or internal user ID. Static and account profiles remain separate identities.
- Validation: 66 unit/API tests; browser fixture with two published users checks merged home, creator directory, detail link, individual list ownership display, mobile overflow and logout.
- GitHub production remains unchanged; release target is existing Cloudflare preview.

## 2026-10-04 — v1.2.0-preview.13
- Keep original-author vs site-collector attribution distinction.
- Static William profile has no avatar and is not implicitly merged with a signed-in account. Missing photos now show a neutral SVG person instead of an initial; published photos remain intact.
- Destination line has 26px top separation and is pushed toward the card footer.
- Creator tiles reserve identical title, two-line bio and count slots, even when bio is empty.
- Home creator rail includes all public profiles: desktop three across, tablet two, mobile partial next card; scroll-snap and previous/next buttons when more than three. All-creators directory remains available.
- 66 unit/API tests passed; integration browser verifies equal creator tile heights/title positions with an empty biography, profile routes, menu/logout and mobile overflow.

## 2026-10-04 — v1.2.0-preview.14
- Center entire attribution row with flex alignment; default avatar now a filled illustrated SVG rather than empty person outline.
- Destination font reduced to .78rem; footer reserves two-row space so location baselines are stable with ordinary tag counts.
- Public community profile adapter now includes banner URL; profile intro displays saved banner with overlapping avatar. Failed/missing images leave a soft fallback background.
- 66 tests and integration browser passed. Preview only.

## 2026-10-04 — v1.2.0-preview.15
- User requested author first-character avatars: restored first Unicode code point in a centered circular blue-tinted avatar; uploaded public photos still overlay it and missing-image fallback reveals the character.
- Examples: William W, 奔跑的長工 奔, 旅行者 旅.
- 66 tests and integration browser passed; deployed existing preview Worker.

## 2026-10-04 — v1.2.0-preview.16
- Moved location/tags/popularity toward card bottom: removed reserved empty tag-row height, aligned popularity with tags, retained 16px bottom padding and larger separation from description.
- Build and integration browser checks passed. Live preview footer measured after deploy; production GitHub Pages unchanged pending user review.
- Worker deployment: 1bf3f717-c66c-45cc-a826-84c4389ce670.
