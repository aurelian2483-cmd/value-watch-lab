import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {METHODS} from './selector.mjs';

const digest = text => createHash('sha256').update(text).digest('hex');
const nonempty = s => typeof s === 'string' && s.length > 0;
const timestamp = value => typeof value === 'string' && /T.*(?:Z|[+-]\d\d:\d\d)$/.test(value) && Number.isFinite(Date.parse(value));
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const finite = n => typeof n === 'number' && Number.isFinite(n);

const SOURCES = Object.freeze({
  current: {path:'paper-lab/engine.js',anchor:'const modelRows = list(document.experimental_model_forecasts);',role:'event feed and baseline display; not an exact engine version receipt'},
  experimental: {path:'paper-lab/experimental.js',anchor:'function marketCandidate(recentForm, decimalOdds)',role:'market-mixing calculation; no frozen standalone output in canonical ledger'},
  hybrid: {path:'paper-lab/hybrid.js',anchor:"const model = 'CURRENT_SEASON_POISSON_COMPARISON_V1'",role:'underlying football model; not a versioned hybrid output'},
  compare: {path:'paper-lab/desk-compact-20261116.js',anchor:"engineView === 'bottleneck'",role:'interface tool; never forecast model evidence'},
  reliability: {path:'paper-lab/reliability-core.js',anchor:"status:'FORM_CANDIDATE'",role:'historical pattern filter; not a calibrated probability vector'},
  'racing-top-four': {path:'paper-lab/sport-methods.js',anchor:'function topFour(weights)',role:'top-four probability transform; depends on separately frozen racing inputs'}
});

function assertBlocked(data, name) {
  assert(data?.research_only === true && data.model_validation === 'UNVALIDATED' &&
    data.publication_gate === 'BLOCKED',name + ': research publication gates changed');
}

function inspectLedger(ledger) {
  assert(ledger?.schemaVersion === 1 && ledger.kind === 'PROSPECTIVE_PREDICTION_LEDGER' &&
    ledger.modelValidated === false && Array.isArray(ledger.records),'Invalid prospective ledger');
  const ids = new Set(), groups = new Map();
  for (const p of ledger.records) {
    assert(nonempty(p.prediction_id) && !ids.has(p.prediction_id),'Missing/duplicate prediction_id');
    ids.add(p.prediction_id);
    assert(nonempty(p.event_id) && nonempty(p.sport) && nonempty(p.market) &&
      nonempty(p.model_version),'Missing exact forecast identity');
    assert(p.research_only === true && p.model_validated === false,'Unblocked forecast record');
    assert(timestamp(p.recorded_at_utc) && timestamp(p.event_start_utc) &&
      timestamp(p.source_observed_at_utc) &&
      Date.parse(p.source_observed_at_utc) <= Date.parse(p.recorded_at_utc) &&
      Date.parse(p.recorded_at_utc) < Date.parse(p.event_start_utc),'Invalid pre-event chronology');
    assert(hash(p.snapshot_sha256) && hash(p.training_fingerprint) &&
      hash(p.source_fingerprint),'Untraceable archived prediction');
    const values = Object.values(p.probabilities || {});
    assert(values.length >= 2 && values.every(x=>finite(x)&&x>=0&&x<=1) &&
      Math.abs(values.reduce((a,b)=>a+b,0)-1) <= 1e-6,'Invalid probability vector');
    const key=[p.sport,p.market,p.model_version].join('|');
    groups.set(key,(groups.get(key)||0)+1);
  }
  return [...groups].map(([key,n])=>{
    const [sport,market,model_version]=key.split('|');
    return {sport,market,model_version,archived_forecasts:n,
      linked_dropdown_method:null,method_affiliation:'NOT_EVIDENCED'};
  }).sort((a,b)=>a.sport.localeCompare(b.sport)||a.market.localeCompare(b.market));
}

/** Inspect exact archived forecast receipts by source identity, NOT dropdown engine. */
export function lookupSourceForecast(ledger,{sport,event_id,market,model_version}={}) {
  assert([sport,event_id,market,model_version].every(nonempty),'Exact source lookup required');
  const reports=inspectLedger(ledger);
  if(!reports.some(x=>x.sport===sport&&x.market===market&&x.model_version===model_version))
    return {status:'NO_MATCHING_MODEL_VERSION',records:[]};
  const matches=ledger.records.filter(p=>p.sport===sport && p.event_id===event_id &&
    p.market===market && p.model_version===model_version);
  if(matches.length!==1) return {status:matches.length?'AMBIGUOUS_RECEIPTS':'NO_EXACT_EVENT_RECEIPT',records:[]};
  const p=matches[0];
  return {status:'SOURCE_RECEIPT_FOUND_ENGINE_AFFILIATION_UNVERIFIED',records:[{
    prediction_id:p.prediction_id,model_version:p.model_version,event_id:p.event_id,
    sport:p.sport,market:p.market,recorded_at_utc:p.recorded_at_utc,
    event_start_utc:p.event_start_utc,snapshot_sha256:p.snapshot_sha256,
    training_fingerprint:p.training_fingerprint,
    engine_method_id:null,independently_verified_outcome:false,betting_eligible:false
  }]};
}

export function buildMethodIdentityReport({bridge,ledger,football,racing,sourceTexts={}}) {
  assert(bridge?.kind==='BOTTLENECK_EVIDENCE_BRIDGE_V1' &&
    bridge.research_only===true && bridge.selection_eligible===false &&
    bridge.publication_gate==='BLOCKED' && bridge.selected_method===null,
    'Invalid or unlocked evidence bridge');
  const groups=inspectLedger(ledger);
  assert(ledger.records.length===bridge.prospective.forecasts,'Forecast count mismatch with bridge');
  assertBlocked(football,'football');
  assertBlocked(racing,'racing');
  assert(Array.isArray(football.experimental_model_forecasts) &&
    Array.isArray(racing.forecasts),'Missing forecast arrays');
  const footballModels=new Map();
  for(const p of football.experimental_model_forecasts){
    assert(p?.research_only===true && p.model_validation==='UNVALIDATED' &&
      p.publication_gate==='BLOCKED' && nonempty(p.model),
      'Unblocked or unversioned football research forecast');
    footballModels.set(p.model,(footballModels.get(p.model)||0)+1);
  }
  const models=Object.fromEntries([...footballModels].sort());
  const sources={};
  for(const method of METHODS){
    const evidence=SOURCES[method.id];
    assert(evidence,'Unregistered dropdown method');
    const file=sourceTexts[evidence.path];
    assert(typeof file==='string' && file.includes(evidence.anchor),
      method.id + ': exact source anchor not found');
    sources[method.id]={file:evidence.path,source_sha256:digest(file),source_role:evidence.role};
  }
  const racingModel=nonempty(racing.model)?racing.model:null;
  const rows=METHODS.map(m=>{
    const knownInput=m.id==='hybrid'?'CURRENT_SEASON_POISSON_COMPARISON_V1':
      m.id==='racing-top-four'?racingModel:null;
    let reason=m.kind==='tool'?'COMPARISON_TOOL_NOT_PREDICTOR':
      m.id==='reliability'?'RULE_FILTER_NO_STANDALONE_PROBABILITY':
      m.id==='racing-top-four' && racing.forecasts.length===0?'NO_PUBLISHED_RACING_FORECASTS':
      'NO_VERIFIED_METHOD_VERSION_TO_PREDICTION_RECEIPT_LINK';
    return {method_id:m.id,label:m.label,kind:m.kind,
      source:sources[m.id],known_input_version:knownInput,
      verified_engine_version:null,exact_ledger_receipts:0,
      independent_result_pairs:0,selection_eligible:false,reason};
  });
  return {schema_version:1,kind:'BOTTLENECK_METHOD_IDENTITY_V1',
    research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED',
    selected_method:null,selection_eligible:false,verified_betting_value:false,
    user_gate:bridge.catalogue,
    dropdown_methods:rows,source_ledger_groups:groups,
    experimental_football_unattributed:{count:football.experimental_model_forecasts.length,
      by_model:models,status:'NOT_AS_ISSUED_ATTESTED_NOT_A_DROPDOWN_ENGINE'},
    racing_current:{underlying_model_version:racingModel,
      current_forecast_count:racing.forecasts.length,source_only:true},
    historical_reconstructed:{events:bridge.historical.events,
      variants:bridge.historical.reconstructed_variants.map(x=>x.id),
      eligible_for_engine_selection:false},
    independent_outcome_rows:bridge.prospective.outcome_archive_rows,
    decision:'ABSTAIN_NO_AUTHENTICATED_DROPDOWN_MODEL_RECEIPT_MAPPING',
    limitations:[
      'Archived FIXED_ELO_K24_V1 tennis/NFL forecasts have not been linked to an exact dropdown engine revision.',
      'An underlying source version or code hash does not prove identical deployed engine identity.',
      'Website forecast records without independently attested publication/capture times are not prospective evidence.',
      'A reliability filter, top-four transform and comparison view are not standalone calibrated match-winner models.',
      'No prediction selection, bookmaker value or live publication is authorised.'
    ]};
}