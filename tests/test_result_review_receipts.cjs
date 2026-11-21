'use strict';
const assert = require('node:assert/strict');
const {reviewReceipts} = require('../validation-centre/core');
const inputs = [
  require('../research/result-review-status.json'), require('../prediction-ledger.json'),
  require('../research/provider-result-observations.json'), require('../research/secondary-result-evidence.json')
];
// Replay the checked-in receipt set at its own publication time.
const now = Date.parse(inputs[0].generated_at_utc);
assert(Number.isFinite(now), 'The receipt queue needs a publication timestamp');
const review = (args=inputs, at=now) => reviewReceipts(...args,at);
const baseline = review();
const ready = inputs[0].items.filter(row=>row.review_state==='READY_FOR_HUMAN_REVIEW');
const identities = rows=>rows.map(row=>row.sport+':'+(row.eventId ?? row.event_id)).sort();
assert(ready.some(row=>row.sport==='tennis') && ready.some(row=>row.sport==='nfl'));
assert.deepEqual(identities(baseline.matches),identities(ready));
assert.equal(baseline.withheld,0);
assert.equal(baseline.stale,false);
assert.equal(review(inputs,now+4*86400000).stale,true);
assert.equal(review(inputs,now-1).matches.length,0);
for(const index of [0,1,2,3]){
  const copy=inputs.slice();
  copy[index]=null;
  const result=review(copy);
  assert.equal(result.matches.length,0);
  assert(result.reason);
}
for(const mutate of [
  (a,b,r,p)=>{ b.sport='tennis'; },
  (a,b,r,p)=>{ a.event_id='nfl-0'; },
  (a,b,r,p)=>{ r.event_start_utc='2026-11-17T01:16:00Z'; },
  (a,b,r,p)=>{ r.observed_score.home++; },
  (a,b,r,p)=>{ b.participant_ids=[b.participant_ids[0],b.participant_ids[0]]; },
  (a,b,r,p)=>{ b.actual_outcome='tie'; },
  (a,b,r,p)=>{ a.source_observed_at_utc=p.event_start_utc; },
  (a,b,r,p)=>{ b.observed_at_utc=b.observed_at_utc.replace('Z',''); },
  (a,b,r,p)=>{ b.source_url='https://github.com/unreviewed.csv'; },
  (a,b,r,p)=>{ a.provider_response_sha256='unknown'; },
  (a,b,r,p,set)=>{ set[3].observations.push({...b}); },
  (a,b,r,p,set)=>{ set[1].records.push({...p}); },
  (a,b,r,p,set)=>{ set[0].items.push({...r}); }
]){
  const copy=structuredClone(inputs);
  const row=copy[0].items.find(row=>row.sport==='nfl'&&row.review_state==='READY_FOR_HUMAN_REVIEW');
  const id=row.prediction_id;
  const find=rows=>rows.find(entry=>entry.prediction_id===id);
  mutate(find(copy[2].observations),find(copy[3].observations),row,find(copy[1].records),copy);
  assert.deepEqual(identities(review(copy).matches),identities(ready.filter(entry=>entry.prediction_id!==id)));
}
console.log('PASS: archived NFL and tennis receipt coverage, stale state, failures, conflicts and exact fixture joins');
