'use strict';
const assert=require('node:assert/strict');
const M=require('../wildcard/model-challenge.js');
const now=Date.parse('2026-11-13T01:20:00Z');
const generated='2026-11-13T01:10:00Z',start='2026-11-13T14:20:00Z';
const gates={research_only:true,publication_gate:'BLOCKED',model_validation:'UNVALIDATED',generated_at_utc:generated};
const forecast={race_id:'R1',race_name:'Test Race',racecourse:'Test',startUTC:start,model:'RESEARCH',
 challenge_eligible:0,independent_timestamp_attested:false,
 runners:[{horse_id:'H1',name:'Horse A',model_probability:.6},{horse_id:'H2',name:'Horse B',model_probability:.4}]};
const diag=M.inspectRace(forecast);
assert.equal(diag.topRunner,'Horse A');
assert.equal(diag.fieldSize,2);
assert(Math.abs(diag.normalizedEntropy-0.9709505944546686)<1e-10);
assert(Math.abs(diag.topGap-.2)<1e-10);
assert.equal(diag.uniformBaseline,.5);
assert.equal(diag.expectedValue,null);assert.equal(diag.verifiedPrice,null);
assert.equal(diag.eligible,false);
assert.equal(M.inspectRace({...forecast,runners:[{...forecast.runners[0],model_probability:.7},forecast.runners[1]]}),null);
assert.equal(M.inspectRace({...forecast,runners:[forecast.runners[0],{...forecast.runners[1],horse_id:'H1'}]}),null);
assert.equal(M.inspectRace({...forecast,runners:[{...forecast.runners[0],model_probability:1},forecast.runners[1]]}),null);
const horse={...gates,coverage:{observed_races:3},forecasts:[forecast]};
assert.equal(M.racing(horse,now).races.length,1);
assert.equal(M.racing({...horse,publication_gate:'OPEN'},now).races.length,0);
assert.equal(M.racing({...horse,generated_at_utc:'2026-11-12T18:00:00Z'},now).status,'STALE_OR_UNDATED');
assert.equal(M.racing({...horse,forecasts:[{...forecast,startUTC:'2026-11-12T12:00:00Z'}]},now).races.length,0);
assert.equal(M.racing({...horse,forecasts:[forecast,forecast]},now).excluded,1);
const next='2026-11-21T12:30:00Z',fixture={home:'A',away:'B',kickoff_utc:next,verification:'SCHEDULE_CROSS_CHECK'};
const football={...gates,upcoming_fixtures:[fixture],experimental_model_forecasts:[{home:'A',away:'B',kickoff_utc:next,
 prob_home:.6,prob_draw:.25,prob_away:.15,model:'CURRENT_2026_27',
 training_basis:{season:'2026_27',verified:true}}]};
assert.equal(M.football(football,now).eligible,1);
assert.equal(M.football({...football,experimental_model_forecasts:football.experimental_model_forecasts.map(x=>({...x,model:'POISSON_BASELINE_2025_26_V1',training_basis:null}))},now).excluded,1);
assert.equal(M.football({...football,generated_at_utc:'2026-11-11T00:00:00Z'},now).status,'STALE_OR_UNDATED');
const review=M.review(horse,football,now);
assert.equal(review.publicationGate,'BLOCKED');
assert.equal(review.expectedValue,null);
for(const k of ['benter','walters','bloom','robson'])assert(review[k].status&&review[k].note);
console.log('PASS: full-field probabilities, entropy, chronological and schema gates, current-season football, no fabricated EV');
