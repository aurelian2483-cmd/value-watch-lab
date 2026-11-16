"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const V=require("../paper-lab/horse-v3plus.js");
const now=Date.parse("2026-11-15T14:05:00Z");
function sample(){
 return {kind:"HORSE_RESEARCH_PUBLIC_READONLY_STATUS_V1",research_only:true,model_validation:"UNVALIDATED",publication_gate:"BLOCKED",
 betting_eligible:false,model_recommendations_enabled:false,official_withdrawal_match_status:"NOT_VERIFIED",
 bsp_comparison_status:"NOT_AVAILABLE",report_generated_at_utc:"2026-11-15T14:00:00Z",
 metrics:{current_day_races_with_source_observation:13,current_day_stale_last_observation_over_60m:3,
 current_day_changes_observed:3,v1_frozen_forecasts:66,v3_frozen_forecasts:0,historical_conflicting_field_races:10}};
}
assert.deepEqual(V.validate(sample(),now),{ok:true,forecastCount:0,generated:"2026-11-15T14:00:00Z"});
for(const mutate of [
 o=>o.publication_gate="OPEN",o=>o.model_validation="VALIDATED",o=>o.betting_eligible=true,
 o=>o.model_recommendations_enabled=true,o=>o.metrics.v3_frozen_forecasts=-1,
 o=>o.metrics.v3_frozen_forecasts=0.5,o=>o.report_generated_at_utc="2026-11-15T11:00:00Z",
 o=>o.report_generated_at_utc="2026-11-15T15:00:00Z",
 o=>o.official_withdrawal_match_status="VERIFIED",o=>o.bsp_comparison_status="VERIFIED"]){
 const d=sample();mutate(d);assert.equal(V.validate(d,now).ok,false);
}
assert.equal(V.origin({name:"FORM_PERCENTILE_SOFTMAX_RESEARCH_V1"}),"V1 · unvalidated");
assert.equal(V.origin({name:"V3_FIXED_DISTANCE_SURFACE_RESEARCH"}),"V3+ · unvalidated");
assert.equal(V.origin({probabilityKind:"EXPERIMENTAL_CONTEXT_WEIGHT"}),"Context model · separate");
assert.equal(V.origin({name:"OTHER"}),"Model source unverified");
assert.equal(V.wording({ok:true,forecastCount:0}).active,false);
assert.match(V.wording({ok:true,forecastCount:0}).badge,/AWAITING/);
assert.equal(V.wording({ok:true,forecastCount:5}).active,false);
const desk=fs.readFileSync(path.join(__dirname,"../paper-lab/desk.js"),"utf8");
assert.match(desk,/ValueWatchHorseV3Plus\?\.attach\(reasonDetails, 'racing', leg\.model\)/);
assert.match(desk,/ValueWatchHorseV3Plus\?\.attach\(record\.racingPanel, 'racing', event\.model\)/);
for(const page of ["index.html","paper-lab/index.html"]){
 const html=fs.readFileSync(path.join(__dirname,"..",page),"utf8");
 assert.match(html,/horse-v3plus\.js\?v=1/);
 assert.match(html,/horse-v3plus\.css\?v=1/);
}
console.log("PASS: 19 V3+ status, model-origin, regression and page-wire checks; no bet qualification changes");
