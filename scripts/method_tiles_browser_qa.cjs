'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require('playwright');

const root=path.resolve(__dirname,'..');
const types={'.html':'text/html','.css':'text/css','.js':'application/javascript','.json':'application/json'};
const server=http.createServer(async(req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const file=path.resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
    if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
    const data=await fs.readFile(file);
    return res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'}).end(data);
  }catch{res.writeHead(404).end();}
});
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const url='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch();
  const checked=[];
  try{
    for(const entry of ['/', '/paper-lab/']){
      for(const width of [1440,390]){
        const page=await browser.newPage({viewport:{width,height:870}});
        const errors=[];
        page.on('pageerror',e=>errors.push(e.message));
        await page.goto(url+entry,{waitUntil:'load'});
        // Unified Desk intentionally moves Engine View into the collapsed
        // Research tools disclosure on narrow mobile screens. Open it first.
        const revealPicker=async()=>{
          const collapsed=page.locator('details.dashboard-slip-tools:not([open]) > summary');
          if(await collapsed.count()) await collapsed.click();
        };
        await revealPicker();
        const picker=page.locator('#engine-methods');
        const box=id=>picker.locator('button[data-method="'+id+'"]');
        await box('current').waitFor();
        assert.equal(await picker.locator('button').count(),7);
        const legend=page.locator('.method-star-guide');
        await legend.waitFor();
        assert.equal(await legend.locator('.method-star-key').count(),8);
        assert.equal(await picker.locator('.method-identity-star').count(),7);
        assert.equal(await legend.getByText('Alpha Hunt',{exact:true}).count(),1);
        assert.equal(await legend.locator('a[href$="/alpha-hunt/"]').count(),1);
        const shade=async id=>box(id).locator('.method-identity-star').evaluate(node=>getComputedStyle(node).color);
        assert.notEqual(await shade('current'),await shade('experimental'));
        assert.notEqual(await shade('experimental'),await shade('hybrid'));
        assert.equal(await box('current').getAttribute('aria-pressed'),'true');
        await box('current').click();
        assert.equal(await box('current').getAttribute('aria-pressed'),'false');
        await box('experimental').focus();
        await page.keyboard.press('Space');
        await box('hybrid').click();
        const overlap = await page.evaluate(() => {
          const picker=document.querySelector('#engine-methods');
          const tile=document.querySelector('#engine-methods [data-method="bottleneck"]');
          const slip=document.querySelector('#slip-panel');
          const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}};
          const target=rect(tile),column=rect(picker),panel=rect(slip);
          const hit=document.elementFromPoint(target.x+target.width/2,target.y+target.height/2);
          return {target,column,panel,hit:hit?.id||hit?.className||hit?.tagName,
            body:document.body.className,html:document.documentElement.className,
            viewport:{width:innerWidth,height:innerHeight}};
        });
        console.log('Engine tile geometry',entry,width,JSON.stringify(overlap));
        await box('bottleneck').click();
        for(const id of ['experimental','hybrid','bottleneck'])
          assert.equal(await box(id).getAttribute('aria-pressed'),'true');
        const panels=page.locator('#engine-analysis .engine-mode-panel');
        await page.waitForFunction(()=>document.querySelectorAll('#engine-analysis .engine-mode-panel').length===3);
        assert.deepEqual(await panels.evaluateAll(nodes=>nodes.map(n=>n.dataset.enginePanel)),['experimental','hybrid','bottleneck']);
        assert((await page.locator('#engine-status').textContent()).includes('3 methods selected'));
        const selectedStyle=await box('hybrid').evaluate(e=>getComputedStyle(e).backgroundImage);
        const unselectedStyle=await box('current').evaluate(e=>getComputedStyle(e).backgroundImage);
        assert.notEqual(selectedStyle,unselectedStyle,'Selected boxes need visibly different blue backgrounds');
        assert.equal(await page.locator('#engine-select').evaluate(e=>e.getAttribute('aria-hidden')),'true');
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'No mobile overflow');
        await page.reload({waitUntil:'load'});
        await revealPicker();
        await box('hybrid').waitFor();
        assert.equal(await box('hybrid').getAttribute('aria-pressed'),'true');
        assert.equal(await box('bottleneck').getAttribute('aria-pressed'),'true');
        assert.equal(await page.locator('#engine-analysis .engine-mode-panel').count(),3);
        await box('experimental').click();
        await box('hybrid').click();
        await box('bottleneck').click();
        assert.equal(await page.locator('#engine-analysis').isHidden(),true);
        assert.equal(await legend.locator('.method-star-key').count(),8,'Coloured method identity remains visible without any selections');
        assert((await page.locator('#engine-status').textContent()).includes('Select one or more'));
        await box('compare').click();
        assert.equal(await page.locator('#engine-analysis .engine-mode-panel').count(),1);
        assert.equal(await box('compare').getAttribute('aria-pressed'),'true');
        assert.equal(errors.length,0,errors.join('\n'));
        checked.push(entry+':'+width);
        await page.close();
      }
    }
    console.log('PASS real browser method-tile selection, 7 tiles, keyboard, 3 parallel panels, persistence, mobile and desktop:',checked.join(', '));
  }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
