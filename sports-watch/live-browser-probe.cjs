/* End-to-end probe with the real provider: network and browser, no mocks.
   Observational smoke test: does not assert that matches must exist 24/7. */
const { chromium }=require('playwright');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=__dirname;
const allowed=new Set(['index.html','sports-watch.js','fixtures.js','coverage.js','sports-watch.css']);
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
const server=http.createServer((req,res)=>{
 const file=new URL(req.url,'http://127.0.0.1').pathname.replace(/^\//,'')||'index.html';
 if(!allowed.has(file)){res.writeHead(404);res.end();return;}
 try{res.writeHead(200,{'Content-Type':mime[path.extname(file)],'X-Content-Type-Options':'nosniff'});res.end(fs.readFileSync(path.join(ROOT,file)));}
 catch(e){res.writeHead(500);res.end(String(e));}
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
  const page=await context.newPage();
  const faults=[],calls=[];
  page.on('pageerror',err=>faults.push('JS '+err.message));
  page.on('console',msg=>{if(msg.type()==='error')faults.push('Console '+msg.text());});
  page.on('requestfailed',r=>{if(r.url().includes('sportscore'))faults.push('Fetch '+r.url()+' '+r.failure()?.errorText);});
  page.on('response',response=>{if(response.url().includes('sportscore'))calls.push({url:response.url(),status:response.status()});});
  await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'load'});
  await page.locator('#fixture-sport').selectOption('football');
  await page.waitForFunction(()=>!document.getElementById('fixture-status').textContent.startsWith('Checking'),{timeout:25000}).catch(()=>{});
  const count=await page.locator('.fixture-card').count();
  const before=(await page.locator('#fixture-status').innerText()).slice(0,500);
  let selected=null;
  if(count>0){
   await page.locator('.fixture-card').first().click();
   selected={
    acknowledged:await page.locator('#fixture-selection-result').isVisible(),
    match:(await page.locator('#fixture-selection-name').innerText()).slice(0,150),
    coverage:(await page.locator('#coverage-selected').innerText()).slice(0,300),
    providers:await page.locator('.coverage-card').count()
   };
  }
  console.log(JSON.stringify({device:'mobile-chromium',fixtureCards:count,status:before,selection:selected,requests:calls.slice(0,12),errors:faults.slice(0,12)}));
  if(faults.some(s=>s.startsWith('JS ')))process.exitCode=1;
  if(count>0&&(!selected?.acknowledged||!selected.providers))process.exitCode=1;
 }finally{await browser.close();}
})().catch(e=>{console.error(String(e));process.exitCode=1;}).finally(()=>server.close());
