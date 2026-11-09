'use strict';
const {chromium}=require('playwright');
const {report}=require('./sports_coverage_report.cjs');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const from=process.argv[2]||new Date().toISOString().slice(0,10),to=process.argv[3]||new Date(Date.parse(from+'T12:00:00Z')+6*86400000).toISOString().slice(0,10);
const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css'})[path.extname(file)]||'text/plain');res.end(data);});
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({headless:true,...(process.env.COVERAGE_BROWSER_EXECUTABLE?{executablePath:process.env.COVERAGE_BROWSER_EXECUTABLE}:{})});
  try{
    const expected=report(from,to),results=[];
    for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
      const page=await browser.newPage({viewport});const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.goto('http://127.0.0.1:'+server.address().port+'/');
      await page.waitForFunction(()=>document.querySelector('#events')?.getAttribute('aria-busy')==='false');
      await page.evaluate(({from,to})=>{for(const [id,value] of [['date-to',to],['date-from',from]]){const e=document.getElementById(id);e.value=value;e.dispatchEvent(new Event('change',{bubbles:true}));}},{from,to});
      for(const sport of ['racing','tennis','nfl','football']){
        if(await page.locator('#sport').isVisible())await page.selectOption('#sport',sport);
        else await page.locator('[data-sport="'+sport+'"]:visible').first().click();
        const count=expected.days.reduce((sum,d)=>sum+d[sport].upcoming,0);
        await page.waitForFunction(n=>document.querySelectorAll('#events .event-card').length===Math.min(24,n),count);
        while(await page.locator('#events .load-more').count())await page.locator('#events .load-more').click();
        assert.equal(await page.locator('#events .event-card').count(),count);
        if(sport==='racing'&&count){assert((await page.locator('.source-entries').count())>0);assert((await page.locator('.source-entries p').count())>0);}
        const greenExpected=sport==='racing'?expected.days.reduce((sum,d)=>sum+d.racing.green_publisher_forecast+d.racing.green_observed_market,0):null;
        const greenDisplayed=sport==='racing'?await page.locator('#events [data-evidence-green="true"]').count():null;
        if(sport==='racing')assert.equal(greenDisplayed,greenExpected,'Every qualifying real source favourite must reach a highlighted runner button');
        const blueExpected=sport==='racing'?expected.days.reduce((sum,d)=>sum+d.racing.blue_source_selections,0):null;
        const yellowExpected=sport==='racing'?expected.days.reduce((sum,d)=>sum+d.racing.yellow_agreements,0):null;
        if(sport==='racing')await page.waitForFunction(({blue,yellow})=>document.querySelectorAll('#events [data-evidence-blue="true"]').length===blue&&document.querySelectorAll('#events [data-evidence-yellow="true"]').length===yellow,{blue:blueExpected,yellow:yellowExpected});
        const blueDisplayed=sport==='racing'?await page.locator('#events [data-evidence-blue="true"]').count():null;
        const yellowDisplayed=sport==='racing'?await page.locator('#events [data-evidence-yellow="true"]').count():null;
        if(sport==='racing')assert(await page.locator('#events .event-card').evaluateAll(cards=>cards.every(c=>c.querySelectorAll('[data-evidence-blue="true"]').length<=1&&c.querySelectorAll('[data-evidence-yellow="true"]').length<=1)),'Every race has at most one blue leader and one yellow agreement');
        results.push({width:viewport.width,sport,displayed:count,greenExpected,greenDisplayed,blueExpected,blueDisplayed,yellowExpected,yellowDisplayed});
      }
      assert.deepEqual(errors,[]);await page.close();
    }
    console.log(JSON.stringify({from,to,results},null,2));
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
