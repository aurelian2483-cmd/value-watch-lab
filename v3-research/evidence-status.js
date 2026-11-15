"use strict";
(() => {
  const endpoint="../horse-research-status.json";
  const required=["current_day_races_with_source_observation","current_day_stale_last_observation_over_60m",
    "current_day_changes_observed","v1_frozen_forecasts","v3_frozen_forecasts","historical_conflicting_field_races"];
  const labels=[
    ["current_day_races_with_source_observation","Source-observed races today"],
    ["current_day_stale_last_observation_over_60m","Races with last observation >60 min old"],
    ["current_day_changes_observed","Publisher field changes today"],
    ["v1_frozen_forecasts","Historical V1 frozen forecasts"],
    ["v3_frozen_forecasts","Historical V3 frozen forecasts"],
    ["historical_conflicting_field_races","Unresolved historical field conflicts"]
  ];
  function verify(data, now) {
    if(!data || data.kind!=="HORSE_RESEARCH_PUBLIC_READONLY_STATUS_V1" ||
       data.research_only!==true || data.model_validation!=="UNVALIDATED" ||
       data.publication_gate!=="BLOCKED" || data.betting_eligible!==false ||
       data.model_recommendations_enabled!==false ||
       data.official_withdrawal_match_status!=="NOT_VERIFIED" ||
       data.bsp_comparison_status!=="NOT_AVAILABLE" ||
       !data.metrics || typeof data.metrics!=="object") return {ok:false,reason:"unsafe or incompatible research status"};
    for(const key of required) {
      const x=data.metrics[key];
      if(!Number.isSafeInteger(x) || x<0) return {ok:false,reason:"invalid research metric"};
    }
    if(typeof data.report_generated_at_utc!=="string" ||
       !/(?:Z|[+-]\d{2}:\d{2})$/.test(data.report_generated_at_utc))
      return {ok:false,reason:"missing timezone provenance"};
    const observed=Date.parse(data.report_generated_at_utc);
    if(!Number.isFinite(observed) || observed>now+300000) return {ok:false,reason:"invalid or future research timestamp"};
    const age=now-observed;
    if(age>3600000) return {ok:true,stale:true,age};
    return {ok:true,stale:false,age};
  }
  function cell(tag,value,cls) {
    const el=document.createElement(tag); el.textContent=String(value);
    if(cls)el.className=cls;return el;
  }
  function render(data, at=Date.now()) {
    const root=document.getElementById("horse-evidence-status");
    const message=document.getElementById("horse-evidence-message");
    if(!root || !message)return false;
    const result=verify(data,at);
    root.replaceChildren();
    if(!result.ok){
      message.textContent="Evidence status unavailable — "+result.reason+". No research metrics or betting conclusions can be inferred.";
      return false;
    }
    const generated=new Date(data.report_generated_at_utc);
    message.textContent=(result.stale?"STALE RESEARCH SNAPSHOT — ":"Research snapshot — ")+
      "generated "+generated.toLocaleString("en-GB",{timeZone:"Europe/London",hour12:false})+
      ". Publisher observations only; not an official withdrawal list or live odds.";
    const grid=cell("div","","evidence-metrics");
    for(const [key,label] of labels){
      const item=cell("article","","evidence-metric");
      item.append(cell("small",label),cell("strong",data.metrics[key]));
      grid.append(item);
    }
    root.append(grid);
    root.append(cell("p","Official withdrawal matches: NOT VERIFIED · Betfair BSP comparisons: NOT AVAILABLE · Model validation: UNVALIDATED · Betting publication: BLOCKED.","evidence-warning"));
    if(result.stale)root.append(cell("p","Data is more than 60 minutes old. Do not interpret it as current race coverage.","evidence-warning"));
    return true;
  }
  async function load() {
    const message=document.getElementById("horse-evidence-message");
    if(!message)return;
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),8000);
    try{
      const res=await fetch(endpoint,{cache:"no-store",signal:controller.signal});
      if(!res.ok)throw new Error("data not published");
      const body=await res.json();
      render(body);
    }catch(err){
      const root=document.getElementById("horse-evidence-status");
      if(root)root.replaceChildren();
      message.textContent="Evidence feed not published or temporarily unavailable. No research metrics inferred; betting remains blocked.";
    }finally{clearTimeout(timer)}
  }
  if(typeof module!=="undefined" && module.exports)module.exports={verify};
  if(typeof document!=="undefined"){
    document.addEventListener("DOMContentLoaded",()=>{
      document.getElementById("horse-evidence-refresh")?.addEventListener("click",load);
      load();
    });
  }
})();
