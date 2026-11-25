import test from 'node:test';
import assert from 'node:assert/strict';
import {METHODS,assessBottleneck} from './selector.mjs';
const H='a'.repeat(64), J='b'.repeat(64), K='c'.repeat(64), L='d'.repeat(64);
const event={id:'synthetic:game:1',sport:'football',startUTC:'2026-12-01T20:00:00Z',market:'FOOTBALL_90_MINUTE_1X2'};
const nowUTC='2026-11-30T12:00:00Z';
const controls={catalogue_registered:1000,catalogue_provenance_reviewed:true,user_approved_tournament:true};
function report(method_id,score=0.9){return {method_id,event_id:event.id,sport:'football',market:event.market,
  forecast_at_utc:'2026-11-30T10:00:00Z',published_at_utc:'2026-11-30T10:05:00Z',model_sha256:H,forecast_sha256:J,
  validation:{status:'INDEPENDENTLY_REVIEWED',prospective:true,inputs_as_of_cutoff_verified:true,outcomes_independently_verified:true,
    paired_set_sha256:K,reference_model_sha256:L,review_receipt_id:'synthetic-only',paired_count:150,
    baseline_log_loss:1.05,candidate_log_loss:score,delta_log_loss_ci95:[-.2,-.03]}};}
const run=(r,override={})=>assessBottleneck({event,assessments:r,controls,nowUTC,...override});
test('exactly six flat choices; compare is a utility rather than model',()=>{
  assert.deepEqual(METHODS.map(x=>x.id),['current','experimental','hybrid','compare','reliability','racing-top-four']);
  assert.equal(METHODS.filter(x=>x.kind==='predictor').length,5);
  assert.equal(METHODS.find(x=>x.id==='compare').kind,'tool');
});
test('actual incomplete gate prevents a selected method regardless of score',()=>{
  const r=run([report('experimental')],{controls:{catalogue_registered:286,catalogue_provenance_reviewed:false,user_approved_tournament:false}});
  assert.equal(r.status,'CATALOGUE_OR_APPROVAL_GATE_BLOCKED');assert.equal(r.selected_method,null);
});
test('empty or malformed event fails closed',()=>{
  assert.equal(run([],{event:{...event,startUTC:'invalid'}}).status,'INVALID_EVENT');
  assert.equal(run([],{event:{...event,startUTC:'2026-11-01T20:00:00Z'}}).selected_method,null);
  assert.equal(run([],{event:{...event,sport:'unknown'}}).status,'INVALID_EVENT');
});
test('no evidence means no selection',()=>{
  const r=run([]);assert.equal(r.status,'NO_ELIGIBLE_METHOD');assert.equal(r.selected_method,null);
  assert.equal(r.methods.find(x=>x.id==='compare').reason,'COMPARISON_TOOL_NOT_PREDICTOR');
});
test('forecast timestamps and contradictory values are rejected',()=>{
  const x=report('experimental');x.published_at_utc='2026-12-01T20:01:00Z';
  assert.equal(run([x]).methods.find(x=>x.id==='experimental').reason,'FORECAST_TIMING_UNVERIFIED');
  assert.equal(run([{...report('experimental'),forecast_sha256:'invalid'}]).selected_method,null);
});
test('invalid or weak statistical evidence cannot select',()=>{
  const x=report('experimental');x.validation.paired_count=99;
  assert.equal(run([x]).methods.find(x=>x.id==='experimental').reason,'INSUFFICIENT_MATCHED_PAIRS');
  x.validation.paired_count=150;x.validation.delta_log_loss_ci95=[-.2,.01];
  assert.equal(run([x]).selected_method,null);
  x.validation.delta_log_loss_ci95=[-.2,-.03];x.validation.candidate_log_loss=1.2;
  assert.equal(run([x]).selected_method,null);
});
test('reject duplicate reports; avoid silently choosing better revision',()=>{
  const r=run([report('current',.9),report('current',.8)]);
  assert.equal(r.selected_method,null);
  assert.equal(r.methods.find(x=>x.id==='current').reason,'DUPLICATE_OR_INVALID_ASSESSMENT');
});
test('require a common exact paired dataset and comparator',()=>{
  const a=report('current',.95),b=report('experimental',.85);
  b.validation.paired_set_sha256=J;
  assert.equal(run([a,b]).status,'INCOMPARABLE_EVENT_SETS');
  assert.equal(run([a,b]).selected_method,null);
});
test('on synthetic, independently reviewed flags and all gates, choose lowest valid log loss',()=>{
  const r=run([report('current',.95),report('experimental',.85),report('hybrid',.88)]);
  assert.equal(r.status,'RESEARCH_METHOD_SCREENED_NOT_DEPLOYED');
  assert.equal(r.selected_method,'experimental');
  assert.equal(r.selection_is_betting_advice,false);
  assert.match(r.not_attested,/external audit/);
});
test('reject inapplicable racing model and never select compare',()=>{
  const r=run([report('compare',.1),report('racing-top-four',.1)]);
  assert.equal(r.selected_method,null);
  assert.equal(r.methods.find(x=>x.id==='racing-top-four').reason,'SPORT_NOT_SUPPORTED');
});
test('does not modify source objects',()=>{
  const input=[report('current')],snapshot=JSON.stringify(input);
  run(input);assert.equal(JSON.stringify(input),snapshot);
});