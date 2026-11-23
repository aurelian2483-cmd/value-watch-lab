import test from 'node:test';
import assert from 'node:assert/strict';
import {buildReviewJournalReport,emptyReviewJournal,decisionDigest} from './review-journal.mjs';

const A='a'.repeat(64),B='b'.repeat(64),C='c'.repeat(64),ZERO='0'.repeat(64);
const asOf='2026-11-23T23:00:00Z';
const clone=x=>structuredClone(x);
function raw(both=false){
  const source=(matched)=>({
    status:matched?'ORIGINAL_BYTES_MATCH_RECEIPT_HASH_ORIGIN_NOT_ATTESTED':'ORIGINAL_RESPONSE_NOT_PRESERVED',
    raw_bytes_supplied:matched,digest_matches_receipt:matched,
    ...(matched?{metadata_matches_receipt:true,computed_sha256:A,byte_count:20}:{}),
    independently_authenticated:false
  });
  return {
    schema_version:1,kind:'BOTTLENECK_RAW_SOURCE_EVIDENCE_AUDIT_V1',
    research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED',
    selected_method:null,scoring_authorised:false,betting_eligible:false,
    independently_verified_results_added:0,independently_authenticated_source_origins:0,
    raw_bytes_retained_in_output:false,
    generated_from_snapshot_utc:'2026-11-23T15:17:50Z',source_dossier_sha256:A,
    inspected_review_packets:1,source_receipts_expected:2,
    raw_sources_missing:both?0:2,hash_consistent_raw_sources:both?2:0,
    hash_mismatched_raw_sources:0,source_metadata_conflicts:0,
    by_packet:[{
      prediction_id:'tennis:test:one',sport:'tennis',event_id:'event-one',
      model_version:'FIXED_ELO_K24_V1',
      first_source:source(both),second_source:source(both),
      pair_byte_consistency:both?'BOTH_RESPONSE_HASHES_MATCH_UNATTESTED':'INCOMPLETE_OR_CONFLICTING',
      source_independence:'NOT_ATTESTED',reviewer_decision:'NOT_RECORDED',
      verified_outcome:false,dropdown_method:null,betting_eligible:false
    }]
  };
}
function entry(decision='NEEDS_EVIDENCE',previous_sha256=ZERO,time='2026-11-23T17:00:00Z'){
  const x={
    review_id:'decision-001',prediction_id:'tennis:test:one',
    reviewed_at_utc:time,reviewer_alias:'local-reviewer-1',decision,
    reason:'Original provider response bytes require independent source review.',
    evidence_references:decision==='READY_FOR_EXTERNAL_AUDIT'?[B,C]:[],
    previous_sha256
  };
  return {...x,entry_sha256:decisionDigest(x)};
}
function withEntry(d,decision='NEEDS_EVIDENCE'){
  const j=emptyReviewJournal(d);
  j.entries.push(entry(decision));
  return j;
}
test('no private journal means all results remain unreviewed and unverified',()=>{
  const r=buildReviewJournalReport(raw(),null,asOf);
  assert.equal(r.total_packets,1);
  assert.equal(r.review_status_counts.NOT_REVIEWED,1);
  assert.equal(r.private_decision_entries,0);
  assert.equal(r.selected_method,null);
  assert.equal(r.independent_outcomes_certified,0);
  assert.equal(r.scoring_authorised,false);
  assert.equal(r.review_chain_tip_sha256,ZERO);
});
test('blank journal is anchored to the exact raw-source report without mutating it',()=>{
  const d=raw(),before=JSON.stringify(d),j=emptyReviewJournal(d);
  assert.equal(j.entries.length,0);
  assert.equal(j.publication_gate,'BLOCKED');
  assert.match(j.raw_audit_sha256,/^[a-f0-9]{64}$/);
  assert.equal(buildReviewJournalReport(d,j,asOf).private_decision_entries,0);
  assert.equal(JSON.stringify(d),before);
});
test('unresolved review reason is retained as a private decision not result truth',()=>{
  const d=raw(),r=buildReviewJournalReport(d,withEntry(d),asOf);
  assert.equal(r.review_status_counts.NEEDS_EVIDENCE,1);
  assert.equal(r.queue[0].review_status,'NEEDS_EVIDENCE');
  assert.equal(r.queue[0].independently_verified_outcome,false);
  assert.equal(r.reviewer_identity_authenticated,false);
  assert.equal(r.digest_chain_externally_anchored,false);
});
test('the register can track disputes and rejections but never certify a winner',()=>{
  for(const decision of ['DISPUTED','REJECTED']){
    const d=raw(),r=buildReviewJournalReport(d,withEntry(d,decision),asOf);
    assert.equal(r.review_status_counts[decision],1);
    assert.equal(r.independent_outcomes_certified,0);
    assert.equal(r.engine_identity_certified,0);
    assert.equal(r.queue[0].betting_eligible,false);
  }
});
test('external audit readiness rejects absent original response files',()=>{
  const d=raw(),j=withEntry(d,'READY_FOR_EXTERNAL_AUDIT');
  assert.throws(()=>buildReviewJournalReport(d,j,asOf),/two byte-consistent responses/);
});
test('even both matching response hashes only allow handoff not certification',()=>{
  const d=raw(true),j=withEntry(d,'READY_FOR_EXTERNAL_AUDIT');
  const r=buildReviewJournalReport(d,j,asOf);
  assert.equal(r.review_status_counts.READY_FOR_EXTERNAL_AUDIT,1);
  assert.equal(r.original_source_independence_authenticated,false);
  assert.equal(r.independent_outcomes_certified,0);
  assert.equal(r.queue[0].linked_dropdown_method,null);
});
test('ready state also needs external evidence fingerprints',()=>{
  const d=raw(true),j=withEntry(d,'READY_FOR_EXTERNAL_AUDIT');
  j.entries[0].evidence_references=[];
  j.entries[0].entry_sha256=decisionDigest(j.entries[0]);
  assert.throws(()=>buildReviewJournalReport(d,j,asOf),/two byte-consistent responses/);
});
test('stale journal anchored to another source dossier is rejected',()=>{
  const d=raw(),j=emptyReviewJournal(d);const modified=raw();
  modified.by_packet[0].event_id='different';
  assert.throws(()=>buildReviewJournalReport(modified,j,asOf),/Invalid or unanchored private review journal/);
});
test('falsified hash chain, predecessor and decision details are rejected',()=>{
  const d=raw(),j=withEntry(d);j.entries[0].reason='TAMPER';
  assert.throws(()=>buildReviewJournalReport(d,j,asOf),/Invalid human review entry|Review hash chain mismatch/);
  const q=withEntry(d);q.entries[0].previous_sha256=B;
  assert.throws(()=>buildReviewJournalReport(d,q,asOf),/Review hash chain mismatch/);
});
test('append-only sequence can add a new decision without replacing the earlier one',()=>{
  const d=raw(),j=withEntry(d),old=j.entries[0].entry_sha256;
  const second=entry('DISPUTED',old,'2026-11-23T18:00:00Z');
  second.review_id='decision-002';second.entry_sha256=decisionDigest(second);
  j.entries.push(second);
  const r=buildReviewJournalReport(d,j,asOf);
  assert.equal(r.private_decision_entries,2);
  assert.equal(r.review_status_counts.DISPUTED,1);
  assert.equal(r.queue[0].latest_review_entry_hash,second.entry_sha256);
  assert.equal(r.review_chain_tip_sha256,second.entry_sha256);
});
test('duplicate journal IDs, future decisions and reversed chronology rejected',()=>{
  const d=raw(),j=withEntry(d);
  const second=entry('DISPUTED',j.entries[0].entry_sha256,'2026-11-23T16:00:00Z');
  j.entries.push(second);
  assert.throws(()=>buildReviewJournalReport(d,j,asOf),/Out-of-sequence|Invalid human review entry/);
  const k=withEntry(d);k.entries[0].reviewed_at_utc='2099-01-01T00:00:00Z';
  k.entries[0].entry_sha256=decisionDigest(k.entries[0]);
  assert.throws(()=>buildReviewJournalReport(d,k,asOf),/future-dated/);
});
test('self-reported VERIFIED decision and fabricated fields have no place in schema',()=>{
  const d=raw(),j=withEntry(d);
  j.entries[0].decision='VERIFIED_OUTCOME';
  j.entries[0].entry_sha256=decisionDigest(j.entries[0]);
  assert.throws(()=>buildReviewJournalReport(d,j,asOf),/Invalid human review entry/);
  const k=withEntry(d);k.entries[0].externally_signed=true;
  assert.throws(()=>buildReviewJournalReport(d,k,asOf),/fields cannot be omitted or invented/);
});
test('review cannot refer to unknown prediction or missing evidence reference format',()=>{
  const d=raw(),j=withEntry(d);
  j.entries[0].prediction_id='unknown';j.entries[0].entry_sha256=decisionDigest(j.entries[0]);
  assert.throws(()=>buildReviewJournalReport(d,j,asOf),/Invalid human review entry/);
  const k=withEntry(d);k.entries[0].evidence_references=['untrusted-url'];
  k.entries[0].entry_sha256=decisionDigest(k.entries[0]);
  assert.throws(()=>buildReviewJournalReport(d,k,asOf),/Invalid external evidence fingerprints/);
});
test('counter corruption and raw packet false verification fail closed',()=>{
  const d=raw();d.hash_consistent_raw_sources=1;
  assert.throws(()=>buildReviewJournalReport(d,null,asOf),/Inconsistent original-source audit counts/);
  const q=raw();q.by_packet[0].verified_outcome=true;
  assert.throws(()=>buildReviewJournalReport(q,null,asOf),/Unsafe or duplicate result packet/);
});
test('determinism and input immutability',()=>{
  const d=raw(),j=withEntry(d),before=JSON.stringify([d,j]);
  assert.deepEqual(buildReviewJournalReport(d,j,asOf),buildReviewJournalReport(d,j,asOf));
  assert.equal(JSON.stringify([d,j]),before);
});
