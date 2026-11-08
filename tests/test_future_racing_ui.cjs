'use strict';
const assert=require('node:assert/strict');
const E=require('../paper-lab/engine.js');
const now=Date.parse('2026-11-08T20:00:00Z');
const row={race_id:'synthetic',racecourse:'Test Course',name:'Synthetic Test Hurdle',startUTC:'2026-11-09T13:00:00Z',
  source:'https://www.sportinglife.com/racing/racecards/2026-11-09/test-course/racecard/synthetic/test',
  observedAtUTC:'2026-11-08T19:59:00Z',runner_source:'https://www.sportinglife.com/racing/meeting/2026-11-09/test-course/12',
  runner_source_sha256:'a'.repeat(64),runner_observed_at_utc:'2026-11-08T19:59:00Z',race_stage:'DORMANT',
  runner_data_status:'SINGLE_SOURCE_RUNNERS_OBSERVED',active_runner_count:2,
  runners:[1,2].map(i=>({horse_id:String(i),name:'Test Horse '+i,runner_status:'RUNNER',active_runner:true,previous_results:[]}))};
const document={schema_version:1,research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED',generated_at_utc:'2026-11-08T19:59:00Z',races:[row]};
const normalize=d=>E.normalizeFeeds([{kind:'racing-future',path:'racing-future-data.json',document:d}],now);
const events=normalize(document);
assert.equal(events.length,1);assert.equal(events[0].choices.length,2);
assert.equal(events[0].choices[0].label,'Test Horse 1');assert.equal(events[0].model,null);
assert.equal(events[0].status.selectable,false);assert.equal(events[0].choices[0].quote,null);
assert.equal(E.statusOf(events[0],now+31*60000).selectable,false);
assert.equal(normalize({...document,publication_gate:'OPEN'}).length,0);
const pending=normalize({...document,races:[{...row,runner_data_status:'RUNNER_FIELD_UNCONFIRMED',runners:[]}]});
assert.equal(pending[0].futureScheduleOnly,true);assert.equal(pending[0].status.selectable,false);
console.log('Future meeting cards retain named runners, source receipts, freshness and blocked publication gates');
