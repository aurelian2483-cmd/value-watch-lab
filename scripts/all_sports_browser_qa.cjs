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
    await page.clock.install({time:new Date('2026-11-21T08:00:00Z')});
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
  for (const sport of ['basketball','cricket']) {
    let available = true;
    const handler = route => {
      const params = new URL(route.request().url()).searchParams;
      assert.equal(params.get('sport'),sport);
      return available ? route.fulfill({json:{fixtures:[
        {sport,home:'Synthetic ' + sport + ' A',away:'Synthetic B',status:'scheduled',time:'2026-11-22T19:00:00Z'},
        {sport:'tennis',home:'Wrong sport A',away:'Wrong sport B',status:'scheduled',time:'2026-11-22T19:00:00Z'}
      ]}}) : route.fulfill({status:503});
    };
    await page.route('https://sportscore.com/**',handler);
    await page.goto(base + '/sports-watch/?sport=' + sport);
    const cards = page.locator('#fixture-results .fixture-card');
    await cards.first().waitFor();
    assert.equal(await cards.count(),1);
    await cards.first().click();
    assert.equal(await page.locator('#coverage-sport').inputValue(),sport);
    await viewportCheck(page,sport + ' discovery');
    available = false;
    await page.locator('#fixture-refresh').click();
    await page.getByText(/Fixture data unavailable:/).waitFor();
    assert.equal(await cards.count(),0);
    await page.unroute('https://sportscore.com/**',handler);
    report.syntheticChecks.push(sport + ' provider discovery, sport mismatch rejected, deduplication, official coverage lookup and failed refresh');
  }
  await page.route('https://sportscore.com/**',() => { throw Error('Golf must use manual coverage'); });
  await page.goto(base + '/sports-watch/?sport=golf');
  assert.equal(await page.locator('#fixture-sport').isDisabled(),true);
  assert.equal(await page.locator('#sports [data-sport="golf"]').getAttribute('aria-pressed'),'true');
  report.syntheticChecks.push('Golf manual coverage only');
  await page.close();
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
    }
    for (const width of [1440,820,390]) {
      const context = await browser.newContext({viewport:{width,height:920},reducedMotion:'reduce'});
      const page = await context.newPage();
      await page.route(url => url.origin !== base, route => route.abort());
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));
      for (const sport of sports) {
        if (compact) await page.clock.setFixedTime(new Date('2026-11-21T10:30:00Z'));
        await page.goto(base + '/?sport=' + sport + (compact ? '&view=visual-preview' : '') + '#sport-evidence');
        if (compact) assert(await page.locator('html.visual-preview').count(), 'Compact preview must be active');
        const panel = page.locator('#sport-evidence');
        await panel.getByText(/PASS · No qualifying opportunity/).waitFor();
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
      if (!compact && width !== 820) {
        for (const route of routes) {
          const response = await page.goto(base + '/' + route + '/');
          assert.equal(response.status(),200);
          await page.waitForLoadState('networkidle');
          await screenshot(page,route + '-workspace-' + width);
          if (route === 'validation-centre') {
            await resultReceiptFlow(page,width);
            await providerReadinessFlow(page,width);
          }
        }
      }
      if (compact && !baseline) {
        await page.locator('#sport-nav [data-sport="rugby"]').click();
        await page.getByRole('heading', {name:'Rugby evidence and workflow'}).waitFor();
        assert.equal(new URL(page.url()).searchParams.get('view'), 'visual-preview');
        assert.equal(new URL(page.url()).searchParams.get('sport'), 'rugby');
        await page.goBack();
        await page.getByRole('heading', {name:'Cricket evidence and workflow'}).waitFor();
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
