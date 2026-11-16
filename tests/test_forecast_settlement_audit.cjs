'use strict';
const assert=require('node:assert/strict');
const {compare}=require('../research/forecast-receipts/settlement-audit.cjs');
const G={research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED'};
const captured={...G,status:'REPOSITORY_SNAPSHOT_RECEIPT_NOT_INDEPENDENT_ATTESTATION',
 records:[{...G,home:'Home FC',away:'Away FC',kickoff_utc:'2026-11-10T15:00:00Z',
 model_version:'POISSON_BASELINE_2025_26_V1',probabilities:[.5,.3,.2],
 capture_at_utc:'2026-11-09T12:00:00Z',timestamp_independently_attested:false}]};
const receipts=[
 {url:'https://example.org/final',sha256:'a'.repeat(64),received_at_utc:'2026-11-11T10:00:00Z'},
 {url:'https://other.example/final',sha256:'b'.repeat(64),received_at_utc:'2026-11-11T10:01:00Z'}];
const final={...G,generated_at_utc:'2026-11-11T11:00:00Z',performance:{entries:[
 {league:'PL',home:'Home FC',away:'Away FC',kickoff_utc:'2026-11-10T15:00:00Z',
  model:'POISSON_BASELINE_2025_26_V1',record_sha256:'c'.repeat(64),
  verification:'TWO_SOURCE_REGULATION_TIME_FINAL',score_home:2,score_away:1,source_receipts:receipts}
]}};
const now=Date.parse('2026-11-12T12:00:00Z');
const x=compare(captured,final,now);
assert.equal(x.counts.matched_results,1);
assert.equal(x.counts.scored_exploratory,1);
assert.equal(x.counts.attested_eligible,0);
assert.equal(x.publication_gate,'BLOCKED');
assert(Math.abs(x.metrics.unattested_model_log_loss-Math.log(2))<1e-12);
assert.equal(compare(captured,{...final,performance:{entries:[]}},now).counts.unmatched,1);
assert.equal(compare(captured,{...final,performance:{entries:final.performance.entries.map(x=>({...x,model:'OTHER'}))}},now).counts.no_same_model,1);
assert.equal(compare(captured,{...final,performance:{entries:final.performance.entries.map(x=>({...x,source_receipts:[receipts[0],receipts[0]]}))}},now).counts.matched_results,0);
assert.throws(()=>compare({...captured,status:'PROMOTED'},final,now),/Invalid/);
console.log('Research-only settlement audit passed');
