import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildRollingHistoryView} from './rolling-history.mjs';

const root=new URL('../../',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
const input={
  currentFootball:JSON.parse(read('historical-reliability-data.json')),
  reconstructedFootball:JSON.parse(read('research/football-baseline-v1/608-reconstructed-forecasts.json')),
  darts:JSON.parse(read('darts/feed.json')),
  ledger:JSON.parse(read('prediction-ledger.json')),
  refreshWorkflowText:read('.github/workflows/reliability-results-refresh.yml'),
  asOfUTC:'2026-11-23T22:30:00Z'
};
const run=data=>buildRollingHistoryView(data??input);
test('one rolling view retains 2026/27 results including the previous week',()=>{
  const r=run();
  assert.equal(r.source_counts['historical-reliability-data.json'],782);
  assert.equal(r.source_counts['research/football-baseline-v1/608-reconstructed-forecasts.json'],608);
  assert.equal(r.source_counts['darts/feed.json'],80);
  assert.equal(r.recent_completed_last_7_full_days,48);
  assert.equal(r.recent_completed_by_sport.football,48);
  assert.equal(r.historical_results_by_sport.football,1390);
  assert.equal(r.historical_results_by_sport.darts,80);
});
test('do not conflate current-season source results with retrospectively rebuilt estimates',()=>{
 const r=run();
 const recent=r.events.find(x=>x.source_dataset==='historical-reliability-data.json');
 const older=r.events.find(x=>x.source_dataset.startsWith('research/football-baseline-v1'));
 assert.equal(recent.evidence_tier,'SOURCE_REPORTED_UNVERIFIED');
 assert.equal(recent.history_season,'2026/27');
 assert.equal(older.evidence_tier,'RETROSPECTIVE_RECONSTRUCTED_NOT_AS_ISSUED');
 assert.equal(older.competition,null);
});
test('never use date-only yesterday results until following midnight UTC',()=>{
  const r=run({...input,asOfUTC:'2026-11-22T23:59:59Z'});
  assert(r.quarantined_future_or_same_day.length>0);
  assert(!r.events.some(x=>x.result_day_utc==='2026-11-22'));
  assert(r.events.every(x=>Date.parse(x.training_available_after_utc)<=Date.parse(r.as_of_utc)));
});
test('football last week is explicitly present, not treated as missing prospective finals',()=>{
  const r=run();
  const lastWeek=r.events.filter(x=>x.history_season==='2026/27'&&
    x.result_day_utc>='2026-11-16'&&x.result_day_utc<='2026-11-22');
  assert.equal(lastWeek.length,48);
  assert.equal(r.frozen_forecast_receipts,74);
  assert.equal(r.selected_method,null);
  assert.equal(r.publication_gate,'BLOCKED');
});
test('actual football scores must agree with outcome labels',()=>{
 const x=structuredClone(input);
 x.currentFootball.results[0].actual_outcome='INVALID';
 assert.throws(()=>run(x),/Invalid current-season historical result/);
});
test('duplicate source-specific events fail instead of inflating counts',()=>{
 const x=structuredClone(input);
 x.currentFootball.results.push(structuredClone(x.currentFootball.results[0]));
 assert.throws(()=>run(x),/Duplicate source-specific historical result identity/);
});
test('bad source provenance or release gates fail closed',()=>{
 const x=structuredClone(input);
 x.currentFootball.publication_gate='OPEN';
 assert.throws(()=>run(x),/Current-season history source contract invalid/);
 const y=structuredClone(input);
 y.refreshWorkflowText='fake workflow';
 assert.throws(()=>run(y),/refresh contract not detected/);
});
test('read-only view is deterministic with no source mutation',()=>{
 const snapshot=JSON.stringify(input);
 assert.deepEqual(run(),run());
 assert.equal(JSON.stringify(input),snapshot);
});
