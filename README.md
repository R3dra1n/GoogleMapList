# William 的口袋地圖

以目的地為中心的 Google Maps 清單目錄。靜態網站以 GitHub Pages 發佈；Decap CMS 管理內容；Cloudflare Worker 處理 GitHub OAuth。

## 本機預覽

Node.js 22 或以上，前台不需要安裝套件。

```sh
npm test
npm run dev
```

開啟 http://127.0.0.1:4173 。修改後執行 `npm run build` 再重新整理。`dist/` 是生成的網站，不提交 Git。Decap CMS 固定為 3.16.3，從 unpkg 載入；它提供自己的 React 與編輯器。

## 管理清單

網站頁尾 → 管理清單 → GitHub 登入。

1. 有新的大洲或國家時，先新增父層，儲存後再新增城市。
2. 新增城市／縣市，選擇國家，填寫名稱、美食與景點分享連結。大洲由國家決定。
3. 兩個入口可共用連結；缺少連結顯示「整理中」。
4. 封面可上傳 JPEG、PNG、WebP、GIF。填寫替代文字；使用他人照片時，填署名、來源與授權。替換既有照片時也要更新這三欄。
5. 顯示順序以數字由小到大排列；公開顯示開關可下架。大洲／國家不提供刪除，防止破壞子層；隱藏即可。城市支援刪除。
6. 儲存會提交到 GitHub；網站要等 Actions 完成才更新。後台上方的「查看發佈進度」可核對結果。失敗時上一版網站仍可用。

識別碼自動產生並鎖定。改名稱不會修改路由或父子關係。內容為公開倉庫資料；「隱藏」只是不在網站顯示，不適合儲存私人資訊。

## 首次連接認證

GitHub Pages 可以獨立上線。管理後台必須完成下面的一次性設定；未設定時登入入口會明確顯示尚未連接，不會導向虛構的認證網址。

1. 登入 Cloudflare：`wrangler login`。
2. Worker 已部署至 `https://pocket-atlas-auth.huayang-hsu.workers.dev`。日後更新可執行 `npm run deploy:auth`。
3. 到 https://github.com/settings/developers → OAuth Apps → New OAuth App，填寫：
   - Application name：TravelLikeLocal（可自訂）
   - Homepage URL：https://r3dra1n.github.io/GoogleMapList/
   - Authorization callback URL：`https://pocket-atlas-auth.huayang-hsu.workers.dev/callback`
   - Allow wildcard matching 與 Enable Device Flow 保持關閉。Expire user access tokens 可保持開啟；目前 Decap GitHub backend 不自動續期，過期後請登出再登入。
4. 將 Client ID 和 Client Secret 填入本機 `worker/.dev.vars`（此檔已被 Git 忽略），執行 `node scripts/configure-auth.mjs` 即可安全上傳。腳本不輸出密鑰。也可使用終端機互動輸入：

```sh
wrangler secret put GITHUB_CLIENT_ID --config worker/wrangler.toml
wrangler secret put GITHUB_CLIENT_SECRET --config worker/wrangler.toml
```

5. 執行 `node scripts/connect-auth.mjs https://pocket-atlas-auth.huayang-hsu.workers.dev`。腳本確認 `/health` 就緒後更新公開的後台網址。
6. 提交與推送這個設定。從正式網站 `/admin/` 登入驗證。允許的 GitHub 帳號必須對 `R3dra1n/GoogleMapList` 有 push 權限。

OAuth 使用 `public_repo` scope，隨機 state + Secure/HttpOnly/SameSite=Lax cookie，精確的 postMessage origin/opener 檢查。GitHub Client Secret 不會進入網站或 Git；部署於 Worker secrets，本機設定檔也受到 Git 忽略保護。OAuth 只允許正式 GitHub Pages origin；本地預覽不能完成正式登入。

## 部署

`.github/workflows/pages.yml` 在 main 更新時測試、驗證內容、建置並發佈。GitHub 倉庫 Settings → Pages 的 Source 設為 GitHub Actions。

資料夾：
- `content/continents`：大洲
- `content/countries`：國家／地區，引用大洲 ID
- `content/cities`：城市，引用國家 ID
- `public/uploads`：後台上傳的照片
- `worker`：OAuth 認證服務

直接在 GitHub 改資料亦可，但需保留 ID 與檔名一致；不應刪除仍被引用的父層。建置會阻止孤兒關係、重複 ID、不安全的連結與不存在的圖片。

### 回復失敗修改

在 GitHub 檢查 Actions 的失敗訊息，修正內容或 revert 對應 commit。下一次成功發佈將更新網站。

## 測試

`npm test` 包含層級、隱藏、排序、路由、链接和 OAuth 授權檢查。固定初始內容是測試 fixture，不限制日後新增或刪除真實目的地。`npm run build` 對目前內容執行驗證。

`tests/browser.cjs` 使用 Playwright 驗證前台及以記憶體測試 backend 驗證 CMS；需可用的 Playwright/Chrome 與已啟動的本機預覽。測試不修改 GitHub 正式內容。

## 照片

所有初始照片源自 Wikimedia Commons，作者、來源與 CC 授權存於各內容檔。照片已縮小並使用 CSS 裁切；網站「影像來源」提供署名與授權。相片沿用原作授權，不代表網站程式套用相同授權。

## 外觀、多語言與旅行筆記

前台右上角可選「跟隨系統／淺色／深色」與繁體中文、简体中文、English、日本語、한국어；選擇記在本機瀏覽器。現有目的地已提供五語名稱與介紹（原本空白的介紹保持空白）。新內容的翻譯欄位可留空，前台回退原文；英文地名沿用「英文名稱」。新增內容不會自動翻譯，管理介面本身維持繁體中文。

城市編輯器底部可填「旅行筆記」五種語言與「Google 我的地圖」。旅行筆記目前為分段文字，空行分段，不執行 HTML。任一欄有內容即顯示文章入口；城市文章網址為 `#/大洲ID/國家ID/城市ID`，可分享與重新整理。

My Maps 欄位接受 Google 完整網址（`https://www.google.com/maps/d/viewer?mid=...`，也接受 edit/embed），不接受 iframe 原始碼或短網址。請先在 Google My Maps 開放地圖公開瀏覽。網站僅在點擊「載入互動地圖」後連線 Google，也提供完整地圖連結；不複製、不修改 Google 上的內容。

照片：編輯城市或國家 → 封面照片 → 選擇圖片／上傳 → 填圖片描述 → 發布。可使用自己的圖片；更換照片時同步更新或清空舊署名、來源、授權。照片搜尋與自動下載尚未接入，避免把錯誤地點或未確認授權的素材直接發布。

`tests/features-browser.cjs` 驗證主題、語言記憶、文章深層連結、文字轉義與按需地圖嵌入；互動地圖測試使用模擬資料，實際地圖需由維護者貼入公開 My Maps 網址。

前台會在回到頁面及每分鐘檢查新版本；若內容已發布，顯示「載入最新內容」提示，點擊後更新資料並保留當前區域。Google My Maps 在城市卡片上以「我的地圖」入口呈現，進入文章頁後可載入互動地圖。

目前語言切換使用已儲存的翻譯，尚未連接自動翻譯服務；沒有填寫的語言回退原文。可另外配置發布時自動翻譯，應先選定服務、確認費用及安全保存 API 憑證。

## Google 自動翻譯接入

使用 Cloud Translation Basic v2 的 `nmt` 標準模型。中文名稱、介紹、圖片描述與旅行筆記會翻成简体中文、English、日本語、한국어，直接寫入原有 JSON 欄位，英文名稱寫入 `english`。連結、ID、圖片來源與作者不送翻譯。

- 非空且沒有機器記錄的譯文視為人工內容，永不自動覆蓋。
- 機器譯文在中文原文變更時更新；若你改過譯文，改視為人工內容。要重新自動翻譯，清空該譯文欄位再發布。
- `translation/state.json` 保存來源／結果指紋及可重用的翻譯快取。這不是密鑰，也不會發佈到網站。
- 發布後等 Actions 完成，再重新開啟後台內容，便能看到新增譯文。請避免用仍開著的舊表單覆蓋新譯文。
- 沒有 API key 時保留現有內容並正常發布。已配置但 API 失敗時，停止發布，上一版網站保留；原文提交仍在 GitHub。
- 每次工作流程最多送出 50,000 字符，超限在呼叫 Google 前停止。這不是每月帳單上限；Google 免費額度與其他專案用量需在 Cloud Console 核對。單欄文字目前上限 5,000 字符。
- 正常重複建置不會再翻譯相同內容。API 成功但後續 Git 推送失敗時，重跑可能再次產生用量；不保證分散式流程恰好呼叫一次。

設定步驟：
1. 在 Google Cloud 建立或選擇專案，連接結算帳戶，啟用 **Cloud Translation API**。
2. 在「API 和服務 → 憑證」建立 API key，將 API 限制設為 **Cloud Translation API**。此 key 供 GitHub Actions 伺服器使用，不是瀏覽器 referrer key。
3. 在 GitHub 倉庫 Settings → Secrets and variables → Actions → New repository secret，名稱填 `GOOGLE_TRANSLATE_API_KEY`，值填 API key。不要放在公開程式碼、CMS 欄位或聊天裡。
4. 也可填入本機 `.env.translation`，執行 `node scripts/configure-translation.mjs` 安全上傳（此檔已被 `.gitignore` 排除）。
5. 在 Actions → Validate and publish Pocket Atlas → Run workflow，觸發第一次翻譯。之後正常發布內容就會自動執行。

檢查待翻譯數量且不呼叫 API：`node scripts/translate-content.mjs --check`。只有 GitHub Actions 的翻譯步驟會取得密鑰；網站訪客不呼叫 Google 翻譯 API，也不會取得密鑰。

## 讀者推薦與自動搜圖候選

前台頁尾「推薦好地方」開啟五語推薦表單，收集國家、城市、名稱、類型、Google Maps 連結、理由和選填 Email。推薦不是公開留言：資料儲存在 Cloudflare D1 `pocket-atlas-recommendations`，不進公開 Git、不放入網站資料檔。沒有 Email 通知功能；維護者從收件箱查看。訪客每個連線來源每小時最多 5 次新推薦，使用隨機鹽雜湊計數，不保存原始 IP；另有隱藏誘捕欄位、長度校驗與冪等收件 ID。這些是基礎防垃圾機制，若遇到大量濫用可再接 Turnstile。

管理後台上方 →「推薦收件箱／搜圖」→ GitHub 登入。工具使用獨立登入工作階段，權限仍由同一 GitHub 倉庫的 push 權限決定。每個管理 API 請求都重新核對權限；令牌只放在目前分頁的 sessionStorage，過期後重新登入。

- 收件箱：待審核、已採納、略過，支援分頁與永久刪除。Email 不公開。採納只更新審核狀態，不直接修改 Google Maps 清單。
- 搜圖：先儲存國家／城市，再選目的地，自動以名稱與父區域搜尋 Wikimedia Commons。可修改關鍵字；找不到時可以繼續自行上傳。
- 候選只納入可辨識的 CC BY、CC BY-SA、CC0／公有領域授權 JPG/PNG/WebP，顯示作者、原圖與授權。搜尋不保證地點正確，需維護者選擇。
- 確认後下載最多 2.5 MB 的預覽尺寸圖片到 `public/uploads`，與圖片描述、署名、來源、授權一起原子提交到 GitHub；原來的圖檔保留，以免破壞其他引用。新的圖片描述翻譯欄位會清空並由既有翻譯流程補齊。
- 保存使用內容 SHA 與非強制更新，遇到其他編輯搶先修改時要求重新選擇，不覆盖。請先儲存並關閉同一筆 CMS 舊表單，再選圖；完成後重新開啟內容。

Worker 設定：`DB` 綁定私密 D1、`RATE_SALT` 存於 Worker secret。資料結構在 `worker/migrations/0001_recommendations.sql`。部署順序：套用 D1 migration → `npm run deploy:auth` → 推送網站。不要把 D1 資料匯出檔提交到公開倉庫。

`npm test` 使用 Node 22 的實驗性 SQLite 測試實際 SQL；`tests/community-browser.cjs` 驗證推薦失敗保留、重試、審核、刪除、選圖、衝突及登入過期。正式服務已測試推薦提交、權限、狀態更新與刪除測試資料，亦測試真實 Wikimedia 搜圖及下載；正式封面由維護者自行選擇。

### 推薦 Email 通知

接收地址使用 Worker Secret `NOTIFICATION_EMAIL`，發信 API Key 使用 `RESEND_API_KEY`，不放入公開內容。預設寄件者為 `Pocket Atlas <onboarding@resend.dev>`，只用於通知同一 Resend 帳號的已驗證信箱；使用其他收件地址時需先驗證自己的寄信網域，再設定 `NOTIFICATION_FROM`。

新增推薦會透過 D1 trigger 加入通知佇列。Worker 每 5 分鐘檢查，僅寄收件編號與私人收件箱連結，不寄訪客 Email 或推薦全文。供應商失敗時每小時重試，最多 6 次、首次嘗試後最多 23 小時；使用固定 idempotency key 防止重複投遞。刪除推薦也會刪除其佇列資料。通知失敗不影響推薦保存。後台顯示待寄、已交付發信服務、失敗數量；「已交付」不代表已送達收件匣。

初次啟用只通知新增資料，不自動補寄既有推薦。

### 社群分享預覽

首頁的 Open Graph 與 Twitter 大圖標籤直接寫入 HTML，分享爬蟲不需執行 JavaScript。封面為原創卡片插畫 `public/assets/share-cover.jpg`（1200 × 630），可編輯來源是 `design/share-cover.html`。首頁提供 canonical 與 `sitemap.xml`。目前 hash 區域連結共用首頁預覽，並非各目的地的獨立 SEO 頁面；未來新增主題／目的地靜態頁時需給每頁自己的 canonical、OG 與 sitemap 項目。

### 主題精選與其他地圖平台

大洲導覽最右側的「✨ 主題精選」使用 `#/themes`，內容存於 `content/themes/`，不需要父級地區或標籤。後台可設定名稱、介紹、封面、排序、公開狀態及主要清單連結；沿用 Google 翻譯與搜圖流程。未建立主題時顯示整理中，不放入示範清單。

城市、獨立地區與主題均可選填高德／百度 HTTPS 分享連結。Google 原有美食、景點欄位保持 Google 專用；替代平台入口另外顯示平台名稱。主題主要連結可使用三種平台。訪客推薦表單也接受這三種平台，依精確主機白名單驗證，不接受口令或任意網站。

不會自動將 Google Maps 清單轉換成其他平台，也不猜測地點座標。請在高德或百度建立相應內容，再貼上可公開分享的連結。官方 URI 格式已以 HTTP 測試確認可開啟；中國大陸實際網路、App 喚起及收藏流程仍需當地實機驗證。
