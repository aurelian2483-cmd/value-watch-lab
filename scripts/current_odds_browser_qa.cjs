'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');
const sources = require('../pro-sources');
const core = require('../football-match/core');
const {renderCurrentOdds} = require('./render_current_odds.cjs');
const root = path.join(__dirname, '..');
const read = name => fs.readFile(path.join(root, name), 'utf8').then(JSON.parse);
const deployed = process.argv.includes('--public');
const live = deployed || process.argv.includes('--live');
const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'};

let checkpoint='fixture selection';
async function main(){
 let [dashboard,expanded,other,racing]=await Promise.all([
  'research-dashboard-data.json','football-expanded-data.json','other-sports-data.json','racing-research-data.json'
 ].map(read));
 const now=live?Date.now():Date.parse(racing.generated_at_utc)+60000;
 if(!live){
  const gates={research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED',schema_version:1,
   generated_at_utc:new Date(now-1000).toISOString()};
  const start=new Date(now+2*3600000).toISOString();
  const fixture={league:'PL',home:'QA Football Home',away:'QA Football Away',kickoff_utc:start};
  const emptyFixture={...fixture,home:'QA Football Unpriced'};
  const unverifiedFixture={...fixture,home:'QA Football Unverified'};
  const cutoff=new Date(now-60000).toISOString();
  const forecast={...gates,...fixture,model:'QA model',odds:null,expected_value:null,
   prob_home:0.5,prob_draw:0.25,prob_away:0.25,cutoff_utc:cutoff,
   source_receipts:[{observed_at_utc:cutoff,url:'https://example.test/results',sha256:'b'.repeat(64)}]};
  dashboard={...gates,upcoming_fixtures:[fixture,emptyFixture,unverifiedFixture],
   experimental_model_forecasts:[forecast,{...forecast,...unverifiedFixture,cutoff_utc:null}]};
  expanded=null;
  const otherEvent=(id,competition,home,away,url)=>({id,competition,name:home+' vs '+away,startUTC:start,
   source:'https://site.api.espn.com/apis/site/v2/sports/'+url+'/scoreboard',
   participants:[{id:'1',name:home},{id:'2',name:away}]});
  other={...gates,sports:{
   tennis:{events:[otherEvent('atp-321','ATP · Nitto ATP Finals','QA Tennis Home','QA Tennis Away','tennis/atp')]},
   nfl:{events:[otherEvent('nfl-123','NFL · Week 11','QA NFL Home','QA NFL Away','football/nfl')]}
  }};
 }
 const football=sources.footballEvidence([dashboard,expanded],null,core,now);
 const records=sources.summarize([sources.inspect('football',dashboard,now,core),
  sources.inspect('other',other,now),sources.inspect('racing',racing,now)],now).upcoming;
 const league={PL:'soccer_epl',E1:'soccer_efl_champ',UCL:'soccer_uefa_champs_league',UEL:'soccer_uefa_europa_league',
  SP1:'soccer_spain_la_liga',I1:'soccer_italy_serie_a',D1:'soccer_germany_bundesliga',F1:'soccer_france_ligue_one'};
 const choices={};
 const controlled={schema_version:1,provider:'THE_ODDS_API',research_only:true,model_validation:'UNVALIDATED',
  publication_gate:'BLOCKED',generated_at_utc:new Date(now).toISOString(),records:[]};
 for(const item of records){
  if(choices[item.sport])continue;
  if(item.sport==='racing'){
   if(item.detail)choices.racing=item;
   continue;
  }
  let key, home, away;
  if(item.sport==='football'){
   const identity=football.events.get(item.fixtureKey)?.identity;
   if(!identity)continue;
   key=league[identity[0]];[,home,away]=identity;
  }else if(item.detail?.participants){
   if(item.sport==='tennis'&&item.detail.competition==='ATP · Nitto ATP Finals')key='tennis_atp_finals';
   else if(item.sport==='nfl')key='americanfootball_nfl';
   [home,away]=item.detail.participants.map(([,name])=>name);
  }
  if(!key)continue;
  choices[item.sport]=item;
  controlled.records.push({sport_key:key,event_id:String(controlled.records.length+1).repeat(24),start_utc:item.startUTC,
   home,away,market:'h2h',bookmaker:'skybet',prices:{home:2.83,away:2.17,...(item.sport==='football'?{draw:3.5}:{})},
   observed_at_utc:new Date(now-1000).toISOString(),checked_at_utc:new Date(now).toISOString(),receipt_sha256:'a'.repeat(64),
   source_url:'https://api.the-odds-api.com/v4/sports/'+key+'/odds?bookmakers=skybet&markets=h2h&oddsFormat=decimal&dateFormat=iso'});
 }
 const document=live?await read('work/current-odds.json'):controlled;
 const join=input=>sources.providerPrices(sources.currentOdds(input,now),records,football,now);
 const matched=join(document);
 if(!live){
  assert.equal(matched.size,3);
  for(const edit of [
   r=>({...r,home:r.away,away:r.home}),r=>({...r,start_utc:new Date(Date.parse(r.start_utc)+1000).toISOString()}),
   r=>({...r,observed_at_utc:new Date(now-31*60000).toISOString()}),r=>({...r,bookmaker:'unknown'}),
   r=>({...r,prices:{home:2}}),r=>({...r,source_url:r.source_url+'&apiKey=secret'})
  ])assert.equal(join({...controlled,records:controlled.records.map(edit)}).size,0);
  assert.equal(join({...controlled,records:controlled.records.flatMap(r=>[r,r])}).size,0);
 }
 const template=await fs.readFile(path.join(root,'index.html'),'utf8');
 const published=renderCurrentOdds(template,document,{dashboard,expanded,other},now);
 const republished=renderCurrentOdds(published.html,document,{dashboard,expanded,other},now);
 assert.equal(republished.count,published.count,'Repeated builds must preserve exact current matches.');
 assert.equal(republished.html,published.html,'Repeated builds must not duplicate stored price sections.');
 const servedHTML=live&&!deployed?await fs.readFile(path.join(root,'work/public-price-preview/site/index.html'),'utf8'):published.html;
 assert.equal(servedHTML,published.html,'The built page must still match the current accepted receipts.');
 assert.equal(published.count,matched.size);
 if(!live){
  assert.equal(renderCurrentOdds(template,document,{dashboard,expanded,other},now+31*60000).count,0);
  assert(!published.html.includes('api.the-odds-api.com/v4/sports'));
  assert(!published.html.includes('receipt_sha256'));
  assert(!published.html.includes('work/current-odds.json'));
  for(const {event_id,receipt_sha256} of controlled.records){
   assert(!published.html.includes(event_id));
   assert(!published.html.includes(receipt_sha256));
  }
 }
 const server=http.createServer(async(req,res)=>{
  try{
   const pathname=new URL(req.url,'http://localhost').pathname;
   const site=live?path.join(root,'work/public-price-preview/site'):root;
   const file=path.resolve(site,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
   if(!file.startsWith(site+path.sep))return res.writeHead(403).end();
   res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
   if(pathname.startsWith('/work/'))return res.writeHead(404).end();
   if(pathname==='/'||pathname==='/index.html')return res.end(servedHTML);
   if(!live&&pathname==='/research-dashboard-data.json')return res.end(JSON.stringify(dashboard));
   if(!live&&pathname==='/football-expanded-data.json')return res.end(JSON.stringify(expanded));
   if(!live&&pathname==='/other-sports-data.json')return res.end(JSON.stringify(other));
   res.end(await fs.readFile(file));
  }catch{res.writeHead(404).end();}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base=deployed?'https://aurelian2483-cmd.github.io/value-watch-lab':'http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch();
 const verified=new Set();
 try{
  for(const width of (live?[820]:[1440,1180,820,390])){
   const page=await browser.newPage({viewport:{width,height:width===1180?820:width===820?1180:920},hasTouch:width!==1440});
   await page.clock.setFixedTime(new Date(now));
   await page.route(url=>url.origin!==new URL(base).origin,route=>route.abort());
   for(const sport of ['football','tennis','nfl']){
    const item=[...matched.keys()].find(row=>row.sport===sport);
    if(!item)continue;
    const params=new URLSearchParams({fsport:sport,fq:item.name.slice(0,65)});
    if(sport==='football')params.set('sport','football');
    checkpoint=sport+' fixture evidence';
    await page.goto(base+'/?'+params);
    const row=page.locator('.pro-feature-event').filter({hasText:item.name});
    const trigger=row.locator('.pro-fixture-evidence-toggle');
    await trigger.click();
    const evidence=page.locator('#'+await trigger.getAttribute('aria-controls'));
    await evidence.getByText(/Sky Bet via The Odds API/).waitFor();
    await evidence.getByText(/Checked .*Z/).waitFor();
    await evidence.getByText(/EV unavailable:/).waitFor();
    await evidence.getByText(/Observed .*Z/).waitFor();
    await evidence.getByText(/Expires .*Z/).waitFor();
    await evidence.getByText('Home '+matched.get(item)[0].prices.home.toFixed(2),{exact:true}).waitFor();
    if(sport==='football'){
     const ukDate=value=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
     await page.locator('#date-from').fill(ukDate(now));
     await page.locator('#date-to').fill(ukDate(item.startMs));
     await page.locator('#date-to').dispatchEvent('change');
    }
    if(sport==='football'){
     checkpoint='visible exact-match football price strip';
     const featuredRow=page.locator('.pro-feature-event').filter({hasText:item.name}).first();
     await featuredRow.waitFor({state:'visible',timeout:15000});
     assert(football.events.get(item.fixtureKey)?.identity,'Exact football identity is required for visible price verification.');
     for(const side of ['home','draw','away']){
      const expected=matched.get(item)[0].prices[side].toFixed(2);
      await featuredRow.getByText((side==='home'?'Home':side==='draw'?'Draw':'Away')+' '+expected,{exact:true}).waitFor();
     }
     await featuredRow.getByText('Sky Bet · 1X2',{exact:true}).waitFor();
     await featuredRow.getByText(/Observed .*checked .*EV withheld/).waitFor();
     if(!live){
      const card=page.locator('#events .desk-event-card').filter({has:page.getByRole('heading',{name:item.name,exact:true})});
      await card.locator('.live-price-pill').filter({hasText:/Sky Bet · observed/}).waitFor();
      const headings=page.locator('#events .desk-market-head');
      assert.equal(await headings.isVisible(),width>=1000);
      if(width>=1000){
       const column=await headings.locator('.desk-market-head-outcomes').boundingBox();
       const market=await card.locator('.desk-three-way').boundingBox();
       assert(Math.abs(column.x-market.x)<=1 && Math.abs(column.width-market.width)<=1);
      }
      const empty=page.locator('#events .desk-event-card').filter({hasText:'QA Football Unpriced vs QA Football Away'});
      await empty.getByText('No verified prices or model estimates',{exact:true}).waitFor();
      assert.equal(await empty.locator('.selection-price:visible').count(),0);
      const unverified=page.locator('#events .desk-event-card').filter({hasText:'QA Football Unverified vs QA Football Away'});
      await unverified.locator('[data-choice-id=home] .selection-price').filter({hasText:'50.0%'}).waitFor();
      assert.equal(await unverified.locator('.desk-market-comparison:visible').count(),0);
      for(const side of ['home','draw','away']){
       const button=card.locator('button[data-choice-id="'+side+'"]');
       const expected=matched.get(item)[0].prices[side].toFixed(2);
       await button.getByText(expected,{exact:true}).waitFor();
       const comparison=side==='home'?'50.0% model · Fair 2.00':'25.0% model · Fair 4.00';
       await button.getByText(comparison,{exact:true}).waitFor();
       assert((await button.boundingBox()).height>=44);
      }
      assert.equal(await card.locator('.desk-three-way').evaluate(grid=>grid.scrollWidth<=grid.clientWidth),true);
      await card.getByText('EV withheld',{exact:true}).waitFor();
      const disclosure=card.getByText('Research Evidence',{exact:true});
      await disclosure.focus();
      await page.keyboard.press('Enter');
      assert(await disclosure.evaluate(summary=>summary.parentElement.open));
      await page.keyboard.press('Enter');
      if(width!==1440){
       await page.locator('#paper-open').click();
       await page.locator('#slip-tabs').waitFor({state:'visible'});
       await page.keyboard.press('Escape');
       assert.equal(await page.locator('#paper-open').getAttribute('aria-expanded'),'false');
      }
      if(process.env.VW_DESK_SCREENSHOTS){
       await card.screenshot({path:path.join(process.env.VW_DESK_SCREENSHOTS,'controlled-prices-'+width+'.png')});
      }
     }

    }
    assert.equal((await page.request.get(base+'/work/current-odds.json')).status(),404);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    verified.add(sport);
   }
   if(!live&&width===390){
    await page.clock.setFixedTime(new Date(now+31*60000));
    await page.reload();
    await page.locator('.pro-feature-event').first().waitFor();
    assert.equal(await page.locator('.pro-featured .pro-fixture-evidence-toggle').filter({hasText:'Sky Bet prices'}).count(),0);
    assert.equal(await page.locator('#pro-featured-rows').getByText('Sky Bet via The Odds API',{exact:true}).count(),0);
   }
   if(!live&&width===820&&choices.racing){
    await page.goto(base+'/?'+new URLSearchParams({fsport:'racing',fq:choices.racing.name.slice(0,65)}));
    await page.locator('.pro-fixture-evidence-toggle').first().click();
    await page.getByText('Record an unverified price privately').click();
    await page.getByLabel('Market (Win, Place or Each-way)').fill('Each-way');
    await page.getByLabel('Runner',{exact:true}).fill('QA runner');
    await page.getByLabel('Decimal price',{exact:true}).fill('5');
    await page.getByLabel('HTTPS source URL').fill('https://skybet.com/horse-racing/');
    await page.getByLabel('Places paid (when applicable)').fill('3');
    await page.getByLabel('Field size (when applicable)').fill('12');
    await page.getByRole('button',{name:'Save observation now'}).click();
    await page.getByText(/Each-way also needs/).waitFor();
    await page.getByLabel('Each-way fraction (for example 1/5)').fill('1/5');
    await page.getByRole('button',{name:'Save observation now'}).click();
    await page.getByText(/Latest unverified observation/).waitFor();
    const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('value-watch-private-price-observations-v1'))[0]);
    assert.equal(stored.racingTerms.eachWayFraction,'1/5');
    assert.equal(stored.racingTerms.priceBasis,'QUOTED_WIN_LEG');
    assert.equal(stored.verification,'USER_RECORDED_UNVERIFIED');
   }
   await page.close();
  }
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
 console.log(JSON.stringify({mode:deployed?'public':live?'live':'controlled',matchedFixtures:matched.size,renderedSports:[...verified]}));
 const requiredSports=live?new Set([...matched.keys()].map(item=>item.sport)):new Set(['football','tennis','nfl']);
 assert.deepEqual([...verified].sort(),[...requiredSports].sort(),'Every sport with a matched quote must render it; unavailable live markets are not counted as failures.');
}
main().catch(error=>{
 if(live){
  const reason=error?.name==='TimeoutError'?'browser element timed out':error?.code==='ERR_ASSERTION'?'browser assertion failed':'runtime error';
  console.error('Live review incomplete at '+checkpoint+': '+reason+'. No event names or quote payload were logged.');
 }
 else console.error(error);
 process.exitCode=1;
});
