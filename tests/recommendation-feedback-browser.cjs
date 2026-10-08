const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {readFile}=require('node:fs/promises');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const requests=[];let mode='slow',configRequests=0;
 await page.route('https://feedback.test/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==='/api/recommendations'){requests.push(route.request().postDataJSON());if(mode==='slow')return;return route.fulfill({status:201,contentType:'application/json',body:JSON.stringify({id:requests.at(-1).id})});}
  if(path.includes('connection.json')){configRequests++;return route.abort();}
  if(path==='/')return route.fulfill({contentType:'text/html',body:'<button id="recommend-place">Recommend</button><script type="module" src="/recommendations.js"></script>'});
  return route.fulfill({contentType:'application/javascript',body:await readFile('public'+path,'utf8')});
 });
 await page.goto('https://feedback.test/');await page.locator('#recommendation-dialog').waitFor({state:'attached'});
 await page.clock.install();await page.locator('#recommend-place').click();await page.locator('[name=name]').fill('測試景點');await page.locator('[name=consent]').check();
 await page.locator('[type=submit]').click();await page.waitForFunction(()=>document.querySelector('form').getAttribute('aria-busy')==='true');
 assert.match(await page.locator('#recommendation-result').textContent(),/正在送出/);
 await page.clock.fastForward(4100);assert.match(await page.locator('#recommendation-result').textContent(),/連線比平常慢/);
 await page.clock.fastForward(11000);await page.waitForFunction(()=>document.querySelector('#recommendation-result').textContent.includes('未能及時'));
 assert.equal(await page.locator('[name=name]').inputValue(),'測試景點');assert.equal(await page.locator('[type=submit]').isEnabled(),true);
 mode='success';await page.locator('[type=submit]').click();await page.waitForFunction(()=>document.querySelector('#recommendation-result').textContent.includes('已收到'));
 assert.equal(requests.length,2);assert.equal(requests[0].id,requests[1].id);assert.equal(configRequests,0);
 assert.equal(await page.locator('[name=name]').inputValue(),'');assert.deepEqual(errors,[]);
 console.log('PASS recommendation: direct same-origin submission, progress, slow feedback, timeout, preserved retry ID, success');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
