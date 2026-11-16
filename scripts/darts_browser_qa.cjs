'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'};
const server=http.createServer((req,res)=>{
 let name;try{name=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname)}catch{return res.writeHead(400).end()}
 const file=path.resolve(root,'.'+name+(name.endsWith('/')?'index.html':''));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
 fs.readFile(file,(err,data)=>err?res.writeHead(404).end():res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(data));
});
(async()=>{
 await new Promise(r=>server.listen(8191,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [1440,390]){
   const page=await browser.newPage({viewport:{width,height:900}}),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:8191/',{waitUntil:'domcontentloaded'});
   assert.equal(await page.locator('a[href="./darts/"]').count()>=1,true,'Home navigation must link darts lab');
   await page.goto('http://127.0.0.1:8191/darts/',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>{const s=document.querySelector('#feed-status')?.textContent||'';return s.includes('UNVALIDATED / BLOCKED')||(s.includes('unavailable')&&!s.includes('Checking'))});
   const originalCount=await page.locator('#forecast-count').innerText();
   assert(/^\d+$/.test(originalCount),'Published forecast count must be numeric');
   assert((await page.locator('#feed-status').innerText()).includes('BLOCKED'));
   const results=Array.from({length:8},(_,i)=>({id:'r'+i,played_at:'2026-10-'+String(i+1).padStart(2,'0')+'T11:00:00Z',status:'FINAL',player_a:{id:'a',name:'Player A'},player_b:{id:'b',name:'Player B'},winner_id:'a'}));
   const fixtures=[{id:'future',start_utc:'2099-06-01T20:00:00Z',status:'SCHEDULED',competition:'Local test',player_a:{id:'a',name:'Player A'},player_b:{id:'b',name:'Player B'}}];
   await page.locator('#import-json').setInputFiles({name:'sample.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({results,fixtures}))});
   await page.waitForFunction(()=>document.querySelector('#forecast-count').textContent==='1');
   assert((await page.locator('#matches').innerText()).includes('NOT CALIBRATED'));
   assert((await page.locator('#import-status').innerText()).includes('No source verification'));
   await page.locator('#reset').click();
   await page.waitForFunction(expected=>document.querySelector('#forecast-count').textContent===expected,originalCount);
   assert.deepEqual(errors,[],'No client runtime errors');
   await page.close();
  }
  console.log('Darts homepage link, provider-observed or empty research feed, imported Elo, reset, desktop/mobile QA passed');
 } finally{await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1;server.close()});
