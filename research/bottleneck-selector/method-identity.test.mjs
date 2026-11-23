import test from 'node:test';
import assert from 'node:assert/strict';
import {METHODS} from './selector.mjs';
import {buildMethodIdentityReport,lookupSourceForecast} from './method-identity.mjs';

const H='a'.repeat(64),J='b'.repeat(64),K='c'.repeat(64);
const sourceTexts={
  'paper-lab/engine.js':"const modelRows = list(document.experimental_model_forecasts);",
  'paper-lab/experimental.js':'function marketCandidate(recentForm, decimalOdds)',
  'paper-lab/hybrid.js':"const model = 'CURRENT_SEASON_POISSON_COMPARISON_V1'",
  'paper-lab/desk-compact-20261116.js':"engineView === 'bottleneck'",
  'paper-lab/reliability-core.js':"status:'FORM_CANDIDATE'",
  'paper-lab/sport-methods.js':'function topFour(weights)'
};
const p={prediction_id:'t:1:FIXED_ELO_K24_V1',event_id:'t:1',sport:'tennis',market:'MATCH_WINNER',
  model_version:'FIXED_ELO_K24_V1',recorded_at_utc:'2026-11-16T09:00:00Z',
  source_observed_at_utc:'2026-11-16T08:00:00Z',event_start_utc:'2026-11-16T20:00:00Z',
  snapshot_sha256:H,training_fingerprint:J,source_fingerprint:K,
  probabilities:{player1:.6,player2:.4},research_only:true,model_validated:false};
const ledger={schemaVersion:1,kind:'PROSPECTIVE_PREDICTION_LEDGER',modelValidated:false,records:[p]};
const bridge={kind:'BOTTLENECK_EVIDENCE_BRIDGE_V1',research_only:true,selection_eligible:false,
  publication_gate:'BLOCKED',selected_method:null,catalogue:{target:1000,registered:286,remaining:714,
    qualified:0,reviewed_and_approved:false},prospective:{forecasts:1,outcome_archive_rows:0},
  historical:{events:2,reconstructed_variants:[{id:'p_unadjusted'},{id:'p_recent_form_alpha_0_025'}]}};
const football={research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED',
  experimental_model_forecasts:[{model:'POISSON_BASELINE_2025_26_V1',research_only:true,
    model_validation:'UNVALIDATED',publication_gate:'BLOCKED'}]};
const racing={research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED',
  model:'CONTEXT_FORM_RESEARCH_V1',forecasts:[]};
const fixture={bridge,ledger,football,racing,sourceTexts};
const copy=x=>structuredClone(x);

test('all six existing dropdown options remain flat with compare a tool',()=>{
  assert.deepEqual(METHODS.map(x=>x.id),['current','experimental','hybrid','compare','reliability','racing-top-four']);
  const r=buildMethodIdentityReport(fixture);
  assert.deepEqual(r.dropdown_methods.map(x=>x.method_id),METHODS.map(x=>x.id));
  assert.equal(r.dropdown_methods.find(x=>x.method_id==='compare').kind,'tool');
  assert.equal(r.selected_method,null);
});

test('exact source archive is not falsely attributed to Current Engine 2.5',()=>{
  const r=buildMethodIdentityReport(fixture);
  assert.deepEqual(r.source_ledger_groups,[{sport:'tennis',market:'MATCH_WINNER',
    model_version:'FIXED_ELO_K24_V1',archived_forecasts:1,linked_dropdown_method:null,
    method_affiliation:'NOT_EVIDENCED'}]);
  assert(r.dropdown_methods.every(x=>x.verified_engine_version===null&&x.selection_eligible===false));
});

test('underlying hybrid source does not become an independently archived hybrid forecast',()=>{
  const r=buildMethodIdentityReport(fixture);
  const x=r.dropdown_methods.find(x=>x.method_id==='hybrid');
  assert.equal(x.known_input_version,'CURRENT_SEASON_POISSON_COMPARISON_V1');
  assert.equal(x.exact_ledger_receipts,0);
});

test('racing transform and reliability rule cannot be given synthetic standalone engine identities',()=>{
  const r=buildMethodIdentityReport(fixture);
  assert.equal(r.racing_current.underlying_model_version,'CONTEXT_FORM_RESEARCH_V1');
  assert.equal(r.dropdown_methods.find(x=>x.method_id==='racing-top-four').reason,'NO_PUBLISHED_RACING_FORECASTS');
  assert.equal(r.dropdown_methods.find(x=>x.method_id==='reliability').reason,'RULE_FILTER_NO_STANDALONE_PROBABILITY');
});

test('football dashboard model remains separate from method identity',()=>{
  const r=buildMethodIdentityReport(fixture);
  assert.deepEqual(r.experimental_football_unattributed.by_model,{POISSON_BASELINE_2025_26_V1:1});
  assert.equal(r.experimental_football_unattributed.status,'NOT_AS_ISSUED_ATTESTED_NOT_A_DROPDOWN_ENGINE');
});

test('lookup exact source receipt without assigning engine or alleging independent result',()=>{
  const r=lookupSourceForecast(ledger,{sport:'tennis',event_id:'t:1',market:'MATCH_WINNER',model_version:'FIXED_ELO_K24_V1'});
  assert.equal(r.status,'SOURCE_RECEIPT_FOUND_ENGINE_AFFILIATION_UNVERIFIED');
  assert.equal(r.records[0].engine_method_id,null);
  assert.equal(r.records[0].betting_eligible,false);
  assert.equal(r.records[0].snapshot_sha256,H);
  assert(!('probabilities' in r.records[0]));
});

test('wrong model, wrong event and partial identities return no source match',()=>{
  assert.equal(lookupSourceForecast(ledger,{sport:'tennis',event_id:'t:1',market:'MATCH_WINNER',model_version:'WRONG'}).status,'NO_MATCHING_MODEL_VERSION');
  assert.equal(lookupSourceForecast(ledger,{sport:'tennis',event_id:'missing',market:'MATCH_WINNER',model_version:'FIXED_ELO_K24_V1'}).status,'NO_EXACT_EVENT_RECEIPT');
  assert.throws(()=>lookupSourceForecast(ledger,{sport:'tennis'}),/Exact source lookup required/);
});

test('ambiguous receipts cannot silently choose the newer revision',()=>{
  const x=copy(ledger);x.records.push({...p,prediction_id:'another'});
  assert.equal(lookupSourceForecast(x,{sport:'tennis',event_id:'t:1',market:'MATCH_WINNER',model_version:'FIXED_ELO_K24_V1'}).status,'AMBIGUOUS_RECEIPTS');
});

test('duplicate IDs and late forecast timestamps fail closed',()=>{
  const a=copy(fixture);a.ledger.records.push(p);
  assert.throws(()=>buildMethodIdentityReport(a),/duplicate prediction_id/);
  const b=copy(fixture);b.ledger.records[0].recorded_at_utc='2026-11-16T21:00:00Z';
  assert.throws(()=>buildMethodIdentityReport(b),/chronology/);
});

test('missing receipt digests, abnormal probabilities, tampered report counts fail closed',()=>{
  const a=copy(fixture);a.ledger.records[0].training_fingerprint='x';
  assert.throws(()=>buildMethodIdentityReport(a),/Untraceable/);
  const b=copy(fixture);b.ledger.records[0].probabilities={a:0.8,b:0.8};
  assert.throws(()=>buildMethodIdentityReport(b),/Invalid probability/);
  const c=copy(fixture);c.bridge.prospective.forecasts=2;
  assert.throws(()=>buildMethodIdentityReport(c),/Forecast count mismatch/);
});

test('model identity source anchors must exist and remain traceable',()=>{
  const a=copy(fixture);a.sourceTexts['paper-lab/hybrid.js']='unsafe different code';
  assert.throws(()=>buildMethodIdentityReport(a),/source anchor not found/);
  const r=buildMethodIdentityReport(fixture);
  for(const x of r.dropdown_methods) assert.match(x.source.source_sha256,/^[a-f0-9]{64}$/);
});

test('live validation or betting claim is rejected',()=>{
  const a=copy(fixture);a.football.publication_gate='OPEN';
  assert.throws(()=>buildMethodIdentityReport(a),/research publication gates changed/);
  const b=copy(fixture);b.bridge.selection_eligible=true;
  assert.throws(()=>buildMethodIdentityReport(b),/Invalid or unlocked/);
});

test('source inputs are not mutated',()=>{
  const str=JSON.stringify(fixture);
  buildMethodIdentityReport(fixture);
  lookupSourceForecast(ledger,{sport:'tennis',event_id:'t:1',market:'MATCH_WINNER',model_version:'FIXED_ELO_K24_V1'});
  assert.equal(JSON.stringify(fixture),str);
});