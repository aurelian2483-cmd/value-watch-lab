"use strict";
const {chromium}=require("playwright");
const {spawn}=require("node:child_process");
const http=require("node:http");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const now=new Date();
const status={kind:"HORSE_RESEARCH_PUBLIC_READONLY_STATUS_V1",research_only:true,model_validation:"UNVALIDATED",
 publication_gate:"BLOCKED",betting_eligible:false,model_recommendations_enabled:false,
 official_withdrawal_match_status:"NOT_VERIFIED",bsp_comparison_status:"NOT_AVAILABLE",
 report_generated_at_utc:now.toISOString(),
 metrics:{current_day_races_with_source_observation:13,current_day_stale_last_observation_over_60m:3,
 current_day_changes_observed:3,v1_frozen_forecasts:66,v3_frozen_forecasts:0,historical_conflicting_field_races:10}};
async function probe(){return new Promise((resolve,reject)=>{const req=http.get("http://127.0.0.1:8140/",r=>{r.resume();resolve(r.statusCode)});req.on("error",reject)})}
async function main(){
 const server=spawn("python3",["-m","http.server","8140","--bind","127.0.0.1"],{stdio:"ignore"});
 let browser;
 try{
  let ready=false;for(let i=0;i<35;i++){try{if(await probe()===200){ready=true;break}}catch(_){}
   await new Promise(r=>setTimeout(r,200))}
  assert.ok(ready,"HTTP test server unavailable");
  browser=await chromium.launch({headless:true});
  for(const pathname of ["/","/paper-lab/"]){
   for(const width of [1365,390]){
    const page=await browser.newPage({viewport:{width,height:840}});
    const errors=[];page.on("pageerror",e=>errors.push(e.message));
    const root="http://127.0.0.1:8140";
    await page.route("**/horse-research-status.json",route=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(status)}));
    await page.goto(root+pathname,{waitUntil:"domcontentloaded"});
    await page.waitForFunction(()=>Boolean(window.ValueWatchHorseV3Plus));
    await page.waitForFunction(()=>window.ValueWatchHorseV3Plus.status().ok===true);
    const check=await page.evaluate(()=>{
      const box=document.createElement("section");box.id="v3plus-test";document.body.append(box);
      const api=window.ValueWatchHorseV3Plus;
      api.attach(box,"racing",{name:"FORM_PERCENTILE_SOFTMAX_RESEARCH_V1"});
      const v1=box.innerText;
      api.attach(box,"racing",{name:"V3_FIXED_DISTANCE_SURFACE_RESEARCH"});
      const v3=box.innerText;
      api.attach(box,"racing",{probabilityKind:"EXPERIMENTAL_CONTEXT_WEIGHT"});
      const ctx=box.innerText;
      return {v1,v3,ctx,modelBlocked:box.querySelector(".horse-v3plus-indicator").dataset.v3Plus};
    });
    assert.match(check.v1,/V1 · unvalidated/);
    assert.match(check.v3,/V3\+ · unvalidated/);
    assert.match(check.ctx,/Context model · separate/);
    assert.match(check.ctx,/V3\+ AWAITING FORECAST/);
    assert.equal(check.modelBlocked,"blocked");
    assert.ok(await page.locator("#slip-content").count(),"existing paper slips retained");
    assert.deepEqual(errors,[],"page javascript errors");
    const file=`/tmp/v3plus-${pathname==="/paper-lab/"?"paper":"home"}-${width}.png`;
    await page.screenshot({path:file,fullPage:false});
    await page.close();
   }
  }
  console.log("PASS real Chromium: home and paper desk at desktop/mobile, V1/V3+/context labels, blocked state and existing slips");
 }finally{if(browser)await browser.close();server.kill("SIGTERM")}
}
main().catch(e=>{console.error(e);process.exitCode=1});
