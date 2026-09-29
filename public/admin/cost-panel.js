const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const format=n=>typeof n==='number'?n.toLocaleString('zh-TW',{maximumFractionDigits:2}):'未知';
const groups=[
 {title:'Cloudflare 後端',keys:['workers_day','workers_month'],note:'處理登入、推薦與統計請求。Free 每日 10 萬次；付費方案另有固定月費，帳號方案尚未核對。'},
 {title:'D1 資料庫',keys:['d1_day','d1_month','storage'],note:'存放推薦、人氣和監測資料。Free 每日讀取 500 萬列、寫入 10 萬列，容量 5 GB。'},
 {title:'AI 自動簡介',keys:['ai_day','ai_month'],note:'Cloudflare Workers AI · Qwen3-30B-A3B。每日前 10,000 neurons 免費；按日重置，不能直接從月總量推算超額費用。'},
 {title:'Google 翻譯',keys:['translation'],note:'Google Translation NMT。每月前 50 萬字符以 US$10 抵免涵蓋；本站另設 40 萬字符預算。其他程式可能共用抵免。'},
 {title:'Email 通知',keys:['email'],note:'Resend 發送推薦與用量通知。以下僅在 API 成功時顯示帳號實際配額。'}
];
function estimate(key,p){
 if(p.status!=='ok')return '';
 const value=k=>p.metrics.find(m=>m.key===k)?.value;
 const amount={workers_month:()=>value('requests')*.3/1e6+value('cpuTimeUs')*.02/1e9,d1_month:()=>value('rowsRead')*.001/1e6+value('rowsWritten')/1e6,ai_month:()=>value('totalNeurons')*.011/1000,translation:()=>value('characters')*20/1e6}[key]?.();
 return Number.isFinite(amount)?`<details class="cost-rate"><summary>計價參考</summary><p>若完全不扣免費額度，這部分用量原價約 US$${amount.toFixed(4)}。<strong>不是已扣款或應付費用。</strong>未含固定月費、稅、其他服務及折扣。</p></details>`:'';
}
function metricLabel(key,m){
 if(key==='translation')return '本站預算';
 if(key==='email')return '帳號配額';
 if(key.endsWith('_day')||key==='storage')return 'Free 額度參考';
 return '付費方案包含量參考';
}
function provider(key,p){
 const period=key.endsWith('_day')?'今日':key.endsWith('_month')||key==='translation'?'本月':key==='storage'?'容量':'';
 if(!p)return '';
 return `<div class="cost-period">${period?`<h4>${period}</h4>`:''}${p.status==='ok'?`<ul class="cost-metrics">${p.metrics.map(m=>`<li><strong>${escape(m.label)}：${format(m.value)} ${escape(m.unit)}</strong>${m.referenceLimit>0?`<small>${metricLabel(key,m)} ${format(m.referenceLimit)} · ${(m.value/m.referenceLimit*100).toFixed(2)}%</small><progress max="${m.referenceLimit}" value="${Math.min(m.value,m.referenceLimit)}" aria-label="${escape(m.label)}"></progress>`:''}${m.resetsAt?`<small>重置：${escape(new Date(m.resetsAt).toLocaleString())}</small>`:''}</li>`).join('')}</ul>${estimate(key,p)}`:`<p class="cost-unavailable">${escape(p.reason)}</p>`}</div>`;
}
export async function renderCostPanel(root,api){
 root.textContent='正在讀取供應商統計…';
 try{
  const data=await api('/api/admin/cost-monitor');
  const disconnected=Object.values(data.providers).filter(p=>!['ok','no_data'].includes(p.status)).length;
  root.innerHTML=`<div class="cost-overview"><strong>用量監測，不是帳單</strong><p>應付金額尚未取得。用量有原價，不代表需要付款；免費額度內的適用用量可免計費，付費方案固定月費另計。</p><small>更新：${escape(data.checkedAt?new Date(data.checkedAt).toLocaleString():'尚未取得')} · 約每 15 分鐘更新 · 統計期間以 UTC 為準</small></div>${data.stale?'<p class="usage-warning" role="alert">統計已過期或尚未取得，不能用來判斷目前費用。</p>':''}${disconnected?`<p class="usage-warning" role="alert">${disconnected} 個資料項目讀取失敗／尚未設定，無法確認其用量與費用。</p>`:''}<div class="usage-alerts">${data.warnings?.map(w=>`<p class="usage-warning" role="alert">${escape(w.message)}</p>`).join('')||'<p class="help">可讀取的項目目前未達參考警示門檻。</p>'}</div><div class="cost-grid">${groups.map(group=>{const keys=group.keys.filter(key=>data.providers[key]);if(!keys.length)return '';const source=keys.map(key=>data.providers[key]).find(p=>p.status==='ok');return `<section class="cost-card"><h3>${group.title}</h3><p class="cost-help">${group.note}</p>${keys.map(key=>provider(key,data.providers[key])).join('')}${source?`<details class="cost-source"><summary>統計來源與範圍</summary><p>${escape(source.source)}<br>${escape(source.scope)}</p></details>`:''}</section>`}).join('')}</div><section class="cost-card cost-notifications"><h3>警示通知</h3><p>達參考門檻 80%、95%、100% 時顯示警示。Email 寄至已設定的管理員地址；每 5 分鐘檢查，重複警示會合併，最多 6 次發信嘗試／日。</p><label class="cost-toggle"><input id="usage-email-toggle" type="checkbox" ${data.settings.emailEnabled?'checked':''} ${data.settings.emailConfigured?'':'disabled'}> 啟用 Email 用量警示</label><p id="usage-email-status" role="status">${data.settings.emailConfigured?(data.settings.emailEnabled?'已啟用':'尚未啟用 Email；可在此開啟。'):'缺少發信服務或接收地址。'}</p><details><summary>最近警示通知狀態</summary>${data.notifications.map(n=>`<p>${escape(n.created_at)} · ${escape({pending:n.attempts>=3?'重試失敗':'等待發送',sent:'已交付發信服務'}[n.status]||n.status)}<br>${escape(n.message)}</p>`).join('')||'<p>尚無警示記錄。</p>'}</details></section><details class="cost-explanation"><summary>準確度、免費服務與計費限制</summary><p>Cloudflare 為供應商真實統計，可能抽樣、延遲，且包含同帳號其他專案。翻譯僅記錄本站用量，未包含啟用前與其他程式。參考配額不等於已核實的剩餘額度，監測與通知本身也會消耗資源。</p><p>Wikimedia 搜圖、Google Maps 分享連結和 Decap CMS 未另接付費 API。圖片用 Sharp 縮放壓縮，不使用 AI；目前沒有自動影片剪輯功能。公開 GitHub repo 標準 Actions 執行時間免費，仍受平台限制。</p><p>帳號訂閱、Google 抵免餘額與完整帳單尚未接入。警示不會停止供應商計費，也不能保證不超支。</p></details>`;
  root.querySelector('#usage-email-toggle').onchange=async event=>{const input=event.target;input.disabled=true;try{await api('/api/admin/cost-settings',{method:'POST',body:JSON.stringify({emailEnabled:input.checked})});root.querySelector('#usage-email-status').textContent=input.checked?'已啟用 Email 警示。':'已關閉 Email 警示。';}catch(error){input.checked=!input.checked;root.querySelector('#usage-email-status').textContent=error.message;}finally{input.disabled=false}};
 }catch(error){root.textContent=error.message;}
}
