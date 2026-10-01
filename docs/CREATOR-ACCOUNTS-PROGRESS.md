# 創作者帳號階段進度

基準：已部署 v1.1.0，GitHub Actions 36749777453 成功，正式提交 0db3fba。
開發分支：codex/creator-accounts。當前開發版 v1.2.0-preview.1，尚未部署。

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
