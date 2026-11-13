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
   if(width<1020)await page.locator('#paper-open').click();
   await page.locator('.wildcard-risk-studio').waitFor({timeout:15000});
   assert.equal(await page.locator('.wildcard-review-lenses .wildcard-lens').count(),3,'All three independent method lenses must be visible');
   assert.equal(await page.locator('.wildcard-risk-mode').count(),4,'Wildcard needs four risk options');
   assert((await page.locator('.wildcard-risk-studio').innerText()).includes('FIFTH EXPERIMENTAL PAPER SLIP'));
   const firstMode=page.locator('.wildcard-risk-mode').first();
   if(await firstMode.isEnabled()){
     await firstMode.click();
     const legs=page.locator('.wildcard-fifth-leg');
     assert.equal(await legs.count(),2,'Double scenario must contain two different events');
     const prices=legs.locator('input');
     await prices.nth(0).fill('2.00');
     await prices.nth(1).fill('3.00');
     const paperStake=page.locator('.wildcard-fifth-slip label:has-text("Hypothetical £ stake") input');
     await paperStake.fill('1.00');
     assert((await page.locator('.wildcard-calculation').innerText()).includes('£6.00'),'Scenario arithmetic is 1 × 2 × 3');
     await page.reload({waitUntil:'domcontentloaded'});
     if(width<1020)await page.locator('#paper-open').click();
     await page.locator('.wildcard-risk-studio').waitFor({timeout:15000});
     assert((await page.locator('.wildcard-fifth-slip input').first().inputValue())==='2.00','Fifth draft should persist on the same browser');
     assert.equal(await page.locator('#slip-tabs button').count(),4,'Original four slip slots must remain intact');
   }
   if(width<1020)await page.locator('#paper-close').click();

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
   await page.goto('http://127.0.0.1:8177/wildcard/',{waitUntil:'domcontentloaded'});
   await page.locator('#three-lenses .lens').first().waitFor({timeout:15000});
   assert.equal(await page.locator('#three-lenses .lens').count(),3,'Gold Council must contain three distinct reviewer decisions');
   assert.equal(await page.locator('#benter-heading').isVisible(),true,'Dedicated horse-racing lab must be visible');
   const horseForecastCount=Number(await page.locator('#horse-forecasts').innerText());
   assert(Number.isInteger(horseForecastCount)&&horseForecastCount>=0,'Horse forecasts must be a real observed count');
   if(horseForecastCount===0)assert.equal(await page.locator('#horse-eligible').innerText(),'0','No current forecasts must imply zero racing selections');
   assert((await page.locator('#racing-explanation').innerText()).length>30,'Horse audit must explain exclusion or eligibility');
   assert((await page.locator('#ticket-legs').innerText()).length>0,'Gold Council ticket must explain what it is showing');
   assert((await page.locator('.ticket').innerText()).includes('NOT APPROVED'),'Gold ticket must not imply independently verified betting edge');
   assert.equal(await page.locator('#ticket-legs .ticket-leg').count()<=3,true,'Council does not mechanically fill seven legs');
   const hypotheticPrices=page.locator('#manual-prices input');
   if(await hypotheticPrices.count()===2){
     await hypotheticPrices.nth(0).fill('2');
     await hypotheticPrices.nth(1).fill('3');
     await page.locator('#stake').fill('1.00');
     assert((await page.locator('#sim-result').innerText()).includes('£6.00'),'Council arithmetic must use only manually entered prices');
     assert((await page.locator('#sim-result').innerText()).includes('not a verified bookmaker offer'));
   }
   await page.screenshot({path:path.join(out,'gold-council-'+width+'.png'),fullPage:false});
   assert.deepEqual(errors,[],'Gold Council runtime errors');

   await page.close();
  }
  console.log('PASS: reference Pro homepage and Analyst Terminal on desktop/mobile, original sport/slip delegation, real snapshots and no verified odds claims');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.close());
