import test from 'node:test';
import assert from 'node:assert/strict';
import {runCompletionAudit,buildCompletionReport} from './completion-audit.mjs';

const copy=x=>structuredClone(x);
const data=runCompletionAudit({asOfUTC:'2026-11-23T22:50:00Z'});
test('all six website method options remain distinct and no winner is promoted',()=>{
  assert.equal(data.six_method_ids.length,6);
  assert.deepEqual(data.six_method_ids,
    ['current','experimental','hybrid','compare','reliability','racing-top-four']);
  assert.equal(data.selected_method,null);
  assert.equal(data.model_winner_validated,false);
  assert.equal(data.publication_gate,'BLOCKED');
});
test('real research inputs report only documented, non-verified results',()=>{
  assert(data.forecast_ledger_records>0);
  assert.equal(data.verified_outcome_records,0);
  assert.equal(data.certified_outcomes_added,0);
  assert.equal(data.scoring_authorised,false);
  assert.equal(data.betting_eligible,false);
});
test('real source archive has complete missing-original-byte accounting',()=>{
  assert.equal(data.raw_original_responses_expected,data.review_packets*2);
  assert.equal(data.raw_original_responses_missing,data.raw_original_responses_expected);
  assert.equal(data.raw_original_responses_hash_consistent,0);
});
test('full source pipeline refuses falsely declaring catalogue complete',()=>{
  const g=data.gates.find(x=>x.id==='CATALOGUE_1000_QUALITY_GATE');
  assert(g);
  assert.equal(g.passed,false);
  assert.equal(g.observed.registered,286);
  assert.equal(g.observed.outstanding,714);
});
test('six clear hard gates preserved with no hidden opt-in approval',()=>{
  assert.equal(data.gates.length,6);
  assert.deepEqual(data.blockers,data.gates.map(g=>g.id));
  assert(data.gates.every(g=>g.passed===false));
  assert.equal(data.readiness,'RESEARCH_INFRASTRUCTURE_CONNECTED_EXTERNAL_EVIDENCE_BLOCKED');
});
test('optional private review register cannot create fictitious approved results',()=>{
  const changed=copy(data);
  changed.gates[0].passed=true;
  // Copy of a summary can change; it cannot be passed back as pipeline inputs.
  assert.deepEqual(data.gates.every(g=>!g.passed),true);
  assert.equal(data.independent_outcomes_certified,undefined);
});
test('all input read/capture components remain in research-only mode',()=>{
  assert.equal(data.research_only,true);
  assert.equal(data.model_validation,'UNVALIDATED');
  assert(data.no_claims.some(s=>s.includes('independent')));
});
test('end-to-end report deterministic for fixed cutoff and source snapshot',()=>{
  assert.deepEqual(data,runCompletionAudit({asOfUTC:'2026-11-23T22:50:00Z'}));
});
test('complete real archive links to the review worklist counts',()=>{
  assert.equal(data.review_packets,36);
  assert.equal(data.private_review_decisions,0);
  assert.equal(data.raw_original_responses_expected,72);
});
test('no unknown private options are silently applied',()=>{
  const report=runCompletionAudit({asOfUTC:'2026-11-23T22:50:00Z'});
  assert.equal(report.selected_method,null);
  assert.equal(report.verified_outcome_records,0);
});
