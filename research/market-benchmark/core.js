'use strict';
// Research-only market benchmarking. No quotes are fetched or bets published.
(function(root,factory){
  const api=factory();
  if(typeof module==='object' && module.exports)module.exports=api;
  else root.ValueWatchMarketBenchmark=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const GATES=Object.freeze({research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED'});
  const finite=x=>typeof x==='number'&&Number.isFinite(x);
  const probability=x=>finite(x)&&x>=0&&x<=1;
  function vector(v){
    return Array.isArray(v)&&v.length>=2&&v.length<=50&&v.every(probability)&&Math.abs(v.reduce((a,b)=>a+b,0)-1)<1e-8;
  }
  function time(value){
    if(typeof value!=='string'||!/(Z|[+-]\d\d:\d\d)$/.test(value))return null;
    const n=Date.parse(value);
    return Number.isFinite(n)?n:null;
  }
  function deVig(odds){
    if(!Array.isArray(odds)||odds.length<2||odds.length>50||!odds.every(o=>finite(o)&&o>1))return null;
    const implied=odds.map(o=>1/o);
    const margin=implied.reduce((a,b)=>a+b,0);
    if(!finite(margin)||margin<=0)return null;
    return {probabilities:implied.map(p=>p/margin),overround:margin-1,method:'PROPORTIONAL_NORMALISATION'};
  }
  function score(probabilities,winnerIndex){
    if(!vector(probabilities)||!Number.isSafeInteger(winnerIndex)||winnerIndex<0||winnerIndex>=probabilities.length)return null;
    const logLoss=-Math.log(Math.max(Number.EPSILON,probabilities[winnerIndex]));
    const brier=probabilities.reduce((a,p,i)=>a+(p-(i===winnerIndex?1:0))**2,0);
    return {logLoss,brier};
  }
  function blend(model,market,weight){
    if(!vector(model)||!vector(market)||model.length!==market.length||!finite(weight)||weight<0||weight>1)return null;
    return model.map((p,i)=>weight*p+(1-weight)*market[i]);
  }
  // A comparison requires a complete same-market closing vector and an
  // independent pre-start model vector. Closing prices are hindsight only.
  // Weight is a declared frozen research setting, not an optimised default.
  function evaluate({event_id,market_id,start_utc,model_probabilities,model_frozen_at_utc,
                     closing_odds,closing_observed_at_utc,closing_source,
                     winner_index,blend_weight}={}){
    const blocked=reason=>({...GATES,status:'INELIGIBLE',reason});
    if(!event_id||!market_id||typeof event_id!=='string'||typeof market_id!=='string')return blocked('Missing stable event/market identity');
    const start=time(start_utc),frozen=time(model_frozen_at_utc),close=time(closing_observed_at_utc);
    if(start===null||frozen===null||close===null||frozen>=start||close>=start||close<frozen)
      return blocked('Invalid chronological observations');
    if(!closing_source||typeof closing_source!=='string'||!/^https:\/\/[^\s/]+/i.test(closing_source))
      return blocked('Missing attributable closing price source');
    const market=deVig(closing_odds);
    if(!market||!vector(model_probabilities)||market.probabilities.length!==model_probabilities.length)
      return blocked('Incomplete same-market odds or model probability vector');
    if(!Number.isSafeInteger(winner_index)||winner_index<0||winner_index>=market.probabilities.length)
      return blocked('Invalid or absent outcome index; independent settlement verification required');
    const original=score(model_probabilities,winner_index),baseline=score(market.probabilities,winner_index);
    const result={...GATES,status:'RETROSPECTIVE_RESEARCH',event_id,market_id,
      closing_benchmark:'HINDSIGHT_ONLY_NOT_MODEL_INPUT',market_de_vig_method:market.method,
      market_overround:market.overround,model:original,market:baseline,
      delta_log_loss:original.logLoss-baseline.logLoss,delta_brier:original.brier-baseline.brier,
      closing_source};
    if(blend_weight!==undefined){
      const p=blend(model_probabilities,market.probabilities,blend_weight);
      if(p===null)return blocked('Invalid prespecified blend weight');
      result.combined_hindsight=score(p,winner_index);
      result.combined_warning='Closing odds used in this blend; cannot represent a pre-start trading decision';
    }
    return result;
  }
  return Object.freeze({deVig,score,blend,evaluate,GATES});
});
