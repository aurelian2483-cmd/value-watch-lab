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
  try {
    for (const width of [1440,390]) {
      const context = await browser.newContext({viewport:{width,height:940},reducedMotion:'reduce'});
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror',error => errors.push(error.message));
      await page.goto(base+'/market-intelligence/');
      const launch = page.getByRole('link',{name:'Open Match Centre preview'});
      await launch.waitFor();
      await page.evaluate(() => localStorage.setItem('value-watch-research-desk-v4','saved-workspace-sentinel'));
      await launch.click();
      await page.getByRole('heading',{level:1}).waitFor();
      const shared = page.url();
      const original = await page.locator('#event-title').textContent();
      assert(shared.includes('event=espn%3A'));
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
      const selected = await page.locator('#fixture').inputValue();
      await page.locator('#competition').selectOption('D1');
      const alternate = await page.locator('#fixture option').evaluateAll((options,id) => options.find(option => option.value && option.value !== id).value,selected);
      await page.locator('#fixture').selectOption(alternate);
      assert.match(page.url(),/competition=D1/);
      await page.goBack();
      assert.equal(await page.locator('#competition').inputValue(),'D1');
      const search = page.getByRole('searchbox',{name:'Find a team'});
      await search.pressSequentially(original);
      assert.equal(new URL(page.url()).searchParams.get('q'),original);
      assert.equal(await search.inputValue(),original);
      assert(Number.parseInt(await page.locator('#fixture-count').textContent(),10)>0);
      await page.goto(shared);
      await page.getByRole('heading',{name:original,exact:true}).waitFor();
      assert.equal(await page.evaluate(() => localStorage.getItem('value-watch-research-desk-v4')),'saved-workspace-sentinel');
      await page.getByRole('link',{name:'Historical reconstruction',exact:true}).click();
      await page.getByLabel('Probability model').waitFor();
      const before = await page.locator('.chart').innerText();
      await page.getByLabel('Probability model').selectOption('1');
      assert.notEqual(await page.locator('.chart').innerText(),before);
      await page.getByText('Same-sample historical scores',{exact:true}).click();
      assert(await page.getByText(/608 matches · Brier.*log loss/).first().isVisible());
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
      await page.screenshot({path:path.join(output,'football-cutoff-'+width+'.png'),fullPage:true});
      const dashboard = JSON.parse(await fs.readFile(path.join(root,'research-dashboard-data.json'),'utf8'));
      const baseline = dashboard.experimental_model_forecasts.find(row => row.model === 'POISSON_BASELINE_2025_26_V1' &&
        row.home === 'Manchester City' && row.away === 'Fulham');
      const cutoff = '2026-11-20T15:00:00Z';
      const receipt = {url:'https://example.org/training.csv',sha256:'a'.repeat(64),observed_at_utc:cutoff};
      dashboard.experimental_model_forecasts.push(
        {...baseline,model:'QA receipt at cutoff',cutoff_utc:cutoff,source_receipts:[receipt]},
        {...baseline,model:'QA receipt after cutoff',cutoff_utc:cutoff,
          source_receipts:[receipt,{...receipt,observed_at_utc:'2026-11-20T15:00:00.000001Z'}]}
      );
      await page.route('**/research-dashboard-data.json',route => route.fulfill({json:dashboard}));
      await page.reload();
      await page.getByText(/^1 eligible model estimate ·/).waitFor();
      assert.deepEqual(await page.getByLabel('Probability model').locator('option').allTextContents(),['QA receipt at cutoff']);
      assert(await unverified.getByText('QA receipt after cutoff',{exact:true}).isVisible());
      assert(await unverified.getByText('Training source receipt 2 was observed after the explicit training cutoff.',{exact:true}).isVisible());
      await page.screenshot({path:path.join(output,'football-receipt-cutoff-'+width+'.png'),fullPage:true});
      await page.unroute('**/research-dashboard-data.json');
      await page.route('**/football-expanded-data.json',route => route.fulfill({status:503}));
      await page.goto(shared);
      await page.getByRole('status').getByText('This fixture is unavailable or its identity is ambiguous.').waitFor();
      assert.deepEqual(errors,[]);
      await context.close();
    }
    console.log('PASS: football preview and archive, market handoff, keyboard, filters, back, storage, error states and desktop/mobile accessibility');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; }).finally(() => server.close());
