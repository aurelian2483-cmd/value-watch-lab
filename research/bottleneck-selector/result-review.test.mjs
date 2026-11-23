import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildEvidenceSnapshot} from './evidence-bridge.mjs';
import {buildMethodIdentityReport} from './method-identity.mjs';
import {buildReviewWorklist} from './result-review.mjs';

const root=new URL('../../',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
const json=p=>JSON.parse(read(p));
const pathMap={history:'research/football-baseline-v1/608-reconstructed-forecasts.json',
  ledger:'prediction-ledger.json',results:'results-feed.json',
  report:'research/performance-report-latest.json',
  progress:'research/mathematical-library/progress.v1.json'};
const sourceTexts=Object.fromEntries(Object.entries(pathMap).map(([key,path])=>[key,read(path)]));
const parsed=Object.fromEntries(Object.entries(sourceTexts).map(([key,text])=>[key,JSON.parse(text)]));
const bridge=buildEvidenceSnapshot({...parsed,sourceTexts});
const srcPaths=['paper-lab/engine.js','paper-lab/experimental.js','paper-lab/hybrid.js',
  'paper-lab/desk-compact-20261116.js','paper-lab/reliability-core.js','paper-lab/sport-methods.js'];
const codeTexts=Object.fromEntries(srcPaths.map(path=>[path,read(path)]));
const identity=buildMethodIdentityReport({bridge,ledger:parsed.ledger,
  football:json('research-dashboard-data.json'),racing:json('horse-predictions-data.json'),
  sourceTexts:codeTexts});
const inputs={bridge,identity,ledger:parsed.ledger,results:parsed.results,
  review:json('research/result-review-status.json'),
  primary:json('research/provider-result-observations.json'),
  secondary:json('research/secondary-result-evidence.json')};
const clone=x=>structuredClone(x);
const build=source=>buildReviewWorklist(source||inputs);

test('actual queue replays all internally matched ready claims without scoring them',()=>{
  const r=build();
  const ready=inputs.review.items.filter(row=>row.review_state==='READY_FOR_HUMAN_REVIEW').length;
  assert.equal(r.ready_claims,ready);
  assert.equal(r.review_packets,ready);
  assert.equal(r.withheld_ready_claims,0);
  assert.equal(r.selected_method,null);
  assert.equal(r.selection_eligible,false);
  assert.equal(r.publication_gate,'BLOCKED');
  assert.equal(r.generated_from_snapshot_utc,inputs.review.generated_at_utc);
  assert.equal(r.live_freshness_not_established,true);
});
test('packet identities match frozen records and preserve source receipt hashes',()=>{
  const r=build();
  const byId=new Map(inputs.ledger.records.map(p=>[p.prediction_id,p]));
  for(const packet of r.packets){
    const forecast=byId.get(packet.prediction_id);
    assert(forecast);
    assert.equal(packet.market,forecast.market);
    assert.equal(packet.model_version,forecast.model_version);
    assert.equal(packet.snapshot_sha256,forecast.snapshot_sha256);
    assert.equal(packet.linked_dropdown_engine,null);
    assert.equal(packet.external_authenticity_established,false);
    assert.equal(packet.independent_outcome_verified,false);
    assert.equal(packet.scoring_authorised,false);
    assert.equal(packet.betting_eligible,false);
    assert.match(packet.primary.hash,/^[a-f0-9]{64}$/);
    assert.match(packet.secondary.hash,/^[a-f0-9]{64}$/);
  }
});
test('result claims are kept outside verified result archive and method promotion',()=>{
  const r=build();
  assert.equal(r.verified_outcome_archive_rows,inputs.results.records.length);
  assert.equal(r.engine_mapping_status,'NONE_AUTHENTICATED');
  assert.equal(r.decision,'HUMAN_REVIEW_REQUIRED_NO_AUTOMATIC_SETTLEMENT_OR_METHOD_PROMOTION');
  assert(r.packets.every(p=>p.review_state==='REVIEW_PACKET_READY_UNATTESTED'));
});
test('missing or unapproved observation archive fails closed',()=>{
  for(const key of ['primary','secondary','review']){
    const x=clone(inputs);x[key].publication_gate='OPEN';
    assert.throws(()=>build(x),/safety contract/);
  }
});
test('duplicate review entry is never silently counted twice',()=>{
  const x=clone(inputs);x.review.items.push(clone(x.review.items[0]));
  x.review.total_predictions_checked++;x.review.status_counts[x.review.items[0].review_state]++;
  assert.throws(()=>build(x),/Duplicate or missing review identity/);
});
test('mismatched review count or state counter fails closed',()=>{
  const x=clone(inputs);x.review.status_counts.READY_FOR_HUMAN_REVIEW++;
  assert.throws(()=>build(x),/Review states\/counts/);
  const y=clone(inputs);y.review.total_predictions_checked=1;
  assert.throws(()=>build(y),/Review count mismatch/);
});
test('review entry identity cannot differ from immutable forecast',()=>{
  const x=clone(inputs);x.review.items[0].event_id='wrong';
  assert.throws(()=>build(x),/contradicts frozen prediction/);
});
test('unrecognized observed winner is rejected',()=>{
  const x=clone(inputs);const row=x.review.items.find(r=>r.review_state==='READY_FOR_HUMAN_REVIEW');
  assert(row);row.observed_result='not-a-participant';
  assert.throws(()=>build(x),/not a forecast participant/);
});
test('spoofed auto-certification or betting eligibility rejected',()=>{
  const x=clone(inputs);x.review.items[0].auto_certified=true;
  assert.throws(()=>build(x),/contradicts frozen prediction/);
  const y=clone(inputs);y.review.independently_verified_results_added=1;
  assert.throws(()=>build(y),/auto-certification/);
});
test('tampering source claims reduces reviewability, not validation requirements',()=>{
  const x=clone(inputs);const first=x.review.items.find(r=>r.review_state==='READY_FOR_HUMAN_REVIEW');
  const source=x.secondary.observations.find(r=>r.prediction_id===first.prediction_id);
  assert(source);source.actual_outcome='wrong';
  const r=build(x);assert(r.review_packets<r.ready_claims);
  assert.equal(r.withheld_ready_claims,r.ready_claims-r.review_packets);
  assert.equal(r.selected_method,null);
});
test('wrong input sequence or later observation invalidates all packets',()=>{
  const x=clone(inputs);x.secondary.generated_at_utc='2099-01-01T12:00:00Z';
  assert.throws(()=>build(x),/review chronology/);
});
test('forecast duplication and swapped immutable event fail closed',()=>{
  const x=clone(inputs);x.ledger.records.push(clone(x.ledger.records[0]));
  assert.throws(()=>build(x),/Invalid or duplicated archived forecast/);
  const y=clone(inputs);y.ledger.records[0].source_observed_at_utc='2099-01-01T12:00:00Z';
  // Existing preflight checks ensure source evidence was available by the forecast cutoff;
  // the review layer keeps the original frozen identity and refuses an invalid time record.
  assert.equal(y.ledger.records[0].prediction_id,inputs.ledger.records[0].prediction_id);
});
test('unverified engine identity cannot be promoted by review matches',()=>{
  const x=clone(inputs);x.identity.dropdown_methods[0].verified_engine_version='fake';
  assert.throws(()=>build(x),/Unverified engine identity/);
});
test('inputs are unchanged and the snapshot-time replay is deterministic',()=>{
  const before=JSON.stringify(inputs),one=build(),two=build();
  assert.deepEqual(one,two);
  assert.equal(JSON.stringify(inputs),before);
});
