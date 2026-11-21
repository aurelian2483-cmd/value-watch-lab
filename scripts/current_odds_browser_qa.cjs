'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');
const sources = require('../pro-sources');
const core = require('../football-match/core');
const root = path.join(__dirname, '..');
const read = name => fs.readFile(path.join(root, name), 'utf8').then(JSON.parse);
const live = process.argv.includes('--live');
const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'};

async function main(){
 let [dashboard,expanded,other,racing]=await Promise.all([
  'research-dashboard-data.json','football-expanded-data.json','other-sports-data.json','racing-research-data.json'
 ].map(read));
 const now=live?Date.now():Date.parse(racing.generated_at_utc)+60000;
 if(!live){
  const gates={research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED',schema_version:1,
   generated_at_utc:new Date(now-1000).toISOString()};
  const start=new Date(now+2*3600000).toISOString();
  dashboard={...gates,upcoming_fixtures:[{league:'PL',home:'QA Football Home',away:'QA Football Away',kickoff_utc:start}]};
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
 const server=http.createServer(async(req,res)=>{
  try{
   const pathname=new URL(req.url,'http://localhost').pathname;
   const file=path.resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
   if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
   res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
   if(pathname==='/work/current-odds.json')return res.end(JSON.stringify(document));
   if(!live&&pathname==='/research-dashboard-data.json')return res.end(JSON.stringify(dashboard));
   if(!live&&pathname==='/football-expanded-data.json')return res.end(JSON.stringify(expanded));
   if(!live&&pathname==='/other-sports-data.json')return res.end(JSON.stringify(other));
   res.end(await fs.readFile(file));
  }catch{res.writeHead(404).end();}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch();
 const verified=new Set();
 try{
  for(const width of (live?[820]:[1440,820,390])){
   const page=await browser.newPage({viewport:{width,height:920},hasTouch:width!==1440});
   await page.clock.setFixedTime(new Date(now));
   await page.route(url=>url.origin!==base,route=>route.abort());
   for(const sport of ['football','tennis','nfl']){
    const item=[...matched.keys()].find(row=>row.sport===sport);
    if(!item)continue;
    await page.goto(base+'/?'+new URLSearchParams({fsport:sport,fq:item.name.slice(0,65)}));
    const row=page.locator('.pro-feature-event').filter({hasText:item.name});
    const trigger=row.locator('.pro-fixture-evidence-toggle');
    await trigger.click();
    const evidence=page.locator('#'+await trigger.getAttribute('aria-controls'));
    await evidence.getByText(/Sky Bet via The Odds API/).waitFor();
    await evidence.getByText(/Checked .*Z/).waitFor();
    await evidence.getByText(/EV unavailable:/).waitFor();
    await evidence.getByText(/home .* · implied .* · proportional no-vig/).waitFor();
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    verified.add(sport);
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
 console.log(JSON.stringify({mode:live?'live':'controlled',matchedFixtures:matched.size,renderedSports:[...verified]}));
 assert.equal(verified.size,3,'Coverage incomplete: all three sports must render a matched quote.');
}
main().catch(error=>{
 if(live)console.error('Live review incomplete. See the anonymized fixture counts; no quote payload was logged.');
 else console.error(error);
 process.exitCode=1;
});
