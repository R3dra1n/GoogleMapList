const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const names={workers_day:'Cloudflare 後端 · 今日',workers_month:'Cloudflare 後端 · 本月',d1_day:'D1 資料庫 · 今日',d1_month:'D1 資料庫 · 本月',storage:'D1 儲存容量',ai_day:'AI 自動簡介 · 今日',ai_month:'AI 自動簡介 · 本月',email:'Email 通知',translation:'Google 翻譯 · 本月'};
const format=n=>typeof n==='number'?n.toLocaleString('zh-TW',{maximumFractionDigits:2}):'未知';
function estimate(key,p){
 if(p.status!=='ok')return '';
 const value=k=>p.metrics.find(m=>m.key===k)?.value;
 let amount,note='未扣免費額度／折扣，不含固定費、稅與其他服務；不是帳單。';
 if(key==='workers_month'){amount=value('requests')*.3/1e6+value('cpuTimeUs')*.02/1e9;note+=' Standard 另有最低 US$5 月費；帳號方案未確認。';}
 if(key==='d1_month')amount=value('rowsRead')*.001/1e6+value('rowsWritten')/1e6;
 if(key==='ai_month')amount=value('totalNeurons')*.011/1000;
 if(key==='translation')amount=value('characters')*20/1e6;
 if(!Number.isFinite(amount))return '';
 return `<p class="cost-estimate">按牌價估算 US$${amount.toFixed(4)}<br><small>${note}</small></p>`;
}
export async function renderCostPanel(root,api){
 root.textContent='正在讀取供應商統計…';
 try{
  const data=await api('/api/admin/cost-monitor');
  const disconnected=Object.values(data.providers).filter(p=>!['ok','no_data'].includes(p.status)).length;
  root.innerHTML=`<p>最近更新：${escape(data.checkedAt?new Date(data.checkedAt).toLocaleString():'尚未取得')} · 時間範圍以 UTC 為準。</p>${data.stale?'<p class="usage-warning" role="alert">統計已過期或尚未取得，不能用來判斷目前費用。</p>':''}${disconnected?`<p class="usage-warning" role="alert">${disconnected} 個資料項目尚未連接／讀取失敗，費用不能當作零。</p>`:''}<div class="usage-alerts">${data.warnings?.map(w=>`<p class="usage-warning" role="alert">${escape(w.message)}</p>`).join('')||'<p>目前可讀取的資料未觸及警示門檻。這不代表所有服務免費。</p>'}</div><p>達參考门檻 80%、95%、100% 顯示警示。Cloudflare 今日門檻參考 Free 配額，本月參考 Standard 包含量，皆不是已核實的帳號剩餘額度。Email 使用供應商回報的實際配額，翻譯使用本站 40 萬字符預算。</p><div class="cost-grid">${Object.entries(data.providers).map(([key,p])=>`<section class="cost-card"><h3>${escape(names[key]||key)}</h3>${p.status==='ok'?`<p class="cost-source">${escape(p.source)}<br>${escape(p.scope)}</p><ul>${p.metrics.map(m=>`<li><strong>${escape(m.label)}：${format(m.value)} ${escape(m.unit)}</strong>${m.referenceLimit>0?`<br><small>參考門檻 ${format(m.referenceLimit)} · ${(m.value/m.referenceLimit*100).toFixed(2)}%</small><progress max="${m.referenceLimit}" value="${Math.min(m.value,m.referenceLimit)}" aria-label="${escape(m.label)}"></progress>`:''}${m.resetsAt?`<br><small>重置：${escape(new Date(m.resetsAt).toLocaleString())}</small>`:''}</li>`).join('')}</ul>${estimate(key,p)}`:`<p>${escape(p.reason)}</p>`}</section>`).join('')}</div><section class="cost-card"><h3>警示通知</h3><p>畫面警示自動啟用。Email 寄至已設定的管理員接收地址；不在公開頁面顯示地址。每 5 分鐘檢查，供應商統計最多每 15 分鐘更新。同一期間、項目與門檻去重，最多 6 次發信嘗試／日，也受共用 Email 上限限制。</p><label><input id="usage-email-toggle" type="checkbox" ${data.settings.emailEnabled?'checked':''} ${data.settings.emailConfigured?'':'disabled'}> 啟用 Email 用量警示</label><p id="usage-email-status" role="status">${data.settings.emailConfigured?(data.settings.emailEnabled?'已啟用':'尚未啟用 Email；可在此開啟。'):'缺少發信服務或接收地址。'}</p><details><summary>最近警示通知狀態</summary>${data.notifications.map(n=>`<p>${escape(n.created_at)} · ${escape({pending:n.attempts>=3?'重試失敗':'等待發送',sent:'已交付發信服務'}[n.status]||n.status)}<br>${escape(n.message)}</p>`).join('')||'<p>尚無警示記錄。</p>'}</details></section><p>Wikimedia 公開搜圖、Google Maps 分享連結、Decap CMS 未另接付費 API。公開 GitHub repo 的標準 Actions 執行時間免費；仍受平台限制。Google 完整結算與固定方案費仍需對照供應商帳單。</p>`;
  root.querySelector('#usage-email-toggle').onchange=async event=>{const input=event.target;input.disabled=true;try{await api('/api/admin/cost-settings',{method:'POST',body:JSON.stringify({emailEnabled:input.checked})});root.querySelector('#usage-email-status').textContent=input.checked?'已啟用 Email 警示。':'已關閉 Email 警示。';}catch(error){input.checked=!input.checked;root.querySelector('#usage-email-status').textContent=error.message;}finally{input.disabled=false}};
 }catch(error){root.textContent=error.message;}
}
