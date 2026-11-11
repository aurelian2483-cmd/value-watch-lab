'use strict';
const assert=require('node:assert/strict'),T=require('../cardano-lab/temporal-backtest.js');
const row=(id,fold,day,p,y)=>({id,event_id:'match-'+id,fold_id:fold,probability:p,baseline_probability:.5,outcome:y,dataset_split:'HOLDOUT',training_cutoff_utc:'2025-12-01T00:00:00Z',issued_at_utc:'2026-01-'+String(day).padStart(2,'0')+'T09:00:00Z',event_at_utc:'2026-01-'+String(day).padStart(2,'0')+'T12:00:00Z',resolved_at_utc:'2026-01-'+String(day).padStart(2,'0')+'T15:00:00Z'});
const good=[row('b','fold2',8,.7,1),row('a','fold1',2,.8,1)];
const result=T.evaluate(good,{min_fold_size:2});
assert.equal(result.fold_count,2);
assert.equal(result.folds[0].fold_id,'fold1');
assert.equal(result.insufficient_sample,true);
assert.equal(result.aggregate.sample_size,2);
assert.equal(result.publication_gate,'BLOCKED');
const invalid=[
 [{...good[0],training_cutoff_utc:'2026-01-09T00:00:00Z'},good[1]],
 [{...good[0],event_id:'match-a'},good[1]],
 [{...good[0],fold_id:'fold1'},good[1]],
 [{...good[0],fold_id:'bad id'},good[1]],
 [{...good[0],dataset_split:'TRAIN'},good[1]],
 [{...good[0],issued_at_utc:'2026-01-09T09:00:00Z'},good[1]]
];
for(const records of invalid)assert.throws(()=>T.evaluate(records));
assert.throws(()=>T.evaluate([]),/Nonempty/);
assert.throws(()=>T.evaluate(good,{min_fold_size:0}),/min_fold_size/);
console.log('PASS Cardano temporal fold audit and negative cases');
