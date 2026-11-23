import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import Validation from '../../validation-centre/core.js';

const STATES=new Set(['AWAITING_EVENT','AWAITING_PRIMARY_FINAL','AWAITING_INDEPENDENT_SOURCE',
  'SECONDARY_CONFLICT','SECONDARY_INVALID','READY_FOR_HUMAN_REVIEW','IDENTITY_CONFLICT','ARCHIVE_INVALID']);
const goodTime=value=>typeof value==='string'&&/T.*(?:Z|[+-]\d\d:\d\d)$/.test(value)&&Number.isFinite(Date.parse(value));
const digest=value=>createHash('sha256').update(value).digest('hex');
const safe=doc=>doc?.schema_version===1&&doc.research_only===true&&
  doc.model_validation==='UNVALIDATED'&&doc.publication_gate==='BLOCKED';
const eventKey=(sport,id,start)=>JSON.stringify([sport,id,start]);

/**
 * Read-only manual result-review worklist, never an outcome certifier.
 * Reuses the repository's existing exact matching and primary/secondary checks.
 * The generated list is a snapshot-time replay; don't mistake it for live freshness.
 */
export function buildReviewWorklist({bridge,identity,ledger,results,review,primary,secondary,
  sourceTexts={}}={}){
  assert(bridge?.kind==='BOTTLENECK_EVIDENCE_BRIDGE_V1'&&bridge.research_only===true&&
    bridge.publication_gate==='BLOCKED'&&bridge.selection_eligible===false&&
    bridge.selected_method===null,'Invalid Bottleneck evidence bridge');
  assert(identity?.kind==='BOTTLENECK_METHOD_IDENTITY_V1'&&
    identity.publication_gate==='BLOCKED'&&identity.selection_eligible===false&&
    identity.selected_method===null&&Array.isArray(identity.dropdown_methods)&&
    identity.dropdown_methods.length===6&&
    identity.dropdown_methods.every(m=>m.verified_engine_version===null&&
      m.selection_eligible===false),'Unverified engine identity was promoted');
  assert(ledger?.schemaVersion===1&&ledger.kind==='PROSPECTIVE_PREDICTION_LEDGER'&&
    ledger.modelValidated===false&&Array.isArray(ledger.records),'Invalid forecast ledger');
  assert(results?.schemaVersion===1&&results.kind==='VERIFIED_OUTCOME_FEED'&&
    Array.isArray(results.records),'Invalid outcome archive');
  assert(safe(review)&&safe(primary)&&safe(secondary)&&
    Array.isArray(review.items)&&Array.isArray(primary.observations)&&
    Array.isArray(secondary.observations),'Review or observation source failed safety contract');
  assert(review.independently_verified_results_added===0&&goodTime(review.generated_at_utc)&&
    goodTime(primary.generated_at_utc)&&goodTime(secondary.generated_at_utc)&&
    Date.parse(primary.generated_at_utc)<=Date.parse(review.generated_at_utc)&&
    Date.parse(secondary.generated_at_utc)<=Date.parse(review.generated_at_utc),
    'Invalid review chronology or unauthorised auto-certification');
  assert(Number.isInteger(review.total_predictions_checked)&&
    review.total_predictions_checked===review.items.length&&
    review.items.length<=ledger.records.length,'Review count mismatch');
  assert(review.status_counts&&typeof review.status_counts==='object'&&
    !Array.isArray(review.status_counts)&&
    Object.keys(review.status_counts).every(k=>STATES.has(k)&&
      Number.isInteger(review.status_counts[k])&&review.status_counts[k]>=0),
    'Invalid review status counters');

  const preds=new Map(), uniqueEvent=new Map(), states=new Map();
  for(const p of ledger.records){
    assert(typeof p?.prediction_id==='string'&&!preds.has(p.prediction_id)&&
      Validation.validatePrediction(p)===null&&
      p.research_only===true&&p.model_validated===false&&
      goodTime(p.source_observed_at_utc)&&
      Date.parse(p.source_observed_at_utc)<=Date.parse(p.recorded_at_utc)&&
      typeof p.training_fingerprint==='string'&&/^[a-f0-9]{64}$/.test(p.training_fingerprint)&&
      typeof p.source_fingerprint==='string'&&/^[a-f0-9]{64}$/.test(p.source_fingerprint),
      'Invalid or duplicated archived forecast');
    preds.set(p.prediction_id,p);
    const k=eventKey(p.sport,p.event_id,p.event_start_utc);
    if(!uniqueEvent.has(k))uniqueEvent.set(k,[]);
    uniqueEvent.get(k).push(p);
  }
  assert(preds.size===bridge.prospective.forecasts,'Evidence bridge forecast count drift');
  assert(results.records.length===bridge.prospective.outcome_archive_rows,
    'Evidence bridge outcome count drift');

  const reviewIDs=new Set();
  for(const row of review.items){
    assert(typeof row?.prediction_id==='string'&&!reviewIDs.has(row.prediction_id),
      'Duplicate or missing review identity');
    reviewIDs.add(row.prediction_id);
    const p=preds.get(row.prediction_id);
    assert(p&&row.sport===p.sport&&row.event_id===p.event_id&&
      row.event_start_utc===p.event_start_utc&&STATES.has(row.review_state)&&
      row.auto_certified===false&&row.betting_eligible===false,
      'Review item contradicts frozen prediction');
    if(row.observed_result!==null&&row.observed_result!==undefined)
      assert(Object.hasOwn(p.probabilities,row.observed_result),
        'Review outcome is not a forecast participant');
    states.set(row.review_state,(states.get(row.review_state)||0)+1);
  }
  assert(Object.entries(review.status_counts).every(([k,v])=>(states.get(k)||0)===v)&&
    [...states].every(([k,v])=>review.status_counts[k]===v),
    'Review states/counts contradict one another');
  const replayAt=Date.parse(review.generated_at_utc);
  const evidence=Validation.reviewReceipts(review,ledger,primary,secondary,replayAt);
  assert(evidence.reason===null&&Array.isArray(evidence.matches),
    'Source review receipts are not usable for exact snapshot-time matching');

  const byKey=new Map(),readyCount=states.get('READY_FOR_HUMAN_REVIEW')||0;
  for(const row of review.items.filter(x=>x.review_state==='READY_FOR_HUMAN_REVIEW')){
    const key=eventKey(row.sport,row.event_id,row.event_start_utc);
    if(!byKey.has(key))byKey.set(key,[]);
    byKey.get(key).push(row);
  }
  const packets=[],taken=new Set();
  for(const match of evidence.matches){
    const k=eventKey(match.sport,match.eventId,match.kickoff);
    const rows=byKey.get(k),forecasts=uniqueEvent.get(k);
    // A shared event with multiple forecast versions is NOT proof of which one
    // the review receipt belongs to; postpone until exact ID is exposed.
    if(!rows||rows.length!==1||!forecasts||forecasts.length!==1||taken.has(k))continue;
    const row=rows[0],p=forecasts[0];
    if(row.prediction_id!==p.prediction_id)continue;
    taken.add(k);
    packets.push({
      prediction_id:p.prediction_id,sport:p.sport,event_id:p.event_id,
      market:p.market,model_version:p.model_version,
      forecast_recorded_at_utc:p.recorded_at_utc,
      scheduled_start_utc:p.event_start_utc,snapshot_sha256:p.snapshot_sha256,
      result_claim:row.observed_result,source_label:match.label,
      source_description:match.description,receipt_kind:match.receiptKind,
      primary:match.primary,secondary:match.secondary,
      review_state:'REVIEW_PACKET_READY_UNATTESTED',
      external_authenticity_established:false,
      independent_outcome_verified:false,linked_dropdown_engine:null,
      scoring_authorised:false,betting_eligible:false
    });
  }
  packets.sort((a,b)=>a.scheduled_start_utc.localeCompare(b.scheduled_start_utc)||
    a.prediction_id.localeCompare(b.prediction_id));
  assert(packets.length<=readyCount,'Review evidence cannot exceed ready queue');
  const inputHashes=Object.fromEntries(Object.entries(sourceTexts).map(([k,text])=>{
    assert(typeof text==='string','Missing source text');
    return [k,digest(text)];
  }));
  return {
    schema_version:1,kind:'BOTTLENECK_RESULT_REVIEW_WORKLIST_V1',
    research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED',
    generated_from_snapshot_utc:review.generated_at_utc,
    snapshot_time_replay:true,live_freshness_not_established:true,
    frozen_forecasts:ledger.records.length,verified_outcome_archive_rows:results.records.length,
    ready_claims:readyCount,review_packets:packets.length,
    withheld_ready_claims:readyCount-packets.length,
    state_counts:Object.fromEntries([...states].sort(([a],[b])=>a.localeCompare(b))),
    engine_mapping_status:'NONE_AUTHENTICATED',
    selected_method:null,selection_eligible:false,
    input_hashes:inputHashes,packets,
    decision:'HUMAN_REVIEW_REQUIRED_NO_AUTOMATIC_SETTLEMENT_OR_METHOD_PROMOTION',
    limitations:[
      'Two agreeing source records may share an upstream origin and are not independently authenticated.',
      'This is a replay of the saved evidence queue at publication time, not a current-source refresh.',
      'Neither observed winners nor matching result claims have been added to results-feed.json.',
      'Exact source model identity is not a verified dropdown-engine mapping.',
      'No retrospective reconstruction, review packet, or sample count establishes positive betting EV.'
    ]
  };
}
