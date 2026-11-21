'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const evidence = require('../football-match/core');
const stamp = hour => '2026-11-20T' + hour + ':00Z';
const now = Date.parse(stamp('18:30'));
const fixture = { league:'D1', home:'Home', away:'Away', espn_event_id:'101', kickoff_utc:stamp('20:00') };
const gates = {schema_version:1,research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED'};
const feed = (rows, time = stamp('17:00')) => ({...gates,generated_at_utc:time,upcoming_fixtures:rows});
const eventID = row => JSON.stringify(['football',JSON.stringify([row.league,row.home,row.away]),row.kickoff_utc]);
const capture = {
  event_id:eventID(fixture), start_utc:fixture.kickoff_utc, market:'FOOTBALL_90_MINUTE_1X2',
  snapshot_at_utc:stamp('18:00'),
  benchmark:{
    source:'https://www.goldedge.net/odds/football/home-away-abc123',
    source_event_id:'abc123', source_team_names:['Home','Away'], source_id:'PINNACLE_VIA_GOLDEDGE',
    source_sha256:'a'.repeat(64), verified:true, observed_at_utc:stamp('17:50'),
    captured_at_utc:stamp('18:00'), http_date_utc:stamp('18:00'),
    timestamp_basis:'GOLDEDGE_PINNACLE_1X2_OBSERVATION_TIME', prices:{home:2,draw:3,away:4}
  }
};
const index = evidence.fixtureIndex([feed([fixture])], now);
const markets = (records, fixtures = index, asOf = now) => evidence.verifyMarkets({schema_version:1,records}, fixtures, asOf);
assert.equal(index.espn.get('101'), 'espn:101');
assert.equal(markets([capture]).matches[0].sources.length,1);
const moved = {...fixture,kickoff_utc:stamp('21:00')};
const rescheduled = evidence.fixtureIndex([feed([fixture]),feed([moved],stamp('18:00'))],now);
assert.equal(rescheduled.events[0].id,index.events[0].id);
assert.equal(rescheduled.events[0].start,Date.parse(moved.kickoff_utc));
assert.equal(rescheduled.events[0].marketCutoff,Date.parse(fixture.kickoff_utc));
assert.equal(markets([capture],rescheduled).matches.length,0);
assert.equal(evidence.fixtureIndex([feed([fixture,moved])],now).events.length,0);
assert.equal(evidence.fixtureIndex([feed([fixture,{...fixture,away:'Different team'}])],now).events.length,0);
assert.equal(evidence.fixtureIndex([feed([fixture,{...fixture,espn_event_id:'102'}])],now).events.length,0);
const noProvider = evidence.fixtureIndex([undefined,feed([{...fixture,espn_event_id:null}])],now);
assert.match(noProvider.events[0].id,/^fixture:/);
assert.equal(noProvider.espn.size,0);
assert.equal(evidence.fixtureIndex([feed([fixture],stamp('19:00'))],now).events.length,0);

for (const invalid of [
  {source_team_names:['Away','Home']}, {source_event_id:'another'}, {source_sha256:'invalid'},
  {observed_at_utc:stamp('17:20')}, {observed_at_utc:stamp('18:10')},
  {captured_at_utc:stamp('20:00')}, {http_date_utc:stamp('19:00')},
  {prices:{home:2,away:4}}, {prices:{home:2,draw:3,away:4,extra:5}},
  {market:'SECOND_HALF_RESULT'}, {settlement_period:'EXTRA_TIME'},
  {start_utc:stamp('21:00')}, {source:'https://goldedge.net.example.org/odds/football/abc123'}
]) {
  const rejected = markets([{...capture,benchmark:{...capture.benchmark,...invalid}}]);
  assert.equal(rejected.matches.flatMap(match => match.sources).length,0,JSON.stringify(invalid));
  assert(rejected.withheldReasons.length > 0,JSON.stringify(invalid));
}

assert.equal(markets([{...capture,snapshot_at_utc:stamp('20:00')}],index,Date.parse(stamp('21:00'))).matches.flatMap(match => match.sources).length,0);
assert.equal(markets([capture],index,Date.parse(stamp('17:59'))).matches.flatMap(match => match.sources).length,0);
assert.equal(markets([{...capture,market:'FOOTBALL_EXTRA_TIME_1X2'}]).matches.length,0);
const conflictingQuotes = markets([capture,{...capture,benchmark:{...capture.benchmark,prices:{home:3,draw:4,away:5}}}]);
assert.equal(conflictingQuotes.matches.flatMap(match => match.sources).length,0);
assert(conflictingQuotes.withheldReasons.some(item => item.reason.includes('Conflicting prices')));
const repeated = {...capture,snapshot_at_utc:stamp('18:10'),benchmark:{
  ...capture.benchmark,source_sha256:'c'.repeat(64),observed_at_utc:stamp('18:05'),
  captured_at_utc:stamp('18:10'),http_date_utc:stamp('18:10'),
  prices:{home:1.9,draw:3.2,away:4.2}
}};
const repeatedResult = markets([capture,repeated]);
const sourceHistory = repeatedResult.matches[0].sourceHistories[0];
assert.equal(sourceHistory.observationCount,2);
assert.equal(sourceHistory.earliest.prices.home,2);
assert.equal(sourceHistory.latest.prices.home,1.9);
assert.equal(sourceHistory.movementAvailable,true);
assert(Math.abs(sourceHistory.movement.home.decimal + .1) < 1e-12);
assert.equal(sourceHistory.openingPriceAvailable,false);
assert(Math.abs(sourceHistory.latest.metrics.overround - (1/1.9 + 1/3.2 + 1/4.2 - 1)) < 1e-12);
const deduplicated = markets([capture,capture]).matches[0].sourceHistories[0];
assert.equal(deduplicated.observationCount,1);
assert.equal(deduplicated.movementAvailable,false);
assert.equal(deduplicated.latest.metrics.overround,1/2+1/3+1/4-1);

const skyQuote = {
  source:'https://skybet.com/football/division/home-v-away/e-101',
  source_event_id:'101',source_market_id:'ppb:sbkMarket:1.1',source_id:'SKY_BET',
  source_sha256:'d'.repeat(64),verified:true,observed_at_utc:stamp('17:50'),
  captured_at_utc:stamp('17:50'),http_date_utc:stamp('17:50'),
  source_team_names:['Home','Away'],executable_verified:false,
  timestamp_basis:'DIRECT_SKY_BET_HTTP_OBSERVATION_TIME',
  prices:{home:2.1,draw:3.1,away:4.1}
};
const skyRecord = {...capture,sky_bet:skyQuote};
const skyLater = {...skyRecord,snapshot_at_utc:stamp('18:10'),sky_bet:{
  ...skyQuote,source_market_id:'ppb:sbkMarket:2.2',source_sha256:'e'.repeat(64),
  observed_at_utc:stamp('18:05'),captured_at_utc:stamp('18:05'),http_date_utc:stamp('18:05'),
  prices:{home:2.2,draw:3.2,away:4.2}
}};
const marketIdConflict = markets([skyRecord,skyLater]);
assert.equal(marketIdConflict.matches.flatMap(match => match.sources).filter(source => source.sourceId === 'SKY_BET').length,0);
assert(marketIdConflict.withheldReasons.some(item => item.reason.includes('market identity changed')));

const another = {...fixture,espn_event_id:'102',kickoff_utc:stamp('22:00')};
assert.equal(markets([capture,{...capture,event_id:eventID(another),start_utc:another.kickoff_utc}],
  evidence.fixtureIndex([feed([fixture,another])],now)).matches.length,0);
const inputReceipt = {url:'https://example.org/training.csv',sha256:'b'.repeat(64),observed_at_utc:stamp('16:00')};
const estimate = {...fixture,...gates,model:'QA_POISSON',prob_home:.806,prob_draw:.135,prob_away:.059,
  cutoff_utc:stamp('16:00'),source_receipts:[inputReceipt]};
const candidates = [
  {...estimate,cutoff_utc:undefined},
  {...estimate,cutoff_utc:'not a timestamp'},
  {...estimate,cutoff_utc:'2026-02-30T15:00:00Z'},
  {...estimate,cutoff_utc:stamp('21:00')},
  {...estimate,cutoff_utc:stamp('17:01')},
  {...estimate,source_receipts:[]},
  {...estimate,source_receipts:[{...inputReceipt,observed_at_utc:stamp('17:01')}]},
  estimate
];
const modelFeed = {...feed([fixture]),experimental_model_forecasts:candidates};
const classified = evidence.fixtureIndex([modelFeed],now).events[0].models;
assert.deepEqual(classified.map(model => model.cutoffReason),[
  'Explicit training cutoff is missing.','Explicit training cutoff is invalid.','Explicit training cutoff is invalid.',
  'Training cutoff is later than the earliest known kickoff.','Training cutoff is later than the recorded model observation.',
  'Training source receipts are missing.','Training source receipt 1 was observed after the explicit training cutoff.',null
]);
assert.deepEqual(classified.filter(model => model.cutoffReason === null).map(model => model.row),[estimate]);
classified.forEach((model,index) => assert.equal(model.row,candidates[index],'Keep original probability and provenance object'));
for (const [timestamp, expected] of [
  ['2026-11-20T15:59:59.999999Z',null],
  ['2026-11-20T17:00:00+01:00',null],
  ['2026-11-20T16:00:00.000001Z','was observed after the explicit training cutoff.'],
  [stamp('16:01'),'was observed after the explicit training cutoff.'],
  [stamp('17:00'),'was observed after the explicit training cutoff.'],
  [undefined,'is missing its observation timestamp.'],
  ['','is missing its observation timestamp.'],
  ['2026-11-20T16:00:00','has an invalid observation timestamp.'],
  ['2026-02-30T16:00:00Z','has an invalid observation timestamp.']
]) {
  const row = {...estimate,source_receipts:[inputReceipt,{...inputReceipt,observed_at_utc:timestamp}]};
  const [checked] = evidence.fixtureIndex([{...modelFeed,experimental_model_forecasts:[row]}],now).events[0].models;
  assert.equal(checked.cutoffReason,expected === null ? null : 'Training source receipt 2 ' + expected);
  assert.equal(checked.row,row);
}
const movedEstimate = {...estimate,kickoff_utc:moved.kickoff_utc,cutoff_utc:stamp('20:30')};
const modelAfterMove = evidence.fixtureIndex([feed([fixture]),{
  ...feed([moved],stamp('18:00')),experimental_model_forecasts:[movedEstimate,{...movedEstimate,cutoff_utc:stamp('16:00')}]
}],now).events[0];
assert.deepEqual(modelAfterMove.models.map(model => model.cutoffReason),[
  'Training cutoff is later than the earliest known kickoff.',null
]);
const frozen = {observed_at_utc:stamp('17:40'),comparison:{...estimate,
  method:'CURRENT_SEASON_POISSON_COMPARISON_V1',unvalidated:true,training_sha256:'c'.repeat(64)}};
const eligibleFrozen = {...frozen,observed_at_utc:stamp('17:40'),comparison:{
  ...estimate,method:'CURRENT_SEASON_POISSON_COMPARISON_V1',unvalidated:true,
  training_sha256:'c'.repeat(64),cutoff_utc:stamp('16:00'),source_receipts:[inputReceipt]
}};
const eligibleMarket = markets([{...capture,frozen_model:eligibleFrozen}]).matches[0];
assert.equal(eligibleMarket.model.cutoffReason,null);
assert.equal(markets([{...capture,frozen_model:frozen}]).matches[0].model.cutoffReason,null);
assert.equal(markets([{...capture,frozen_model:{...frozen,comparison:{...frozen.comparison,source_receipts:null}}}])
  .matches[0].model.cutoffReason,'Training source receipts are missing.');

assert.equal(markets([{...capture,frozen_model:{...frozen,comparison:{...frozen.comparison,
  source_receipts:[{...inputReceipt,observed_at_utc:stamp('16:01')}]}}}])
  .matches[0].model.cutoffReason,'Training source receipt 1 was observed after the explicit training cutoff.');
const archive = require('../research/football-baseline-v1/608-reconstructed-forecasts.json');
assert.equal(evidence.historicalRows(archive).length,608);
assert.equal(evidence.historicalRows({...archive,meta:{...archive.meta,validated:true}}).length,0);
assert.equal(evidence.historicalRows({...archive,rows:[archive.rows[0],archive.rows[0],archive.rows[0]]}).length,0);
for (const file of ['index.html','paper-lab/index.html']) assert.match(fs.readFileSync(file,'utf8'),/journal\.js\?v=3/);
assert.doesNotMatch(fs.readFileSync('football-match/app.js','utf8'),/localStorage|sessionStorage/);
const history = require('../football-match/history');
const premier = history.archiveMatches(archive);
assert.equal(premier.length,608);
const city = {identity:['PL','Manchester City','Fulham'],marketCutoff:Date.parse(stamp('20:00'))};
const cityHistory = history.matchHistory(city,premier);
assert(cityHistory.home.length > cityHistory.homeVenue.length);
assert(cityHistory.away.length > cityHistory.awayVenue.length);
assert(cityHistory.meetings.length > 0);
assert(cityHistory.home.every(row => row.day < '2026-11-20'));
const historicView = history.matchHistory({identity:['PL',archive.rows[0].home,archive.rows[0].away],
  row:archive.rows[0],archived:true},premier);
assert(historicView.home.every(row => row.day < archive.rows[0].date));
const expanded = require('../football-expanded-data.json');
const firstFinal = expanded.performance.entries[0];
const results = entries => history.competitionMatches({...expanded,performance:{entries}});
assert.equal(results([firstFinal,firstFinal]).length,1);
assert.equal(results([firstFinal,{...firstFinal,score_home:firstFinal.score_home + 1},firstFinal]).length,0);
assert.equal(results([{...firstFinal,source_receipts:[firstFinal.source_receipts[0]]}]).length,0);
assert.equal(history.matchHistory({...city,identity:['UCL','Manchester City','Fulham']},premier).count,0);
const discovery = require('../football-match/discovery');
const nearMidnight = {start:Date.parse('2026-06-15T23:30:00Z'),exact:'one'};
assert.equal(discovery.day(nearMidnight,false),'2026-06-16');
assert.equal(discovery.groupFixtures([nearMidnight,{start:nearMidnight.start+120000}],false).size,1);
assert.equal(discovery.status(nearMidnight,nearMidnight.start-1,new Map([['one',{}]]),false),'scheduled');
assert.equal(discovery.status(nearMidnight,nearMidnight.start,new Map(),false),'elapsed');
assert.equal(discovery.status(nearMidnight,nearMidnight.start,new Map([['one',{}]]),false),'final');
assert.equal(discovery.status(nearMidnight,nearMidnight.start,new Map(),true),'archived');
const checkedFinal = results([firstFinal])[0];
assert.equal(checkedFinal.exact, JSON.stringify([firstFinal.league,firstFinal.home,firstFinal.away,new Date(firstFinal.kickoff_utc).toISOString()]));
const stored = new Map([['journal','keep']]);
const storage = () => ({getItem:key => stored.get(key),setItem:(key,value) => stored.set(key,value)});
assert(discovery.saveFavourites(new Set(['PL','D1','<bad>']),storage));
assert.deepEqual([...discovery.readFavourites(storage)],['PL','D1']);
assert.equal(stored.get('journal'),'keep');
const blocked = () => {throw new Error('Storage denied');};
assert.equal(discovery.saveFavourites(new Set(['PL']),blocked),false);
assert.equal(discovery.readFavourites(blocked).size,0);
console.log('PASS: exact football identity, reschedules, ambiguous providers, cutoff, complete markets, reconstruction and journal compatibility');
