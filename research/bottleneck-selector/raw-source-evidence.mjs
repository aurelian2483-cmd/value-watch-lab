import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

const SHA=/^[a-f0-9]{64}$/;
const SIDES=['first_source','second_source'];
const maximumBytes=3_000_000;
const nonempty=v=>typeof v==='string'&&v.length>0;
const validTime=v=>typeof v==='string'&&/^\d{4}-\d\d-\d\dT/.test(v)&&
  /(Z|[+-]\d\d:\d\d)$/.test(v)&&Number.isFinite(Date.parse(v));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const key=(prediction,side)=>JSON.stringify([prediction,side]);

function assertDossier(dossier){
  assert(dossier?.schema_version===1&&
    dossier.kind==='BOTTLENECK_SOURCE_VERIFICATION_DOSSIER_V1'&&
    dossier.research_only===true&&dossier.model_validation==='UNVALIDATED'&&
    dossier.publication_gate==='BLOCKED'&&
    dossier.selected_method===null&&dossier.automatic_scoring_authorised===false&&
    dossier.betting_eligible===false&&dossier.certified_outcomes_added===0&&
    dossier.source_independence_certified===0&&
    dossier.snapshot_time_replay===true&&
    dossier.live_freshness_not_established===true&&
    validTime(dossier.generated_from_snapshot_utc),'Unsafe Bottleneck source dossier');
  assert(Array.isArray(dossier.packets)&&
    Number.isInteger(dossier.inspectable_packets)&&
    dossier.inspectable_packets===dossier.packets.length&&
    Number.isInteger(dossier.total_ready_claims)&&
    Number.isInteger(dossier.withheld_packets)&&
    dossier.total_ready_claims===dossier.inspectable_packets+dossier.withheld_packets,
    'Contradictory source dossier counts');
}

function checkPacket(p) {
  assert(nonempty(p?.prediction_id)&&p.status==='MANUAL_SOURCE_AND_SETTLEMENT_VERIFICATION_REQUIRED'&&
    p.independently_verified_outcome===false&&
    p.verified_dropdown_engine===null&&
    p.scoring_authorised===false&&p.betting_eligible===false&&
    p.upstream_source_independence==='NOT_ESTABLISHED'&&
    p.original_raw_response_authenticity==='NOT_ESTABLISHED'&&
    p.external_human_review==='NOT_PERFORMED'&&
    SHA.test(p.forecast_receipt||''),'Untrusted source review packet');
  for(const side of SIDES){
    const src=p[side];
    assert(nonempty(src?.url)&&validTime(src.observed_at_utc)&&
      SHA.test(src.digest_sha256||''),'Incomplete source receipt metadata');
  }
}

function evaluateSide(receipt,provided) {
  if(!provided) return {status:'ORIGINAL_RESPONSE_NOT_PRESERVED',raw_bytes_supplied:false,
    digest_matches_receipt:false,independently_authenticated:false};
  const metadataOK=provided.source_url===receipt.url&&
    provided.observed_at_utc===receipt.observed_at_utc;
  const computed=sha(provided.bytes);
  const digestMatches=computed===receipt.digest_sha256;
  const status=!metadataOK?'SOURCE_RECEIPT_METADATA_MISMATCH':
    !digestMatches?'ORIGINAL_BYTES_HASH_MISMATCH':
    'ORIGINAL_BYTES_MATCH_RECEIPT_HASH_ORIGIN_NOT_ATTESTED';
  return {
    status,raw_bytes_supplied:true,byte_count:provided.bytes.byteLength,
    computed_sha256:computed,
    digest_matches_receipt:digestMatches,
    metadata_matches_receipt:metadataOK,
    independently_authenticated:false
  };
}

/**
 * Optional local, privately preserved original response bytes can be compared
 * with source SHA-256 claims. Hash agreement is only byte-level consistency,
 * NOT proof of collection time, publication authenticity or independent origin.
 * No original bytes are emitted to reports or committed to the repository.
 */
export function auditRawSourceEvidence(dossier,evidence=[]){
  assertDossier(dossier);
  assert(Array.isArray(evidence)&&evidence.length<=50_000,'Invalid raw evidence set');
  const expected=new Set(),ids=new Set();
  for(const p of dossier.packets){
    checkPacket(p);
    assert(!ids.has(p.prediction_id),'Duplicate source dossier prediction');
    ids.add(p.prediction_id);
    for(const side of SIDES)expected.add(key(p.prediction_id,side));
  }
  const found=new Map();
  for(const item of evidence){
    assert(nonempty(item?.prediction_id)&&SIDES.includes(item?.side),
      'Invalid source evidence identity');
    const k=key(item.prediction_id,item.side);
    assert(expected.has(k),'Unexpected source evidence identity');
    assert(!found.has(k),'Duplicate source evidence identity');
    assert(item.bytes instanceof Uint8Array&&
      item.bytes.byteLength>0&&item.bytes.byteLength<=maximumBytes,
      'Unsafe or oversized raw evidence bytes');
    assert(nonempty(item.source_url)&&validTime(item.observed_at_utc),
      'Invalid supplied original-source metadata');
    found.set(k,item);
  }
  let matched=0,mismatched=0,metadataMismatch=0,missing=0;
  const packets=dossier.packets.map(p=>{
    const examined={};
    for(const side of SIDES){
      const r=evaluateSide(p[side],found.get(key(p.prediction_id,side)));
      examined[side]=r;
      if(r.status==='ORIGINAL_RESPONSE_NOT_PRESERVED')missing++;
      else if(r.status==='SOURCE_RECEIPT_METADATA_MISMATCH')metadataMismatch++;
      else if(r.status==='ORIGINAL_BYTES_HASH_MISMATCH')mismatched++;
      else matched++;
    }
    return {
      prediction_id:p.prediction_id,sport:p.sport,event_id:p.event_id,
      model_version:p.model_version,
      first_source:examined.first_source,second_source:examined.second_source,
      pair_byte_consistency:examined.first_source.digest_matches_receipt &&
        examined.second_source.digest_matches_receipt &&
        examined.first_source.metadata_matches_receipt &&
        examined.second_source.metadata_matches_receipt?
          'BOTH_RESPONSE_HASHES_MATCH_UNATTESTED':'INCOMPLETE_OR_CONFLICTING',
      source_independence:'NOT_ATTESTED',
      reviewer_decision:'NOT_RECORDED',
      verified_outcome:false,
      dropdown_method:null,
      betting_eligible:false
    };
  });
  assert(matched+mismatched+metadataMismatch+missing===dossier.packets.length*2,
    'Incomplete response accounting');
  return {
    schema_version:1,kind:'BOTTLENECK_RAW_SOURCE_EVIDENCE_AUDIT_V1',
    research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED',
    generated_from_snapshot_utc:dossier.generated_from_snapshot_utc,
    source_dossier_sha256:sha(Buffer.from(JSON.stringify(dossier),'utf8')),
    inspected_review_packets:dossier.packets.length,
    source_receipts_expected:dossier.packets.length*2,
    private_raw_sources_supplied:evidence.length,
    hash_consistent_raw_sources:matched,
    hash_mismatched_raw_sources:mismatched,
    source_metadata_conflicts:metadataMismatch,
    raw_sources_missing:missing,
    by_packet:packets,
    raw_bytes_retained_in_output:false,
    independently_verified_results_added:0,
    independently_authenticated_source_origins:0,
    selected_method:null,scoring_authorised:false,betting_eligible:false,
    decision:'NO_AUTOMATIC_RESULT_CERTIFICATION_OR_METHOD_SELECTION',
    limitations:[
      'Matching a hash only shows that supplied bytes equal the existing recorded digest.',
      'A matching digest does not prove response retrieval time, provider authenticity or independence.',
      'Raw source bodies are read only from separately supplied local evidence, never network-fetched.',
      'No human review signatures or independent attestations are created by this program.',
      'No results feed, bookmaker data or model selection is changed.'
    ]
  };
}
