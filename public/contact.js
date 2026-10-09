const form=document.getElementById('contact-form'),status=document.getElementById('contact-status'),topic=document.getElementById('topic');
const requested=new URLSearchParams(location.search).get('type');if(['general','content','account'].includes(requested))topic.value=requested;
let busy=false,previous='',id='';
form.onsubmit=async e=>{e.preventDefault();if(busy)return;const reason=document.getElementById('message').value.trim();if(!reason){status.textContent='請填寫訊息內容。';return;}
 const email=document.getElementById('reply-email').value.trim(),signature=JSON.stringify([topic.value,reason,email]);if(signature!==previous){previous=signature;id=crypto.randomUUID();}
 busy=true;const button=form.querySelector('button');button.disabled=true;status.textContent='正在送出…';
 try{const base=location.hostname==='r3dra1n.github.io'?'https://pocket-atlas-auth.huayang-hsu.workers.dev':'';
 const r=await fetch(base+'/api/recommendations',{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(15000),body:JSON.stringify({id,name:'[聯絡] '+topic.selectedOptions[0].textContent,category:'other',reason,email,consent:document.getElementById('consent').checked,country:'',city:'',mapUrl:''})});const result=await r.json();if(!r.ok)throw Error(result.error||'送出失敗');status.textContent='訊息已保存到管理員收件箱。收到後會依內容處理；請留意回覆信箱。';form.reset();previous='';
 }catch(e){status.textContent=e.name==='TimeoutError'?'暫時未收到確認，內容已保留，可再按送出；相同內容不會重複建立。':e.message||'送出失敗，請稍後再試。';}finally{busy=false;button.disabled=false;}};
