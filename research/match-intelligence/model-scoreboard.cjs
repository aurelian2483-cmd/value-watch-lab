'use strict';
// Research-only scoreboard. Pre-match predictions must already be frozen by prospective-validation-lab.
// This module never generates predictions from settled results or publishes betting recommendations.
const {buildLedger}=require('./prospective-validation-lab.cjs');
const {scores}=require('./stage12-market-calibration.cjs');
const crypto=require('node:crypto');
const LABEL=['HOME','DRAW','AWAY'];
const MODEL_IDS=['poisson','recent_form','market_anchor_cap5'];
const sha=o=>crypto.createHash('sha256').update(JSON.stringify(o)).digest('hex');
function validVector(p){
 if(!Array.isArray(p)||p.length!==3||p.some(x=>typeof x!=='number'||!Number.isFinite(x)||x<0||x>1)||Math.abs(p.reduce((a,b)=>a+b,0)-1)>1e-7)throw Error('Invalid 1X2 vector');
 return p;
}
function originalModels(f){
 return {poisson:validVector(f.probabilities.poisson),recent_form:validVector(f.probabilities.recent_form)};
}
function bet(probs,prices,cap=null){
 if(!prices)return {selection:'PASS',reason:'MISSING_THREE_WAY_ODDS',odds:null,estimated_ev:null};
 if(!Array.isArray(prices)||prices.length!==3||prices.some(x=>!Number.isFinite(x)||x<=1))throw Error('Invalid decimal odds');
 const eligible=probs.map((p,i)=>({i,odds:prices[i],ev:p*prices[i]-1}))
  .filter(x=>(cap===null||x.odds<=cap)&&x.ev>=.05)
  .sort((a,b)=>b.ev-a.ev||a.i-b.i);
 if(!eligible.length)return {selection:'PASS',reason:'NO_QUALIFYING_EV',odds:null,estimated_ev:null};
 const c=eligible[0];
 return {selection:LABEL[c.i],reason:null,odds:c.odds,estimated_ev:+c.ev.toFixed(6)};
}
function buildScoreboard(predictions,settlements=[]){
 const core=buildLedger(predictions,settlements); // integrity, unique fixtures, verified chronology requirements
 const byResult=new Map(core.scored.map(x=>[x.fixture_id,x]));
 const bySettle=new Map(settlements.map(x=>[x.fixture_id,x]));
 const fixtures=[];
 for(const f of predictions){
  const base=originalModels(f),market=f.market;
  const prices=market?.decimal_odds??null;
  const marketProb=market?.implied_probabilities?validVector(market.implied_probabilities):null;
  const anchor=marketProb?validVector(base.recent_form.map((p,i)=>.5*p+.5*marketProb[i])):null;
  const models={...base,market_anchor_cap5:anchor};
  const settled=byResult.get(f.fixture_id);
  const result=bySettle.get(f.fixture_id);
  const actual=settled?settled.outcome:null;
  const rows={};
  for(const id of MODEL_IDS){
   const p=models[id];
   if(!p){rows[id]={status:'PASS',reason:'MISSING_MARKET_BENCHMARK',probabilities:null,selection:'PASS',paper_profit:null,log_loss:null,brier:null};continue;}
   const b=bet(p,prices,id==='market_anchor_cap5'?5:null);
   const won=actual!==null&&b.selection!=='PASS'?LABEL[actual]===b.selection:null;
   rows[id]={status:actual===null?'AWAITING_RESULT':'SETTLED',
    probabilities:p,selection:b.selection,pass_reason:b.reason,
    odds:b.odds,estimated_ev:b.estimated_ev,
    paper_profit:actual===null?null:(b.selection==='PASS'?0:(won?b.odds-1:-1)),
    log_loss:actual===null?null:scores(p,actual).loss,
    brier:actual===null?null:scores(p,actual).brier,
    won};
  }
  fixtures.push({fixture_id:f.fixture_id,home:f.fixture.home,away:f.fixture.away,
    kickoff_utc:f.fixture.kickoff_utc,forecast_at_utc:f.created_at_utc,
    prediction_sha256:f.record_sha256,
    quote_status:!prices?'MISSING':market.evidence_status,
    quote_verified:false,executable_quote_verified:false,
    settlement:result?{home_goals:result.home_goals,away_goals:result.away_goals,source_uri:result.source_uri}:null,
    models:rows});
 }
 const summary={};
 for(const id of MODEL_IDS){
  const eligible=fixtures.filter(f=>f.models[id].probabilities);
  const settled=eligible.filter(f=>f.models[id].log_loss!==null);
  const quoted=settled.filter(f=>f.models[id].pass_reason!=='MISSING_THREE_WAY_ODDS');
  const bets=quoted.filter(f=>f.models[id].selection!=='PASS');
  const sum=(xs,k)=>xs.reduce((s,x)=>s+x.models[id][k],0);
  summary[id]={eligible_predictions:eligible.length,settled_fixtures:settled.length,
   with_quote:quoted.length,passes:quoted.length-bets.length,
   unpriced_settled:settled.length-quoted.length,
   bets:bets.length,wins:bets.filter(x=>x.models[id].won).length,
   losses:bets.filter(x=>!x.models[id].won).length,
   mean_log_loss:settled.length?sum(settled,'log_loss')/settled.length:null,
   mean_brier:settled.length?sum(settled,'brier')/settled.length:null,
   illustrative_paper_profit:bets.length?sum(bets,'paper_profit'):null,
   hypothetical_roi:bets.length?sum(bets,'paper_profit')/bets.length:null};
 }
 // Fair paired comparison: only fixtures on which both compared vectors exist and are settled.
 const pair=(a,b)=>{
  const xs=fixtures.filter(x=>x.models[a].log_loss!==null&&x.models[b].log_loss!==null);
  return {fixtures:xs.length,mean_delta_log_loss_b_minus_a:xs.length?xs.reduce((s,x)=>s+x.models[b].log_loss-x.models[a].log_loss,0)/xs.length:null,
    mean_delta_brier_b_minus_a:xs.length?xs.reduce((s,x)=>s+x.models[b].brier-x.models[a].brier,0)/xs.length:null};
 };
 return {schema:'VW_MODEL_SCOREBOARD_V1',state:'RESEARCH_ONLY',live_changed:false,
  verified_profit:false,market_prices_independently_verified:false,
  notes:['All historical and new quote-only profits are hypothetical unless independently verified.','No bookmaker execution is confirmed.','Predictions must be frozen before kickoff; future results must be separate settlements.','Never optimize settings based on this scoreboard.'],
  frozen_count:core.frozen_count,settled_count:core.settled_count,unsettled_count:core.unsettled_count,
  models:summary,paired:{form_vs_poisson:pair('poisson','recent_form'),anchor_vs_recent_form:pair('recent_form','market_anchor_cap5')},
  fixtures};
}
if(require.main===module){
 const fs=require('node:fs'),[pred,settle]=process.argv.slice(2);
 if(!pred)throw Error('Usage: node model-scoreboard.cjs predictions.json [settlements.json]');
 const predictions=JSON.parse(fs.readFileSync(pred,'utf8'));
 const settlements=settle?JSON.parse(fs.readFileSync(settle,'utf8')):[];
 process.stdout.write(JSON.stringify(buildScoreboard(predictions,settlements),null,2)+'\n');
}
module.exports={buildScoreboard,bet};
