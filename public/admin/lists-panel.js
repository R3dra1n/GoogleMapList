export function renderListsPanel(root,api,active=()=>true){
 root.replaceChildren();let sequence=0,next=null;
 const el=(tag,text)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;return n};
 const note=el('p','管理所有會員清單。下架後會從公開頁、搜尋和封面入口隱藏，作者不能自行重新發布；原稿保留，可恢復。此處不永久刪除會員內容。');
 const form=el('form'),query=el('input');query.type='search';query.maxLength=100;query.placeholder='搜尋清單或作者';query.setAttribute('aria-label',query.placeholder);
 const filter=el('select');filter.setAttribute('aria-label','清單狀態');filter.append(new Option('所有清單','all'),new Option('管理員已下架','hidden'));
 const submit=el('button','搜尋／重新整理');submit.type='submit';form.append(query,filter,submit);
 const status=el('p');status.setAttribute('role','status');const rows=el('div'),more=el('button','載入更多');more.hidden=true;more.type='button';root.append(note,form,status,rows,more);
 async function load(offset=0){const revision=++sequence;submit.disabled=more.disabled=true;status.textContent='讀取中…';
 try{const result=await api('/api/admin/lists?q='+encodeURIComponent(query.value.trim())+'&state='+filter.value+'&offset='+offset);if(!active()||revision!==sequence)return;
 if(!offset)rows.replaceChildren();for(const item of result.items){const box=el('article');box.className='recommendation';box.append(el('h3',item.title||'未命名清單'),el('p',(item.author||'未命名作者')+' · '+(item.destination||'未填地點')),el('p',item.moderated?'管理員已下架：'+item.reason:item.public?'公開中':'作者未公開／草稿'));
 if(item.public){const a=el('a','查看公開清單 ↗');a.href='https://pocket-atlas-auth.huayang-hsu.workers.dev/#/lists/community/'+encodeURIComponent(item.id);a.target='_blank';a.rel='noopener noreferrer';box.append(a);}
 const details=el('details');details.append(el('summary','查看清單內容'),el('p',item.description||'未填簡介'));try{const url=new URL(item.url);if(url.protocol==='https:'&&!url.username&&!url.password){const source=el('a','查看原始地圖 ↗');source.href=url.href;source.target='_blank';source.rel='noopener noreferrer';details.append(source);}}catch{}box.append(details);
 const action=el('button',item.moderated?'恢復清單':'下架清單');action.type='button';action.onclick=()=>confirmAction(item);box.append(action);rows.append(box);}
 next=result.nextOffset;more.hidden=next==null;status.textContent=result.items.length?'已更新。':'沒有符合的清單。';
 }catch(e){if(active()&&revision===sequence){rows.replaceChildren();more.hidden=true;status.textContent=e.message;}}finally{if(active()&&revision===sequence)submit.disabled=more.disabled=false;}}
 function confirmAction(item){const dialog=el('dialog'),heading=el('h2',item.moderated?'恢復這份清單？':'下架這份清單？'),reason=el('textarea');reason.maxLength=500;reason.required=true;reason.placeholder='請填寫原因（作者可見）';reason.setAttribute('aria-label','管理原因');const message=el('p');message.setAttribute('role','status');const confirm=el('button',item.moderated?'確認恢復':'確認下架'),cancel=el('button','取消');dialog.append(heading,el('p',item.title),el('p','恢復會沿用作者原本的公開狀態；私人草稿不會因恢復而公開。'),reason,message,confirm,cancel);root.append(dialog);dialog.onclose=()=>dialog.remove();cancel.onclick=()=>dialog.close();confirm.onclick=async()=>{if(!reason.reportValidity()||!reason.value.trim())return;confirm.disabled=true;try{await api('/api/admin/lists',{method:'PATCH',body:JSON.stringify({id:item.id,revision:item.revision,hidden:!item.moderated,reason:reason.value.trim()})});if(!active())return;dialog.close();await load();}catch(e){if(active())message.textContent=e.message;}finally{confirm.disabled=false;}};dialog.showModal();}
 form.onsubmit=e=>{e.preventDefault();load()};more.onclick=()=>load(next);load();
}
