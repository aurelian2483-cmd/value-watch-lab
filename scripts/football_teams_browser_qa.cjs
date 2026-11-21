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
    const fsSync = require('node:fs');
    const pl = JSON.parse(fsSync.readFileSync(path.join(root,'research-dashboard-data.json'),'utf8'));
    const expanded = JSON.parse(fsSync.readFileSync(path.join(root,'football-expanded-data.json'),'utf8'));
    const observed = Math.max(Date.parse(pl.generated_at_utc),Date.parse(expanded.generated_at_utc));
    for (const width of [1440,390]) {
      const context = await browser.newContext({viewport:{width,height:950},reducedMotion:'reduce'});
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror',error => errors.push(error.message));
      await page.addInitScript(() => {
        window.cspViolations = [];
        addEventListener('securitypolicyviolation',event => window.cspViolations.push(event.violatedDirective));
      });
      await page.clock.setFixedTime(new Date(observed + 1000));
      await page.goto(base+'/football-teams/');
      await page.getByRole('status').getByText(/Premier League schedule: .*Expanded schedule:/).waitFor();
      await page.getByLabel('Team',{exact:true}).selectOption('Leeds');
      const leeds = page.locator('#team-panel .fixture a').first();
      await leeds.waitFor();
      const leedsTitle = (await leeds.textContent()).replace(/^Open | in Match Centre$/g,'');
      assert(leedsTitle.includes('Leeds United'));
      await leeds.click();
      await page.getByRole('heading',{name:leedsTitle,exact:true}).waitFor();
      await page.goBack();
      await page.getByLabel('Team',{exact:true}).selectOption('Coventry City');
      await page.getByText(/No qualifying historical results for this team/).waitFor();
      assert(await page.locator('#team-panel .fixture a').count());
      await page.getByLabel('Team',{exact:true}).selectOption('Manchester City');
      await page.getByText(/Descriptive results trend:/).waitFor();
      assert(await page.getByText(/Home: .*Away:/).isVisible());
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      const violations = (await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations;
      assert.deepEqual(violations.map(issue => issue.id),[]);
      assert.deepEqual(await page.evaluate(() => window.cspViolations),[]);
      await page.locator('#team-dashboard').scrollIntoViewIfNeeded();
      await page.screenshot({path:path.join(output,'football-teams-'+width+'.png'),fullPage:true});
      await page.getByLabel('Competition',{exact:true}).selectOption('D1');
      assert.match(await page.locator('#coverage').textContent(),/Two-source regulation-time finals/);
      await page.getByLabel('Team',{exact:true}).selectOption('Bayern Munich');
      const bayern = page.locator('#team-panel .fixture a').first();
      const bayernTitle = (await bayern.textContent()).replace(/^Open | in Match Centre$/g,'');
      await bayern.click();
      await page.getByRole('heading',{name:bayernTitle,exact:true}).waitFor();
      await page.route('**/research-dashboard-data.json',route => route.fulfill({status:503}));
      await page.goto(base+'/football-teams/');
      await page.getByText(/Premier League schedule unavailable/).waitFor();
      await page.getByLabel('Team',{exact:true}).selectOption('Manchester City');
      assert(await page.getByText('Schedule snapshot unavailable.',{exact:true}).isVisible());
      await page.unroute('**/research-dashboard-data.json');
      await page.clock.setFixedTime(new Date(observed + 49*3600000));
      await page.reload();
      await page.getByText(/stale \(at least 48 hours old\)/).waitFor();
      assert.deepEqual(errors,[]);
      await context.close();
      console.log('PASS Team Intelligence ' + width + 'px: actual snapshots, fixture links, zero history, missing/stale feed, CSP, axe and overflow');
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; }).finally(() => server.close());
