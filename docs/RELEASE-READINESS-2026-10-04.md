# 正式合併前核對 · 2026-10-04

基準：v1.2.0-preview.10，開放註冊。正式 GitHub Pages 仍為原版；本次未合併、未部署。

## 登入品牌
- 正確登入專案為 pocket-540c0，非 gmail-506417（翻譯）或 robust-episode-510303-c7。
- Branding：https://console.cloud.google.com/auth/branding?project=pocket-540c0
- 建議顯示名稱 Pocket Atlas，支援信箱須為管理者實際使用的信箱，首頁、隱私與條款需為真實公開頁。
- Google 公開顯示應用名稱/Logo 可能需要品牌驗證；不保證修改立即替換網域字樣。
- firebaseConfig.authDomain 現在直接由 projectId 拼出 firebaseapp.com。更換品牌登入網域需先完成 Firebase Hosting 自訂網域、OAuth redirect URI、Firebase authorized domains 與 CSP 配套，不能只改字串。
- 本輪無可控制 Google Cloud 已登入頁面的工具，亦未發現 gcloud/firebase CLI，未替用戶修改 Branding 或送審。已開啟正確設定頁。

## 合併前優先工作
1. 原首頁視覺 + 社群公開資料 + 登入頭像選單整合。目前原站讀靜態 data.json，Worker 社群獨立。
2. 決定正式服務網域與路由。GitHub Pages 與 workers.dev 為不同 site；目前 HttpOnly/SameSite=Lax Cookie 僅 Worker 可用。優先將原首頁資產與帳號路由放到同一 origin。保留舊址轉址/相容連結；不把 Session 放 URL 或 localStorage。
3. 登入到期與續編：目前 Firebase 登入後 signOut SDK，Worker session 最多 1 小時，無自動續期。需友善重新登入、草稿保護，不能直接任意延長 session 而略過撤銷設計。
4. 驗證信跨分頁/關頁流程：SDK 使用 inMemoryPersistence；原頁關閉後不能依賴 currentUser，需要引導重新登入。Google/密碼同 Email 綁定介面尚未實作。
5. 註冊濫用/共享 IP：登入交換每 IP 每 UTC 日 30 次；同網路測試者可能互相用完。圖片上傳目前全站每天 100 次；需改善分層限制與明確錯誤。Firebase 註冊/寄信另受供應商限制，本站限制不涵蓋那些呼叫。
6. 個人資料/清單生命週期：補帳號與內容刪除、照片移除、公開個人頁隱藏入口、離開未保存提醒。現有清單可隱藏，不等於刪除。
7. 管理功能：已有停權資料欄與存取檢查，尚需管理員審核/隱藏內容、檢舉入口。首頁精選由管理者策展；最新清單不冒充人氣排行榜。
8. 正式隱私/服務條款、聯絡與資料刪除方式；真實內容審定後發布。不要把模板草稿當成完整法律承諾。
9. 圖片/容量：照片目前存 D1，公開圖片 no-store，封面存 draft/published JSON。擴大流量前量測快取與儲存策略，配合隱藏即不可讀的需求；不逕自新增付費儲存。
10. 發布：整理未提交開發檔案，保留使用者無關檔案，建立可回復 commit/tag、備份 D1、演練回退；新舊 URL、OG、搜尋、來源作者、人氣資料需一致。人氣無真實來源不造數字。

## 測試與驗收
- 本輪重新執行 65 項單元/API 測試，全通過。既有 Playwright 使用模擬 Firebase SDK，不代表所有實際寄信/Google UI 已驗收。
- 真實裝置：iPhone Safari、Android Chrome、桌面 Chrome/Safari；LINE 內嵌→外部開啟。
- 新 Google、Email 註冊/驗證/重新登入/忘記密碼、重複 Email、取消授權、阻擋 popup、過期 session、斷線儲存、跨分頁修改。
- 兩個新帳號所有權隔離、公開/隱藏、頭像更新、登出後私有 API 401、停權立即禁止本站 session、供應商撤銷在既有 session 期間的行為。
- 正式驗收以原首頁版式為準：照片卡片、角色→頭像→名稱、地點/Tag、真實人氣；首頁標語自然分行。

官方參考：
https://support.google.com/cloud/answer/15549049?hl=en
https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification
https://firebase.google.com/docs/auth/web/google-signin
