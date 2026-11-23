import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

const hex=/^[a-f0-9]{64}$/;
const stamp=value=>typeof value==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d/.test(value)&&
  /(Z|[+-]\d\d:\d\d)$/.test(value)&&Number.isFinite(Date.parse(value));
const text=value=>typeof value==='string'&&value.trim().length>0&&value.length<=2000;
const digest=value=>createHash('sha256').update(value).digest('hex');
const origin=value=>{
  assert(text(value),'Missing result source URL');
  const u=new URL(value);
  assert(u.protocol==='https:'&&!u.username&&!u.password&&
    !u.port&&!u.hash&&u.hostname.length>0,'Invalid source URL');
  return u.hostname.toLowerCase();
};
const prior=(start,end)=>stamp(start)&&stamp(end)&&Date.parse(start)<Date.parse(end);
const KINDS=new Set(['Schedule CSV receipt','Tournament PDF receipt','Reviewed facts fingerprint']);

const actionList=Object.freeze([
  'Retrieve and inspect the original provider response or preserved bytes; verify that the receipt digest corresponds to those exact bytes.',
  'Verify the event identity, participants, scheduled time, competition, completed/final status and settlement rules using original source context.',
  'Establish that the secondary result originates from a genuinely independent upstream publisher, not a mirror or downstream copy.',
  'Record a traceable external human review decision and unresolved disagreements; do not infer verification from matching text or domains.',
  'Reconcile verified outcomes separately from engine-version identity; never publish betting predictions or performance claims from this worklist.'
]);

/**
 * A source-dependence and manual-review dossier. No external fetching,
 * attestation, settlement, model selection, score computation or writer.
 * Pure function: identical inputs produce identical output.
 */
export function buildSourceVerificationDossier(worklist) {
  assert(worklist?.kind==='BOTTLENECK_RESULT_REVIEW_WORKLIST_V1'&&
    worklist.schema_version===1&&worklist.research_only===true&&
    worklist.model_validation==='UNVALIDATED'&&
    worklist.publication_gate==='BLOCKED'&&
    worklist.selected_method===null&&worklist.selection_eligible===false&&
    worklist.engine_mapping_status==='NONE_AUTHENTICATED'&&
    worklist.snapshot_time_replay===true&&worklist.live_freshness_not_established===true,
    'Unsafe or untraceable result worklist');
  assert(stamp(worklist.generated_from_snapshot_utc),'Invalid source snapshot timestamp');
  assert(Array.isArray(worklist.packets)&&
    Number.isInteger(worklist.review_packets)&&
    Number.isInteger(worklist.ready_claims)&&
    Number.isInteger(worklist.withheld_ready_claims)&&
    worklist.review_packets===worklist.packets.length&&
    worklist.ready_claims===worklist.review_packets+worklist.withheld_ready_claims&&
    worklist.withheld_ready_claims>=0,'Contradictory worklist counts');
  assert(Number.isInteger(worklist.verified_outcome_archive_rows)&&
    worklist.verified_outcome_archive_rows>=0,
    'Invalid outcome archive count');
  const seen=new Set(),eventSeen=new Set(),familyCounts=new Map(),sportCounts=new Map();
  const packets=[];
  for(const p of worklist.packets) {
    assert(p&&typeof p==='object'&&!Array.isArray(p)&&
      text(p.prediction_id)&&text(p.event_id)&&text(p.model_version)&&
      text(p.market)&&text(p.result_claim)&&
      p.review_state==='REVIEW_PACKET_READY_UNATTESTED'&&
      p.external_authenticity_established===false&&
      p.independent_outcome_verified===false&&
      p.linked_dropdown_engine===null&&p.scoring_authorised===false&&
      p.betting_eligible===false&&hex.test(p.snapshot_sha256||''),
      'Unsafe result packet or unsupported certification');
    assert(!seen.has(p.prediction_id),'Duplicate forecast identity');
    seen.add(p.prediction_id);
    const event=[p.sport,p.event_id,p.market,p.scheduled_start_utc].join('|');
    assert(!eventSeen.has(event),'Ambiguous same-event result packets');
    eventSeen.add(event);
    assert(['tennis','nfl'].includes(p.sport)&&
      p.market===(p.sport==='tennis'?'MATCH_WINNER':'GAME_RESULT_INCLUDING_OVERTIME'),
      'Unsupported sport-market settlement rules');
    assert(prior(p.forecast_recorded_at_utc,p.scheduled_start_utc)&&
      Date.parse(p.scheduled_start_utc)-Date.parse(p.forecast_recorded_at_utc)>=300000&&
      stamp(p.primary?.observed)&&stamp(p.secondary?.observed)&&
      Date.parse(p.primary.observed)>Date.parse(p.scheduled_start_utc)&&
      Date.parse(p.secondary.observed)>Date.parse(p.scheduled_start_utc)&&
      Date.parse(p.primary.observed)<=Date.parse(worklist.generated_from_snapshot_utc)&&
      Date.parse(p.secondary.observed)<=Date.parse(worklist.generated_from_snapshot_utc),
      'Result and prediction timestamps contradict the archived cutoff');
    assert(hex.test(p.primary?.hash||'')&&hex.test(p.secondary?.hash||'')&&
      p.primary.hash!==p.secondary.hash,'Missing or duplicated result digests');
    const a=origin(p.primary.url),b=origin(p.secondary.url);
    assert(a!==b,'Two result URL hosts must differ; independence still unproved');
    assert(KINDS.has(p.receipt_kind)&&text(p.source_label)&&
      text(p.source_description),'Unclassified secondary source receipt');
    const family=a+' -> '+b;
    familyCounts.set(family,(familyCounts.get(family)||0)+1);
    sportCounts.set(p.sport,(sportCounts.get(p.sport)||0)+1);
    packets.push(Object.freeze({
      prediction_id:p.prediction_id,event_id:p.event_id,sport:p.sport,
      model_version:p.model_version,market:p.market,
      reported_outcome:p.result_claim,
      forecast_receipt:p.snapshot_sha256,forecast_recorded_at_utc:p.forecast_recorded_at_utc,
      scheduled_start_utc:p.scheduled_start_utc,
      first_source:{host:a,url:p.primary.url,observed_at_utc:p.primary.observed,
        digest_sha256:p.primary.hash},
      second_source:{host:b,url:p.secondary.url,observed_at_utc:p.secondary.observed,
        digest_sha256:p.secondary.hash,type:p.receipt_kind},
      receipt_pair_fingerprint:digest(JSON.stringify([
        p.prediction_id,p.snapshot_sha256,p.result_claim,
        p.primary.hash,p.secondary.hash])),
      source_hosts_distinct:true,
      upstream_source_independence:'NOT_ESTABLISHED',
      original_raw_response_authenticity:'NOT_ESTABLISHED',
      external_human_review:'NOT_PERFORMED',
      independently_verified_outcome:false,
      verified_dropdown_engine:null,scoring_authorised:false,
      betting_eligible:false,status:'MANUAL_SOURCE_AND_SETTLEMENT_VERIFICATION_REQUIRED'
    }));
  }
  packets.sort((a,b)=>a.scheduled_start_utc.localeCompare(b.scheduled_start_utc)||
    a.prediction_id.localeCompare(b.prediction_id));
  const names=m=>Object.fromEntries([...m].sort(([a],[b])=>a.localeCompare(b)));
  return {
    schema_version:1,kind:'BOTTLENECK_SOURCE_VERIFICATION_DOSSIER_V1',
    research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED',
    generated_from_snapshot_utc:worklist.generated_from_snapshot_utc,
    snapshot_time_replay:true,live_freshness_not_established:true,
    total_ready_claims:worklist.ready_claims,
    inspectable_packets:packets.length,
    withheld_packets:worklist.withheld_ready_claims,
    by_sport:names(sportCounts),by_source_host_pair:names(familyCounts),
    certified_outcomes_added:0,
    archived_verified_outcome_records:worklist.verified_outcome_archive_rows,
    source_independence_certified:0,
    model_engine_identity_certified:0,
    selected_method:null,
    automatic_scoring_authorised:false,betting_eligible:false,
    manual_review_requirements:[...actionList],
    packets,
    status:'REVIEW_READY_NOT_INDEPENDENTLY_VERIFIED',
    decision:'ABSTAIN_PENDING_AUTHENTICATED_SOURCE_AND_HUMAN_REVIEW',
    limitations:[
      'Separate hostnames and matching results do not prove independent upstream publishers.',
      'This report contains source receipt hashes, not the original retrieved bytes or external attestation.',
      'The archived timestamp does not establish current provider freshness.',
      'No method from the website is linked to a verified as-issued engine version.',
      'Nothing in this report writes the settlement feed, selects a model or proves betting value.'
    ]
  };
}
