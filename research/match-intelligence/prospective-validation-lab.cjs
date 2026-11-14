'use strict';
// Value Watch prospective football lab. Freeze predictions BEFORE result knowledge.
// No executable wagers, no claim that supplied odds metadata proves authenticity.
const crypto=require('node:crypto');
const {baseline}=require('../../scripts/match_intelligence_backtest.cjs');
const {poisson1x2}=require('./dynamic-player-impact.js');
const {implied,scores}=require('./stage12-market-calibration.cjs');
const {auditFutureQuote}=require('./stage13-market-blend.cjs');
const CONFIG=Object.freeze({
 experiment_id:'VW-FOOTBALL-PROSPECTIVE-2026-11-14',
 research_version:'poisson-form-alpha-0.025-v1',
 recent_form_alpha:0.025,form_games:5,min_form_games:3,
 market:'1X2_FULL_TIME',ev_threshold:0.05,flat_stake_units:1,
 publication_gate:'BLOCKED'
});
function stamp(x,name){
 if(typeof x!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(x)||!Number.isFinite(Date.parse(x)))throw Error(name+' must be timezone-aware ISO timestamp');
 return Date.parse(x);
}
const finite=(x)=>typeof x==='number'&&Number.isFinite(x);
function clamp(x){return Math.max(.15,Math.min(4,x));}
function norm(p){
 if(!Array.isArray(p)||p.length!==3||p.some(v=>!finite(v)||v<0||v>1)||Math.abs(p.reduce((s,x)=>s+x,0)-1)>1e-9)throw Error('Probabilities must sum to one');
 return p;
}
function hash(data){return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');}
function freezePrediction({fixture,history,created_at_utc,quote=null}={}){
 if(!fixture||typeof fixture!=='object'||typeof fixture.id!=='string'||!fixture.id.trim()||
    typeof fixture.home!=='string'||!fixture.home.trim()||typeof fixture.away!=='string'||!fixture.away.trim()||
    fixture.home===fixture.away)throw Error('Valid distinct fixture and immutable ID required');
 const kickoff=stamp(fixture.kickoff_utc,'kickoff');
 const now=stamp(created_at_utc,'created_at');
 if(now>=kickoff)throw Error('Cannot freeze prediction at or after kickoff');
 if(!Array.isArray(history))throw Error('History array required');
 const known=new Set(),past=[];
 for(const g of history){
   if(!g||typeof g.id!=='string'||!g.id||known.has(g.id)||g.id===fixture.id)throw Error('Duplicate/invalid historical fixture ID');
   known.add(g.id);
   const played=stamp(g.kickoff_utc,'past kickoff'),available=stamp(g.result_known_at_utc,'result known at');
   if(played>=kickoff||available<played||available>now)throw Error('History result not verifiably available before forecast cutoff');
   if(typeof g.home!=='string'||!g.home||typeof g.away!=='string'||!g.away||g.home===g.away||
     !Number.isInteger(g.hg)||!Number.isInteger(g.ag)||g.hg<0||g.ag<0)throw Error('Invalid prior fixture');
   // Date-only conservative replay: restrict to completed *earlier calendar days*.
   // Prevent matches from same calendar date entering another forecast.
   const date=g.kickoff_utc.slice(0,10),futureDate=fixture.kickoff_utc.slice(0,10);
   if(date>=futureDate)throw Error('Same-date or later history not eligible');
   past.push({date,home:g.home,away:g.away,hg:g.hg,ag:g.ag});
 }
 past.sort((a,b)=>a.date.localeCompare(b.date));
 const fx={date:fixture.kickoff_utc.slice(0,10),home:fixture.home,away:fixture.away};
 const lambdas=baseline(past,fx);
 if(!lambdas)return {status:'PASS_INSUFFICIENT_HISTORICAL_DATA',fixture_id:fixture.id,
   created_at_utc,history_count:past.length,publication_gate:'BLOCKED'};
 const forms=team=>past.filter(g=>g.home===team||g.away===team).slice(-CONFIG.form_games)
   .map(g=>g.home===team?g.hg-g.ag:g.ag-g.hg);
 const h=forms(fx.home),a=forms(fx.away);
 if(h.length<CONFIG.min_form_games||a.length<CONFIG.min_form_games)
   return {status:'PASS_INSUFFICIENT_RECENT_FORM',fixture_id:fixture.id,created_at_utc,
     history_count:past.length,publication_gate:'BLOCKED'};
 const mean=v=>v.reduce((s,x)=>s+x,0)/v.length;
 const delta=mean(h)-mean(a),alpha=CONFIG.recent_form_alpha;
 const old=norm(Object.values(poisson1x2(...lambdas)));
 const recent=norm(Object.values(poisson1x2(clamp(lambdas[0]*Math.exp(alpha*delta)),clamp(lambdas[1]*Math.exp(-alpha*delta)))));
 let market=null;
 if(quote){
   const audit=auditFutureQuote({fixture_id:fixture.id,kickoff_utc:fixture.kickoff_utc,
     forecast_cutoff_utc:created_at_utc,quote});
   const p=implied(quote.decimal_odds);
   market={quote_provider:quote.provider||null,quote_record:quote.source_record_id||null,
     quote_digest:hash(quote),quote_captured_at_utc:quote.captured_at_utc||null,
     decimal_odds:p?p.odds:null,implied_probabilities:p?p.probabilities:null,
     evidence_status:audit.status,issues:audit.issues,
     independently_verified_in_lab:false,executable_quote_verified:false};
 }
 const record={status:'FROZEN_PREDICTION',experiment_id:CONFIG.experiment_id,
   version:CONFIG.research_version,fixture_id:fixture.id,fixture:{home:fixture.home,away:fixture.away,kickoff_utc:fixture.kickoff_utc},
   created_at_utc,history_count:past.length,history_digest:hash(history),baseline_lambdas:lambdas,
   raw_form_goal_diff_delta:delta,probabilities:{poisson:old,recent_form:recent},
   market,publication_gate:'BLOCKED',outcome_known:false};
 return {...record,record_sha256:hash(record)};
}
function buildLedger(predictions,settlements=[]){
 if(!Array.isArray(predictions)||!Array.isArray(settlements))throw Error('Ledger arrays required');
 const byId=new Map(),res=[];
 for(const prediction of predictions){
   if(!prediction||prediction.status!=='FROZEN_PREDICTION'||!prediction.record_sha256)
     throw Error('Cannot record missing/unfrozen prediction');
   const {record_sha256,...payload}=prediction;
   if(hash(payload)!==record_sha256)throw Error('Prediction integrity mismatch');
   if(byId.has(prediction.fixture_id))throw Error('Duplicate frozen prediction');
   byId.set(prediction.fixture_id,prediction);
 }
 const settled=new Set();
 for(const entry of settlements){
   if(!entry||typeof entry.fixture_id!=='string'||!byId.has(entry.fixture_id)||settled.has(entry.fixture_id))
     throw Error('Settlement without unique frozen prediction');
   settled.add(entry.fixture_id);
   const p=byId.get(entry.fixture_id);
   if(!Number.isInteger(entry.home_goals)||entry.home_goals<0||!Number.isInteger(entry.away_goals)||entry.away_goals<0)
     throw Error('Invalid result goals');
   if(!entry.source_uri||typeof entry.source_uri!=='string'||!/^https:\/\/\S+$/.test(entry.source_uri))
     throw Error('Result source URI required');
   const observed=stamp(entry.result_observed_at_utc,'result observed');
   if(observed<=stamp(p.fixture.kickoff_utc,'kickoff'))throw Error('Result recorded before kickoff');
   const outcome=entry.home_goals>entry.away_goals?0:entry.home_goals===entry.away_goals?1:2;
   const base=scores(p.probabilities.poisson,outcome),form=scores(p.probabilities.recent_form,outcome);
   const market=p.market?.implied_probabilities?scores(p.market.implied_probabilities,outcome):null;
   res.push({fixture_id:entry.fixture_id,date:p.fixture.kickoff_utc.slice(0,10),
      predicted_at:p.created_at_utc,outcome,baseline:base,form,market,
      historical_quote_not_certified:true,paper_return:null,verified_betting_roi:null,
      settlement_source:entry.source_uri,settlement_observed_at:entry.result_observed_at_utc});
 }
 const avg=(records,name,metric)=>records.length?records.reduce((s,x)=>s+x[name][metric],0)/records.length:null;
 const common=res.filter(r=>r.market!==null);
 const delta=metric=>res.length?res.reduce((s,x)=>s+x.form[metric]-x.baseline[metric],0)/res.length:null;
 return {experiment_id:CONFIG.experiment_id,publication_gate:'BLOCKED',research_only:true,
   frozen_count:predictions.length,settled_count:res.length,unsettled_count:predictions.length-res.length,
   baseline_ll:avg(res,'baseline','loss'),form_ll:avg(res,'form','loss'),
   delta_ll_form_minus_baseline:delta('loss'),baseline_brier:avg(res,'baseline','brier'),
   form_brier:avg(res,'form','brier'),delta_brier_form_minus_baseline:delta('brier'),
   matched_market_count:common.length,matched_form_ll:avg(common,'form','loss'),
   matched_market_ll:avg(common,'market','loss'),
   verified_betting_roi:null,predictions_preserved:true,
   scored:res};
}
module.exports={CONFIG,freezePrediction,buildLedger};
