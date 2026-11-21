'use strict';
const {chromium}=require('playwright');
const AxeBuilder=require('@axe-core/playwright').default;
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
   const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
   const page=await context.newPage();
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   for (const sport of ['football','racing','tennis','nfl']) {
     await page.goto('http://127.0.0.1:8177/?sport='+sport+'#events-view');
     assert.equal(await page.locator('#sport').inputValue(),sport,'Deep link applies the original sport filter');
     assert.equal(await page.locator('#sport-nav [data-sport="'+sport+'"]').getAttribute('aria-pressed'),'true');
   }
   await page.goto('http://127.0.0.1:8177/market-intelligence/');
   await page.waitForFunction(() => !document.querySelector('#market-status').textContent.startsWith('Loading'));
   assert((await page.locator('.terminal-gate').innerText()).includes('UNVALIDATED · Publication BLOCKED'));
   const markets = page.locator('#match option');
   if (await markets.count()) {
     assert(await page.locator('#market-rows tr').count() >= 3);
     assert((await page.locator('#market-status').innerText()).includes('recorded historical observations'));
     assert((await page.locator('#market-rows a').first().getAttribute('href')).startsWith('https://'));
     if (await markets.count() > 1) await page.locator('#match').selectOption('1');
   } else {
     assert((await page.locator('#market-status').innerText()).includes('No source-backed'));
   }
   assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
   const marketAudit = await new AxeBuilder({page}).analyze();
   assert.deepEqual(marketAudit.violations.map(violation => violation.id), []);
   await page.screenshot({path:path.join(out,'market-intelligence-'+width+'.png')});
   await page.route('**/hybrid-market-data.json', route => route.fulfill({status:503}));
   await page.reload();
   await page.getByText('The recorded market feed is unavailable.', {exact:true}).waitFor();
   assert.equal(await page.locator('#market-rows tr').count(), 0);
   await page.unroute('**/hybrid-market-data.json');
   await page.goto('http://127.0.0.1:8177/',{waitUntil:'domcontentloaded'});
   await page.locator('.pro-landing').waitFor();
   await page.waitForFunction(()=>!document.getElementById('pro-featured-status').textContent.includes('Checking published'),{timeout:12000});
   for(const sport of ['football','racing','tennis','nfl']){
    const displayed=await page.locator('[data-pro-count="'+sport+'"]').innerText();
    assert(/^\d+$/.test(displayed)||displayed==='—','Unavailable sport counts must not masquerade as zero');
   }
   assert((await page.locator('#pro-featured-status').innerText()).includes('No verified bookmaker odds, EV or qualifying bets.') || (await page.locator('#pro-featured-status').innerText()).includes('unavailable'),'Homepage must clearly deny verified betting value when source feeds are absent or unverified');

   assert.equal(await page.locator('.pro-darts-preview').count(),1,'Homepage must have one darts preview');
   assert.equal(await page.locator('#pro-darts-feed-status').count(),0,'Detailed coverage must not clutter homepage');
   assert((await page.locator('.pro-darts-preview-summary').innerText()).includes('no verified betting fixtures'),'Homepage must retain research warning');
   assert.equal(await page.locator('.pro-darts-preview a[href="./darts/"]').count(),1,'Darts CTA must open laboratory');
   const dartsFilter = page.locator('.pro-quick-filters [data-pro-sport="darts"]');
   assert.equal(await dartsFilter.count(),1,'Darts fixtures should be available in the source-backed event filter');
   assert.match(await dartsFilter.locator('[data-pro-count="darts"]').innerText(), /^(?:\d+|—)$/);
   await page.goto('http://127.0.0.1:8177/darts/',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>!document.getElementById('coverage-verification').textContent.includes('Checking published'),{timeout:12000});
   assert.equal(await page.locator('#coverage-confirmed').count(),1);
   assert.equal(await page.locator('#coverage-tentative').count(),1);
   assert.equal(await page.locator('#coverage-history').count(),1);
   assert((await page.locator('#coverage-verification').innerText()).includes('BLOCKED'),'Darts lab must retain verification gate');
   await page.goto('http://127.0.0.1:8177/',{waitUntil:'domcontentloaded'});
   assert.equal(await page.locator('[data-pro-slot]').count(),4);
   if(width<1020)await page.locator('#paper-open').click();
   await page.locator('.wildcard-current-audit > summary').click();
   await page.locator('.wildcard-risk-studio').waitFor();
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
     await page.locator('.wildcard-current-audit > summary').click();
     await page.locator('.wildcard-risk-studio').waitFor();
     assert((await page.locator('.wildcard-fifth-slip input').first().inputValue())==='2.00','Fifth draft should persist on the same browser');
     assert.equal(await page.locator('#slip-tabs button').count(),4,'Original four slip slots must remain intact');
   }
   if(width<1020)await page.locator('#paper-close').click();

   assert.equal(await page.locator('.pro-arena-sport').count(),4,'Homepage hero must present four sports');
   assert.equal(await page.locator('.pro-hero-arena').isVisible(),false);
   assert.equal(await page.locator('.vw-workspaces a[href="./analyst/"]').count(),1);
   await page.locator('.pro-quick-filters [data-pro-sport="tennis"]').click();
   await page.waitForTimeout(1000);
   assert.equal(await page.locator('#sport-nav button[data-sport="tennis"]').getAttribute('aria-pressed'),'true','Pro sport nav must use existing desk filter');
   await page.locator('[data-pro-slot="2"]').click();
   await page.waitForTimeout(300);
   assert.equal(await page.locator('#slip-tabs button[data-slot="2"]').getAttribute('aria-pressed'),'true','Pro paper slip must use existing slip state');
   await page.screenshot({path:path.join(out,'pro-home-'+width+'.png'),fullPage:false});
   assert.deepEqual(errors,[],'Home page JS runtime errors');
   if(width<1020)await page.locator('#paper-close').click();
   for (const sport of ['darts','rugby']) {
     await page.locator('#sport-nav button[data-sport="'+sport+'"]').click();
     await page.waitForFunction(s => {
       const panel=document.querySelector('[data-fixture-sport="'+s+'"]');
       return panel && !panel.textContent.includes('Loading '+s+' sources');
     },sport);
     assert.equal(await page.locator('#sport').inputValue(),sport,'Sport stays on the main desk');
     assert.equal(await page.locator('.fixture-events').count(),1,'One selected-sport panel');
     assert.equal(await page.locator('#find-racing').isVisible(),false,'Racing-only action hidden');
     const filteredCanBuild = await page.locator('#generate').isEnabled();
     if (sport === 'darts') assert.equal(filteredCanBuild,false,'Darts remains fixture-only for filtered paper slips');
     assert(!(await page.locator('#events').innerText()).includes('Paper selections and betting prices are unavailable for this view'),'Old blanket fixture-only fallback removed');
     const matchCards=page.locator('.fixture-event-card');
     if(await matchCards.count()) {
       const card = matchCards.first();
       const draw = card.locator('.fixture-outcome strong').filter({hasText:/^Draw$/});
       assert.equal(await card.locator('.fixture-outcome').count(), 2 + await draw.count(), 'Each match shows both participants and any modelled draw');
       const captured = await card.getByText('Captured prices · paper research', {exact:true}).count();
       if (!captured) assert((await card.innerText()).includes('Bookmaker odds unavailable'),'Missing quotes stay explicit');
       assert((await card.locator('.fixture-model-status').innerText()).length>10,'Model availability is explained per match');
     }
     await page.locator('#build-scope').selectOption('all');
     assert.equal(await page.locator('#generate').isEnabled(),true,'All-sports research remains available');
     await page.locator('#build-scope').selectOption('filters');
     assert.equal(await page.locator('#generate').isEnabled(),filteredCanBuild,'Returning to the sport filter restores its build eligibility');
     assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Match cards fit desktop and mobile');
   }
   await page.goto('http://127.0.0.1:8177/rugby/',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>!document.getElementById('refreshed').textContent.includes('Checking research'),{timeout:12000});
   assert((await page.locator('#refreshed').innerText()).includes('Research snapshot available')||(await page.locator('#refreshed').innerText()).includes('STALE SNAPSHOT'));
   const rugbyHealthText=await page.locator('#source-health').innerText();
   assert(rugbyHealthText.includes('Free-source event coverage may be incomplete.'),'Rugby source health must disclose incomplete event coverage even when every date was checked');
   assert(rugbyHealthText.includes('All dates in the window checked')||rugbyHealthText.includes('Partial source sample only')||rugbyHealthText.includes('Reported source window checked'),'Rugby source health must describe date coverage separately');
   const rugbyFixtures=await page.locator('#fixtures .fixture').count();
   if(!rugbyFixtures) assert((await page.locator('#fixtures').innerText()).includes('No source-confirmed future fixtures'),'Missing rugby coverage must not invent fixtures');
   else assert((await page.locator('#fixtures').innerText()).includes('No validated model probability'),'Sourced rugby schedule must not imply forecasts');
   await page.locator('[data-code="RL"]').click();
   assert.equal(await page.locator('[data-code="RL"]').getAttribute('aria-pressed'),'true');
   assert((await page.locator('#sport-heading').innerText()).includes('Rugby League'));
   assert((await page.locator('.disclosure').innerText()).includes('BLOCKED'));
   await page.goto('http://127.0.0.1:8177/validation-centre/',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>!document.getElementById('result-heading').textContent.includes('Checking'),{timeout:20000});
   assert.equal(await page.locator('#sports-body tr').count(),7,'Seven separate divisions must be shown');
   assert.equal(await page.locator('#performance-rows tr').count(),7,'All seven sports need honest performance statuses');
   assert((await page.locator('#performance-state').innerText()).toLowerCase().includes('contract-matched'),'Performance must show its independent sample evidence state');
   assert.equal(await page.locator('#model-comparison').count(),1,'Paired model comparisons must have a visible container');
   assert.equal(await page.locator('#calibration-bars').count(),1,'Calibration must expose accessible chart container');
   assert((await page.locator('#coverage-report').innerText()).length>20,'Seven-sport coverage must not be silent or empty');
   assert.equal(await page.locator('#paired').innerText(),'0','Empty prospective archive must not invent verified forecast performance');
   const prospective=Number(await page.locator('#predictions').innerText()),outcomes=Number(await page.locator('#outcomes').innerText());
   assert(Number.isSafeInteger(prospective)&&prospective>=0,'Prospective archive count must be grounded nonnegative integer');
   assert(Number.isSafeInteger(outcomes)&&outcomes>=0,'Verified outcome count must be grounded nonnegative integer');
   assert((await page.locator('#result-heading').innerText()).includes('NO MODEL APPROVAL'));
   assert((await page.locator('#legacy').innerText()).includes('LEGACY_DESCRIPTIVE_NOT_PROSPECTIVE'),'Legacy results must be explicitly excluded');
   assert.equal(await page.locator('text=Unavailable').count()>0,true,'No ROI should be invented');
   await page.locator('#retry').click();
   await page.waitForFunction(()=>!document.getElementById('retry').disabled,{timeout:20000});
   const viewport=await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2);
   assert(viewport,'Validation scoreboard must not produce horizontal page overflow');
   assert.deepEqual(errors,[],'Validation Centre runtime errors');
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
   await page.locator('.council-research-disclosure > summary').click();
   await page.locator('#three-lenses .lens').first().waitFor({timeout:15000});
   await page.waitForFunction(()=>document.querySelector('#council-outcome')?.dataset.state!=='loading',{timeout:18000});
   assert.equal(await page.locator('#council-outcome').getAttribute('data-state'),'PASS_RESEARCH_INCOMPLETE','Research must show explicit conservative PASS state');
   assert((await page.locator('#outcome-title').innerText()).includes('PASS — No qualifying candidates'));
   assert((await page.locator('#outcome-subtitle').innerText()).includes('preliminary source-gated research leads'));
   assert((await page.locator('#outcome-reasons').innerText()).includes('independently verified executable bookmaker price'));
   assert((await page.locator('#outcome-meta').innerText()).includes('14-day research horizon'));
   assert.equal(await page.locator('.lens-evidence-sample').count(),3,'Each automated lens must show evidence size');
   assert((await page.locator('#margin-result').innerText()).includes('Assuming'));
   await page.locator('#horizon').selectOption('7');
   await page.waitForFunction(()=>document.querySelector('#outcome-meta')?.textContent.includes('7-day research horizon'),{timeout:18000});
   assert((await page.locator('#window-label').innerText()).includes('7-day research horizon'),'Displayed period must match horizon control');
   await page.locator('#horizon').selectOption('14');
   await page.waitForFunction(()=>document.querySelector('#outcome-meta')?.textContent.includes('14-day research horizon'),{timeout:18000});
   assert.equal(await page.locator('#three-lenses .lens').count(),3,'Gold Council must contain three distinct reviewer decisions');
   await page.locator('#model-challenge-summary .challenge-tile').first().waitFor({timeout:15000});
   assert.equal(await page.locator('#model-challenge-summary .challenge-tile').count(),4,'All four independent method diagnostics must appear');
   assert((await page.locator('#horse-field-diagnostics').innerText()).includes('racing model diagnostics'),'Racing diagnostic status must remain visible');
   assert((await page.locator('#model-challenge-summary').innerText()).includes('NO_OUT_OF_SAMPLE_MARKET_ADVANTAGE_ESTABLISHED'),'Bloom lens must not assert validated ROI');

   assert.equal(await page.locator('#benter-heading').isVisible(),true,'Dedicated horse-racing lab must be visible');
   assert.equal(await page.locator('.horse-scoreline').count(),5,'Benter desk must show scored sample, baseline and uncertainty');
   assert((await page.locator('#horse-proof').innerText()).length>50,'Horse model evidence and limitations must be explained');
   const horseForecastRaw=await page.locator('#horse-forecasts').innerText();
   assert(horseForecastRaw==='—'||(/^\d+$/.test(horseForecastRaw)),'Horse forecasts must be an observed count or unavailable');
   if(horseForecastRaw==='0')assert.equal(await page.locator('#horse-eligible').innerText(),'0','No current forecasts must imply zero racing selections');
   if(horseForecastRaw==='—')assert((await page.locator('#racing-explanation').innerText()).includes('missing, stale or invalid'),'Unusable horse feed must be marked unavailable');
   assert((await page.locator('#racing-explanation').innerText()).length>30,'Horse audit must explain exclusion or eligibility');
   assert((await page.locator('#ticket-legs').innerText()).length>0,'Gold Council ticket must explain what it is showing');
   for(const id of ['ticket-walters','ticket-bloom','ticket-benter']){
     assert((await page.locator('#'+id).innerText()).length>5,'Three council verdicts must be visible on card');
   }
   assert((await page.locator('#ticket-selection-note').innerText()).includes('Why these'),'Selection policy must be explained');
   assert.equal(await page.locator('#ticket-research-radar').count(),1,'Gold ticket must expose screened but blocked football and racing research');
   assert((await page.locator('#ticket-research-radar').innerText()).includes('Horse-racing research radar'));
   assert((await page.locator('#ticket-research-radar').innerText()).includes('Football source audit'));
   assert((await page.locator('#ticket-research-radar').innerText()).includes('NOT COUNCIL PICKS'));

   const legsOnPage=await page.locator('#ticket-legs .ticket-leg').count();
   if(legsOnPage>0){
     assert.equal(await page.locator('#ticket-legs .ticket-outcome').count(),legsOnPage,'Every leg shows its selection separately');
     assert.equal(await page.locator('#ticket-legs .ticket-probability').count(),legsOnPage,'Every leg labels raw model estimate');
     const firstLeg=page.locator('#ticket-legs .ticket-leg').first();
     const match=await firstLeg.locator('strong').first().innerText();
     const pick=await firstLeg.locator('.ticket-outcome').innerText();
     assert(pick.startsWith('Research selection: '),'Selection label is distinct from event name');
     assert(!match.startsWith('Research selection:'),'Repeated selection name must not precede fixture');
     await firstLeg.locator('.ticket-evidence summary').click();
     assert((await firstLeg.locator('.ticket-evidence').innerText()).includes('not independently calibrated')||(await firstLeg.locator('.ticket-evidence').innerText()).includes('No independent probability calibration'));
   }
   await page.locator('.ticket-alternatives summary').click();
   assert((await page.locator('#ticket-alternatives').innerText()).length>0,'Alternatives must not be silently hidden');
   const councilBefore=await page.locator('#ticket-bloom').innerText();
   await page.locator('#scenario').selectOption('challenger');
   assert((await page.locator('#ticket-selection-note').innerText()).includes('Why these'),'Challenger scenario must update card explanation');
   await page.locator('#scenario').selectOption('flagship');

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

   await context.close();
  }
  console.log('PASS: reference Pro homepage and Analyst Terminal on desktop/mobile, original sport/slip delegation, real snapshots and no verified odds claims');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.close());
