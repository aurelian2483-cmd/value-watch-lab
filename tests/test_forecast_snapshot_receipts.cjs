'use strict';
const assert=require('node:assert/strict');
const {capture}=require('../research/forecast-receipts/capture.cjs');
const source={research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED',
 generated_at_utc:'2026-11-16T10:00:00Z',
 experimental_model_forecasts:[
 {home:'Home',away:'Away',kickoff_utc:'2026-11-17T12:00:00Z',model:'POISSON_TEST',
  prob_home:.5,prob_draw:.3,prob_away:.2},
 {home:'Started',away:'Match',kickoff_utc:'2026-11-16T09:00:00Z',model:'POISSON_TEST',
  prob_home:.5,prob_draw:.3,prob_away:.2}
 ]};
const provenance={captured_at_utc:'2026-11-16T10:05:00Z',source_sha256:'a'.repeat(64),repository_commit:'b'.repeat(40)};
const result=capture(source,provenance);
assert.equal(result.count,1);
assert.equal(result.records[0].model_version,'POISSON_TEST');
assert.deepEqual(result.records[0].probabilities,[.5,.3,.2]);
assert.equal(result.records[0].timestamp_independently_attested,false);
assert.equal(result.records[0].challenge_eligible,0);
assert.equal(result.publication_gate,'BLOCKED');
assert.equal(result.excluded.started_or_within_cutoff,1);
assert.equal(capture({...source,experimental_model_forecasts:[source.experimental_model_forecasts[0],source.experimental_model_forecasts[0]]},provenance).excluded.duplicate_identity,1);
assert.throws(()=>capture(source,{...provenance,source_sha256:'invalid'}),/Capture requires/);
assert.throws(()=>capture(source,{...provenance,captured_at_utc:'2026-11-16T09:59:00Z'}),/Stale or future/);
assert.throws(()=>capture(source,{...provenance,captured_at_utc:'2026-11-19T12:00:00Z'}),/Stale or future/);
assert.throws(()=>capture({...source,publication_gate:'OPEN'},provenance),/Incorrect source/);
const bad={...source.experimental_model_forecasts[0],prob_draw:.7};
assert.equal(capture({...source,experimental_model_forecasts:[bad]},provenance).count,0);
console.log('Forecast snapshot receipt gates, provenance and chronological rejection passed');
