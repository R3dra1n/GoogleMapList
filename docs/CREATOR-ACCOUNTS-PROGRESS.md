# 創作者帳號階段進度

基準：已部署 v1.1.0，GitHub Actions 36749777453 成功，正式 data.json 版本為 1.1.0、提交 0db3fba。
開發分支：codex/creator-accounts。此階段程式尚未部署。

已完成第一步：
- prototypes/creator-settings.html：姓名、簡介、頭像、Banner 本機即時預覽，圖片格式／大小檢查；不儲存、不上傳，不冒充已登入。
- worker/creator-profile.mjs：純資料與權限邊界。身份需由伺服器認證後傳入，拒絕跨帳號編輯、停權帳號與 role/curated/published 等欄位注入。尚未接入 API 路由或資料庫，不能當成已完成帳號系統。
- 三項權限／輸入驗證測試，另瀏覽器驗證即時預覽、文字安全、手機版、重設。全部 48 項單元測試通過。

使用者已選擇同時提供 Google OAuth 與 Email magic link。兩者共用內部 user_id；帳號綁定必須在已登入狀態完成另一種方式的驗證，不僅憑相同 Email 自動合併。接著處理認證憑證、session、D1 user/creator 綁定及所有權查驗。先完成帳號與儲存，再接媒體後端；前端檔案檢查不能取代伺服器限制。未購買資源、未建立付費服務、未執行雲端 schema 變更。
