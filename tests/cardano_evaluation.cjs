'use strict';
const assert=require('node:assert/strict'),E=require('../cardano-lab/evaluation.js');
const row=(id,p,b,y)=>({id,probability:p,baseline_probability:b,outcome:y,dataset_split:'HOLDOUT',issued_at_utc:'2026-01-01T12:00:00Z',event_at_utc:'2026-01-02T12:00:00Z',resolved_at_utc:'2026-01-03T12:00:00Z'});
const result=E.scores([row('a',.8,.5,1),row('b',.2,.5,0)]);
assert.equal(result.sample_size,2);
assert.ok(Math.abs(result.model.brier-.04)<1e-12);
assert.ok(Math.abs(result.baseline.brier-.25)<1e-12);
assert.equal(result.improved_brier,true);
assert.equal(result.improved_log_loss,true);
assert.equal(result.validation_status,'UNVALIDATED');
assert.equal(result.publication_gate,'BLOCKED');
const cases=[
 [row('a',0,.5,1),'probability'],[row('a',1,.5,1),'probability'],
 [row('a',NaN,.5,1),'probability'],[row('a',.5,1,1),'baseline'],
 [row('a',.5,.5,2),'outcome'],[{...row('a',.5,.5,1),dataset_split:'TRAIN'},'HOLDOUT'],
 [{...row('a',.5,.5,1),issued_at_utc:'2026-01-04T12:00:00Z'},'chronology'],
 [{...row('a',.5,.5,1),issued_at_utc:'bad'},'chronology'],
 [{...row('a',.5,.5,1),resolved_at_utc:'2026-01-01T12:00:00Z'},'chronology']
];
for(const [bad,label] of cases)assert.throws(()=>E.scores([bad]),undefined,'reject '+label);
assert.throws(()=>E.scores([row('a',.5,.5,1),row('a',.5,.5,0)]),/duplicate/);
assert.throws(()=>E.scores([]),/Nonempty/);
const worse=E.scores([row('a',.1,.7,1),row('b',.9,.3,0)]);
assert.equal(worse.improved_brier,false);
console.log('PASS Cardano holdout evaluation and negative cases');
