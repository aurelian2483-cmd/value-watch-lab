'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const out = path.join(root, 'work/browser-qa/unified-dashboard');
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.json': 'application/json' };
const server = http.createServer(async (req, res) => {
  try {
    const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = path.resolve(root, '.' + name + (name.endsWith('/') ? 'index.html' : ''));
    if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
    const body = await fs.readFile(file);
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' }).end(body);
  } catch {
    if (!res.headersSent) res.writeHead(404);
    res.end();
  }
});

async function main() {
  await fs.mkdir(out, { recursive: true });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch();
  const routes = new Set();
  const sizes = [[1440, 1000], [1180, 820], [820, 1180], [390, 844]];
  try {
    for (const [width, height] of sizes) {
      const page = await browser.newPage({ viewport: {width,height}, hasTouch: width < 1440 });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
          writeText: async value => {
            if (window.denyCopy) throw new Error('Simulated clipboard denial');
            window.copiedLink = value;
          }
        } });
      });
      await page.goto(base + '/?sport=football');
      const first = page.locator('#events .desk-market-row').first();
      await first.waitFor();
      const watch = page.locator('#dashboard-watch');
      assert.equal(await watch.isVisible(), false);
      assert.equal(await page.locator('#copy-event-link').isDisabled(), true);
      const sportsRail = page.locator('#dashboard-sports #sport-nav');
      assert.equal(await sportsRail.locator('button[data-sport]').count(), 10);
      assert.equal(await sportsRail.evaluate(rail => getComputedStyle(rail).flexDirection), 'row');
      assert.equal(await page.locator('#slip-panel').isVisible(), width > 1020);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      // The persistent multi-select tile panel intentionally occupies more
      // vertical space than the old dropdown; verify the first fixture stays
      // accessible by scrolling, rather than requiring it above the fold.
      await first.scrollIntoViewIfNeeded();
      assert.equal(await first.evaluate(node => {
        const rect=node.getBoundingClientRect();
        const x=rect.left + Math.min(rect.width/2, 50);
        const y=Math.max(0,Math.min(innerHeight-1,rect.top+Math.min(20,rect.height/2)));
        return rect.width>0 && rect.height>0 && rect.top < innerHeight &&
          rect.bottom>0 && (node.contains(document.elementFromPoint(x,y)) ||
          node===document.elementFromPoint(x,y));
      }),true,'First fixture accessible after scrolling, not covered by slip dock');
      assert.equal(await page.locator('#page-status').isVisible(), false);
      if (width < 1021) {
        await page.locator('#paper-open').tap();
        await page.locator('#slip-tabs').waitFor();
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('#paper-open').getAttribute('aria-expanded'), 'false');
      }
      await page.screenshot({path: path.join(out, 'dashboard-' + width + '.png')});
      const engine = page.locator('#engine-methods');
      const tile = id => engine.locator('button[data-method="' + id + '"]');
      const lanes = page.locator('[data-bottleneck-lane]');
      const activate = async (sport, expected) => {
        await sportsRail.locator(`button[data-sport="${sport}"]`).click();
        if (width <= 680) await page.locator('.dashboard-slip-tools:not([open]) > summary').click();
        if (await tile('current').getAttribute('aria-pressed') === 'true') await tile('current').click();
        if (await tile('bottleneck').getAttribute('aria-pressed') !== 'true') await tile('bottleneck').click();
        await lanes.first().waitFor();
        assert.deepEqual(await lanes.evaluateAll(nodes => nodes.map(node => node.dataset.bottleneckLane)), expected);
        assert.equal(await lanes.getByText(/Second star withheld/).count(), expected.length);
      };
      await activate('rugby', ['rugby_union', 'rugby_league']);
      assert.equal(await tile('bottleneck').getAttribute('aria-pressed'), 'true');
      assert.equal(await lanes.getByText(/incremental value is unproven/).count(), 1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.locator('#engine-analysis').screenshot({path: path.join(out, 'bottleneck-rugby-' + width + '.png')});
      if (width === 1440) {
        for (const sport of ['football', 'racing', 'tennis', 'nfl', 'darts', 'basketball', 'cricket', 'golf']) {
          await activate(sport, [sport]);
        }
        await activate('all', ['football', 'racing', 'tennis', 'nfl', 'darts', 'rugby_union',
          'rugby_league', 'basketball', 'cricket', 'golf']);
      }
      await sportsRail.locator('button[data-sport="football"]').click();
      await tile('bottleneck').click();await tile('current').click();

      const menu = page.locator('#research-pages > summary');
      await menu.focus();
      await page.keyboard.press('Enter');
      const links = page.locator('#research-pages .research-page-groups a');
      await links.first().waitFor();
      if (width === 1440) {
        for (const url of await links.evaluateAll(nodes => nodes.map(node => node.href))) {
          const response = await page.request.get(url);
          assert.equal(response.status(), 200, url);
          assert.match(await response.text(), /<title>[^<]+<\/title>/i, url);
          routes.add(url.replace(base, ''));
        }
        await page.screenshot({path: path.join(out, 'research-pages-1440.png')});
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.keyboard.press('Escape');
      assert.equal(await menu.evaluate(node => !node.parentElement.open && document.activeElement === node), true);

      const name = await first.locator('.event-title').innerText();
      const fixtureId = await first.getAttribute('data-event-id');
      const start = await first.locator('time').getAttribute('datetime');
      await first.getByRole('button', {name:'Watch ' + name}).click();
      await watch.getByRole('heading', {name, exact:true}).waitFor();
      await watch.getByText(/No approved event-specific provider/).waitFor();
      assert.equal(await watch.locator('iframe').count(), 0);
      if (width === 390) await page.screenshot({path:path.join(out,'selected-watch-390.png')});
      await page.locator('#copy-event-link').click();
      const eventUrl = await page.evaluate(() => window.copiedLink);
      assert.equal(new URL(eventUrl).searchParams.get('watch'), 'desk:football:' + fixtureId);
      await page.reload();
      await watch.getByRole('heading', {name, exact:true}).waitFor();
      await page.evaluate(() => { window.denyCopy = true; });
      await page.locator('#copy-event-link').click();
      const field = page.locator('#dashboard-copy-value');
      assert.equal(await field.inputValue(), eventUrl);
      assert.equal(await field.evaluate(node => node.selectionEnd - node.selectionStart === node.value.length), true);
      await watch.getByRole('button', {name:'Close Watch'}).click();
      assert.equal(await watch.isVisible(), false);
      await page.goBack();
      await watch.getByRole('heading', {name, exact:true}).waitFor();
      if (width === 1440) {
        const approved = {event_key:'desk:football:' + fixtureId, sport:'football', event_time:start,
          approved:true, url:'https://www.youtube.com/watch?v=abcdefghijk', embed_allowed:true};
        await page.route('**/sports-watch/approved-events.json', route => route.fulfill({json:{version:1,events:[approved]}}));
        await page.route('https://www.youtube-nocookie.com/**', route => route.fulfill({body:'Controlled approved embed'}));
        await page.goto(eventUrl);
        await watch.getByRole('button', {name:'Copy provider link'}).click();
        assert.equal(await page.evaluate(() => window.copiedLink), approved.url);
        assert.equal(await watch.locator('iframe').count(), 0);
        await watch.getByRole('button', {name:'Load approved video'}).click();
        assert.equal(await watch.locator('iframe').getAttribute('src'), 'https://www.youtube-nocookie.com/embed/abcdefghijk');
        await page.reload();
        await page.evaluate(() => { window.denyCopy = true; });
        await watch.getByRole('button', {name:'Copy provider link'}).click();
        assert.equal(await field.inputValue(), approved.url);
        await page.evaluate(() => Object.defineProperty(navigator,'clipboard',{configurable:true,value:undefined}));
        await page.locator('#copy-event-link').click();
        assert.equal(await field.inputValue(), eventUrl);
        await page.unroute('**/sports-watch/approved-events.json');
        await page.route('**/sports-watch/approved-events.json', route => route.fulfill({json:{version:1,events:[{...approved,event_time:'2020-01-01T00:00:00Z'}]}}));
        await page.reload();
        await watch.getByText(/No approved event-specific provider/).waitFor();
        assert.equal(await watch.getByRole('button', {name:'Copy provider link'}).isVisible(), false);
        const missing = new URL(eventUrl);
        missing.searchParams.set('watch','desk:football:invalid');
        await page.goto(missing.href);
        await watch.getByText(/selected event is unavailable/).waitFor();
        assert.equal(await page.locator('#copy-event-link').isDisabled(), true);
      }
      assert.deepEqual(errors, []);
      await page.close();
    }
    console.log(JSON.stringify({viewports:sizes, routes:[...routes], copyAndWatch:'passed'}));
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => server.close());
