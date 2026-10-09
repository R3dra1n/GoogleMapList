export function renderMembersPanel(root,api,active=()=>true){
 root.replaceChildren();let sequence=0;
 const el=(tag,text)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;return n};
 const note=el('p','统计完成验证并成功进入本站的会员；不含 Firebase 中尚未完成验证／首次登入的人。编辑部作者资料不计入会员数。Email 仅管理者可见。');
 const summary=el('div');summary.className='member-summary';
 const form=el('form'),input=el('input');input.type='search';input.placeholder='搜尋姓名或 Email';input.maxLength=100;input.setAttribute('aria-label','搜尋會員');const submit=el('button','搜尋／重新整理');submit.type='submit';form.append(input,submit);
 const status=el('p');status.setAttribute('role','status');const table=el('table');const wrap=el('div');wrap.className='member-table';wrap.append(table);
 const more=el('button','載入更多');more.hidden=true;more.type='button';let next=null;
 const firebase=el('a','查看 Firebase 注册账号（包含尚未进入本站的账号） ↗');firebase.href='https://console.firebase.google.com/project/pocket-540c0/authentication/users';firebase.target='_blank';firebase.rel='noopener noreferrer';root.append(note,firebase,summary,form,status,wrap,more);
 async function load(offset=0){const revision=++sequence;submit.disabled=true;more.disabled=true;status.textContent='正在讀取會員記錄…';
 try{const result=await api('/api/admin/members?q='+encodeURIComponent(input.value.trim())+'&offset='+offset);if(!active()||revision!==sequence)return;
 summary.replaceChildren(...[['本站會員',result.summary.total],['近30天加入',result.summary.recent],['公開創作者',result.summary.publicCreators],['公開清單',result.summary.publicLists],['停用帳號',result.summary.suspended]].map(([label,value])=>{const box=el('div');box.append(el('strong',String(value)),el('span',label));return box}));
 if(!offset){const head=el('tr');for(const label of ['姓名','Email','加入本站','個人頁狀態','清單總數／公開'])head.append(el('th',label));table.replaceChildren(head);}
 for(const row of result.items){const tr=el('tr');for(const value of [row.name||'尚未設定',row.email,new Date(row.createdAt*1000).toLocaleDateString(),row.suspended?'帳號已停用':row.publicProfile?'公開':'未公開',row.lists+' ／ '+row.publicLists])tr.append(el('td',String(value)));table.append(tr);}
 next=result.nextOffset;more.hidden=next==null;status.textContent=result.items.length?'已更新；上方統計為全站總數，搜尋只篩選下方記錄。':'沒有符合的會員。';
 }catch(error){if(active()&&revision===sequence){table.replaceChildren();summary.replaceChildren();more.hidden=true;status.textContent=error.message||'讀取失敗，請重試。';}}
 finally{if(active()&&revision===sequence){submit.disabled=false;more.disabled=false;}}
 }
 form.onsubmit=e=>{e.preventDefault();load()};more.onclick=()=>load(next);load();
}
