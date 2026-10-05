import {youtubeId,entryPlatform} from '../catalog-model.js';
import {migrateSession,onSessionChange,readSession} from './session.js';
migrateSession();
onSessionChange(()=>{document.getElementById('publish-status').textContent='另一個分頁的登入狀態已改變。請先複製未儲存內容，再重新整理並登入；此頁不會自動重載。';});
import { isMapsLink, isImagePath, myMapId, mapProvider } from '../model.js';
const status=document.getElementById('publish-status');
const CMS=window.CMS;
if(!CMS){document.getElementById('admin-setup').hidden=false;document.getElementById('admin-setup').textContent='管理介面未能載入，請檢查網路後重新整理。';throw new Error('CMS unavailable');}
const h=window.h;
const relation=CMS.getWidget('relation');
// Decap's relation control re-emits the unchanged parent when it reloads
// display metadata. Only an actual parent change should dirty this form.
class ParentRelation extends relation.control {
  shouldComponentUpdate(nextProps,nextState){
    return super.shouldComponentUpdate(nextProps,nextState)||nextState?.initialOptions!==this.state?.initialOptions;
  }
  triggerInitialOnChange(){}
}
CMS.registerWidget('parent-relation',ParentRelation,relation.preview,relation.schema);
CMS.registerWidget('stable-id',window.createClass({
  componentDidMount(){if(!this.props.value)this.props.onChange(crypto.randomUUID());},
  render(){return h('div',{},h('input',{id:this.props.forID,value:this.props.value||'',readOnly:true,style:{width:'100%',padding:'12px',background:'#f1f4f8',border:'1px solid #d7deeb',borderRadius:'5px',color:'#65738a'}}),h('small',{},'自動建立，改名稱不會改變識別碼。'));}
}));
CMS.registerEventListener({name:'preSave',handler:async({entry})=>{
  let data=entry.get('data');const kind=entry.get('collection');
  for(const v of data.get('videos')?.toJS()||[])if(!youtubeId(v.url)||!Number.isInteger(v.start||0)||(v.start||0)<0)throw new Error('請填入有效 YouTube HTTPS 網址與非負整數起播秒數。');
  for(const p of data.get('places')?.toJS()||[])if(!p.name?.trim()||(p.url&&!entryPlatform(p.url))||(p.source&&!/^https:\/\//.test(p.source)))throw new Error('請確認景點名稱、地圖與 HTTPS 來源網址。');
  const token=readSession();
  if(token){
    const auth=await fetch('https://api.github.com/repos/R3dra1n/GoogleMapList',{headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json'},cache:'no-store'});
    if(auth.status===401){status.textContent='GitHub 登入已失效。請先複製目前輸入，再從右上角登出並重新登入。';throw new Error('GitHub 登入已失效（Bad credentials）。目前輸入保留在此頁；請先複製備份，再登出並重新登入後重試。');}
    if(!auth.ok)throw new Error('暫時無法確認 GitHub 授權，請稍後重試；目前輸入保留。');
    if(!(await auth.json()).permissions?.push)throw new Error('此 GitHub 帳號沒有網站編輯權限，請使用網站維護者帳號登入。');
  }

  for(const key of ['name','food','sights','image','imageAlt','imageSource','imageLicense'])if(typeof data.get(key)==='string')data=data.set(key,data.get(key).trim());
  for(const provider of ['amap','baidu'])if(data.get(provider)&&mapProvider(data.get(provider))!==provider)throw new Error('請貼上對應平台的 HTTPS 地圖分享連結。');
  if(kind==='themes'&&data.get('link')&&!mapProvider(data.get('link')))throw new Error('主題清單需要 Google Maps、高德或百度的 HTTPS 分享連結。');
  if(!data.get('name'))throw new Error('請填寫名稱。');
  if(data.get('image')&&!data.get('imageAlt'))throw new Error('請為封面照片填寫圖片描述。');
  if(!isImagePath(data.get('image')))throw new Error('請上傳 JPG、PNG、WebP 或 GIF 圖片；檔名不能包含 %、? 或 #。');
  if(['cities','countries','themes'].includes(kind)&&data.get('myMap')&&!myMapId(data.get('myMap')))throw new Error('請貼上 Google 我的地圖完整網址（含 mid），不要貼 iframe 程式碼。');
  if(['cities','countries'].includes(kind))for(const field of ['food','sights']){data=data.set(field,data.get(field)||'');if(!isMapsLink(data.get(field)))throw new Error('請貼上 HTTPS 的 Google Maps 分享連結。');}
  for(const field of ['imageSource','imageLicense'])if(data.get(field)&&!/^https:\/\//.test(data.get(field)))throw new Error('圖片來源與授權網址必須使用 HTTPS。');
  // Fetch the latest branch, rather than a possibly stale deployed content snapshot.
  const repo='R3dra1n/GoogleMapList';
  const r=await fetch(`https://api.github.com/repos/${repo}/contents/content/${kind}?ref=main`,{cache:'no-store'});
  if(!r.ok)throw new Error('暫時無法核對最新清單，請稍後重試；目前輸入會保留。');
  const files=await r.json();
  const entries=await Promise.all(files.filter(f=>f.name.endsWith('.json')).map(async f=>{const response=await fetch(f.download_url,{cache:'no-store'});if(!response.ok)throw new Error('讀取清單失敗，請重試。');return response.json();}));
  const parent=kind==='cities'?'country':kind==='countries'?'continent':null;
  if(entries.some(x=>x.id!==data.get('id')&&x.name.trim()===data.get('name')&&(!parent||x[parent]===data.get(parent))))throw new Error('同一區域已有這個名稱，請返回修改既有項目，或使用不同名稱。');
  if(['cities','countries','themes'].includes(kind)&&!data.get('description')?.trim()&&data.get('autoDescription')!==false){
    status.textContent='正在由 AI 產生簡介，完成後一起儲存…';
    const config=await (await fetch('./connection.json',{cache:'no-store'})).json();
    const response=await fetch(config.authBaseUrl+'/api/admin/descriptions',{method:'POST',headers:{Authorization:`Bearer ${readSession()}`,'Content-Type':'application/json'},body:JSON.stringify({kind,name:data.get('name'),parent:parent?data.get(parent):undefined})});
    const result=await response.json();if(!response.ok)throw new Error(result.error||'AI 簡介生成失敗；可關閉自動簡介後重試。');
    data=data.set('description',result.description);
  }
  status.textContent='正在儲存修改；完成後將自動排程發佈。';
  return data;
}});
for(const event of ['postSave','postPublish','postUnpublish'])CMS.registerEventListener({name:event,handler:()=>{status.textContent='修改已儲存到 GitHub，等待翻譯與網站發佈。請查看發佈進度；完成後重新開啟內容查看譯文。';}});
try {
  const response=await fetch('./connection.json',{cache:'no-store'});
  if(!response.ok)throw new Error('無法讀取管理後台設定，請稍後重試。');
  const connection=await response.json();
  if(!connection.authBaseUrl)throw new Error('清單管理後台尚待連接 GitHub 登入。公開地圖已可使用；完成一次性登入設定後，就能在這裡新增與修改清單。');
  CMS.init({config:{backend:{base_url:connection.authBaseUrl}}});
} catch(error) {
  const setup=document.getElementById('admin-setup');setup.hidden=false;
  const p=document.createElement('p');p.textContent=error.message;
  const a=document.createElement('a');a.href='https://github.com/R3dra1n/GoogleMapList#首次連接認證';a.textContent='查看管理後台連接步驟 ↗';a.target='_blank';a.rel='noopener noreferrer';
  setup.append(p,a);status.textContent='公開網站可瀏覽 · 管理登入尚未連接';
}
new ResizeObserver(entries=>document.documentElement.style.setProperty('--banner-height',`${entries[0].target.getBoundingClientRect().height}px`)).observe(document.querySelector('.admin-banner'));
