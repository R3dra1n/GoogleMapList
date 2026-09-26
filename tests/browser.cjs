const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const base=process.env.TEST_URL||'http://127.0.0.1:4173';
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(15000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);await page.locator('.country-card').first().waitFor();assert.equal(await page.locator('.country-card').count(),5);
 await page.getByRole('link',{name:'探索台灣',exact:true}).click();await page.locator('.city-card').first().waitFor();assert.equal(await page.locator('.city-card').count(),2);
 assert.equal(await page.getByRole('button',{name:/景點・整理中/}).isDisabled(),true);
 const hualien=page.locator('.city-card').filter({hasText:'花蓮縣'});assert.equal(await hualien.getByRole('link',{name:/美食/}).getAttribute('href'),'https://maps.app.goo.gl/5wpnSUyxxYqL2gK47');
 await page.reload();await page.locator('.city-card').first().waitFor();assert.equal(await page.locator('.city-card').count(),2);
 await page.goto(base+'/#/asia/korea');await page.locator('.combined').waitFor();assert.equal(await page.locator('.actions a').count(),2);
 await page.goto(base+'/#/asia/missing');await page.getByText('這個目的地還沒收進口袋').waitFor();
 await page.goto(base+'/#/asia/taiwan');await page.locator('.city-card').first().waitFor();
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/pocket-mobile.png',fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.evaluate(()=>document.documentElement.style.fontSize='32px');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.evaluate(()=>document.documentElement.style.fontSize='');
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.destination-card').first().evaluate(el=>getComputedStyle(el).transitionDuration),'0s');
 await page.getByRole('button',{name:'影像來源'}).click();await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').isVisible(),false);
 await page.route('**/assets/*.jpg',r=>r.abort());await page.reload();await page.locator('.cover-fallback:not([hidden])').first().waitFor();assert.equal(await page.locator('.cover-fallback:not([hidden])').count(),2);await page.unroute('**/assets/*.jpg');
 assert.deepEqual(errors,[]);console.log('PASS frontend: navigation, reload, links, missing states, mobile, zoom, fallback, dialog, reduced motion');
 const cms=await browser.newPage({viewport:{width:1440,height:1000}});cms.setDefaultTimeout(15000);cms.on('pageerror',e=>errors.push(e.message));
 await cms.route('**/admin/connection.json',r=>r.fulfill({json:{authBaseUrl:'http://localhost'}}));
 await cms.route('**/admin/config.yml',r=>r.fulfill({contentType:'text/yaml',body:fs.readFileSync('public/admin/config.yml','utf8').replace('name: github','name: test-repo')}));
 await cms.route('https://api.github.com/repos/R3dra1n/GoogleMapList/contents/**',r=>r.fulfill({json:[]}));
 await cms.goto(base+'/admin/');await cms.getByRole('button',{name:'登入',exact:true}).click();await cms.getByText('＋ 大洲',{exact:true}).click();
 await cms.getByLabel('大洲名稱',{exact:false}).fill('測試亞洲');
 const id=await cms.locator('input[readonly]').inputValue();assert.match(id,/^[a-f0-9-]{36}$/);
 await cms.screenshot({path:'/tmp/pocket-admin-editor.png',fullPage:true});
 
 await cms.getByText('發布',{exact:true}).first().click();
 
 await cms.getByText(/立即發[布佈]|現在發[布佈]/,{exact:true}).click();
 await cms.getByText('修改已儲存到 GitHub，等待網站發佈。請查看發佈進度確認是否上線。',{exact:true}).waitFor();

 await cms.getByText('未儲存變更',{exact:true}).waitFor({state:'hidden'});
 await cms.evaluate(()=>location.hash='/collections/countries/new');
 await cms.getByLabel('名稱',{exact:true}).fill('測試國家');
 await cms.getByRole('combobox').fill('測試亞洲');await cms.waitForTimeout(1500);console.log('RELATION', (await cms.locator('body').innerText()).slice(0,1500));
 await cms.getByText('測試亞洲',{exact:true}).last().click();
 await cms.getByText('發布',{exact:true}).first().click();await cms.getByText('立即發布',{exact:true}).click();
 await cms.getByText('未儲存變更',{exact:true}).waitFor({state:'hidden'});
 await cms.evaluate(()=>location.hash='/collections/cities/new');
 await cms.getByLabel('城市／縣市名稱',{exact:true}).fill('測試城市');
 await cms.getByRole('combobox').fill('測試國家');await cms.getByText('測試國家',{exact:true}).last().click();
 await cms.getByLabel('美食清單連結',{exact:false}).fill('https://example.com/invalid');
 await cms.getByText('發布',{exact:true}).first().click();await cms.getByText('立即發布',{exact:true}).click();
 await cms.getByText(/請貼上 HTTPS 的 Google Maps 分享連結/).waitFor();
 assert.equal(await cms.getByLabel('城市／縣市名稱',{exact:true}).inputValue(),'測試城市');
 await cms.getByLabel('美食清單連結',{exact:false}).fill('https://maps.app.goo.gl/5wpnSUyxxYqL2gK47');
 await cms.getByText('發布',{exact:true}).first().click();await cms.getByText('立即發布',{exact:true}).click();
 await cms.getByText('未儲存變更',{exact:true}).waitFor({state:'hidden'});
 console.log('PASS CMS: hierarchical creation, immutable IDs, relation selection, rejected unsafe links, retry preserving input, saves (memory backend)');
 assert.deepEqual(errors,[]);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
