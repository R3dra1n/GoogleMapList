# v1.2.11 · 口袋地圖視覺改版

- 採用已確認的照片封面、綠色深淺主題、固定可收合導覽與滑動卡片。
- 首頁、探索、目的地與創作者清單共用新版卡片，保留人氣與作者署名。
- 詳情頁固定上下排列介紹／影片，景點與 My Maps 並列並對齊。
- 公開 Google Maps 清單自動讀取景點；無法解析時保留原地圖入口，My Maps 可作為後備來源。
- 保留正式站會員登入、登出、社群資料、搜尋、管理與內容申訴功能。

驗證：83 項測試；桌面／390px 手機瀏覽器；搜尋、深淺色、導航收合；可愛島 4 景點與 My Maps 對齊。

備份：GitHub `backup/pre-redesign-v1.2.10` 指向 c03a094；本機 `.backups/release-1.2.11/before-release.tar` 與 `approved-preview.tar.gz`。

回復：從備份標籤建立回復分支，執行 `SITE_DEPLOY_TARGET=worker npm run build`，再以 `worker/wrangler.toml` 部署 Worker，並同步 GitHub main。此次不變更資料庫結構或刪除會員資料。

Google 公開清單的資料格式可能變更；影片能否播放仍依創作者的 YouTube 設定。景點照片僅使用目前已核實、附來源署名的匹配素材，沒有圖片的景點仍可顯示文字卡片。
