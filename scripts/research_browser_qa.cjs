'use strict';
// Synthetic fixtures below are isolated to the browser test route. Production
// screenshots use the repository's published snapshots without interception.
const { chromium } = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;
const http = require('node:http'), fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const ROOT = path.resolve(__dirname, '..'), OUT = path.join(ROOT, 'work/browser-qa'); fs.mkdirSync(OUT, { recursive: true });
const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'application/javascript; charset=utf-8', '.json':'application/json; charset=utf-8' };
const server = http.createServer((req,res) => {
  let name; try { name = decodeURIComponent(new URL(req.url,'http://localhost').pathname); } catch { res.writeHead(400).end(); return; }
  const file = path.resolve(ROOT, '.' + name + (name.endsWith('/') ? 'index.html' : ''));
  if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (error,data) => { if (error) res.writeHead(404).end('Not found'); else { res.writeHead(200,{'Content-Type':mime[path.extname(file)] || 'application/octet-stream'}); res.end(data); } });
});
const listen = () => new Promise(resolve => server.listen(8173,'127.0.0.1',resolve));
const base = 'http://127.0.0.1:8173';
const report = { screenshots: [], pageErrors: [], accessibility: [], checks: [] };
const guard = { schema_version:1,research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED',generated_at_utc:'2026-11-08T08:55:00Z' };
const receipt = {url:'https://example.org/qa-fixture',sha256:'a'.repeat(64),observed_at_utc:guard.generated_at_utc};
const fixtureRows = Array.from({length:6},(_,i)=>({home:'Test Home '+i,away:'Test Away '+i,league:'PL',league_name:'Synthetic QA competition',kickoff_utc:'2026-11-0'+(i%2 ? '9':'8')+'T18:00:00Z',schedule_source_receipts:[receipt],current_season_comparison:{...guard,season:'2627',method:'CURRENT_SEASON_POISSON_COMPARISON_V1',prob_home:.45,prob_draw:.3,prob_away:.25,home_venue_matches:8,away_venue_matches:8,small_sample:true,odds:null,expected_value:null},head_to_head_research:{sample_size:8,home_team_wins:3,draws:2,away_team_wins:3,most_recent_match_date:'2026-05-01',history_data_observed_at_utc:guard.generated_at_utc}}));
const football = {...guard,upcoming_fixtures:fixtureRows,experimental_model_forecasts:fixtureRows.map(row=>({...row,...guard,model:'SYNTHETIC_QA_MODEL',prob_home:.45,prob_draw:.3,prob_away:.25,odds:null,expected_value:null}))};
function race(price=2){return {...guard,races:[{race_id:'qa-race',racecourse:'Test Course',name:'Synthetic QA race',startUTC:'2026-11-08T17:00:00Z',observedAtUTC:guard.generated_at_utc,runner_observed_at_utc:guard.generated_at_utc,source:receipt.url,runner_source:receipt.url,runner_source_sha256:'source',race_stage:'DORMANT',runner_data_status:'SINGLE_SOURCE_RUNNERS_OBSERVED',active_runner_count:2,runners:[{horse_id:'a',name:'Test Runner A',active_runner:true,runner_status:'RUNNER',previous_results:[]},{horse_id:'b',name:'Test Runner B',active_runner:true,runner_status:'RUNNER',previous_results:[]}],market_observation:{status:'COMPLETE_SOURCE_OBSERVATION',bookmaker:'Sky Bet',executable_verified:false,verification:'SOURCE_OBSERVED_UNVERIFIED',source:receipt.url,source_sha256:'source',bookmaker_market_id:'win',observed_at_utc:guard.generated_at_utc,quotes:[{horse_id:'a',decimal:price},{horse_id:'b',decimal:3}]}}]};}
const racingPrediction={...guard,model:'CONTEXT_FORM_RESEARCH_V1',forecasts:[{...guard,model:'CONTEXT_FORM_RESEARCH_V1',challenge_eligible:0,race_id:'qa-race',startUTC:'2026-11-08T17:00:00Z',record_sha256:'a'.repeat(64),context_signature:'b'.repeat(64),odds:null,expected_value:null,run_type:'CHASE',runners:[{horse_id:'a',name:'Test Runner A',model_probability:.4},{horse_id:'b',name:'Test Runner B',model_probability:.6}]}],skipped:[],current_field_checks:{['a'.repeat(64)]:{status:'FRESH_MATCHING_FIELD_AND_CONTEXT',context_signature:'b'.repeat(64),runner_source_sha256:'source',runner_observed_at_utc:guard.generated_at_utc,active_runner_ids:['a','b']}}};
async function waitBoard(page){await page.waitForFunction(()=>document.querySelectorAll('#events .event-card').length>0 || document.querySelector('#events .empty-state'));await page.waitForTimeout(150);}
async function noOverflow(page,label){const result=await page.evaluate(()=>({width:innerWidth,body:document.documentElement.scrollWidth}));assert(result.body<=result.width+1,label+' horizontal overflow '+JSON.stringify(result));report.checks.push(label+' no horizontal overflow');}
async function audit(page,label){const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();report.accessibility.push({label,violations:result.violations});const important=result.violations.filter(v=>['critical','serious'].includes(v.impact));assert.equal(important.length,0,label+' accessibility: '+important.map(x=>x.id+': '+x.nodes.map(n=>n.target).join(',')).join('; '));}
(async()=>{
 await listen();const browser=await chromium.launch({headless:true, ...(process.env.PLAYWRIGHT_CHANNEL ? {channel:process.env.PLAYWRIGHT_CHANNEL} : {})});
 try{
  const live=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1,locale:'en-GB'});const page=await live.newPage();page.on('pageerror',error=>report.pageErrors.push(error.message));
  await page.goto(base+'/',{waitUntil:'networkidle'});await waitBoard(page);await noOverflow(page,'real desktop');
  report.renderTiming=await page.evaluate(()=>{const n=performance.getEntriesByType('navigation')[0];return {domContentLoadedMs:n?.domContentLoadedEventEnd,loadMs:n?.loadEventEnd,renderedCards:document.querySelectorAll('#events .event-card').length,totalDOMElements:document.querySelectorAll('*').length}});await page.screenshot({path:path.join(OUT,'desktop-real-data.png'),fullPage:false});report.screenshots.push('desktop-real-data.png');await audit(page,'real desktop');
  await page.setViewportSize({width:390,height:844});await noOverflow(page,'real mobile');await page.screenshot({path:path.join(OUT,'mobile-real-data.png'),fullPage:false});report.screenshots.push('mobile-real-data.png');
  await page.locator('#paper-open').click();await page.locator('body.paper-open').waitFor();await noOverflow(page,'mobile slip');await page.waitForTimeout(300);const sheet=await page.locator('#slip-panel').boundingBox();assert(sheet.x>=-1&&sheet.x+sheet.width<=391,'mobile drawer must be fully inside viewport');await page.screenshot({path:path.join(OUT,'mobile-slip-real-data.png'),fullPage:false});report.screenshots.push('mobile-slip-real-data.png');await audit(page,'real mobile slip');await page.keyboard.press('Escape');await page.locator('body:not(.paper-open)').waitFor();
  await page.setViewportSize({width:768,height:1024});await noOverflow(page,'real tablet');
  await page.setViewportSize({width:1920,height:1080});await noOverflow(page,'real large desktop');
  const test=await browser.newContext({viewport:{width:1440,height:1000}});const p=await test.newPage();p.on('pageerror',error=>report.pageErrors.push(error.message));await p.clock.install({time:new Date('2026-11-08T09:00:00Z')});let racePrice=2,failExpanded=false,omitFootball=false;
  await p.route('**/*-data.json',async route=>{const name=new URL(route.request().url()).pathname.split('/').pop();let doc=name==='research-dashboard-data.json'?(omitFootball?{...football,upcoming_fixtures:[],experimental_model_forecasts:[]}:football):name==='football-expanded-data.json'?{...guard,upcoming_fixtures:[],experimental_model_forecasts:[]}:name==='racing-research-data.json'?race(racePrice):name==='horse-predictions-data.json'?racingPrediction:name==='other-sports-data.json'?{...guard,sports:{}}:null;if(!doc)return route.continue();if(failExpanded&&name==='football-expanded-data.json')return route.abort();return route.fulfill({contentType:'application/json',body:JSON.stringify(doc)});});
  await p.route('**/research-history.json',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({...guard,entries:[]})}));
  await p.goto(base+'/',{waitUntil:'networkidle'});await waitBoard(p);assert.equal(await p.locator('#events .event-card').count(),7);
  assert.equal(await p.locator('#stake').inputValue(),'');
  assert((await p.locator('.selection-price').filter({hasText:'%'}).count())>0);
  assert.equal(await p.locator('#build-scope option').count(),2);
  const checkLink=p.locator('.event-card').filter({hasText:'Test Home 0'}).locator('.event-tools a');assert.equal(await checkLink.getAttribute('href'),'https://www.oddschecker.com/football');
  const matchBox=p.locator('.event-card').filter({hasText:'Test Home 0'}).locator('.match-overview');await matchBox.locator('summary').click();await matchBox.locator('svg.sport-diagram').waitFor();assert.equal(await matchBox.locator('svg.sport-diagram').count(),1);assert((await matchBox.textContent()).includes('Live action and positions are not connected'));
  const estimateBox=p.locator('.event-card').filter({hasText:'Test Home 0'}).locator('.model-details').first();await estimateBox.locator('summary').click();assert((await estimateBox.textContent()).includes('%'));
  report.checks.push('manual stake default, visible labelled estimates, two build scopes and external price-check links');
  const legacy24 = JSON.stringify({data:Array.from({length:24},(_,i)=>({id:'saved-paper-'+i})),selected:[]});
  await p.evaluate(value=>localStorage.setItem('vw26-prototype-v2',value),legacy24);
  const workspaceBefore = await p.evaluate(()=>localStorage.getItem('value-watch-research-desk-v4'));
  assert.equal(await p.locator('[data-engine=current]').getAttribute('aria-pressed'),'true');
  await p.locator('[data-engine=experimental]').focus(); await p.keyboard.press('Enter');
  assert.equal(await p.locator('[data-engine=experimental]').getAttribute('aria-pressed'),'true');
  assert((await p.locator('#engine-analysis').textContent()).includes('ILLUSTRATIVE'));
  assert((await p.locator('#engine-analysis').textContent()).includes('Unavailable'));
  await p.locator('[data-engine=compare]').click();
  assert((await p.locator('#engine-analysis').textContent()).includes('Current Engine 2.5'));
  assert.equal(await p.evaluate(()=>localStorage.getItem('value-watch-research-desk-v4')),workspaceBefore);
  await p.reload({waitUntil:'networkidle'}); await waitBoard(p);
  assert.equal(await p.locator('[data-engine=compare]').getAttribute('aria-pressed'),'true');
  assert.equal(await p.evaluate(()=>localStorage.getItem('vw26-prototype-v2')),legacy24);
  await audit(p,'engine comparison');
  await p.setViewportSize({width:390,height:844}); await noOverflow(p,'engine switch mobile');
  await p.setViewportSize({width:1440,height:1000});
  await p.locator('[data-engine=current]').click();
  assert(await p.locator('#engine-analysis').isHidden());
  await p.evaluate(fixture=>{
    const E=ResearchEngine,t=Date.parse('2026-11-08T09:00:00Z'),event=E.normalizeFeeds([{kind:'football',path:'synthetic-qa-only.json',document:fixture}],t)[0];
    let plan=E.createPlan({from:'2026-11-08',to:'2026-11-14',createdAt:new Date(t).toISOString()});
    plan=E.addSelection(plan,1,event,'home',t);
    plan=E.setRecordedQuote(plan,1,0,{decimal:2.5,source:'https://example.org/synthetic-qa-price',observedAt:new Date(t).toISOString(),bookmaker:'Synthetic QA only'},t);
    const workspace=JSON.parse(localStorage.getItem('value-watch-research-desk-v4'));workspace.plan=plan;
    localStorage.setItem('value-watch-research-desk-v4',JSON.stringify(workspace));
  },football);
  await p.reload({waitUntil:'networkidle'}); await waitBoard(p);
  await p.locator('[data-engine=compare]').click();
  assert((await p.locator('#engine-analysis').textContent()).includes('Central EV: 12.5%'));
  assert((await p.locator('#engine-analysis').textContent()).includes('variance: 1.5469'));
  await p.clock.setSystemTime(new Date('2026-11-08T09:31:00Z')); await p.locator('[data-engine=experimental]').click();
  assert((await p.locator('#engine-analysis').textContent()).includes('Unavailable'));
  await p.clock.setSystemTime(new Date('2026-11-08T09:00:00Z'));
  await p.evaluate(value=>localStorage.setItem('value-watch-research-desk-v4',value),workspaceBefore);
  await p.locator('[data-engine=current]').click(); await p.reload({waitUntil:'networkidle'}); await waitBoard(p);
  report.checks.push('keyboard engine switch, comparison, missing inputs, persistence, unchanged workspace, mobile layout and accessibility');
  await p.locator('[data-range=tomorrow]').click();assert((await p.locator('#coverage-summary').textContent()).includes('matching your filters'));await p.locator('[data-sport=racing]').click();await p.locator('#events .event-empty').waitFor();assert((await p.locator('#events').textContent()).includes('scheduled meetings'));await p.locator('#events').getByRole('button',{name:'Show next 14 days',exact:true}).click();await p.locator('#events .event-card').waitFor();assert.equal(await p.locator('#date-from').inputValue(),'2026-11-08');assert.equal(await p.locator('#date-to').inputValue(),'2026-11-21');await p.locator('[data-sport=all]').click();await p.locator('[data-range="7"]').click();report.checks.push('racing coverage gap explains unavailable cards and offers working range recovery');
  const first=p.locator('#events .event-card').filter({hasText:'Test Home 0'});
  // Run clear + first manual click in one browser task so an asynchronous
  // source refresh cannot auto-populate the empty slip between these actions.
  await first.locator('.selection-button').first().evaluate(button=>{const clear=document.querySelector('#clear-slip');if(!clear.disabled)clear.click();button.click();});
  await p.waitForFunction(()=>document.querySelectorAll('#slip-content .slip-selection').length===1);
  const second=p.locator('#events .event-card').filter({hasText:'Test Home 1'});await second.locator('.selection-button').first().click();await p.waitForFunction(()=>document.querySelectorAll('#slip-content .slip-selection').length===2);report.checks.push('cross-day selections');
  await p.locator('#slip-content .move-button[aria-label*="down"]').first().click();assert((await p.locator('#slip-content .slip-selection').first().textContent()).includes('Test Home 1'));report.checks.push('reorder selections');
  await first.locator('.evidence-details > summary').click();await first.locator('[data-stats-tab=h2h]').click();await first.locator('.stats-panel').getByText('Recorded meetings').waitFor();
  await p.evaluate(()=>window.__cardNode=document.querySelector('#events .event-card'));await p.locator('#stake').fill('2.50');await p.waitForTimeout(50);assert(await p.evaluate(()=>window.__cardNode===document.querySelector('#events .event-card')));assert(await first.locator('.evidence-details').evaluate(e=>e.open));report.checks.push('localized rendering retains event nodes and expanded statistics');
  await p.locator('#freeze').click();await p.locator('[data-view=history]').click();await p.locator('.history-card').first().waitFor();assert((await p.locator('#history').textContent()).includes('Test Home'));report.checks.push('immutable saved history');
  const originalBox=p.locator('#history .history-card').first();await originalBox.locator('> details > summary').click();
  const journalBox=originalBox.locator('.model-details').first();await journalBox.locator('> summary').click();
  await journalBox.locator('input[type=url]').fill('https://example.org/result');await journalBox.locator('textarea').first().fill('Awaiting final source confirmation.');
  await journalBox.locator('button[type=submit]').click();assert((await p.locator('#history').textContent()).includes('1 pending'));
  assert.equal(await p.locator('.journal-chart').count(),0);report.checks.push('pending paper annotation persists and does not invent chart profits');
  await p.locator('[data-view=events]').click();await p.locator('#refresh').click();await p.waitForTimeout(100);
  const racing=p.locator('.event-card').filter({hasText:'Synthetic QA race'}),priceButton=racing.locator('.selection-button[data-choice-id=a]');await priceButton.evaluate(e=>window.__priceNode=e);racePrice=2.2;await p.locator('#refresh').click();await p.waitForTimeout(200);assert(await priceButton.evaluate(e=>e===window.__priceNode));assert((await priceButton.textContent()).includes('2.20'));report.checks.push('price changes patch existing button');
  assert((await racing.locator('.is-model-first').textContent()).includes('Test Runner B'));await priceButton.click();assert(await priceButton.getAttribute('aria-pressed')==='true');assert((await racing.locator('.is-model-first').textContent()).includes('MODEL FIRST CHOICE'));assert((await racing.locator('.is-model-alternative').textContent()).includes('Test Runner A'));report.checks.push('racing first choice and alternative derive from matched context model and remain independent of user selection');
  failExpanded=true;await p.locator('#refresh').click();await p.waitForTimeout(150);await p.locator('#source-details > summary').click();assert((await p.locator('#feeds').textContent()).includes('last good snapshot retained'));report.checks.push('partial failure retains last-good source');
  await p.locator('[data-view=community]').click();await p.locator('#reasoning').fill('<img src=x onerror=alert(1)> certain profit from inside information');await p.locator('#evidence').fill('https://example.org/evidence');await p.locator('#community button[type=submit]').click();assert((await p.locator('#community-result').textContent()).includes('high risk claim'));assert.equal(await p.locator('#community-result img').count(),0);report.checks.push('untrusted community content is text, high-risk claim disclosure');
  await p.locator('#community-result button').click();
  await p.locator('[data-view=history]').click();assert((await p.locator('#history').textContent()).includes('Original source'));
  await p.locator('[data-view=events]').click();await p.locator('#source-details > summary').click();await p.locator('#generate').click();assert((await p.locator('#notice').textContent()).includes('Non-empty slips are retained'));report.checks.push('evidence-only generation preserves existing slip');
  omitFootball=true;await p.locator('#refresh').click();await p.waitForTimeout(200);
  await p.locator('[data-view=community]').click();const captured=await p.evaluate(()=>JSON.parse(localStorage.getItem('value-watch-research-desk-v4')).plan.slots[0].legs[0]);
  await p.locator('#note-event').selectOption(captured.eventId);await p.locator('#note-choice').selectOption(captured.choiceId);await p.locator('#reasoning').fill('Review the original captured selection, even though the feed no longer lists its event.');await p.locator('#community button[type=submit]').click();await p.locator('#community-result button').click();
  const linked=await p.evaluate(()=>JSON.parse(localStorage.getItem('value-watch-research-desk-v4')).claims.at(-1));assert.equal(linked.eventId,captured.eventId);assert.equal(linked.choiceId,captured.choiceId);report.checks.push('private notes retain captured-only event and selection identities');
  await p.locator('[data-view=events]').click();
  await p.setViewportSize({width:390,height:844});await p.locator('#paper-open').click();await p.locator('#paper-close').waitFor({state:'visible'});await p.keyboard.press('Escape');assert.equal(await p.locator('body.paper-open').count(),0);report.checks.push('mobile drawer close and focus behavior');
  await p.clock.setSystemTime(new Date('2026-11-10T12:00:00Z'));
  await p.evaluate(async fixture=>{
    const E=ResearchEngine,t=Date.parse('2026-11-08T09:00:00Z'),events=E.normalizeFeeds([{kind:'football',path:'synthetic-qa-only.json',document:fixture}],t),event=events[0];
    let plan=E.createPlan({from:'2026-11-08',to:'2026-11-14',createdAt:new Date(t).toISOString()});plan=E.addSelection(plan,1,event,'home',t);plan=E.setStake(plan,1,'1.00',t);plan=E.setRecordedQuote(plan,1,0,{decimal:2.5,source:'https://example.org/synthetic-qa-price',observedAt:new Date(t).toISOString(),bookmaker:'Synthetic QA only'},t);
    const snapshot=E.freeze(plan,t,events),record=await ResearchStore.seal(snapshot),journal=ResearchJournal.append([],snapshot,'best-evidence',{status:'SETTLED',source:'https://example.org/synthetic-qa-result',reason:'Synthetic browser QA: manually confirmed exact market and return.',grossReturnMinor:250});
    localStorage.setItem('value-watch-research-desk-v4',JSON.stringify({version:4,plan,history:[record],claims:[],journal}));
  },football);
  await p.reload({waitUntil:'networkidle'});await p.locator('[data-view=history]').click();await p.locator('.journal-chart').waitFor();assert((await p.locator('.journal-summary').textContent()).includes('£1.50'));
  const settledCard=p.locator('#history .history-card').first();await settledCard.locator('> details > summary').click();const correction=settledCard.locator('.model-details').first();await correction.locator('> summary').click();await correction.locator('select').selectOption('DISPUTED');await correction.locator('textarea').first().fill('Synthetic QA correction: source disputed; exclude previous totals.');await correction.locator('button[type=submit]').click();await p.waitForFunction(()=>!document.querySelector('.journal-chart'));assert((await p.locator('.journal-summary').textContent()).includes('1 disputed'));report.checks.push('eligible manual paper chart and append-only disputed correction exclude prior totals');
  // Fresh daily rollover: archive atomically, preserve existing selections, and
  // fail closed when localStorage is unavailable. Isolate from all other QA state.
  const dailyContext=await browser.newContext({viewport:{width:1440,height:900}});
  const dailyPage=await dailyContext.newPage();
  dailyPage.on('pageerror',error=>report.pageErrors.push(error.message));
  await dailyPage.clock.install({time:new Date('2026-11-08T09:00:00Z')});
  await dailyPage.route('**/*-data.json',async route=>{
    const name=new URL(route.request().url()).pathname.split('/').pop();
    const doc=name==='research-dashboard-data.json'?football:
      name==='football-expanded-data.json'?{...guard,upcoming_fixtures:[],experimental_model_forecasts:[]}:
      name==='racing-research-data.json'?race():
      name==='horse-predictions-data.json'?racingPrediction:
      name==='other-sports-data.json'?{...guard,sports:{}}:null;
    if(!doc)return route.continue();
    return route.fulfill({contentType:'application/json',body:JSON.stringify(doc)});
  });
  await dailyPage.route('**/research-history.json',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({...guard,entries:[]})}));
  await dailyPage.goto(base+'/',{waitUntil:'networkidle'});
  await waitBoard(dailyPage);
  await dailyPage.locator('#slip-refresh-health').waitFor();
  assert((await dailyPage.locator('#slip-refresh-health').textContent()).includes('eligible now'),
    'Paper panel explains current eligibility');
  assert.equal(await dailyPage.locator('#fresh-daily-slips-panel').count(),1);
  await dailyPage.locator('#generate').click();
  const originalDaily=await dailyPage.evaluate(()=>JSON.parse(localStorage.getItem('value-watch-research-desk-v4')));
  assert(originalDaily.plan.slots.some(slot=>slot.legs.length),'Test requires original populated research');
  await dailyPage.locator('#fresh-daily-slips-panel').click();
  await dailyPage.waitForFunction(()=>JSON.parse(localStorage.getItem('value-watch-research-desk-v4')||'{}').history?.length===1);
  const refreshedDaily=await dailyPage.evaluate(()=>JSON.parse(localStorage.getItem('value-watch-research-desk-v4')));
  assert.notEqual(refreshedDaily.plan.id,originalDaily.plan.id,'Fresh paper research needs new identity');
  assert.equal(refreshedDaily.history[0].snapshot.id,originalDaily.plan.id);
  assert.deepEqual(refreshedDaily.history[0].snapshot.slots.map(s=>s.legs.map(l=>l.id)),
    originalDaily.plan.slots.map(s=>s.legs.map(l=>l.id)),'Archived selections must be unchanged');
  assert.equal(refreshedDaily.plan.to,'2026-11-14');
  assert(refreshedDaily.plan.slots.some(slot=>slot.legs.length),'Fresh evidence-supported slips should be populated');
  await dailyPage.waitForFunction(()=>{
    const current=JSON.parse(localStorage.getItem('value-watch-research-desk-v4')||'{}');
    return document.querySelector('#slip-count')?.textContent === current.plan.slots[0].legs.length + ' / 15' &&
      document.querySelector('#slip-refresh-health')?.textContent.includes('saved selections');
  });
  report.checks.push('paper panel refreshes rendered selection state and eligibility immediately');
  assert((await dailyPage.locator('#notice').textContent()).includes('previous revision archived'));
  await dailyPage.reload({waitUntil:'networkidle'});
  await waitBoard(dailyPage);
  assert.equal(await dailyPage.evaluate(()=>JSON.parse(localStorage.getItem('value-watch-research-desk-v4')).history.length),1);
  report.checks.push('fresh daily slips archive before replacing, survive reload and preserve historical paper legs');
  const beforeBlocked=await dailyPage.evaluate(()=>JSON.parse(localStorage.getItem('value-watch-research-desk-v4')));
  await dailyPage.evaluate(()=>{const original=Storage.prototype.setItem;window.__restoreSave=()=>Storage.prototype.setItem=original;Storage.prototype.setItem=function(){throw new DOMException('Test storage outage','QuotaExceededError');};});
  await dailyPage.locator('#fresh-daily-slips').click();
  await dailyPage.locator('#page-status').waitFor({state:'visible'});
  await dailyPage.evaluate(()=>window.__restoreSave());
  const afterBlocked=await dailyPage.evaluate(()=>JSON.parse(localStorage.getItem('value-watch-research-desk-v4')));
  assert.deepEqual(afterBlocked,beforeBlocked,'Failed save cannot replace or archive plan');
  assert((await dailyPage.locator('#page-status').textContent()).includes('could not be saved'));
  report.checks.push('storage failure leaves active plan, saved history and journal untouched');
  await dailyContext.close();
  const degraded=await browser.newContext();const failedPage=await degraded.newPage();await failedPage.route('**/paper-lab/engine.js*',route=>route.abort());await failedPage.goto(base+'/',{waitUntil:'networkidle'});await failedPage.locator('#page-status').waitFor({state:'visible'});assert((await failedPage.locator('#page-status').textContent()).includes('could not'));report.checks.push('component-load failure exposes recovery message');await degraded.close();assert.equal(report.pageErrors.length,0,report.pageErrors.join('\n'));
  report.internationalAnalysis=await require('./international_browser_checks.cjs')(browser,base);
  report.racingCandidates=await require('./racing_candidate_browser_checks.cjs')(browser,base);
  report.racingPaper=await require('./racing_paper_browser_checks.cjs')(browser,base);
  report.checks.push('manual provisional racing choices, saved labels, stale blocking and singleton collapsed coverage on desktop/mobile');
  report.passed=true;await test.close();await live.close();
 }finally{await browser.close();}
})().then(()=>{fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));server.close();}).catch(error=>{report.error=error.stack;fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2));console.error(error);server.close();process.exitCode=1;});
