'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const {chromium} = require('playwright');
const root = path.resolve(__dirname,'..');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript','.json':'application/json'};
const server=http.createServer(async(req,res)=>{
  try {
    const p=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const file=path.resolve(root,'.'+p+(p.endsWith('/')?'index.html':''));
    if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
    const bytes=await fs.readFile(file);
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});
    res.end(bytes);
  } catch{res.writeHead(404).end();}
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch();
  const base='http://127.0.0.1:'+server.address().port;
  try {
    for(const width of [1440,390,320]){
      const page=await browser.newPage({viewport:{width,height:900}});
      const errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      const response=await page.goto(base+'/alpha-hunt/',{waitUntil:'load'});
      assert.equal(response.status(),200);
      await page.getByRole('heading',{level:1}).getByText(/Is an apparent edge/).waitFor();
      await page.getByRole('heading',{name:'Research workflow'}).waitFor();
      const decision=page.getByRole('heading',{name:'Confirmed boundary and unanswered requirements'});
      await decision.waitFor();
      assert.equal(await page.locator('ol.pipeline > li').count(),9);
      assert.equal(await page.locator('#decisions tbody tr').count(),7);
      const v5=page.locator('#decisions tbody tr').filter({hasText:'Alpha Hunt v5 is the agreed research architecture'});
      assert.equal(await v5.count(),1);
      assert.match(await v5.textContent(),/Agreed · design only/);
      const dataSharing=page.locator('#decisions tbody tr').filter({hasText:'Alpha Hunt may read Value Watch historical results, bookmaker odds and model predictions.'});
      assert.equal(await dataSharing.count(),1);
      assert.match(await dataSharing.textContent(),/Agreed · read-only/);
      assert.match(await dataSharing.textContent(),/no data interface is implemented or verified yet/);
      assert.equal(await page.locator('script').count(),0,'No sportsbook or model execution scripts on Alpha Hunt page');
      assert.equal(await page.locator('link[rel="stylesheet"]').count(),1);
      const style=await page.locator('body').evaluate(e=>getComputedStyle(e).backgroundColor);
      assert.notEqual(style,'rgba(0, 0, 0, 0)','CSS must load');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'No horizontal overflow on Alpha Hunt');
      await page.getByRole('navigation',{name:'Alpha Hunt navigation'}).getByRole('link',{name:'Decisions'}).click();
      assert.equal(new URL(page.url()).hash,'#decisions');
      await page.getByRole('link',{name:'Value Watch home'}).click();
      assert.equal(new URL(page.url()).pathname,'/');
      assert((await page.locator('a[href="./alpha-hunt/"]').count())>=4,'Homepage must offer independent Alpha Hunt route');
      // The normal homepage script consumes the price template during start-up.
      // Verify source HTML before script hydration rather than testing for a node
      // that the production display intentionally removes.
      const served=await page.request.get(base+'/');
      assert.equal(served.status(),200);
      assert((await served.text()).includes('<template id="vw-published-prices">'),
        'Original served price template retained');
      assert.deepEqual(errors,[],'Alpha Hunt should not throw script errors');
      await page.close();
    }
    console.log('PASS Alpha Hunt standalone website + homepage links on 1440, 390 and 320 px; independent, responsive and no API side effects');
  } finally {
    await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
})().catch(err=>{console.error(err);process.exitCode=1;server.close();});
