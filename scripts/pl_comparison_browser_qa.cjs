'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const {chromium} = require('playwright');
const {mergePoll, render} = require('./render_pl_comparison.cjs');
const {market} = require('../market-intelligence/comparison-core.cjs');

async function main() {
  const now = Date.parse('2026-11-26T12:00Z');
  const html = await fs.readFile('market-intelligence/index.html','utf8');
  const fixture = {home:'QA Home',away:'QA Away',kickoff_utc:'2026-11-26T13:00:00Z'};
  const books = require('../tests/fixtures/pl-bookmakers.cjs')(['skybet','synthetic_book']);
  const price = {sport_key:'soccer_epl',event_id:'abcdefghijklmnop',market:'h2h',settlement:market,
    home:fixture.home,away:fixture.away,start_utc:fixture.kickoff_utc,
    observed_at_utc:'2026-11-26T11:59:00Z',checked_at_utc:new Date(now).toISOString(),receipt_sha256:'a'.repeat(64),
    bookmaker:'skybet',...books.get('skybet'),prices:{home:2,draw:3,away:4}};
  const ledger = mergePoll({observations:[]},{status:'ok',checked:price.checked_at_utc,
    records:[price,{...price,bookmaker:'synthetic_book',...books.get('synthetic_book'),prices:{home:2.1,draw:3,away:4}}]},[fixture],books,now);
  const pages = {
    '/market-intelligence/':html,
    '/market-intelligence/preview.html':render(html,ledger,[fixture],books,true,now),
    '/market-intelligence/failed.html':render(html,{...ledger,status:'failed'},[fixture],books,true,now)
  };
  const root = process.cwd();
  const server = http.createServer(async (req,res) => {
    const name = new URL(req.url,'http://localhost').pathname;
    const type = {'html':'text/html','js':'application/javascript','css':'text/css','json':'application/json'};
    try {
      const file = path.resolve(root,'.'+name);
      if (!file.startsWith(root+path.sep)) return res.writeHead(403).end();
      const body = pages[name] || await fs.readFile(file);
      res.writeHead(200,{'Content-Type':pages[name] ? type.html : type[path.extname(name).slice(1)] || 'text/plain'}).end(body);
    } catch {res.writeHead(404).end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try {
    browser = await chromium.launch();
    for (const width of [1440,390]) {
      const page = await browser.newPage({viewport:{width,height:900}});
      const errors = [];
      page.on('pageerror',error=>errors.push(error.message));
      await page.clock.install({time:new Date(now)});
      const origin = 'http://127.0.0.1:'+server.address().port;
      await page.goto(origin+'/market-intelligence/');
      const section = page.locator('#pl-comparison');
      await section.getByText(/Current comparison is disabled/).waitFor();
      assert.equal(await section.getByText(/Best found/).count(),0);
      await page.goto(origin+'/market-intelligence/preview.html');
      await section.getByText(/Best found among 2 checked/).waitFor();
      await section.getByText(/overround/).first().waitFor();
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth),true);
      await page.clock.fastForward(31*60000);
      await section.getByText(/Prices expired/).waitFor();
      assert.equal(await section.getByText(/Best found/).count(),0);
      await page.goto(origin+'/market-intelligence/failed.html');
      await section.getByRole('status').filter({hasText:'Source failed'}).waitFor();
      assert.equal(await section.getByText(/Best found/).count(),0);
      assert.deepEqual(errors,[]);
      await page.close();
    }
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
  console.log('PASS: synthetic PL comparison, disabled page, browser expiry and source failure at 1440px and 390px');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
