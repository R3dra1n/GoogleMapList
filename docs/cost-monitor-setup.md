# 人氣及成本監測（2026-09-29）

## 本輪更正

移除本站收藏按鈕及收藏數，API 不再接受 save / unsave。保留既有資料表，沒有刪除歷史資料。人氣暫按本站開啟清單的去重瀏覽器数定義，清楚標記不是 Google 收藏數或真人數。若只接受 Google 清單人數，應一併移除人氣；官方 API 目錄目前沒有找到 Saved Lists 收藏人數介面。

## 真實來源與計費範圍

| 服務 | 本輪來源 | 仍有的限制 |
|---|---|---|
| Cloudflare Workers 請求 / CPU | 官方 GraphQL workersInvocationsAdaptive，cpuTimeUs 是微秒 | 可能抽樣，帳號範圍含其他專案，非最終帳單 |
| D1 讀取 / 寫入列 | 官方 d1AnalyticsAdaptiveGroups rowsRead / rowsWritten | 和查詢次數不同；包含監測本身消耗 |
| D1 容量 | 官方 d1StorageAdaptiveGroups 今日各 DB 峰值加總 | 不是月平均 GB-month，不以此推算已結算儲存費 |
| 自動簡介 Workers AI | 官方 aiInferenceAdaptiveGroups totalNeurons / tokens | 沒有當日資料時顯示無資料，不冒充 0 |
| Email | Resend 官方 GET /usage 的每日/本期 used、limit、resets_at | 發信專用憑證可能無權讀用量；帳單與方案固定費不在此 API |
| Google 翻譯 | 本站持久化的預留字符、完成批次字符 | 啟用前歷史、其他程式與 Google 帳號用量尚未取得，不能假稱 Google 帳單 |

Cloudflare 資料已用現有本機 OAuth 登入唯讀實測：2026-09-29 約 06:23 UTC，後端今日 204 次 / 本月 2,120 次，D1 今日讀 663 列 / 寫 70 列，容量 106,496 bytes，AI 本月約 16 neurons。這是當時快照，不是固定測試常數或剩餘額度；程式不內建這些數字。不能將本機部署用 OAuth Token 複製到正式網站作持續監控。

截至本輪實作，Google 帳務未連接，所以**尚不能確認整個帳號的實際成本**。若需要 Google 全帳號的正式費用，需另外連接具結算讀取權限的帳務來源（或對照結算報表），不應只靠 Translation API key。未自動啟用可能額外收費的 Billing Export / BigQuery。

## 持續監控的必要設定

1. Cloudflare API Token：限目前帳號，Account → Account Analytics → Read（這版統一透過 GraphQL 讀統計，不需要另外授予 D1 或 Workers AI 讀取權限）。存入 Worker Secret `CF_USAGE_TOKEN`。公開變數 `CF_ACCOUNT_ID` 已在 wrangler.toml；Token 不能提交 Git 或貼對話。
2. Email 用量優先使用選填的 `RESEND_USAGE_API_KEY`，未設定時使用既有 `RESEND_API_KEY`。如果顯示 403，需提供具有用量讀取權限的憑證，不能當 0。
3. 管理工具「用量與費用」可開啟 Email 警示，預設未啟用；使用既有 NOTIFICATION_EMAIL 接收地址，前端不公開地址。畫面門檻警示自動啟用。
4. 正式上線前套用新增的 0004_cost_monitor.sql，部署 Worker，發布前台。沒有新付費服務或升級。

## 警示及費用估算

使用既有每五分鐘 cron，統計快取 15 分鐘，未設定/授權失敗/格式缺欄位/空回應各自標示，過期超過 30 分鐘顯示紅色提示。監測本身也使用 Workers 請求及 D1 讀寫，已包含在供應商數據中。

达到 80%、95%、100% 參考門檻顯示警示。Cloudflare 今日門檻參考 Free，每月參考 Standard；帳號方案尚未確認，並非實際剩餘配額。Cloudflare 本月查詢是 UTC 曆月，可能與付費訂閱結算周期不同。Email 用實際回傳配額/重置日；翻譯使用本站 400,000 字符預算。

Email 必須在後台主動開啟，啟用後同一項目/期間/門檻只排一次。每封通知有 idempotency key，最多三次重試、最多六次警示發信嘗試/日，也受現有總 Email 90/日、2500/月上限約束。預留超限則延期，不靠警示保證停止計費。供應商、網路、D1、發信服務故障或額度耗盡都可能使警示延遲/失敗，需搭配供應商原生預算通知。

面板的美元金額是「按牌價、未扣免費額度」的可觀察用量估算，排除固定費與稅。不能稱它是最終帳單。Workers Standard 最低 $5/月另計；Google NMT 標準 $20/M 字符；Workers AI $0.011/1,000 neurons。固定方案未知時不假造總費用。

## 來源

- https://developers.cloudflare.com/analytics/graphql-api/tutorials/querying-workers-metrics/
- https://developers.cloudflare.com/d1/observability/metrics-analytics/
- https://developers.cloudflare.com/workers/platform/pricing/
- https://developers.cloudflare.com/workers-ai/platform/pricing/
- https://raw.githubusercontent.com/resend/resend-node/main/src/usage/usage.ts
- https://github.com/resend/resend-mcp/blob/main/src/tools/usage.ts
- https://resend.com/pricing
- https://cloud.google.com/products/translate/pricing
- https://developers.google.com/maps/apis-by-platform

## 驗證

41 項單元測試通過；新增未知數值不轉零、配額警示升級/期間去重、快取、Email 主動啟用、併發發信去重測試。瀏覽器測試確認不再有收藏按鈕，人氣及費用卡片可顯示，失敗項目明示。正式 Worker 已用 CF_USAGE_TOKEN 成功讀取 Workers、D1 與 Workers AI 真實統計。Resend /usage 回傳 HTTP 401，需核對憑證有效性及用量讀取權限；尚未取得正式 Email 用量。未以正式收件人寄測試警示。

## 主題我的地圖與遊記

主題後台新增 myMap 和五語 article 欄位，使用既有翻譯保存流程。前台提供 #/themes/<固定ID> 文章頁、麵包屑與點擊才載入的 Google My Maps 嵌入；無需建立虛構城市。未設定外部清單連結也可只發布文章／我的地圖。既有使用者內容不自動改寫。
