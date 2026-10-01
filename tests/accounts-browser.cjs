const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const {setup}=await import('./helpers/accounts-env.mjs');
 const {accounts}=await import('../worker/accounts.mjs');
 const {env,db}=setup();const sent=[];
 db.prepare('INSERT INTO creator_invitations(email) VALUES(?)').run('alice@example.com');
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
 const context=await browser.newContext();
 await context.route('https://accounts.test/**',async route=>{
  const r=route.request();const headers=await r.allHeaders();
  const request=new Request(r.url(),{method:r.method(),headers,...(r.postDataBuffer()?{body:r.postDataBuffer()}: {})});
  const response=await accounts(request,env,async(_url,options)=>{sent.push(JSON.parse(options.body));return Response.json({id:'test'});});
  await route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:Buffer.from(await response.arrayBuffer())});
 });
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>(errors.push(e.message),console.error('PAGE ERROR:',e.message)));
 await page.goto('https://accounts.test/account/');
 await page.locator('#email').fill('alice@example.com');await page.locator('#send-email').click();
 await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('將收到'));
 assert.equal(sent.length,1);const url=sent[0].text.match(/https:\/\/\S+/)[0];
 await page.goto(url);await page.locator('#confirm').click();await page.locator('#editor').waitFor({state:'visible'});
 await page.locator('#name').fill('Alice 的口袋世界');await page.locator('#description').fill('<script>文字是安全的</script>');
 assert.equal(await page.locator('#preview-description').textContent(),'<script>文字是安全的</script>');
 await page.locator('#links').fill('我的網站 | https://example.com');
 await page.locator('#avatar').setInputFiles({name:'avatar.png',mimeType:'image/png',buffer:await require('sharp')({create:{width:40,height:40,channels:3,background:'#1647dd'}}).png().toBuffer()});
 await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('圖片已預覽'));
 await page.locator('#save').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('草稿已儲存'));
 assert.equal(db.prepare('SELECT name FROM creator_profiles').get().name,'Alice 的口袋世界');
 assert.equal(db.prepare('SELECT mime FROM creator_media').get().mime,'image/webp');
 await page.reload();await page.locator('#editor').waitFor({state:'visible'});assert.equal(await page.locator('#name').inputValue(),'Alice 的口袋世界');
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.locator('#logout').click();await page.locator('#login').waitFor({state:'visible'});
 assert.equal(db.prepare('SELECT COUNT(*) n FROM creator_sessions').get().n,0);
 assert.deepEqual(errors,[]);console.log('PASS: email login, safe profile preview, save/reload, compressed avatar upload, mobile layout, logout');
 }finally{await browser.close();db.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
