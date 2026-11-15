"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {verify}=require("../v3-research/evidence-status.js");
const now=Date.parse("2026-11-15T14:00:00Z");
const fixture={
 kind:"HORSE_RESEARCH_PUBLIC_READONLY_STATUS_V1",
 research_only:true,model_validation:"UNVALIDATED",publication_gate:"BLOCKED",
 betting_eligible:false,model_recommendations_enabled:false,
 official_withdrawal_match_status:"NOT_VERIFIED",
 bsp_comparison_status:"NOT_AVAILABLE",
 report_generated_at_utc:"2026-11-15T13:50:00Z",
 metrics:{
 current_day_races_with_source_observation:13,
 current_day_stale_last_observation_over_60m:3,
 current_day_changes_observed:3,
 v1_frozen_forecasts:66,
 v3_frozen_forecasts:0,
 historical_conflicting_field_races:10
 }};
function check(f,message){assert.equal(f,message,true)}
assert.equal(verify(fixture,now).ok,true);
assert.equal(verify(fixture,now).stale,false);
assert.equal(verify({...fixture,report_generated_at_utc:"2026-11-15T12:30:00Z"},now).stale,true);
for(const [name,change] of Object.entries({
 missing_feed:()=>null,
 publication_open:x=>{x.publication_gate="OPEN"},
 validated_claim:x=>{x.model_validation="VALIDATED"},
 bets_enabled:x=>{x.model_recommendations_enabled=true},
 field_negative:x=>{x.metrics.v3_frozen_forecasts=-1},
 field_fraction:x=>{x.metrics.v3_frozen_forecasts=0.5},
 field_missing:x=>{delete x.metrics.current_day_changes_observed},
 future_time:x=>{x.report_generated_at_utc="2026-11-15T15:00:00Z"},
 missing_tz:x=>{x.report_generated_at_utc="2026-11-15T13:50:00"},
 bad_bsp:x=>{x.bsp_comparison_status="VERIFIED"}
 })){
 let value=JSON.parse(JSON.stringify(fixture));const ret=change(value);
 if(name==="missing_feed")value=ret;
 assert.equal(verify(value,now).ok,false,name);
}
const html=fs.readFileSync(path.join(__dirname,"../v3-research/index.html"),"utf8");
for(const fragment of ['id="horse-evidence"','id="horse-evidence-status"','id="horse-evidence-message"','id="v3-live-snapshot"','./live-compare.js','./evidence-status.js?v=1']){
 assert.ok(html.includes(fragment),fragment);
}
assert.ok(html.includes("BETTING PUBLICATION BLOCKED"));
assert.ok(fs.existsSync(path.join(__dirname,"../v3-research/lab.css")));
assert.ok(fs.existsSync(path.join(__dirname,"../v3-research/live-compare-core.js")));
assert.ok(fs.existsSync(path.join(__dirname,"../v3-research/live-compare.js")));
assert.ok(fs.existsSync(path.join(__dirname,"../v3-research/evidence-status.css")));
console.log("PASS: 12 UI evidence cases, all required V3 comparison assets and protected-page layout");
