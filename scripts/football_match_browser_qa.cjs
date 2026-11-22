'use strict';

const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;

const root = path.resolve(__dirname, '..');
const output = path.join(root,'work/browser-qa');
const mime = {'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json'};
const server = http.createServer(async (request,response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    const name = decodeURIComponent(url.pathname);
    const file = path.resolve(root,'.'+name+(name.endsWith('/')?'index.html':''));
    if (!file.startsWith(root+path.sep)) return response.writeHead(403).end();
    const body = await fs.readFile(file);
    response.writeHead(200,{'Content-Type':mime[path.extname(file)] || 'application/octet-stream'}).end(body);
  } catch { response.writeHead(404).end(); }
});

(async () => {
  await fs.mkdir(output,{recursive:true});
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const base = 'http://127.0.0.1:'+server.address().port;
  const browser = await chromium.launch({headless:true});
  const capture = JSON.parse(await fs.readFile(path.join(root,'tests/fixtures/football-market-replay.json'),'utf8'));
  try {
    for (const width of [1440,820,390]) {
      const context = await browser.newContext({viewport:{width,height:940},reducedMotion:'reduce'});
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror',error => errors.push(error.message));
      if (width === 1440) {
        await page.goto(base+'/market-intelligence/');
        const production = await page.waitForFunction(() => {
          const status = document.querySelector('#market-status')?.textContent;
          return document.querySelector('#market-rows tr') ? 'recorded' :
            status === 'No source-backed pre-kickoff captures are available.' ? 'unavailable' : false;
        });
        assert.match(await production.jsonValue(), /^(recorded|unavailable)$/);
      }
      // Daily schedules can drop the historical fixture. Replay its unmodified receipts with the captured fixture identities.
      await page.clock.setFixedTime(new Date(capture.as_of_utc));
      const capturedFixtures = route => route.fulfill({json:capture.fixtures});
      const capturedMarket = route => route.fulfill({json:capture.market});
      await page.route('**/football-expanded-data.json',capturedFixtures);
      await page.route('**/paper-lab/hybrid-market-data.json',capturedMarket);
      await page.goto(base+'/market-intelligence/');
      await page.locator('#market-rows tr').first().waitFor();
      assert.match(await page.locator('#market-collection-status').innerText(),/Collection status: RATE_LIMITED/);
      const werderOption = await page.locator('#match option').evaluateAll(options =>
        options.find(option => option.textContent.includes('Werder Bremen'))?.value);
      assert.notEqual(werderOption,undefined);
      await page.locator('#match').selectOption(werderOption);
      assert.equal(await page.locator('#market-rows tr').count(),3);
      assert((await page.locator('#market-rows').innerText()).includes('Pinnacle via GoldEdge'));
      assert((await page.locator('#market-rows').innerText()).includes('movement unavailable'));
      assert((await page.locator('#market-withheld').innerText()).includes('No recorded quote for Sky Bet.'));
      assert(/market evidence item was withheld|market evidence items were withheld/.test(await page.locator('#market-withheld').innerText()));
      assert((await page.locator('#market-withheld').innerText()).includes('Fixture identity, kickoff or 90-minute 1X2 market did not match a published fixture.'));
      await page.locator('#source-filter').selectOption('PINNACLE_VIA_GOLDEDGE');
      assert.equal(await page.locator('#market-rows tr').count(),3);
      await page.locator('#source-filter').selectOption('');
      assert.equal(await page.locator('#market-rows tr').count(),3);
      assert.equal(await page.locator('#market-source-details details').count(),1);
      const marketProvenance = page.locator('#market-source-details details').first();
      await marketProvenance.locator('summary').click();
      assert(await marketProvenance.getByText(/Opening price is not explicitly recorded/).isVisible());
      const launch = page.getByRole('link',{name:'Open Match Centre preview'});
      await launch.waitFor();
      await page.evaluate(() => localStorage.setItem('value-watch-research-desk-v4','saved-workspace-sentinel'));
      await launch.click();
      await page.getByRole('heading',{level:1}).waitFor();
      const shared = page.url();
      const original = await page.locator('#event-title').textContent();
      assert(shared.includes('event=espn%3A'));
      await page.getByRole('link',{name:'Markets',exact:true}).click();
      await page.locator('#markets .market-matrix').waitFor();
      assert.equal(await page.locator('#markets .market-matrix tbody tr').count(),1);
      assert(await page.locator('#markets').getByText(/No model passes the explicit training-cutoff/).isVisible());
      assert(await page.locator('#markets').getByText(/opening price is not supplied/i).isVisible());
      const fixtureMarketDetails = page.locator('#markets details').first();
      await fixtureMarketDetails.locator('summary').click();
      assert(await fixtureMarketDetails.getByText(/Only one comparable capture exists/).isVisible());
      await page.getByRole('link',{name:'Sources',exact:true}).click();
      const fixtureReceipt = page.locator('#sources details').first();
      await fixtureReceipt.locator('summary').focus();
      await page.keyboard.press('Enter');
      assert(await fixtureReceipt.evaluate(element => element.open));
      const marketReceipt = page.locator('#sources details').filter({hasText:'90-minute 1X2'}).first();
      await marketReceipt.locator('summary').click();
      assert(await marketReceipt.getByText('Captured ',{exact:false}).isVisible());
      assert((await marketReceipt.getByRole('link').getAttribute('href')).startsWith('https://'));
      await page.locator('#overview').scrollIntoViewIfNeeded();
      const issues = (await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations;
      assert.deepEqual(issues.map(issue => issue.id),[]);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.evaluate(() => scrollTo(0,0));
      await page.screenshot({path:path.join(output,'football-match-'+width+'.png'),fullPage:true});
      assert(await page.locator('#fixture optgroup').count() > 1);
      assert.equal(await page.locator('#fixture-rail .fixture-date-heading').count(),await page.locator('#fixture optgroup').count());
      await page.locator('#competition').selectOption('D1');
      await page.getByRole('button',{name:'Favourite Bundesliga',exact:true}).click();
      const pin = page.getByRole('navigation',{name:'Pinned competitions'}).getByRole('button',{name:'Bundesliga',exact:true});
      await pin.waitFor();
      await page.getByLabel('Favourites only').check();
      const day = await page.locator('#fixture-day option').evaluateAll(options => options.find(option => option.value).value);
      await page.getByLabel('Fixture date (UK)').selectOption(day);
      await page.getByLabel('Match status').selectOption('final');
      assert.equal(new URL(page.url()).searchParams.get('status'),'final');
      assert.equal(await page.locator('#event-title').textContent(),original);
      assert(await page.getByText('Selected fixture is outside these filters.',{exact:true}).isVisible());
      await page.goBack();
      assert.equal(await page.getByLabel('Match status').inputValue(),'');
      assert.equal(await page.getByLabel('Fixture date (UK)').inputValue(),day);
      await page.reload();
      await pin.waitFor();
      assert(await page.getByLabel('Favourites only').isChecked());
      await page.goto(shared);
      await pin.waitFor();
      await page.getByRole('navigation',{name:'Pinned competitions'}).getByRole('button',{name:'Bundesliga'}).click();
      assert.equal(await page.locator('#competition').inputValue(),'D1');
      await page.getByRole('link',{name:/Next fixture|Previous fixture/}).first().click();
      assert.notEqual(page.url(),shared);
      assert.equal(new URL(page.url()).searchParams.get('competition'),'D1');
      await page.goBack();
      await page.getByRole('heading',{name:original,exact:true}).waitFor();
      await page.evaluate(() => scrollTo(0,0));
      await page.screenshot({path:path.join(output,'football-phase4-'+width+'.png'),fullPage:false});
      await page.goto(shared);
      const selected = await page.locator('#fixture').inputValue();
      await page.locator('#competition').selectOption('D1');
      const alternate = await page.locator('#fixture option').evaluateAll((options,id) => options.find(option => option.value && option.value !== id).value,selected);
      await page.locator('#fixture').selectOption(alternate);
      assert.match(page.url(),/competition=D1/);
      await page.goBack();
      assert.equal(await page.locator('#competition').inputValue(),'D1');
      const search = page.getByRole('searchbox',{name:'Find a team'});
      await search.pressSequentially(original);
      await page.waitForURL(url => url.searchParams.get('q') === original);
      assert.equal(await search.inputValue(),original);
      assert(Number.parseInt(await page.locator('#fixture-count').textContent(),10)>0);
      await page.goto(shared);
      await page.getByRole('heading',{name:original,exact:true}).waitFor();
      assert.equal(await page.evaluate(() => localStorage.getItem('value-watch-research-desk-v4')),'saved-workspace-sentinel');
      await page.getByRole('link',{name:'Historical reconstruction',exact:true}).click();
      await page.getByLabel('Probability model').waitFor();
      const before = await page.locator('.chart').innerText();
      await page.getByLabel('Compare with').selectOption('1');
      assert(await page.getByText(/Largest outcome disagreement/).isVisible());
      await page.getByLabel('Compare with').selectOption('');
      await page.getByLabel('Probability model').selectOption('1');
      assert.notEqual(await page.locator('.chart').innerText(),before);
      await page.getByText('Same-sample historical scores',{exact:true}).click();
      assert(await page.getByText(/608 matches · Brier.*log loss/).first().isVisible());
      await page.getByLabel('Compare with').selectOption('0');
      await page.screenshot({path:path.join(output,'football-phase3-models-'+width+'.png'),fullPage:true});
      // Replay the captured estimate after the event rolls out of the current schedule.
      // The earlier journey replays dated repository market evidence using its original fixture identities.
      await page.unroute('**/football-expanded-data.json',capturedFixtures);
      await page.unroute('**/paper-lab/hybrid-market-data.json',capturedMarket);
      await page.clock.setFixedTime(new Date());
      const dashboard = JSON.parse(await fs.readFile(path.join(root,'tests/fixtures/football-cutoff-regression.json'),'utf8'));
      const replayDashboard = route => route.fulfill({json:dashboard});
      await page.route('**/research-dashboard-data.json',replayDashboard);
      await page.goto(base+'/football-match/?q=Manchester+City+v+Fulham');
      await page.getByRole('heading',{name:'Manchester City v Fulham',exact:true}).waitFor();
      const unverified = page.getByRole('region',{name:'UNVERIFIED EXPERIMENTAL ESTIMATES'});
      assert(await unverified.getByText('POISSON_BASELINE_2025_26_V1',{exact:true}).isVisible());
      assert(await unverified.getByText('Home 80.6% · Draw 13.5% · Away 5.9%',{exact:true}).isVisible());
      assert(await unverified.getByText('Explicit training cutoff is missing.',{exact:true}).isVisible());
      assert(await page.getByText(/^0 eligible model estimates/).isVisible());
      assert.equal(await page.getByLabel('Probability model').count(),0);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      const cutoffIssues = (await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations;
      assert.deepEqual(cutoffIssues.map(issue => issue.id),[]);
      const factsLink = page.getByRole('link',{name:'Match facts',exact:true});
      await factsLink.focus();
      await page.keyboard.press('Enter');
      assert.equal(await factsLink.getAttribute('aria-current'),'location');
      const form = page.getByLabel('Results per team');
      await form.selectOption('10');
      assert.equal(await page.locator('#facts .form-row').first().locator('span').count(),10);
      await page.getByLabel('Venue filter').selectOption('venue');
      await page.getByText('Goal trend and result timeline',{exact:true}).first().click();
      assert(await page.locator('#facts details[open]').getByText(/\(home\)$/).first().isVisible());
      await page.evaluate(() => scrollTo(0,0));
      await page.screenshot({path:path.join(output,'football-phase3-'+width+'.png'),fullPage:true});
      const [baseline] = dashboard.experimental_model_forecasts;
      const cutoff = '2026-11-20T15:00:00Z';
      const receipt = {url:'https://example.org/training.csv',sha256:'a'.repeat(64),observed_at_utc:cutoff};
      dashboard.experimental_model_forecasts.push(
        {...baseline,model:'QA receipt at cutoff',cutoff_utc:cutoff,source_receipts:[receipt]},
        {...baseline,model:'QA receipt after cutoff',cutoff_utc:cutoff,
          source_receipts:[receipt,{...receipt,observed_at_utc:'2026-11-20T15:00:00.000001Z'}]}
      );
      await page.reload();
      await page.getByText(/^1 eligible model estimate ·/).waitFor();
      assert.deepEqual(await page.getByLabel('Probability model').locator('option').allTextContents(),['QA receipt at cutoff']);
      assert(await unverified.getByText('QA receipt after cutoff',{exact:true}).isVisible());
      assert(await unverified.getByText('Training source receipt 2 was observed after the explicit training cutoff.',{exact:true}).isVisible());
      await page.screenshot({path:path.join(output,'football-receipt-cutoff-'+width+'.png'),fullPage:true});
      await page.unroute('**/research-dashboard-data.json',replayDashboard);
      const sparse = route => route.fulfill({json:{...dashboard,experimental_model_forecasts:[],
        upcoming_fixtures:[{league:'UCL',home:'QA Home',away:'QA Away',kickoff_utc:'2026-11-24T20:00:00Z'}]}});
      await page.route('**/football-expanded-data.json',sparse);
      await page.goto(base+'/football-match/?competition=UCL&q=QA+Home+v+QA+Away');
      await page.getByText('No prior results for either team were matched in the published two-source final records.',{exact:true}).waitFor();
      await page.unroute('**/football-expanded-data.json',sparse);
      await page.route('**/football-expanded-data.json',route => route.fulfill({status:503}));
      await page.goto(shared);
      await page.getByRole('status').getByText('This fixture is unavailable or its identity is ambiguous.').waitFor();
      assert.deepEqual(errors,[]);
      await context.close();
    }
    console.log('PASS: football preview and archive, market handoff, keyboard, filters, back, storage, error states and desktop/mobile accessibility');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; }).finally(() => server.close());
