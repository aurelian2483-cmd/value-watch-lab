"use strict";
const { chromium } = require("playwright");
const {spawn} = require("node:child_process");
const http=require("node:http");
const fs=require("node:fs");
const assert=require("node:assert/strict");
const fixture={
  schema_version:1,kind:"HORSE_RESEARCH_PUBLIC_READONLY_STATUS_V1",
  research_only:true,model_validation:"UNVALIDATED",publication_gate:"BLOCKED",
  betting_eligible:false,model_recommendations_enabled:false,
  official_withdrawal_match_status:"NOT_VERIFIED",bsp_comparison_status:"NOT_AVAILABLE",
  report_generated_at_utc:new Date().toISOString(),
  metrics:{current_day_races_with_source_observation:13,current_day_stale_last_observation_over_60m:3,
    current_day_changes_observed:3,v1_frozen_forecasts:66,v3_frozen_forecasts:0,
    historical_conflicting_field_races:10}
};
async function probe(){
  return new Promise((resolve,reject)=>{
    const req=http.get("http://127.0.0.1:8139/v3-research/",res=>{res.resume();resolve(res.statusCode)});
    req.on("error",reject);req.setTimeout(5000,()=>req.destroy(new Error("HTTP timeout")));
  });
}
async function main(){
  const server=spawn("python3",["-m","http.server","8139","--bind","127.0.0.1"],{stdio:"ignore"});
  let browser;
  try{
    let listening=false;
    for(let i=0;i<30;i++){try{if(await probe()===200){listening=true;break}}catch(_){}
      await new Promise(r=>setTimeout(r,250));}
    assert.ok(listening,"HTTP preview unavailable");
    browser=await chromium.launch({headless:true});
    for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
      const page=await browser.newPage({viewport});
      const errors=[];
      page.on("pageerror",e=>errors.push(e.message));
      await page.route("**/horse-research-status.json",route=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(fixture)}));
      await page.route("**/racing-research-data.json",route=>route.fulfill({status:503,body:"source unavailable"}));
      await page.goto("http://127.0.0.1:8139/v3-research/",{waitUntil:"domcontentloaded"});
      await page.locator("#horse-evidence-status .evidence-metric").first().waitFor();
      assert.equal(await page.locator("#horse-evidence-status .evidence-metric").count(),6);
      assert.match(await page.locator("#horse-evidence-status").innerText(),/V1 frozen forecasts/);
      assert.match(await page.locator("#horse-evidence-status").innerText(),/66/);
      assert.ok(await page.locator("#v3-live-snapshot").count(),"existing comparison section retained");
      assert.ok(await page.locator(".pill").first().isVisible(),"research gate visible");
      assert.deepEqual(errors,[],"page javascript errors");
      await page.screenshot({path:`/tmp/v3-evidence-${viewport.width}.png`,fullPage:true});
      // Stale data must display warning.
      fixture.report_generated_at_utc=new Date(Date.now()-2*60*60*1000).toISOString();
      await page.locator("#horse-evidence-refresh").click();
      await page.getByText("STALE RESEARCH SNAPSHOT",{exact:false}).first().waitFor();
      fixture.report_generated_at_utc=new Date().toISOString();
      // Unavailable data must never retain old metrics.
      await page.route("**/horse-research-status.json",r=>r.fulfill({status:404,body:"not ready"}));
      await page.locator("#horse-evidence-refresh").click();
      await page.getByText("Evidence feed not published",{exact:false}).waitFor();
      assert.equal(await page.locator("#horse-evidence-status .evidence-metric").count(),0);
      await page.close();
    }
    console.log("PASS Chromium: desktop/mobile rendering, six metrics, stale/missing data, old comparison retained, no page errors");
  }finally{if(browser)await browser.close();server.kill("SIGTERM")}
}
main().catch(e=>{console.error(e);process.exitCode=1});
