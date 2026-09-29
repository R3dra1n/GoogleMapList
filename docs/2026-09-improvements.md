# GoogleMapList：2026-09-29 改善與發布審核

本輪只修改 GoogleMapList；保留使用者 content 檔案。尚未推送、部署 Worker 或套用正式 D1 migration。沒有購買或升級服務。

## 已實作

- 大洲分類只顯示目前語言；主題分類移除 emoji。
- Wikimedia 原先只有 18 筆且不翻頁，候選過濾後可能剩 17 或 1 筆。改每頁 50 筆、320px 候選、依 API continuation 載入更多、依 pageId 去重、失敗保留結果可重試。預設只以目的地名稱搜尋，不自動附加國家造成過度限制。仍排除缺少可信授權/作者、非 JPEG/PNG/WebP、非 Wikimedia 圖片來源，結果不會與 Wikimedia 網站原始結果完全相同。實測 Hong Kong 第一頁 31/50、第二頁 14/50，後續還有頁次。
- 建置產生內容雜湊命名的 480/960px WebP，前台 srcset/sizes，首張優先、其餘 lazy、async decode，保留圖片失敗封面及來源授權。原圖不修改、仍供媒體庫使用。15 張使用中的獨立圖片原本 2,375,103 bytes，小圖合計 338,626 bytes，減少 86%。這是傳輸體積量測，不是宣稱所有網路環境快 86%；GitHub Pages 的回應快取設定由 GitHub 控制，不虛設 _headers。WebP 檔名隨內容改變，不會沿用舊圖 URL。手機 Chrome 已檢查 currentSrc 選用 480px 版本。
- 管理工作室新增「用量與費用」、Google 說明匯入工具。所有管理 API 仍要求 GitHub repo push 權限。

## 用量、費用與限制

截至 2026-09-29 核對官方價格，美元、未含稅。**未讀取帳號訂閱及結算權限，不能確認帳號目前方案、已用免費額度或帳單。** 不把供應商免費額度當作此帳號剩餘額度。

| 實際使用服務 | 觸發點與官方計價 | 本次監測 |
|---|---|---|
| GitHub Pages / Actions | 公開 repo 使用標準 GitHub runner，其執行時間免費；仍有 Pages/儲存/使用政策限制 | 不虛構帳號總用量；保留 Actions 發布狀態 |
| Cloudflare Workers | OAuth、推薦、搜圖、AI、Email、統計。Free 100,000 請求/日；Standard 最低 $5/月，包含 10M 請求與 30M CPU ms，之後 $0.30/M 請求、$0.02/M CPU ms | 本站功能次數不等於全部 Worker 請求或 CPU，帳單項目標記未連接 |
| Cloudflare D1 | 儲存推薦、通知、操作配額、統計；Free 5M 讀取列/日、100K 寫入列/日、5GB；Paid 含 25B 讀取/月、50M 寫入/月、5GB，超額 $0.001/M 讀取、$1/M 寫入、$0.75/GB-month | 不以 API 次數冒充讀写列。索引與彙總表減少掃描，實際供應商用量待連接 |
| Workers AI | 自動簡介 Qwen；10,000 neurons/日免費配置，Paid 超額 $0.011/1,000 neurons | 真實生成嘗試/成功及回應中有提供的 tokens；tokens 不冒充 neurons。全站 50 次/UTC 日，另保留每管理員 30 次/小時 |
| Google Cloud Translation NMT v2 | 每月前 500,000 字符透過 $10 credit 抵扣，標準超額 $20/M 字符；每個目標語言分別計算 | Git 記錄本月預留字符與成功批次字符；顯示「未扣免費額度牌價上界估算」，不是帳單；本程式每月 400,000、每次 50,000 字符限制 |
| Resend | 推薦 Email；Free 3,000/月、100/日；Pro $20/月含 50,000，超額 $0.90/1,000，付費方案可能自動收超額費用 | 嘗試/服務商接受計數；接受不等於送達。本站 90 嘗試/UTC 日、2,500/月（重試也預留） |
| Wikimedia、Google Maps / My Maps 連結、Decap | 現有公開搜圖 API、外部連結、開源 CMS；沒有啟用 Google Maps 付費 API | 搜圖 300 頁/UTC 日。外部 API 仍可能限流或不可用 |

新 D1 usage_daily 從部署後記錄；Email 記錄不再因刪除推薦而消失。每日資料只是本站可觀察事件，沒有歷史資料時顯示未記錄。翻譯缺少 usage.json 時顯示未知，不聲稱未使用。供應商帳務 API 還未接上，不額外要求高權限憑證。

翻譯在 API 呼叫前保留本機 usage.json，工作流成功或失敗都提交預算記錄，失敗阻止部署，網站保留前版。失敗部分可能已被 Google 計費，因此預留不自動退還。若 runner 被強制终止、Git 推送衝突或檔案被人工改動，記錄仍可能不完整；它不是供應商硬性付款上限。其他專案、帳號共用額度與 API key 的外部使用不在本站限制內。

建議在發布前後由帳號擁有者核對：Google Cloud API key 限制為 Translation、降低 API 每日配額並設定結算預算的 50/80/100% Email 告警；Cloudflare 查看帳號方案、Workers/D1/AI 圖表、設定可用 CPU limits/用量通知；Resend 查明方案及超額規則。告警會延遲且不自動阻止計费；應用限制也無法消除所有請求/拒絕請求造成的費用。暫未更改這些帳號層級設定。

官方來源：
- https://docs.github.com/en/billing/concepts/product-billing/github-actions
- https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
- https://developers.cloudflare.com/workers/platform/pricing/
- https://developers.cloudflare.com/d1/platform/pricing/
- https://developers.cloudflare.com/workers-ai/platform/pricing/
- https://cloud.google.com/products/translate/pricing
- https://resend.com/pricing
- https://www.mediawiki.org/wiki/API:Continue

## 清單統計的精確含義

每個清單入口使用「內容種類 / 穩定 ID / 入口欄位」識別；同一張卡的相同網址合併。美食與景點不同網址分別計算；主題、獨立地區也支援。更換同一入口網址仍沿用入口歷史，刪除/隱藏內容不公開統計；同網址出现在不同卡片仍為不同入口，不能把總和解讀為全站唯一人數。

- 使用：在本站點開外部清單連結，對同一瀏覽器、同一入口累積一次。不是訪問首頁、不是 Google 那邊確認開啟或使用。
- 保存：按本站收藏按鈕的目前活躍收藏數。取消 -1；重試同一 save/unsave 不會重複增加/扣除。重複使用與收藏分別計數。
- 唯一：隨機瀏覽器 ID 的雜湊，不是已登入帳號或真人。不同裝置、無痕或清空資料可能再次計數。瀏覽器儲存不可用時收藏無法持久保存；外部地圖仍正常開啟。
- 隱私：只有互動時產生 localStorage 身分，伺服器保存 salted hash，不存原始訪客 ID/IP；IP+小時雜湊只供防濫用，短期配額資料由 cron 清理。沒有跨站追蹤或跨裝置同步。此功能不是完整的「我的收藏」跨頁目錄。
- 更新：寫入完成即更新自身卡片；其他頁面 60 秒輪詢並在回到分頁時刷新。非 WebSocket 保證即時。讀取失敗顯示不可用，不顯示假零；外部連結不等待統計成功。
- 防刷：原子 SQL + totals triggers、每 IP 60 次/小時、全站 2,000 次/日、限制公開清單、限制 body/批量大小、Origin 驗證。Origin 可被非瀏覽器偽造且 IP 可以輪換，因此只能基本防重複，不能作有獎榜單或真人證明。大量讀取仍消耗 Workers/D1。

官方 Google Maps Platform API 目錄沒有找到提供使用者 Saved Lists 追蹤/收藏數的支援介面，所以本站不展示、不假造 Google 收藏數：https://developers.google.com/maps/apis-by-platform

## Google 說明匯入

原專案只有 AI 生成/手填簡介，沒有 Google 清單说明讀取流程。實際請求花蓮 https://maps.app.goo.gl/5wpnSUyxxYqL2gK47 回傳 HTTP 200，但 description/og:description 是 Google 通用宣傳，不是清單說明。

新工具從既有 Google 清單連結嘗試讀取公開 meta 預覽，严格允許來源/跳轉主機、限制大小/逾時、拒絕通用文案。不解析不穩定的內部私有資料格式，不登入或繞過私密清單。若取得候選，明確標「公開預覽文字」，必須核對；沒有則手動複製原文，禁止臆造。兩者皆保留 descriptionSource、descriptionImportedAt、descriptionImportMethod。

保存只允許簡介空白且 Git SHA 沒改變，已有人工或 AI 簡介一律保留。要替換已有內容，維護者需自行在清單後台編輯；不默默覆寫。外文原文不應直接貼進繁中主欄，應先由維護者確認語言。瀏覽器分享描述可能與 Google App 顯示不同，本工具不承諾自動取得每份清單。

## 多使用者與前十榜單：分階段，不在本輪重構

1. **現有維護者策展**：推薦表單、審核、主題清單、本站匿名統計。先累積內容與觀察需求，不將匿名計數直接當排行榜。
2. **使用者帳號與所有權**：OAuth 登入、內部 user_id，list.owner_id；新帳號不給 GitHub repo 權限。以 Worker/D1 管理內容，所有修改在服務端驗 owner/admin。草稿/私密內容不能存進公開 Git repo。明確 public/unlisted/private 狀態，其中 unlisted 不等於 private；private 每次讀取都驗權限。提供修改/刪除/匯出與帳號停用，設定資料保留規則。
3. **使用者投稿與公開個人頁**：選填暱稱、簡介、頭像、公開 slug；Email 永不公開。清單初次發布先審核、外連安全檢查、版權/圖片授權聲明、檢舉/下架/申訴。上傳圖片限制檔案大小/格式、移除 EXIF、重新編碼、容量配額；KOL 身分認領需驗證同意，不用爬取他人資料自動冒名建頁。服務成本另行批准。
4. **榜單**：只收錄已審核公開清單，先用最近 30 日已驗證帳號「淨新增收藏」為主、去重開啟為輔；排除作者本人、自動化/異常流量與已刪除收藏。設定最低樣本數（例如 5 位獨立帳號）、時間衰減、新清單探索位、人工排除與申訴。分數公式与時間範圍公開，至少每日重算，避免即時獎勵刷量。匿名瀏覽器數不直接混成真人排行；風險高時延遲納榜。只有合格項目才展示前十，不足十則如實顯示。

## 發布與回復

待使用者確認才：同步 main 並保留所有 CMS 更新 → 正式 D1 套用 0003（只新增表/trigger）→ 部署 Worker → 推送前台及工作流 → 驗證 GitHub Actions 與線上功能。D1 應先備份/確認 Time Travel 可用；本轮不刪既有資料。舊 Worker/網站可回復，新表保留不影響舊功能。新統計從啟用後累積，不補造歷史。

## 本輪驗證紀錄

- `npm test`：37 項通過，包含 SQL 原子限額、收藏/取消/重試去重、讀者越權阻擋、來源跳轉阻擋、人工簡介保護、翻譯每月預算及 Wikimedia 續頁。
- `npm run build`：9 個城市、15 張封面成功建置。
- `tests/browser.cjs`：導航、刷新、缺少入口、手機、縮放、圖片失敗、鍵盤/減少動效、CMS 階層關聯/ID/儲存通過。
- `tests/community-browser.cjs`：推薦提交失敗與重試、後台審核、封面匯入衝突與登入過期通過。
- `tests/enhancements-browser.cjs`：分類翻譯、480px 圖片選擇、本站收藏/取消、搜圖續頁失敗重試/去重、手動核對匯入、用量面板通過，無頁面 JS 錯誤。
- 瀏覽器寫入測試使用替身；正式 Worker/D1 遷移、Google 翻譯付費呼叫與正式內容寫入尚未執行。圖片搜尋及 Google 公開頁面讀取是唯讀實測。
