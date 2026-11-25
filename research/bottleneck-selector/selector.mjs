// Research-only readiness and evidence-based method routing.
// No website integration, betting decisions, model fitting or performance claims.
const definitions = [
  {id:'current',label:'Current Engine 2.5',kind:'predictor',sports:['football','horse-racing','tennis','nfl','darts','rugby-union','rugby-league']},
  {id:'experimental',label:'Experimental Engine 3.0',kind:'predictor',sports:['football']},
  {id:'hybrid',label:'Hybrid Engine 3.1: Football',kind:'predictor',sports:['football']},
  {id:'compare',label:'Side-by-Side Compare',kind:'tool',sports:[]},
  {id:'reliability',label:'Historical Reliability Model',kind:'predictor',sports:['football']},
  {id:'racing-top-four',label:'Racing Top Four · V1',kind:'predictor',sports:['horse-racing']}
];
export const METHODS = Object.freeze(definitions.map(m=>Object.freeze({...m,sports:Object.freeze([...m.sports])})));
const byId = new Map(METHODS.map(m=>[m.id,m]));
const aliases = Object.freeze({racing:'horse-racing',rugby_union:'rugby-union',rugby_league:'rugby-league'});
const instant = value => typeof value==='string' && /T.*(?:Z|[+-]\d\d:\d\d)$/.test(value) ? Date.parse(value) : NaN;
const hash = value => typeof value==='string' && /^[a-f0-9]{64}$/.test(value);
const finite = value => typeof value==='number' && Number.isFinite(value);
const meaningful = value => typeof value==='string' && value.trim().length>0;
const sportOf = s => typeof s==='string' ? (aliases[s]||s) : '';

// The assessment's score must come from exactly the same sealed comparison set
// as every other candidate it is compared against. These are metadata checks,
// NOT independent authentication of the underlying archive or reviewer.
function inspect(report,event,sport,now) {
  if(!report || typeof report!=='object') return 'MISSING_ASSESSMENT';
  if(report.event_id!==event.id || report.sport!==sport || report.market!==event.market) return 'EVENT_OR_MARKET_MISMATCH';
  const forecast = instant(report.forecast_at_utc);
  const published = instant(report.published_at_utc);
  const start = instant(event.startUTC);
  if(!Number.isFinite(forecast)||!Number.isFinite(published) || forecast>published || published>now || !(published<start)) return 'FORECAST_TIMING_UNVERIFIED';
  if(!hash(report.model_sha256) || !hash(report.forecast_sha256)) return 'MISSING_CODE_OR_FORECAST_HASH';
  const v=report.validation;
  if(v?.status!=='INDEPENDENTLY_REVIEWED' || v.prospective!==true || v.inputs_as_of_cutoff_verified!==true || v.outcomes_independently_verified!==true) return 'NOT_INDEPENDENTLY_VERIFIED';
  if(!hash(v.paired_set_sha256) || !hash(v.reference_model_sha256) || !meaningful(v.review_receipt_id)) return 'UNTRACEABLE_COMPARISON';
  if(!Number.isInteger(v.paired_count) || v.paired_count<100) return 'INSUFFICIENT_MATCHED_PAIRS';
  if(!finite(v.baseline_log_loss)||!finite(v.candidate_log_loss) || v.baseline_log_loss<0 || v.candidate_log_loss<0) return 'INVALID_PROPER_SCORE';
  if(!Array.isArray(v.delta_log_loss_ci95) || v.delta_log_loss_ci95.length!==2 ||
    !v.delta_log_loss_ci95.every(finite) || v.delta_log_loss_ci95[0]>v.delta_log_loss_ci95[1]) return 'INVALID_CONFIDENCE_INTERVAL';
  if(!(v.candidate_log_loss<v.baseline_log_loss && v.delta_log_loss_ci95[1]<0)) return 'NO_SUPPORTED_SCORE_IMPROVEMENT';
  // Identical historical fixtures, published model versions, source timestamps,
  // and comparators are prerequisites to any later genuine external validation.
  return null;
}

/**
 * Pure, deterministic safety-first selector, never a betting recommendation.
 * Without completed catalogue/user review and credible evidence the chosen ID
 * is always null. Reviewer metadata are assertions, not authenticated evidence.
 */
export function assessBottleneck({event,assessments=[],controls={},nowUTC}={}) {
  const now=instant(nowUTC);
  const sport=sportOf(event?.sport);
  const start=instant(event?.startUTC);
  const valid=meaningful(event?.id) && meaningful(event?.market) &&
    Number.isFinite(now) && Number.isFinite(start) && start>now &&
    METHODS.some(m=>m.sports.includes(sport));
  const gates={
    catalogue_complete:Number.isInteger(controls.catalogue_registered) && controls.catalogue_registered>=1000,
    provenance_reviewed:controls.catalogue_provenance_reviewed===true,
    user_approved:controls.user_approved_tournament===true
  };
  const unlocked=Object.values(gates).every(Boolean);
  const reports=new Map();const duplicates=new Set();
  if(Array.isArray(assessments)) for(const r of assessments){
    if(!meaningful(r?.method_id))continue;
    if(reports.has(r.method_id))duplicates.add(r.method_id);
    else reports.set(r.method_id,r);
  }
  const rows=METHODS.map(method=>{
    let reason;
    if(method.kind==='tool') reason='COMPARISON_TOOL_NOT_PREDICTOR';
    else if(!valid)reason='INVALID_OR_UNSUPPORTED_EVENT';
    else if(!method.sports.includes(sport))reason='SPORT_NOT_SUPPORTED';
    else if(!Array.isArray(assessments) || duplicates.has(method.id))reason='DUPLICATE_OR_INVALID_ASSESSMENT';
    else reason=inspect(reports.get(method.id),event,sport,now)||'EVIDENCE_SCREEN_PASSED';
    return Object.freeze({id:method.id,label:method.label,kind:method.kind,applicable:reason!=='SPORT_NOT_SUPPORTED' && reason!=='COMPARISON_TOOL_NOT_PREDICTOR' && valid,reason});
  });
  if(!valid) return Object.freeze({status:'INVALID_EVENT',selected_method:null,selection_is_betting_advice:false,gates,methods:rows});
  if(!unlocked) return Object.freeze({status:'CATALOGUE_OR_APPROVAL_GATE_BLOCKED',selected_method:null,selection_is_betting_advice:false,gates,methods:rows});
  const candidates=rows.filter(x=>x.reason==='EVIDENCE_SCREEN_PASSED').map(row=>({method:row,report:reports.get(row.id)}));
  if(!candidates.length) return Object.freeze({status:'NO_ELIGIBLE_METHOD',selected_method:null,selection_is_betting_advice:false,gates,methods:rows});
  const groups=new Set(candidates.map(c=>c.report.validation.paired_set_sha256+'|'+c.report.validation.reference_model_sha256));
  if(groups.size!==1) return Object.freeze({status:'INCOMPARABLE_EVENT_SETS',selected_method:null,selection_is_betting_advice:false,gates,methods:rows});
  candidates.sort((a,b)=>a.report.validation.candidate_log_loss-b.report.validation.candidate_log_loss ||
    METHODS.findIndex(m=>m.id===a.method.id)-METHODS.findIndex(m=>m.id===b.method.id));
  return Object.freeze({status:'RESEARCH_METHOD_SCREENED_NOT_DEPLOYED',selected_method:candidates[0].method.id,
    selection_is_betting_advice:false,not_attested:'Metadata assertions require independent external audit before any deployment.',
    gates,methods:rows});
}