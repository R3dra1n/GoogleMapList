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
