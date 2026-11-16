'use strict';
const assert=require('node:assert/strict');
const {compare}=require('../research/forecast-receipts/paired-hindsight.cjs');
const G={research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED'};
const forecast={...G,home:'Home FC',away:'Away FC',kickoff_utc:'2026-11-10T15:00:00Z',
 model_version:'POISSON_BASELINE_2025_26_V1',challenge_eligible:0,probabilities:[.5,.3,.2],
 capture_at_utc:'2026-11-09T12:00:00Z',source_generated_at_utc:'2026-11-09T11:30:00Z',
 source_sha256:'a'.repeat(64),repository_commit:'b'.repeat(40),timestamp_independently_attested:false};
const receipt={...G,status:'REPOSITORY_SNAPSHOT_RECEIPT_NOT_INDEPENDENT_ATTESTATION',
 captured_at_utc:'2026-11-09T12:00:00Z',source_sha256:'a'.repeat(64),repository_commit:'b'.repeat(40),records:[forecast]};
const sources=[
 {url:'https://example.org/final',sha256:'a'.repeat(64),received_at_utc:'2026-11-11T10:00:00Z'},
 {url:'https://other.example/final',sha256:'b'.repeat(64),received_at_utc:'2026-11-11T10:01:00Z'}];
const settledEntry={league:'PL',home:'Home FC',away:'Away FC',kickoff_utc:'2026-11-10T15:00:00Z',
 model:'POISSON_BASELINE_2025_26_V1',record_sha256:'c'.repeat(64),
 verification:'TWO_SOURCE_REGULATION_TIME_FINAL',score_home:2,score_away:1,source_receipts:sources};
const final={...G,generated_at_utc:'2026-11-11T11:00:00Z',performance:{entries:[settledEntry]}};
const header='kickoff_utc,home,away,result,void_reason,pin_close_home,pin_close_draw,pin_close_away,teams_reversed_after_logging\n';
const row='2026-11-10T15:00:00+00:00,Home FC,Away FC,1,,2.00,3.50,4.00,0\n';
const now=Date.parse('2026-11-12T12:00:00Z');
const base=compare(receipt,final,header+row,now);
assert.equal(base.counts.paired_hindsight,1);
assert.equal(base.counts.independently_verified_tradable_pairs,0);
assert.equal(base.counts.not_independently_attested,1);
assert.equal(base.publication_gate,'BLOCKED');
assert(Math.abs(base.metrics.model_log_loss-Math.log(2))<1e-12);
assert(Number.isFinite(base.metrics.paired_delta_log_loss));
assert(!JSON.stringify(base).includes('Home FC'));
assert.equal(compare(receipt,final,header+row.replace('2.00,3.50,4.00','2.00,,4.00'),now).counts.missing_market,1);
assert.equal(compare(receipt,final,header+row.replace(',0\n',',1\n'),now).counts.reversed_teams,1);
assert.equal(compare(receipt,final,header+row.replace(',1,,',',X,,'),now).counts.disputed_result,1);
assert.equal(compare(receipt,final,header+row+row,now).counts.ambiguous_identity,1);
assert.equal(compare(receipt,{...final,performance:{entries:[]}},header+row,now).counts.no_corrob_final,1);
assert.equal(compare(receipt,{...final,performance:{entries:[{...settledEntry,model:'OTHER'}]}},header+row,now).counts.mismatched_model,1);
assert.equal(compare({...receipt,records:[forecast,forecast]},final,header+row,now).counts.duplicate_forecast,1);
assert.equal(compare({...receipt,records:[{...forecast,capture_at_utc:'2026-11-11T10:00:00Z'}]},final,header+row,now).counts.missing_prestart_receipt,1);
assert.throws(()=>compare({...receipt,status:'PROMOTED'},final,header+row,now),/Invalid/);
assert.throws(()=>compare(receipt,final,'a,b\n1,2',now),/External closing-market/);
assert.equal(compare({...receipt,source_sha256:'c'.repeat(64)},final,header+row,now).counts.missing_prestart_receipt,1);
assert.equal(compare({...receipt,records:[{...forecast,source_generated_at_utc:'2026-11-10T16:00:00Z'}]},final,header+row,now).counts.missing_prestart_receipt,1);
assert.equal(compare({...receipt,records:[{...forecast,repository_commit:'bad'}]},final,header+row,now).counts.missing_prestart_receipt,1);
console.log('Paired hindsight: identical events, corroborated results, quote and attestation safeguards passed');
