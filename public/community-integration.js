// Enabled only on the same-origin integration preview.
const active=(location.pathname.startsWith('/preview/')||location.hostname==='pocket-atlas-auth.huayang-hsu.workers.dev');
if(active){
 const style=document.createElement('link');style.rel='stylesheet';style.href=new URL('./community-integration.css',import.meta.url);document.head.append(style);
 const zh=()=>document.documentElement.lang.startsWith('zh');const text=(a,b)=>zh()?a:b;
 const el=(tag,value,cls)=>{const n=document.createElement(tag);if(value)n.textContent=value;if(cls)n.className=cls;return n};
 const api=async path=>{const r=await fetch('/account/api/'+path,{cache:'no-store'});if(!r.ok)throw Error(String(r.status));return r.json()};
 const menu=el('details',null,'community-menu');const summary=el('summary',text('登入','Sign in'));menu.append(summary);document.querySelector('.preferences').append(menu);
 const photo=(url,name)=>{const i=el('img');i.src=url;i.alt='';i.loading='lazy';i.onerror=()=>i.replaceWith(el('span',name.slice(0,1),'community-initial'));return i};
 const anchor=(title,href)=>{const a=el('a',title);a.href=href;return a};
 let user;try{user=await api('me')}catch{}
 if(user){summary.textContent='';summary.setAttribute('aria-label',text('帳號選單','Account menu'));summary.append(photo('/account/api/media/avatar',user.profile.name));const options=el('div',null,'community-options');for(const [title,href] of [[text('編輯個人資料','Edit profile'),'/account/'],[text('我的清單','My lists'),'/account/community#manage']])options.append(anchor(title,href));const logout=el('button',text('登出','Sign out'));logout.onclick=async()=>{logout.disabled=true;try{const r=await fetch('/account/api/logout',{method:'POST',headers:{'X-CSRF-Token':user.csrf}});if(!r.ok)throw Error();location.reload()}catch{logout.disabled=false;logout.textContent=text('登出失敗，請重試','Retry sign out')}};options.append(logout);menu.append(options)}else{menu.replaceWith(anchor(text('登入／註冊','Sign in'),'/account/'))}
 document.addEventListener('click',e=>{if(!menu.contains(e.target))menu.open=false});document.addEventListener('keydown',e=>{if(e.key==='Escape')menu.open=false});
}
