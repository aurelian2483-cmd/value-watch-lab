'use strict';
const assert=require('node:assert/strict'),M=require('../cardano-lab/multiclass-evaluation.js');
const row=(id,probabilities,baseline_probabilities,actual_outcome)=>({id,outcomes:['HOME','DRAW','AWAY'],actual_outcome,probabilities,baseline_probabilities,dataset_split:'HOLDOUT',issued_at_utc:'2026-01-01T12:00:00Z',event_at_utc:'2026-01-02T12:00:00Z',resolved_at_utc:'2026-01-03T12:00:00Z'});
const good=M.evaluate([row('a',[.8,.1,.1],[.34,.33,.33],'HOME'),row('b',[.1,.8,.1],[.34,.33,.33],'DRAW')]);
assert.equal(good.sample_size,2);
assert.ok(Math.abs(good.model.brier-.06)<1e-12);
assert.ok(good.delta_log_loss<0);
assert.equal(good.model_validation,'UNVALIDATED');assert.equal(good.publication_gate,'BLOCKED');
const bads=[
 {...row('a',[.8,.1,.1],[.34,.33,.33],'HOME'),dataset_split:'TRAIN'},
 {...row('a',[.8,.1,.1],[.34,.33,.33],'HOME'),actual_outcome:'UNKNOWN'},
 {...row('a',[.8,.1,.1],[.34,.33,.33],'HOME'),outcomes:['HOME','HOME','AWAY']},
 row('a',[.8,.1,.2],[.34,.33,.33],'HOME'),
 row('a',[0,.5,.5],[.34,.33,.33],'HOME'),
 row('a',[NaN,.5,.5],[.34,.33,.33],'HOME'),
 {...row('a',[.8,.1,.1],[.34,.33,.33],'HOME'),issued_at_utc:'2026-01-04T12:00:00Z'},
 {...row('a',[.8,.1,.1],[.34,.33,.33],'HOME'),resolved_at_utc:'2026-01-01T12:00:00Z'}
];
for(const r of bads)assert.throws(()=>M.evaluate([r]));
assert.throws(()=>M.evaluate([row('a',[.8,.1,.1],[.34,.33,.33],'HOME'),row('a',[.8,.1,.1],[.34,.33,.33],'HOME')]),/duplicate/);
assert.throws(()=>M.evaluate([]),/Nonempty/);
const worse=M.evaluate([row('a',[.1,.1,.8],[.34,.33,.33],'HOME')]);assert.equal(worse.improved_brier,false);
console.log('PASS Cardano multiclass holdout evaluation and negative tests');
