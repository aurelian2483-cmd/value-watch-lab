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
]) assert.equal(markets([{...capture,benchmark:{...capture.benchmark,...invalid}}]).matches.length,0,JSON.stringify(invalid));

assert.equal(markets([{...capture,snapshot_at_utc:stamp('20:00')}],index,Date.parse(stamp('21:00'))).matches.length,0);
assert.equal(markets([capture],index,Date.parse(stamp('17:59'))).matches.length,0);
assert.equal(markets([{...capture,market:'FOOTBALL_EXTRA_TIME_1X2'}]).matches.length,0);
assert.equal(markets([capture,{...capture,benchmark:{...capture.benchmark,prices:{home:3,draw:4,away:5}}}]).matches.length,0);
const another = {...fixture,espn_event_id:'102',kickoff_utc:stamp('22:00')};
assert.equal(markets([capture,{...capture,event_id:eventID(another),start_utc:another.kickoff_utc}],
  evidence.fixtureIndex([feed([fixture,another])],now)).matches.length,0);
const archive = require('../research/football-baseline-v1/608-reconstructed-forecasts.json');
assert.equal(evidence.historicalRows(archive).length,608);
assert.equal(evidence.historicalRows({...archive,meta:{...archive.meta,validated:true}}).length,0);
assert.equal(evidence.historicalRows({...archive,rows:[archive.rows[0],archive.rows[0],archive.rows[0]]}).length,0);
for (const file of ['index.html','paper-lab/index.html']) assert.match(fs.readFileSync(file,'utf8'),/journal\.js\?v=3/);
assert.doesNotMatch(fs.readFileSync('football-match/app.js','utf8'),/localStorage|sessionStorage/);
console.log('PASS: exact football identity, reschedules, ambiguous providers, cutoff, complete markets, reconstruction and journal compatibility');
