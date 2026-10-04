# 創作者登入設定（v1.2.0-preview.1）

程式尚未部署。正式網站維持 v1.1.0。兩種登入方式可共存，憑證皆只存 Worker Secrets，不寫進 Git 或前端。

## Google 登入

在 Google Cloud Console 的 Google Auth Platform 建立 Web application OAuth Client，設定品牌、支援 Email、受眾及測試使用者。僅要求 openid、email、profile。

Authorized redirect URI 必須完全一致：

`https://pocket-atlas-auth.huayang-hsu.workers.dev/account/google/callback`

到 Cloudflare → Workers & Pages → pocket-atlas-auth → Settings → Variables and Secrets：

- Secret `GOOGLE_LOGIN_CLIENT_ID`：Google 的 Client ID。
- Secret `GOOGLE_LOGIN_CLIENT_SECRET`：Google 的 Client secret。

這不是現有 Decap 管理後台的 GitHub OAuth App；兩者維持分開。測試模式只邀請指定使用者，正式開放前依 Google Console 提示完成應用程式發布要求。

官方：https://developers.google.com/identity/protocols/oauth2/web-server

## Email 登入

「網域」例如自己購買、能管理 DNS 的品牌域名；「寄件地址」例如 `login@account.yourbrand.com`。`yourbrand.com` 是示例，不能直接照填。一般 `@gmail.com` 地址可接收驗證信，但不能作為你在 Resend 驗證的寄件網域。

1. 取得自己的網域，或使用已有網域的子網域，例如 `account.品牌域名`。不必先將網站搬離 GitHub Pages。
2. Resend → Domains → Add Domain，加入這個網域。
3. 在網域的 DNS 管理後台新增 Resend 畫面提供的 SPF/DKIM 等紀錄；不要自行猜測紀錄值，也不要覆蓋已有的收信設定。
4. 等 Resend 顯示 Verified；登入信關閉點擊／開信追蹤。
5. 在同一個 Worker 新增 Secret `LOGIN_EMAIL_FROM`，例如 `口袋地圖 <login@account.品牌域名>`；已有 `RESEND_API_KEY` 必須具該網域寄信權限。

單純發送登入信不必另外買 Google Workspace 信箱。若希望讀者能回信，另外設定可收信信箱／Reply-To。現有 `NOTIFICATION_EMAIL` 是管理員收件地址，不能替代寄件網域驗證。

官方：https://resend.com/docs/dashboard/domains/introduction

## 啟用前檢查與部署順序

- 先備份目前 D1，審閱並套用新增的 `0005_creator_accounts.sql`；此 migration 新增資料表，不刪改既有資料。此次開發未對雲端套用。
- 把試用者 Email（小寫）新增至 `creator_invitations`；不直接開放公開註冊。
- 部署 Worker 後設定 `CREATOR_ACCOUNTS_ENABLED=true`。未設定預設關閉；Google / Email 可分別啟用，缺憑證的按鈕停用。
- `/account/` 與 API 同源於 Worker，Session 使用 Secure / HttpOnly Cookie；不依賴 GitHub Pages 的跨站 Cookie。
- 完成真實 Google 登入、Email 收信、登出、另一方式綁定、手機操作驗收，再把正式網站登入入口接上。
- Google 登入與 Email 不會只因地址相同就自動合併；先登入原帳號，再驗證並綁定另一方式。
- Cookie session 7 日；Email 連結 10 分鐘、一次使用、須在要求驗證的同一瀏覽器确认。不同裝置或 Email App 內建瀏覽器無法直接兌換。

## 儲存與成本界線

目前姓名、簡介、最多 5 個社群連結及頭像/Banner 為帳號私有草稿。尚未同步到公開創作者 Page，不提供使用者自行投稿／發布清單或管理員精選權限。

圖片經瀏覽器縮小，後端驗證檔頭、類型及大小；每人兩個槽位（頭像最多 256 KB，Banner 最多 1 MB），以 D1 暫存。大量使用者前需評估物件儲存方案，不應無限制擴大這個試用版。

沿用 Workers、D1 與 Resend；未新增付費服務。Email 登入會共用現有寄信嘗試上限（全站每日 90／每月 2,500），另有每地址每日 5 次、每 IP 每日 30 次登入操作限制，媒體每日全站 100 次。這些是應用端限制，不是帳單保證，也不能防止請求本身帶來 Workers 用量。雲端方案、供應商配額與帳單仍需查核。

## 目前採用：Firebase（preview.2）

上方自建 OAuth/Resend 操作僅供舊模式參考。新模式不需要自有寄件網域或 Google Client Secret。

1. 在 Firebase 導入選定的 Google Cloud 專案；確認 Spark 免費方案，不自動接受 Blaze 升級。既有帳單解除可能影響專案資源，須先確認。
2. Authentication 啟用 Google、Email/Password；加入帳號頁使用的 workers.dev 主機至 authorized domains。註冊 Web App，取得公開 SDK config。不要啟用 Analytics、Firestore、Storage 或其他本功能未使用服務。
3. Worker vars 設 AUTH_PROVIDER=firebase、FIREBASE_PROJECT_ID、FIREBASE_API_KEY、FIREBASE_APP_ID。API key 是 Firebase Web 公開設定，不是管理員憑證；權限仍由伺服器 token 驗證、邀請和 D1 所有權管控。
4. 備份 D1 後套用 migrations 0005/0006；先建立獲邀信箱，再啟用 CREATOR_ACCOUNTS_ENABLED。預設邀请制；明確設 CREATOR_REGISTRATION=open 才開放創作者後台。
5. 真實驗收 Google、Email 驗證/登入/重設、未邀請拒絕、登出、資料隔離及圖片上傳，再發布。未邀請者可能在 Firebase 建立帳號，但不得進入本站創作者後台。
6. Firebase 撤銷/停用在新登入時檢查；既有本站 Session 最長一小時。本地停權立即生效。

目前測試只用模擬 SDK/供應商；真實 Firebase 專案設定及驗收未完成。個人頁僅私人草稿，尚未公開發布。
