/* Isolated browser QA: exercises Sports Watch UI without loading remote video. */
const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const ROOT = __dirname;
const MIME = { '.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8' };
const server = http.createServer((req,res)=>{
  const requested = new URL(req.url,'http://127.0.0.1').pathname;
  const file = requested==='/'?'index.html':requested.slice(1);
  if (!['index.html','sports-watch.css','sports-watch.js'].includes(file)){res.writeHead(404);res.end();return;}
  const p=path.join(ROOT,file);
  try {res.writeHead(200,{'Content-Type':MIME[path.extname(file)],'X-Content-Type-Options':'nosniff'});res.end(fs.readFileSync(p));}
  catch(e){res.writeHead(500);res.end();}
});
const main=async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+server.address().port+'/';
 const browser=await chromium.launch({headless:true});
 try {
  for (const viewport of [{width:1440,height:900},{width:1024,height:768},{width:768,height:1024},{width:390,height:844}]) {
   const context=await browser.newContext({viewport,serviceWorkers:'block'});
   await context.route('https://**/*',route=>route.abort());
   const page=await context.newPage();
   const errors=[];
   page.on('pageerror',err=>errors.push(err.message));
   await page.goto(url,{waitUntil:'load'});
   assert.equal(await page.title(),'Sports Watch | Value Watch Pro');
   assert.equal(await page.locator('.provider').count(),12);
   assert.equal(await page.locator('#sport-count').innerText(),'12 provider destinations');
   const layout=await page.evaluate(()=>({body:document.documentElement.scrollWidth,window:window.innerWidth}));
   assert.ok(layout.body<=layout.window+1,'horizontal overflow at '+viewport.width+': '+JSON.stringify(layout));
   await page.getByRole('button',{name:/Darts/}).click();
   assert.equal(await page.locator('.provider').count(),3);
   assert.equal(await page.getByRole('button',{name:/Darts/}).getAttribute('aria-pressed'),'true');
   await page.getByRole('button',{name:/All sports/}).click();
   assert.equal(await page.locator('.provider').count(),12);
   const input=page.locator('#video-url');
   await input.fill('https://livetv.sx/');
   await page.getByRole('button',{name:'Load video'}).click();
   assert.match(await page.locator('#player-status').innerText(),/Not permitted/);
   assert.equal(await page.locator('#player').getAttribute('src'),null);
   await input.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
   await page.getByRole('button',{name:'Load video'}).click();
   assert.equal(await page.locator('#player').getAttribute('src'),'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
   assert.equal(await page.locator('#player').isVisible(),true);
   assert.equal(await page.locator('#youtube-link').isVisible(),true);
   assert.equal(await page.locator('#youtube-link').getAttribute('href'),'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
   assert.match(await page.locator('#player-status').innerText(),/YouTube|player/i);
   await page.getByRole('button',{name:'Stop playback'}).click();
   assert.equal(await page.locator('#player').getAttribute('src'),null);
   assert.equal(await page.locator('#player').isVisible(),false);
   assert.equal(await page.locator('#youtube-link').isVisible(),false);
   assert.deepEqual(errors,[],'page JavaScript errors at '+viewport.width);
   console.log('PASS Sports Watch browser smoke test',viewport.width+'x'+viewport.height);
   await context.close();
  }
 }finally{await browser.close();}
};
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.close());
