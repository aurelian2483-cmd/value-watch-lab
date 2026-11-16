/* V3+ Horse Racing: per-selection evidence label, NOT a selection engine.
 * V3 archive coverage is global. Without a race/horse/source-ID crosswalk
 * it must NEVER be represented as confirming any particular selection.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root && root.document)root.ValueWatchHorseV3Plus=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const scriptBase=typeof document!=="undefined"?(document.currentScript?.src||document.querySelector('script[src*="horse-v3plus.js"]')?.src||new URL("paper-lab/horse-v3plus.js",document.baseURI).href):"https://example.invalid/paper-lab/horse-v3plus.js";
  const STATUS_URL=new URL("../horse-research-status.json",scriptBase).href;
  let state={ok:false,reason:"Evidence not loaded",forecastCount:0,generated:null};
  const targets=new Set();
  const REQUIRED=["current_day_races_with_source_observation","current_day_stale_last_observation_over_60m",
      "current_day_changes_observed","v1_frozen_forecasts","v3_frozen_forecasts","historical_conflicting_field_races"];
  function validate(d,now=Date.now()){
    if(!d||d.kind!=="HORSE_RESEARCH_PUBLIC_READONLY_STATUS_V1"||d.research_only!==true||
       d.model_validation!=="UNVALIDATED"||d.publication_gate!=="BLOCKED"||
       d.betting_eligible!==false||d.model_recommendations_enabled!==false||
       d.official_withdrawal_match_status!=="NOT_VERIFIED"||d.bsp_comparison_status!=="NOT_AVAILABLE"||
       !d.metrics||typeof d.metrics!=="object")
      return {ok:false,reason:"Unapproved research evidence"};
    if(REQUIRED.some(k=>!Number.isSafeInteger(d.metrics[k])||d.metrics[k]<0))
      return {ok:false,reason:"Invalid research counts"};
    if(typeof d.report_generated_at_utc!=="string"||!/(?:Z|[+-]\d{2}:\d{2})$/.test(d.report_generated_at_utc))
      return {ok:false,reason:"Missing UTC timestamp"};
    const at=Date.parse(d.report_generated_at_utc);
    if(!Number.isFinite(at)||at>now+300000||now-at>3600000)
      return {ok:false,reason:"Research evidence stale or future-dated"};
    return {ok:true,forecastCount:d.metrics.v3_frozen_forecasts,generated:d.report_generated_at_utc};
  }
  function wording(s=state){
    if(!s.ok)return {badge:"V3+ UNAVAILABLE",detail:"V3+ model evidence unavailable ("+s.reason+"). No endorsement or betting adjustment.",active:false};
    if(s.forecastCount===0)return {badge:"V3+ AWAITING FORECAST",detail:"No eligible V3 horse forecasts archived. V1+V3 combination and horse-specific backing unavailable.",active:false};
    return {badge:"V3+ RESEARCH ONLY",detail:"V3 archives exist, but there is no verified horse-level crosswalk or calibrated ensemble for this selection. No V3 backing inferred.",active:false};
  }
  function render(node){
    if(!node||!node.isConnected)return;
    node.replaceChildren();
    const info=wording();
    const label=document.createElement("strong");label.textContent=info.badge;label.className="horse-v3plus-label";
    const note=document.createElement("span");note.textContent=info.detail;note.className="horse-v3plus-note";
    node.className="horse-v3plus-indicator";node.dataset.v3Plus="blocked";
    const originLabel=document.createElement("span");originLabel.textContent="Selection source: "+(node.dataset.modelOrigin||"Model source unverified");originLabel.className="horse-v3plus-note";
    node.append(label,originLabel,note);
  }
  function origin(model){
    const m=model&&typeof model.name==="string"?model.name:"";
    if(m==="FORM_PERCENTILE_SOFTMAX_RESEARCH_V1")return "V1 · unvalidated";
    if(m==="V3_FIXED_DISTANCE_SURFACE_RESEARCH")return "V3+ · unvalidated";
    if(model?.probabilityKind==="EXPERIMENTAL_CONTEXT_WEIGHT")return "Context model · separate";
    return "Model source unverified";
  }
  function attach(container,sport,model=null){
    if(!container||sport!=="racing")return;
    let marker=container.querySelector(".horse-v3plus-indicator");
    if(!marker){marker=document.createElement("div");container.append(marker);}
    marker.dataset.modelOrigin=origin(model);
    targets.add(marker);render(marker);
    // Reclaim detached references from cards and slips on subsequent updates.
    if(targets.size>200){for(const el of targets)if(!el.isConnected)targets.delete(el);}
  }
  async function refresh(){
    if(typeof fetch!=="function")return state;
    try{
      const abort=typeof AbortController!=="undefined"?new AbortController():null;
      const response=await fetch(STATUS_URL,{cache:"no-store",signal:abort?.signal});
      if(!response.ok)throw Error("No source status");
      state=validate(await response.json());
    }catch(_){state={ok:false,reason:"Source unavailable",forecastCount:0,generated:null};}
    if(typeof document!=="undefined")for(const el of targets){if(el.isConnected)render(el);else targets.delete(el);}
    return state;
  }
  if(typeof document!=="undefined"){
    document.addEventListener("DOMContentLoaded",()=>{refresh();});
  }
  return Object.freeze({validate,wording,origin,attach,refresh,status:()=>({...state})});
});

