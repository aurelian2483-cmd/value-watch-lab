import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

const SHA=/^[0-9a-f]{64}$/;
const GENESIS='0'.repeat(64);
const STATES=new Set(['NEEDS_EVIDENCE','DISPUTED','REJECTED','READY_FOR_EXTERNAL_AUDIT']);
const date=v=>typeof v==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d/.test(v)&&
  /(Z|[+-]\d\d:\d\d)$/.test(v)&&Number.isFinite(Date.parse(v));
const text=(v,max=800)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
const sha=content=>createHash('sha256').update(content).digest('hex');

/** Digest over fixed ordered fields; hash chain is tamper-evident only when its
 * final digest is separately anchored. It does NOT authenticate the reviewer. */
export function decisionDigest(entry){
  const stable={
    review_id:entry.review_id,prediction_id:entry.prediction_id,
    reviewed_at_utc:entry.reviewed_at_utc,reviewer_alias:entry.reviewer_alias,
    decision:entry.decision,reason:entry.reason,
    evidence_references:entry.evidence_references,
    previous_sha256:entry.previous_sha256
  };
  return sha(JSON.stringify(stable));
}

function assertRawAudit(raw){
  assert(raw?.schema_version===1&&raw.kind==='BOTTLENECK_RAW_SOURCE_EVIDENCE_AUDIT_V1'&&
    raw.research_only===true&&raw.model_validation==='UNVALIDATED'&&
    raw.publication_gate==='BLOCKED'&&raw.selected_method===null&&
    raw.scoring_authorised===false&&raw.betting_eligible===false&&
    raw.independently_verified_results_added===0&&
    raw.independently_authenticated_source_origins===0&&
    raw.raw_bytes_retained_in_output===false&&
    date(raw.generated_from_snapshot_utc)&&SHA.test(raw.source_dossier_sha256||''),
    'Unsafe original-response audit');
  assert(Array.isArray(raw.by_packet)&&Number.isInteger(raw.inspected_review_packets)&&
    raw.inspected_review_packets===raw.by_packet.length&&
    raw.source_receipts_expected===raw.inspected_review_packets*2&&
    Number.isInteger(raw.raw_sources_missing)&&
    Number.isInteger(raw.hash_consistent_raw_sources)&&
    Number.isInteger(raw.hash_mismatched_raw_sources)&&
    Number.isInteger(raw.source_metadata_conflicts)&&
    raw.raw_sources_missing>=0&&raw.hash_consistent_raw_sources>=0&&
    raw.hash_mismatched_raw_sources>=0&&raw.source_metadata_conflicts>=0&&
    raw.raw_sources_missing+raw.hash_consistent_raw_sources+
      raw.hash_mismatched_raw_sources+raw.source_metadata_conflicts===raw.source_receipts_expected,
    'Inconsistent original-source audit counts');
  const seen=new Set();
  for(const p of raw.by_packet){
    assert(text(p?.prediction_id)&&!seen.has(p.prediction_id)&&
      p.verified_outcome===false&&p.dropdown_method===null&&
      p.betting_eligible===false&&p.source_independence==='NOT_ATTESTED'&&
      p.reviewer_decision==='NOT_RECORDED'&&
      ['BOTH_RESPONSE_HASHES_MATCH_UNATTESTED','INCOMPLETE_OR_CONFLICTING']
        .includes(p.pair_byte_consistency),'Unsafe or duplicate result packet');
    seen.add(p.prediction_id);
    const a=p.first_source,b=p.second_source;
    assert(a&&b&&typeof a.digest_matches_receipt==='boolean'&&
      typeof b.digest_matches_receipt==='boolean'&&
      a.independently_authenticated===false&&b.independently_authenticated===false,
      'Unsupported raw source verification status');
    const both=a.digest_matches_receipt===true&&b.digest_matches_receipt===true&&
      a.metadata_matches_receipt===true&&b.metadata_matches_receipt===true;
    assert((p.pair_byte_consistency==='BOTH_RESPONSE_HASHES_MATCH_UNATTESTED')===both,
      'Raw byte consistency mismatch');
  }
}

export function emptyReviewJournal(raw){
  assertRawAudit(raw);
  return {
    schema_version:1,kind:'BOTTLENECK_PRIVATE_REVIEW_JOURNAL_V1',
    research_only:true,publication_gate:'BLOCKED',
    raw_audit_sha256:sha(JSON.stringify(raw)),
    entries:[]
  };
}

/**
 * Inspect an OPTIONAL private append-only review log. Log metadata is supplied
 * by an operator, not independently authenticated. NO outcome ever verified.
 * NO live selection, score, betting, model promotion or file write.
 */
export function buildReviewJournalReport(raw,journal=null,asOfUTC){
  assertRawAudit(raw);
  assert(date(asOfUTC)&&Date.parse(asOfUTC)>=Date.parse(raw.generated_from_snapshot_utc),
    'Invalid review cutoff');
  const input=journal===null?emptyReviewJournal(raw):journal;
  assert(input?.schema_version===1&&
    input.kind==='BOTTLENECK_PRIVATE_REVIEW_JOURNAL_V1'&&
    input.research_only===true&&input.publication_gate==='BLOCKED'&&
    input.raw_audit_sha256===sha(JSON.stringify(raw))&&
    Array.isArray(input.entries)&&input.entries.length<=10000,
    'Invalid or unanchored private review journal');
  const byId=new Map(raw.by_packet.map(p=>[p.prediction_id,p]));
  const recorded=new Set(),latest=new Map();
  let prior=GENESIS,previousTime=Date.parse(raw.generated_from_snapshot_utc);
  for(const entry of input.entries){
    assert(entry&&typeof entry==='object'&&!Array.isArray(entry)&&
      Object.keys(entry).sort().join(',')===
      ['review_id','prediction_id','reviewed_at_utc','reviewer_alias','decision',
       'reason','evidence_references','previous_sha256','entry_sha256'].sort().join(','),
      'Review entry fields cannot be omitted or invented');
    assert(text(entry.review_id,120)&&!recorded.has(entry.review_id)&&
      text(entry.prediction_id,180)&&byId.has(entry.prediction_id)&&
      text(entry.reviewer_alias,80)&&text(entry.reason,2000)&&
      entry.reason.trim().length>=20&&STATES.has(entry.decision)&&
      date(entry.reviewed_at_utc),'Invalid human review entry');
    recorded.add(entry.review_id);
    const at=Date.parse(entry.reviewed_at_utc);
    assert(at>=previousTime&&at<=Date.parse(asOfUTC),
      'Out-of-sequence or future-dated review decision');
    previousTime=at;
    assert(Array.isArray(entry.evidence_references)&&entry.evidence_references.length<=12&&
      entry.evidence_references.every(v=>SHA.test(v)),
      'Invalid external evidence fingerprints');
    assert(entry.previous_sha256===prior&&SHA.test(entry.entry_sha256||'')&&
      decisionDigest(entry)===entry.entry_sha256,
      'Review hash chain mismatch');
    const packet=byId.get(entry.prediction_id);
    if(entry.decision==='READY_FOR_EXTERNAL_AUDIT')
      assert(packet.pair_byte_consistency==='BOTH_RESPONSE_HASHES_MATCH_UNATTESTED'&&
        entry.evidence_references.length>=2,
        'External-audit readiness requires two byte-consistent responses and evidence pointers');
    // A self-entered alias, a hash chain and a claimed decision cannot certify
    // external source authenticity. The next audit is independently required.
    latest.set(entry.prediction_id,entry);
    prior=entry.entry_sha256;
  }
  const counts={NOT_REVIEWED:0,NEEDS_EVIDENCE:0,DISPUTED:0,REJECTED:0,
    READY_FOR_EXTERNAL_AUDIT:0};
  const queue=raw.by_packet.map(p=>{
    const e=latest.get(p.prediction_id);
    const status=e?e.decision:'NOT_REVIEWED';
    counts[status]++;
    return {
      prediction_id:p.prediction_id,sport:p.sport,event_id:p.event_id,
      model_version:p.model_version,review_status:status,
      raw_evidence_status:p.pair_byte_consistency,
      latest_review_entry_id:e?.review_id??null,
      latest_review_entry_hash:e?.entry_sha256??null,
      independently_verified_outcome:false,
      linked_dropdown_method:null,scoring_authorised:false,betting_eligible:false
    };
  });
  return {
    schema_version:1,kind:'BOTTLENECK_MANUAL_REVIEW_REGISTER_V1',
    research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED',
    generated_from_snapshot_utc:raw.generated_from_snapshot_utc,
    review_as_of_utc:asOfUTC,
    raw_audit_sha256:input.raw_audit_sha256,
    review_chain_tip_sha256:prior,
    reviewer_identity_authenticated:false,
    digest_chain_externally_anchored:false,
    original_source_independence_authenticated:false,
    total_packets:raw.by_packet.length,
    private_decision_entries:input.entries.length,
    review_status_counts:counts,
    queue,
    independent_outcomes_certified:0,selected_method:null,
    engine_identity_certified:0,scoring_authorised:false,betting_eligible:false,
    decision:'EXTERNAL_VERIFICATION_PENDING_NO_AUTOMATIC_CERTIFICATION',
    notes:[
      'A reviewer alias and journal digest are user-provided claims, not an authenticated signature.',
      'Hash-chain integrity only becomes tamper-evident across time when the chain tip is separately witnessed.',
      'READY_FOR_EXTERNAL_AUDIT is a handoff state, never verified settlement.',
      'No file is changed and no historical or live betting performance is computed.'
    ]
  };
}
