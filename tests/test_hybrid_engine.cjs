'use strict';
const assert = require('node:assert/strict');
const { evaluate } = require('../paper-lab/hybrid.js');

const now = Date.parse('2026-11-19T09:00:00Z');
const observed = '2026-11-19T08:50:00Z';
const start = '2026-11-19T18:00:00Z';
const hash = 'a'.repeat(64);
const event = {id:'fixture',sport:'football',startUTC:start,observedAt:observed,seasonComparison:{
  method:'CURRENT_SEASON_POISSON_COMPARISON_V1', unvalidated:true,research_only:true,publication_gate:'BLOCKED',
  home_venue_matches:4,away_venue_matches:5,prob_home:0.55,prob_draw:0.25,prob_away:0.20,odds:null,expected_value:null,
  cutoff_utc:start,training_sha256:hash,source_receipts:[{url:'https://example.org/results',sha256:hash,observed_at_utc:observed}]
}};
const data = {schema_version:1,records:[{event_id:event.id,start_utc:start,market:'FOOTBALL_90_MINUTE_1X2',
  benchmark:{source:'https://example.net/market',source_id:'INDEPENDENT',verified:true,observed_at_utc:observed,prices:{home:2,draw:4,away:4}},
  sky_bet:{source:'https://skybet.com/qa',source_id:'SKY_BET',verified:true,observed_at_utc:observed,prices:{home:2.3,draw:3,away:4}}
}]};

const actual = evaluate(event,data,now);
assert.equal(actual.publication_gate,'BLOCKED');
assert.equal(actual.model_validation,'UNVALIDATED');
assert.equal(actual.selection.id,'home');
assert.deepEqual(actual.probabilities,[0.525,0.25,0.225]);
assert(Math.abs(actual.selection.estimatedEV - 0.2075) < 1e-9);
assert.equal(evaluate(event,null,now).probabilities,null);
assert.equal(evaluate({ ...event, sport:'racing' },data,now).probabilities,null);
assert.equal(evaluate(event,data,Date.parse(start)).probabilities,null);
assert.equal(evaluate({ ...event, seasonComparison:null },data,now).probabilities,null);
assert.equal(evaluate(event,{...data,records:[...data.records,...data.records]},now).probabilities,null);
for (const change of [
  row => row.event_id = 'different',
  row => row.start_utc = observed,
  row => row.market = 'EXTRA_TIME',
  row => row.benchmark.prices.draw = null,
  row => row.benchmark.source = 'https://sports.skybet.com/qa',
  row => row.benchmark.observed_at_utc = '2026-11-19T08:00:00Z',
  row => row.benchmark.verified = false
]) {
  const copy = structuredClone(data);
  change(copy.records[0]);
  assert.equal(evaluate(event,copy,now).probabilities,null);
}
for (const change of [
  row => delete row.sky_bet,
  row => row.sky_bet.verified = false,
  row => row.sky_bet.observed_at_utc = '2026-11-19T08:49:59Z',
  row => row.sky_bet.prices.home = 5.1
]) {
  const copy = structuredClone(data);
  change(copy.records[0]);
  const result = evaluate(event,copy,now);
  assert.deepEqual(result.probabilities,actual.probabilities);
  assert.equal(result.selection,null);
}

const captures = require('../paper-lab/hybrid-market-data.json');
const captured = captures.records.find(row => row.sky_bet?.source_event_id === '36289930');
const when = Date.parse(captured.snapshot_at_utc);
const fixture = {id:captured.event_id,sport:'football',startUTC:captured.start_utc,
  observedAt:captured.frozen_model.observed_at_utc,seasonComparison:captured.frozen_model.comparison};
const capturedResult = evaluate(fixture,captures,when);
assert.equal(capturedResult.checkedBothMarkets,true);
assert.equal(capturedResult.selection,null);
const { capturedComparison } = require('../paper-lab/hybrid.js');
assert.equal(capturedComparison(fixture,captures,when),null);
const later = when + 40 * 60000;
assert.equal(evaluate(fixture,captures,later).probabilities,null);
const archived = capturedComparison({...fixture,seasonComparison:null},captures,later);
assert.deepEqual(archived.probabilities,capturedResult.probabilities);
assert.equal(archived.hadCandidate,false);
assert.equal(capturedComparison({...fixture,id:'wrong'},captures,later),null);
