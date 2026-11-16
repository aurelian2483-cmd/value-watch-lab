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
  if (!['index.html','sports-watch.css','sports-watch.js','fixtures.js','coverage.js'].includes(file)){res.writeHead(404);res.end();return;}
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
   // Serve an older CSS version that lacks the hidden-placeholder override.
   await context.route('**/sports-watch.css*', route => {
     const oldCss=fs.readFileSync(path.join(ROOT,'sports-watch.css'),'utf8').replace('.video-area iframe[hidden],.player-empty[hidden]{display:none}', '.video-area iframe[hidden]{display:none}');
     return route.fulfill({status:200,contentType:'text/css',body:oldCss});
   });
   await context.route('https://**/*',route=>route.abort());
   await context.route('https://sportscore.com/**',route=>{
     const requested=new URL(route.request().url());
     const sport=requested.searchParams.get('sport');
     const upcoming=requested.searchParams.get('status')==='upcoming';
     const matches=upcoming
       ? (sport==='tennis'?[{home:'Player Alpha',away:'Player Beta',status:'upcoming',time:'2026-11-16T16:00:00Z',competition:'Test tennis'}]:[])
       : (sport==='football'?[{home:'Live Home',away:'Live Away',status:'live',time:'2026-11-16T12:00:00Z',competition:'Test league',home_score:1,away_score:0},{home:'Finished',away:'Game',status:'finished',time:'2026-11-16T10:00:00Z'}]:[]);
     return route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify({matches,fixtures:matches})});
   });
   const page=await context.newPage();
   const errors=[];
   page.on('pageerror',err=>errors.push(err.message));
   await page.goto(url,{waitUntil:'load'});
   assert.equal(await page.title(),'Sports Watch | Value Watch Pro');
   // Default Live Now is backed by a mocked provider response, not invented app data.
   assert.equal(await page.locator('#fixture-live').getAttribute('aria-pressed'),'true');
   await page.locator('.fixture-card').first().waitFor({state:'visible'});
   assert.equal(await page.locator('.fixture-card').count(),1,'finished event must be excluded from live list');
   assert.match(await page.locator('.fixture-card').first().innerText(),/Live Home vs Live Away/);
   assert.equal(await page.locator('.fixture-attribution a').first().innerText(),'Powered by SportScore');
   await page.locator('.fixture-card').first().click();
   assert.match(await page.locator('#selected-match').innerText(),/Live Home vs Live Away/);
   assert.equal(await page.locator('#coverage-sport').inputValue(),'football');
   assert.match(await page.locator('#coverage-selected').innerText(),/Live Home vs Live Away/);
   assert.equal(await page.locator('#fixture-selection-result').isVisible(),true,'fixture selection must visibly acknowledge selected game');
   assert.match(await page.locator('#fixture-selection-name').innerText(),/Live Home vs Live Away/);
   assert.equal(await page.locator('.coverage-panel').isVisible(),true);
   await page.getByRole('button',{name:'View coverage options'}).click();
   assert.ok(await page.locator('.coverage-card').count()>0);
   assert.equal(await page.locator('.coverage-card').first().getAttribute('target'),'_blank');
   assert.equal(await page.locator('#source-a').inputValue(),'','official coverage suggestions must not inject video links');
   assert.equal(await page.locator('#source-a').inputValue(),'','fixture selection must not invent video links');
   await page.locator('#fixture-upcoming').click();
   await page.locator('.fixture-card').first().waitFor({state:'visible'});
   assert.equal(await page.locator('.fixture-card').count(),1);
   assert.match(await page.locator('.fixture-card').first().innerText(),/Player Alpha vs Player Beta/);

   // A sport with zero live responses should offer an honest Upcoming option.
   await page.locator('#fixture-live').click();
   await page.locator('#fixture-sport').selectOption('basketball');
   await page.locator('#fixture-view-upcoming').waitFor({state:'visible'});
   assert.match(await page.locator('#fixture-status').innerText(),/No confirmed live fixtures/);
   await page.locator('#fixture-view-upcoming').click();
   assert.equal(await page.locator('#fixture-upcoming').getAttribute('aria-pressed'),'true');
   await page.locator('#fixture-sport').selectOption('tennis');
   await page.locator('.fixture-card').first().waitFor({state:'visible'});
   await page.locator('#fixture-manual').click();
   assert.equal(await page.locator('.fixture-card').count(),0);
   assert.match(await page.locator('#fixture-status').innerText(),/Manual entry selected/);
   await page.locator('#fixture-live').click();
   await page.locator('#fixture-sport').selectOption('football');
   await page.locator('.fixture-card').first().waitFor({state:'visible'});

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
   assert.equal(await page.locator('#player-empty').isVisible(),false,'empty-state placeholder must not conceal active video');
   assert.equal(await page.locator('#youtube-link').isVisible(),true);
   assert.equal(await page.locator('#youtube-link').getAttribute('href'),'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
   assert.match(await page.locator('#player-status').innerText(),/YouTube|player/i);
   await page.getByRole('button',{name:'Stop playback'}).click();
   assert.equal(await page.locator('#player').getAttribute('src'),null);
   assert.equal(await page.locator('#player').isVisible(),false);
   assert.equal(await page.locator('#player-empty').isVisible(),true,'placeholder must return when playback stops');
   assert.equal(await page.locator('#youtube-link').isVisible(),false);
   // Four-stage workflow: keep the match while switching approved YouTube links.
   await page.locator('#match-name').fill('Test Team A vs Test Team B');
   await page.locator('#match-competition').fill('Test fixture only');
   await page.getByRole('button',{name:'Select match'}).click();
   assert.match(await page.locator('#selected-match').innerText(),/Test Team A vs Test Team B/);
   assert.match(await page.locator('#coverage-selected').innerText(),/Choose its sport/);
   assert.equal(await page.locator('.coverage-card').count(),0,'manual match without sport must not guess broadcaster');
   await page.locator('#coverage-sport').selectOption('darts');
   assert.ok(await page.locator('.coverage-card').count()>0);
   assert.match(await page.locator('.coverage-card').first().innerText(),/Official destination/);
   await page.locator('#source-a').fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
   await page.locator('#source-b').fill('https://youtu.be/9bZkp7q19f0');
   await page.locator('#source-c').fill('https://livetv.sx/');
   await page.getByRole('button',{name:'Check links'}).click();
   assert.match(await page.locator('#source-security-status').innerText(),/Rejected source C/);
   assert.equal(await page.locator('.source-choices button').count(),0);
   await page.locator('#source-c').fill('');
   await page.getByRole('button',{name:'Check links'}).click();
   assert.equal(await page.locator('.source-choices button').count(),2);
   assert.match(await page.locator('#source-security-status').innerText(),/2 structurally checked/);
   await page.getByRole('button',{name:/Source A · HTTPS/}).click();
   assert.equal(await page.locator('#player').getAttribute('src'),'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
   assert.match(await page.locator('#active-source').innerText(),/Source A/);
   await page.getByRole('button',{name:'Try next checked source'}).click();
   assert.equal(await page.locator('#player').getAttribute('src'),'https://www.youtube-nocookie.com/embed/9bZkp7q19f0');
   assert.match(await page.locator('#active-source').innerText(),/Source B/);
   assert.match(await page.locator('#selected-match').innerText(),/Test Team A vs Test Team B/);
   await page.getByRole('button',{name:'Previous source'}).click();
   assert.equal(await page.locator('#player').getAttribute('src'),'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
   await page.locator('#source-b').fill('https://youtube.com.evil.example/watch?v=9bZkp7q19f0');
   assert.equal(await page.locator('.source-choices button').count(),0,'editing a link revokes prior checks');
   assert.equal(await page.locator('#player').getAttribute('src'),null);
   assert.equal(await page.locator('#next-source').isDisabled(),true);
   await page.locator('#source-b').fill('https://youtu.be/9bZkp7q19f0');
   await page.getByRole('button',{name:'Check links'}).click();
   assert.equal(await page.locator('.source-choices button').count(),2);
   await page.getByRole('button',{name:/Source A · HTTPS/}).click();
   await page.getByRole('button',{name:'Stop playback'}).click();
   assert.match(await page.locator('#active-source').innerText(),/Playback stopped/);
   assert.equal(await page.locator('#player').getAttribute('src'),null);
   assert.deepEqual(errors,[],'page JavaScript errors at '+viewport.width);
   console.log('PASS Sports Watch browser smoke test',viewport.width+'x'+viewport.height);
   await context.close();
  }
 }finally{await browser.close();}
};
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.close());
