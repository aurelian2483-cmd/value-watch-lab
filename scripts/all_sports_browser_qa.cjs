'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const {chromium} = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;

const root = path.resolve(__dirname, '..');
const compact = process.argv.includes('--compact-preview');
const baseline = compact && process.argv.includes('--baseline');
const compactAsOf = new Date(baseline ? '2026-11-21T10:30:00Z' : '2026-11-21T11:50:00Z');
const output = path.join(root, 'work/browser-qa', compact ? 'compact-preview' : 'all-sports');
const mime = {'.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.json':'application/json'};
const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = path.resolve(root, '.' + pathname + (pathname.endsWith('/') ? 'index.html' : ''));
    if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
    const body = await fs.readFile(file);
    res.writeHead(200, {'Content-Type': mime[path.extname(file)] || 'application/octet-stream'}).end(body);
  } catch {
    if (!res.headersSent) res.writeHead(404);
    res.end();
  }
});

const sports = ['football','racing','tennis','nfl','darts','rugby','golf','basketball','cricket'];
const routes = ['football-match','market-intelligence','racing-research','darts','rugby','sports-watch',
  'validation-centre','ops-control','wildcard','analyst','paper-lab'];
const report = {repositoryScreenshots: [], syntheticChecks: [], accessibility: []};
const blocked = ['golf','basketball','cricket'];
const laneEvidence = {football:/OpenLigaDB/, racing:/racecard/, tennis:/ATP\/WTA/, nfl:/nflverse/,
  darts:/PDC/, rugby:/Pro D2/, golf:/Manual directory only/, basketball:/Discovery only/, cricket:/Cricsheet/};

async function viewportCheck(page, label) {
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), label + ' overflows');
}

async function screenshot(page, label, selector) {
  if (selector) await page.locator(selector).scrollIntoViewIfNeeded();
  await viewportCheck(page, label);
  const filename = label + '.png';
  await page.screenshot({path: path.join(output, filename)});
  report.repositoryScreenshots.push(filename);
}

function otherEvent(sport, id, startUTC) {
  const isNFL = sport === 'nfl';
  const participants = [{id:'a',name:'Synthetic ' + sport + ' A'}, {id:'b',name:'Synthetic ' + sport + ' B'}];
  const outcomes = participants.map((player, i) => ({...player, prior_matches:10, probability:i ? .35 : .6}));
  if (isNFL) outcomes.push({id:'tie',name:'Tie after overtime',probability:.05});
  else outcomes[1].probability = .4;
  return {id, startUTC, name:participants.map(p => p.name).join(' vs '), competition:'Synthetic QA ' + sport,
    participants, sport, source:'https://site.api.espn.com/apis/site/v2/sports/' +
      (isNFL ? 'football/nfl' : 'tennis/atp') + '/scoreboard',
    forecast:{model:'FIXED_ELO_K24_V1',calibrated:false,odds:null,expected_value:null,training_sha256:'a'.repeat(64),
      training_matches:20,training_latest_start_utc:'2026-11-06T09:00:00Z',
      market:isNFL ? 'GAME_RESULT_INCLUDING_OVERTIME' : 'MATCH_WINNER',outcomes}};
}

async function researchFlow(browser, base) {
  const page = await browser.newPage({viewport:{width:1440,height:920}});
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  await page.clock.install({time:new Date('2026-11-08T09:00:00Z')});
  await page.route(url => url.origin !== base, route => route.abort());
  const guard = {schema_version:1,research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED',
    generated_at_utc:'2026-11-08T08:55:00Z'};
  const tennis = otherEvent('tennis','qa-tennis','2026-11-08T20:00:00Z');
  const nfl = otherEvent('nfl','qa-nfl','2026-11-08T20:00:00Z');
  let available = false;
  await page.route('**/other-sports-data.json', route => available ? route.fulfill({json:{...guard,
    sports:{tennis:{events:[tennis,tennis,nfl]},nfl:{events:[nfl,{...nfl,id:'stale',name:'Synthetic stale NFL',
      source_collected_at_utc:'2026-11-06T08:00:00Z'}]}}}}) : route.fulfill({status:503}));
  await page.goto(base + '/paper-lab/?sport=tennis');
  await page.locator('#sport-evidence').getByText('Schedule sources unavailable.',{exact:true}).waitFor();
  available = true;
  await page.locator('#refresh').click();
  const tennisCard = page.locator('#events .event-card').filter({hasText:tennis.name});
  await tennisCard.waitFor();
  assert.equal(await page.locator('#events .event-card').count(),1);
  const tennisChoice = tennisCard.getByRole('button',{name:/Synthetic tennis A.*model estimate/});
  await tennisChoice.waitFor();
  if (await tennisChoice.getAttribute('aria-pressed') === 'false') await tennisChoice.click();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('value-watch-research-desk-v4')));
  const persisted = saved.plan.slots.flatMap(slot => slot.legs).find(row => row.event === tennis.name);
  assert.equal(persisted.market,'Match winner');
  assert.equal(persisted.quote,null);
  const slipLeg = page.locator('.slip-selection').filter({hasText:tennis.name});
  await slipLeg.locator('.leg-evidence > summary').click();
  await slipLeg.getByRole('button',{name:'Review this event on the board'}).click();
  assert(await tennisCard.evaluate(el => el.contains(document.activeElement)));
  await page.locator('#sport-nav [data-sport="nfl"]').focus();
  await page.keyboard.press('Enter');
  await page.getByRole('heading',{name:'Synthetic stale NFL',exact:true}).waitFor();
  assert.equal(await page.locator('#events .event-card').count(),2);
  assert.equal(await page.locator('#events .event-card').filter({hasText:'Synthetic stale NFL'})
    .getByRole('button',{name:/paper selection unavailable/}).first().isDisabled(),true);
  await page.goBack();
  assert.equal(await page.locator('#sport').inputValue(),'tennis');
  await page.reload();
  await tennisCard.waitFor();
  assert(await page.evaluate(id => JSON.parse(localStorage.getItem('value-watch-research-desk-v4'))
    .plan.slots.some(slot => slot.legs.some(row => row.id === id)),persisted.id));
  assert.deepEqual(errors, []);
  report.syntheticChecks.push('Tennis/NFL exact source and market, invalid cross-sport row, duplicate, unavailable feed then recovery, stale event, keyboard sport selection, Back, exact saved-event return, paper persistence and unpriced quote');
  await page.close();
}

async function calendarRecovery(browser, base) {
  const context = await browser.newContext({viewport:{width:390,height:920}});
  await context.route(url => url.origin !== base, route => route.abort());
  for (const [sport, feed] of [['darts','darts/feed.json'],['rugby','rugby-research-data.json']]) {
    const page = await context.newPage();
    const snapshot = JSON.parse(await fs.readFile(path.join(root,feed),'utf8'));
    const observedAt = Date.parse(snapshot.generated_at_utc);
    assert(Number.isFinite(observedAt),sport+' recovery snapshot must have a capture time');
    await page.clock.setFixedTime(new Date(observedAt+60000));
    const fail = route => route.fulfill({status:503});
    await page.route('**/' + feed,fail);
    await page.goto(base + '/?sport=' + sport);
    const calendar = page.locator('#events .fixture-events');
    await calendar.getByText(/Provider feed unavailable or stale/).waitFor();
    assert.equal(await calendar.getAttribute('data-fixture-sport'),sport);
    assert.equal(await calendar.getByRole('button',{name:'Add to paper slip'}).count(),0);
    await page.unroute('**/' + feed,fail);
    await page.locator('#refresh').click();
    await calendar.getByText(/^Provider snapshot:/).waitFor();
    assert.equal(await calendar.getByText(/Provider feed unavailable or stale/).count(),0);
    if (sport === 'rugby') {
      assert.match(await calendar.getByRole('link',{name:'Open Rugby League calendar'}).getAttribute('href'),/code=RL/);
    }
    await page.close();
    report.syntheticChecks.push(sport + ' provider error, retained calendar without paper controls, and recovery to repository snapshot');
  }
  await context.close();
}

async function resultReceiptFlow(page, width) {
  const matchList = page.locator('#result-review-matches');
  await matchList.getByText(/Inspect NFL source evidence/).waitFor();
  await matchList.getByText(/Inspect NFL source evidence/).click();
  await matchList.getByText(/including overtime/).first().waitFor();
  assert(await matchList.getByRole('link',{name:'Schedule CSV receipt'}).count() >= 1);
  await screenshot(page,'result-receipts-'+width,'#result-review-heading');
  const fail = route => route.fulfill({status:503});
  await page.route('**/research/secondary-result-evidence.json',fail);
  await page.locator('#retry').click();
  await matchList.getByText(/A source receipt archive is missing/).waitFor();
  assert.equal(await matchList.getByRole('link').count(),0);
  await page.unroute('**/research/secondary-result-evidence.json',fail);
  await page.locator('#retry').click();
  await matchList.getByText(/Inspect tennis source evidence/).waitFor();
  report.syntheticChecks.push('Result receipts on '+width+'px: repository evidence, missing feed and recovery');
}

async function providerReadinessFlow(page,width) {
  await page.getByText('Proposed provider readiness',{exact:true}).click();
  const panel=page.locator('#provider-readiness');
  assert.equal(await panel.locator('tbody tr').count(),9);
  assert(await panel.getByText(/NEEDS RIGHTS REVIEW/).count()===9);
  await screenshot(page,'provider-readiness-'+width,'#provider-readiness-status');
  const fail=route=>route.fulfill({status:503});
  await page.route('**/research/provider-readiness.json',fail);
  await page.locator('#retry').click();
  await page.getByText('Provider registry unavailable or invalid.',{exact:true}).waitFor();
  assert.equal(await panel.locator('tbody tr').count(),0);
  assert(await page.getByText(/frozen forecast.*tracked/).count());
  await page.unroute('**/research/provider-readiness.json',fail);
  await page.locator('#retry').click();
  await panel.getByRole('rowheader',{name:'Golf'}).waitFor();
  report.syntheticChecks.push('Provider readiness on '+width+'px: nine sports and isolated failure/recovery');
}

async function discoveryFlow(browser, base) {
  const page = await browser.newPage({viewport:{width:390,height:920}});
  const providerRequests = [];
  page.on('request', request => {
    if (new URL(request.url()).hostname === 'sportscore.com') providerRequests.push(request.url());
  });
  await page.route(url => url.origin !== base, route => route.abort());
  for (const sport of ['basketball','cricket','golf']) {
    await page.goto(base + '/sports-watch/?sport=' + sport);
    await page.getByText(/Automatic fixture data is unavailable/).waitFor();
    assert.equal(await page.locator('#coverage-sport').inputValue(),sport);
    assert.equal(await page.locator('#sports [data-sport="'+sport+'"]').getAttribute('aria-pressed'),'true');
    await page.locator('#match-name').fill('QA manual coverage lookup');
    await page.getByRole('button',{name:'Select match'}).click();
    assert.match(await page.locator('#coverage-selected').textContent(),/QA manual coverage lookup/);
    assert(await page.locator('.coverage-card').count());
    await viewportCheck(page,sport + ' manual coverage');
  }
  assert.deepEqual(providerRequests, []);
  report.syntheticChecks.push('Basketball, cricket and golf deep-link to manual coverage without automatic fixture requests');
  await page.close();
}

async function overviewStates(page) {
  let state = 'missing';
  const handler = route => state === 'missing'
    ? route.fulfill({status:503})
    : state === 'stale'
      ? route.fulfill({json:{research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED',
          generated_at_utc:'2026-10-01T00:00:00Z',upcoming_fixtures:[]}})
      : route.continue();
  await page.route('**/research-dashboard-data.json',handler);
  await page.reload();
  const football = page.locator('.pro-quick-filters [data-pro-count="football"]');
  await page.waitForFunction(() => document.getElementById('pro-featured-status').textContent.includes('Football unavailable'));
  assert.equal(await football.textContent(),'—');
  state = 'stale';
  await page.locator('#pro-feature-refresh').click();
  await page.waitForFunction(() => document.getElementById('pro-featured-status').textContent.includes('Football stale or undated'));
  assert.equal(await football.textContent(),'—');
  state = 'available';
  await page.locator('#pro-feature-refresh').click();
  await page.waitForFunction(() => /^\d+$/.test(document.querySelector('.pro-quick-filters [data-pro-count="football"]').textContent));
  await page.unroute('**/research-dashboard-data.json',handler);
  report.syntheticChecks.push('Overview distinguishes unavailable and stale football snapshots and recovers to actual snapshot');
}

async function referenceNavigation(browser, base) {
  const page = await browser.newPage({viewport:{width:820,height:920},hasTouch:true});
  await page.clock.setFixedTime(new Date('2026-06-15T22:15:00Z'));
  await page.route(url => url.origin !== base, route => route.abort());
  await page.route('**/research-dashboard-data.json', route => route.fulfill({json:{
    research_only:true, model_validation:'UNVALIDATED', publication_gate:'BLOCKED',
    schema_version:1, generated_at_utc:'2026-06-15T22:00:00Z',
    upcoming_fixtures:[
      {fixture_id:'synthetic-today',espn_event_id:'1234',home:'Synthetic Today',away:'Visitors',kickoff_utc:'2026-06-15T22:30:00Z'},
      {fixture_id:'synthetic-tomorrow',home:'Synthetic Tomorrow',away:'Visitors',kickoff_utc:'2026-06-15T23:30:00Z'}
    ]
  }}));
  await page.goto(base + '/');
  const table = page.locator('#pro-featured-rows');
  const range = page.getByLabel('Fixture date (UK)');
  await table.getByText(/Synthetic Today/).waitFor();
  const sport = page.getByRole('group',{name:'Upcoming fixture filters'}).getByLabel('Sport',{exact:true});
  const query = page.getByLabel('Find a fixture');
  await sport.selectOption('racing');
  assert.equal(await table.getByText(/Synthetic Today/).count(),0);
  await sport.selectOption('football');
  await query.fill('  TOMORROW  ');
  await table.getByText(/Synthetic Tomorrow/).waitFor();
  assert.equal(await table.getByText(/Synthetic Today/).count(),0);
  await page.locator('#pro-feature-refresh').click();
  await page.waitForFunction(() => !document.getElementById('pro-feature-refresh').disabled);
  assert.equal(await sport.inputValue(),'football');
  assert.equal(await query.inputValue(),'  TOMORROW  ');
  await query.fill('');
  await table.getByRole('link',{name:'Synthetic Today vs Visitors'}).tap();
  await page.getByRole('heading',{name:'Synthetic Today v Visitors',exact:true}).waitFor();
  assert.equal(await page.locator('#fixture').inputValue(),'espn:1234');
  const stale = new URL(page.url());
  const exact = JSON.parse(stale.searchParams.get('event').slice('fixture:'.length));
  exact[3] = '2026-06-15T22:31:00.000Z';
  stale.searchParams.set('event','fixture:'+JSON.stringify(exact));
  await page.goto(stale.href);
  await page.getByText('This fixture is unavailable or its identity is ambiguous.').waitFor();
  assert.equal(await page.locator('#event').isVisible(),false);
  await page.goBack();
  await page.getByRole('heading',{name:'Synthetic Today v Visitors',exact:true}).waitFor();
  await page.clock.setFixedTime(new Date('2026-06-15T22:30:00Z'));
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));
  await page.getByText('This fixture is unavailable or its identity is ambiguous.').waitFor();
  assert.equal(await page.locator('#event').isVisible(),false);
  await page.clock.setFixedTime(new Date('2026-06-15T22:15:00Z'));
  await page.goto(base + '/');
  await table.getByText(/Synthetic Today/).waitFor();
  await range.selectOption('tomorrow');
  await table.getByText(/Synthetic Tomorrow/).waitFor();
  assert.equal(await table.getByText(/Synthetic Today/).count(),0);
  await page.locator('#pro-feature-refresh').click();
  await table.getByText(/Synthetic Tomorrow/).waitFor();
  assert.equal(await range.inputValue(),'tomorrow');
  await range.selectOption('today');
  await page.reload();
  assert.equal(await range.inputValue(),'today');
  await table.getByText(/Synthetic Today/).waitFor();
  assert.equal(await table.getByText(/Synthetic Tomorrow/).count(),0);
  await page.getByRole('link',{name:/Explore selected date/}).click();
  assert.equal(await page.locator('#date-from').inputValue(),'2026-06-15');
  assert.equal(await page.locator('#date-to').inputValue(),'2026-06-15');
  await page.locator('.pro-quick-filters [data-pro-sport="football"]').focus();
  await page.keyboard.press('Enter');
  await page.getByRole('heading',{name:'Football evidence and workflow'}).waitFor();
  assert.equal(await page.evaluate(()=>document.activeElement.id),'sport-evidence');
  const nav = page.getByRole('navigation',{name:'Value Watch workspaces'});
  await nav.getByRole('link',{name:'Market evidence'}).click();
  assert.equal(await nav.getByRole('link',{name:'Market evidence'}).getAttribute('aria-current'),'page');
  await nav.getByRole('link',{name:'Validation'}).click();
  assert.equal(await nav.getByRole('link',{name:'Validation'}).getAttribute('aria-current'),'page');
  await nav.getByRole('link',{name:'Research desk'}).click();
  await nav.getByText('More',{exact:true}).click();
  await nav.getByRole('link',{name:'Compact preview'}).click();
  await page.locator('html.visual-preview').waitFor({state:'attached'});
  assert.equal(await range.isVisible(),false);
  report.syntheticChecks.push('UK date, sport and name filters, exact touch fixture handoff, changed kickoff withheld, refresh retention, keyboard focus and compact fallback');
  await page.close();
}

async function exactCrossSport(page, base, width) {
  const now = new Date('2026-11-21T13:55:00Z');
  const startUTC = '2026-11-21T17:00:00Z';
  const guard = {schema_version:1,research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED',
    generated_at_utc:'2026-11-21T13:50:00Z'};
  const race = {race_id:'12345',racecourse:'QA racecourse',name:'Synthetic QA Handicap',startUTC,
    schedule_cross_checked:true,capture_phase:'PRE_EVENT',race_stage:'DORMANT',
    runner_observed_at_utc:guard.generated_at_utc,runner_source_sha256:'a'.repeat(64),
    runner_source:'https://www.sportinglife.com/racing/racecard/12345/qa-handicap'};
  function exactSample(sport,id) {
    const event = otherEvent(sport,id,startUTC);
    const participants = event.participants.map((p,i) => ({...p,id:String(i+1)}));
    return {...event,participants,forecast:null};
  }
  const other = {...guard,sports:{
    tennis:{events:[exactSample('tennis','atp-12345')]},
    nfl:{events:[exactSample('nfl','nfl-12345')]}
  }};
  const raceRoute = route => route.fulfill({json:{...guard,races:[race]}});
  const otherRoute = route => route.fulfill({json:other});
  await page.route('**/racing-research-data.json',raceRoute);
  await page.route('**/other-sports-data.json',otherRoute);
  await page.clock.setFixedTime(now);
  await page.goto(base + '/');
  for (const sport of sports) {
    const choice = page.locator('.pro-quick-filters [data-pro-sport="'+sport+'"]');
    if (width === 1440) { await choice.focus(); await page.keyboard.press('Enter'); }
    else await choice.tap();
    assert.equal(await page.locator('#sport').inputValue(),sport);
    assert.equal(await page.evaluate(()=>document.activeElement.id),'sport-evidence');
    if (['darts','rugby',...blocked].includes(sport))
      assert.match(await page.locator('#sport-evidence').textContent(),/Exact fixture .*unavailable/);
  }
  for (const sport of ['racing','tennis','nfl']) {
    await page.locator('#pro-feature-sport').selectOption(sport);
    const link=page.locator('#pro-featured-rows a').first();
    await link.waitFor();
    const name=await link.innerText();
    await page.locator('#pro-feature-query').fill(name.slice(0,25));
    await page.reload();
    assert.equal(await page.locator('#pro-feature-sport').inputValue(),sport);
    assert.equal(await page.locator('#pro-feature-query').inputValue(),name.slice(0,25));
    if(width===1440){await link.focus();await page.keyboard.press('Enter');}
    else await link.tap();
    await page.getByRole('heading',{name,exact:true}).waitFor();
    await page.locator('#evidence').waitFor();
    const good=new URL(page.url());
    const tuple=JSON.parse(good.searchParams.get('event'));
    tuple[4]='2026-11-22T11:22:00.000Z';
    const mismatch=new URL(good);
    mismatch.searchParams.set('event',JSON.stringify(tuple));
    await page.goto(mismatch.href);
    await page.getByText(/This fixture is unavailable/).waitFor();
    assert.equal(await page.locator('#evidence').isVisible(),false);
    await page.goBack();
    await page.getByRole('heading',{name,exact:true}).waitFor();
    await page.clock.setFixedTime(new Date(startUTC));
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));
    await page.getByText(/This fixture is unavailable/).waitFor();
    assert.equal(await page.locator('#evidence').isVisible(),false);
    await page.clock.setFixedTime(now);
    await page.goBack();
    assert.equal(await page.locator('#pro-feature-sport').inputValue(),sport);
    assert.equal(await page.locator('#pro-feature-query').inputValue(),name.slice(0,25));
    await page.locator('#pro-feature-query').fill('');
  }
  const desk = new URL(base+'/');
  desk.search = new URLSearchParams({sport:'nfl','desk-query':'buffalo','desk-view':'all','desk-competition':'NFL · Week 11'});
  await page.goto(desk.href);
  await page.locator('#range-presets [data-range="tomorrow"]').click();
  await page.reload();
  assert.equal(await page.locator('#date-from').inputValue(),'2026-11-22');
  assert.equal(await page.locator('#competition').inputValue(),'NFL · Week 11');
  assert.equal(await page.locator('#search').inputValue(),'buffalo');
  await page.locator('#sport-nav [data-sport="tennis"]').click();
  await page.goBack();
  assert.equal(await page.locator('#sport').inputValue(),'nfl');
  assert.equal(await page.locator('#event-view').inputValue(),'all');
  assert.equal(await page.locator('#search').inputValue(),'buffalo');
  assert.equal(await page.locator('#competition').inputValue(),'NFL · Week 11');
  assert.equal(await page.locator('#date-from').inputValue(),'2026-11-22');
  await page.unroute('**/racing-research-data.json',raceRoute);
  await page.unroute('**/other-sports-data.json',otherRoute);
  report.syntheticChecks.push(width+'px nine selector handoffs, exact racing/tennis/NFL links, expired history restore, mismatch, touch or keyboard, refresh and Back');
}

async function repositoryFixtureLinks(page,base,width) {
  const asOf = new Date();
  await page.clock.setFixedTime(asOf);
  const sources = require('../pro-sources.js');
  for (const [sport, source, file] of [
    ['racing','racing','racing-research-data.json'],
    ['tennis','other','other-sports-data.json'],
    ['nfl','other','other-sports-data.json']
  ]) {
    const data = JSON.parse(await fs.readFile(path.join(root,file),'utf8'));
    const snapshot = sources.inspect(source,data,+asOf);
    const upcoming = sources.summarize([snapshot],+asOf).upcoming.filter(row => row.sport === sport);
    const expected = upcoming.slice(0,6).filter(row => row.startMs > +asOf).map(sources.detailKey).filter(Boolean);
    await page.goto(base+'/?fsport='+sport);
    await page.waitForFunction(() => !document.querySelector('#pro-featured-status').textContent.startsWith('Checking'));
    const links = await page.locator('#pro-featured-rows a').evaluateAll(rows => rows.map(a => a.href));
    assert.deepEqual(links.map(href => new URL(href).searchParams.get('event')),expected,
      sport+' links must match the exact fixture evidence on the first page');
    if (links.length) {
      await page.goto(links[0]);
      await page.locator('#evidence').waitFor();
      await screenshot(page,sport+'-exact-'+width);
    }
    report.repositoryFixtureLinks ??= [];
    report.repositoryFixtureLinks.push({sport,width,visibleExactLinks:links.length,verifiedOnFirstPage:expected.length});
  }
}

(async () => {
  await fs.mkdir(output, {recursive:true});
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({headless:true});
  try {
    if (!compact) {
      await researchFlow(browser,base);
      await calendarRecovery(browser,base);
      await discoveryFlow(browser,base);
      await referenceNavigation(browser,base);
    }
    for (const width of [1440,820,390]) {
      const context = await browser.newContext({viewport:{width,height:920},hasTouch:width<1000,reducedMotion:'reduce'});
      const page = await context.newPage();
      await page.route(url => url.origin !== base, route => route.abort());
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));
      for (const sport of sports) {
        if (compact) await page.clock.setFixedTime(compactAsOf);
        await page.goto(base + '/?sport=' + sport + (compact ? '&view=visual-preview' : '') + '#sport-evidence');
        if (compact) assert(await page.locator('html.visual-preview').count(), 'Compact preview must be active');
        const panel = page.locator('#sport-evidence');
        await panel.getByText(/PASS · No qualifying opportunity/).waitFor();
        if (!baseline) {
          const lane = panel.getByRole('region', {name:'Experimental source coverage'});
          assert.match(await lane.textContent(), laneEvidence[sport]);
          await lane.getByText('Current odds unavailable from approved free sources. No new free feed connected.').waitFor();
          assert.equal(await lane.locator('button, a, input').count(), 0);
        }
        await page.waitForFunction(() => document.querySelector('#source-summary')?.textContent.startsWith('Sources · '));
        assert.equal(await page.locator('#sport').inputValue(),sport);
        if (blocked.includes(sport)) {
          assert.equal(await page.locator('#events .event-card').count(),0);
          assert.equal(await page.locator('#generate').isDisabled(),true);
        }
        await screenshot(page, sport + '-' + width, '#sport-evidence');
        if (compact && sport === 'racing') {
          await page.waitForFunction(() => !document.getElementById('pro-featured-status').textContent.startsWith('Checking'));
          const panel = page.locator('.pro-featured');
          if (!baseline) {
            assert.equal(await panel.evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(255, 255, 255)');
            assert.equal(await page.locator('#generate + #find-racing').count(), 1);
            assert.equal(await page.locator('#pro-feature-page').evaluate(el => getComputedStyle(el).color), 'rgb(36, 61, 85)');
          }
          await screenshot(page, 'overview-' + width, '.pro-featured');
        }
      }
      const axe = await new AxeBuilder({page}).include('#sport-evidence').analyze();
      assert.deepEqual(axe.violations.map(v => v.id), []);
      report.accessibility.push('Sport evidence panel at ' + width + 'px: no axe violations');
      if (!compact) {
        for (const route of routes) {
          const response = await page.goto(base + '/' + route + '/');
          assert.equal(response.status(),200);
          await page.waitForLoadState('networkidle');
          await screenshot(page,route + '-workspace-' + width);
          if (route === 'ops-control') {
            assert(await page.locator('.brandmark').evaluate(mark => mark.scrollHeight <= mark.clientHeight + 1));
          }
          if (route === 'validation-centre' && width !== 820) {
            await resultReceiptFlow(page,width);
            await providerReadinessFlow(page,width);
          }
        }
      }
      if (compact && !baseline) {
        const quickFilters = page.locator('.pro-quick-filters [data-pro-sport]');
        assert.deepEqual(await quickFilters.evaluateAll(buttons => buttons.map(button => button.dataset.proSport).sort()),
          ['all', ...sports].sort());
        if (width === 390) {
          assert(await page.locator('.pro-featured-scroll').evaluate(el => {
            const evidence = el.querySelector('th:last-child').getBoundingClientRect();
            return el.scrollWidth <= el.clientWidth + 1 && evidence.width > 0 &&
              evidence.right <= el.getBoundingClientRect().right + 1;
          }));
          await overviewStates(page);
        }
        assert.match(await page.locator('#pro-feature-link-guide').textContent(),/Use the sport lanes/);
        assert.equal(await page.locator('#pro-featured-rows a').count(),0);
        await screenshot(page, 'research-lanes-' + width, '.pro-quick-filters');
        await page.locator('.pro-quick-filters [data-pro-sport="rugby"]').click();
        await page.getByRole('heading', {name:'Rugby evidence and workflow'}).waitFor();
        assert.equal(new URL(page.url()).searchParams.get('view'), 'visual-preview');
        assert.equal(new URL(page.url()).searchParams.get('sport'), 'rugby');
        assert.equal(await page.locator('#sport-evidence').evaluate(el => el === document.activeElement),true);
        await page.goBack();
        await page.getByRole('heading', {name:'Cricket evidence and workflow'}).waitFor();
        await page.goto(base + '/?view=visual-preview');
        assert.equal(await page.locator('#sport-evidence').isVisible(),false);
        const football = page.locator('.pro-quick-filters [data-pro-sport="football"]');
        await football.focus();
        await page.keyboard.press('Enter');
        await page.getByRole('heading', {name:'Football evidence and workflow'}).waitFor();
        assert.equal(await page.evaluate(() => document.activeElement.id),'sport-evidence');
      }
      if (!compact) {
        await exactCrossSport(page,base,width);
        await repositoryFixtureLinks(page,base,width);
      }
      assert.deepEqual(errors, []);
      await context.close();
    }
    console.log(JSON.stringify(report,null,2));
  } finally {
    await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2) + '\n');
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {
  console.error(error);
  server.close();
  process.exitCode = 1;
});
