'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'..'),out=path.join(root,'work/browser-qa');fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8'};
const server=http.createServer((req,res)=>{
 let name;try{name=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400).end();return}
 const file=path.resolve(root,'.'+name+(name.endsWith('/')?'index.html':''));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
 fs.readFile(file,(err,data)=>err?res.writeHead(404).end('Not found'):res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(data));
});
(async()=>{
 await new Promise(r=>server.listen(8177,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [1440,390]){
   const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:8177/',{waitUntil:'domcontentloaded'});
   await page.locator('.pro-landing').waitFor();
   await page.waitForFunction(()=>!document.getElementById('pro-featured-status').textContent.includes('Checking published'),{timeout:12000});
   for(const sport of ['football','racing','tennis','nfl']){
    const displayed=await page.locator('[data-pro-count="'+sport+'"]').innerText();
    assert(/^\d+$/.test(displayed)||displayed==='—','Unavailable sport counts must not masquerade as zero');
   }
   assert((await page.locator('#pro-featured-status').innerText()).includes('No verified betting prices or EV.') || (await page.locator('#pro-featured-status').innerText()).includes('unavailable'));

   assert.equal(await page.locator('[data-pro-slot]').count(),4);
   assert.equal(await page.locator('.pro-arena-sport').count(),4,'Homepage hero must present four sports');
   assert.equal(await page.locator('.pro-hero-arena').isVisible(),true);
   assert.equal(await page.locator('.pro-topnav a[href="./analyst/"]').count(),1);
   await page.locator('.pro-topnav [data-pro-sport="tennis"]').click();
   await page.waitForTimeout(1000);
   assert.equal(await page.locator('#sport-nav button[data-sport="tennis"]').getAttribute('aria-pressed'),'true','Pro sport nav must use existing desk filter');
   await page.locator('[data-pro-slot="2"]').click();
   await page.waitForTimeout(300);
   assert.equal(await page.locator('#slip-tabs button[data-slot="2"]').getAttribute('aria-pressed'),'true','Pro paper slip must use existing slip state');
   await page.screenshot({path:path.join(out,'pro-home-'+width+'.png'),fullPage:false});
   assert.deepEqual(errors,[],'Home page JS runtime errors');
   await page.goto('http://127.0.0.1:8177/analyst/',{waitUntil:'domcontentloaded'});
   await page.locator('#results-count').waitFor();
   await page.waitForFunction(()=>!document.getElementById('analyst-state').textContent.includes('Checking source'),{timeout:12000});
   const num=await page.locator('#metric-events').innerText();
   assert(/^\d+$/.test(num),'Analyst event counts must come from actual snapshots');
   const observedRows=await page.locator('#analyst-events tr').count();
   assert(observedRows>=1);
   const availableOdds=await page.locator('#analyst-events td').filter({hasText:'Not verified'}).count();
   if(num!=='0')assert(availableOdds>0,'Displayed source observations must explicitly label odds as unverified');
   else assert((await page.locator('#selection-note').innerText()).includes('source'),'Empty state must explain data limitations');
   await page.locator('#filter-sport').selectOption('tennis');
   await page.locator('#filter-apply').click();
   assert((await page.locator('#results-count').innerText()).includes('matching source observations'));
   assert.equal(await page.locator('text=Verified ROI').count(),1);
   assert.equal(await page.locator('#calibration-sample').count(),1);
   assert.equal(await page.locator('#calibration-status').count(),1);
   assert((await page.locator('#calibration-status').innerText()).length>0,'Archive status must be explicit');
   assert.equal(await page.locator('text=Not certified').count()>0,true);
   await page.screenshot({path:path.join(out,'pro-analyst-'+width+'.png'),fullPage:false});
   assert.deepEqual(errors,[],'Analyst runtime errors');
   await page.close();
  }
  console.log('PASS: reference Pro homepage and Analyst Terminal on desktop/mobile, original sport/slip delegation, real snapshots and no verified odds claims');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.close());
