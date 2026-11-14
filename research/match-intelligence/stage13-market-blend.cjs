'use strict';
// Stage 13: LOCKED market/model blend research and future quote-evidence audit.
// The historical PS opening quote timestamp is NOT independently verified.
// Never treat archive "open" as an attainable decision-time price.
const fs=require('node:fs');
const {parseBookmakerSeason,predictionsForSeason,scores,pairedDateUncertainty}=require('./stage12-market-calibration.cjs');
const {evaluateSeason}=require('../../scripts/match_intelligence_backtest.cjs');
const WEIGHTS=Object.freeze([0,0.1,0.25,0.5,0.75,1]); // weight on recent-form model
const number=x=>typeof x==='number'&&Number.isFinite(x);
function normalize(p,label){
 if(!Array.isArray(p)||p.length!==3||p.some(x=>!number(x)||x<0||x>1))throw Error(label+' invalid 1X2 probabilities');
 const sum=p.reduce((s,v)=>s+v,0);
 if(Math.abs(sum-1)>1e-8)throw Error(label+' not normalized');
 return p;
}
function blend(market,model,weight){
 if(!WEIGHTS.includes(weight))throw Error('Unregistered blend weight');
 normalize(market,'market');normalize(model,'model');
 return market.map((x,i)=>(1-weight)*x+weight*model[i]);
}
function observedPairs(csvText){
 const parsed=parseBookmakerSeason(csvText),p=predictionsForSeason(parsed.results);
 const eligible=evaluateSeason(parsed.results).rows;
 const actualByKey=new Map(parsed.results.map(x=>[x.date+'|'+x.home+'|'+x.away,x]));
 const rows=[];
 let omitted=0;
 for(const r of eligible){
   const key=r.date+'|'+r.home+'|'+r.away,market=parsed.market.get(key),prediction=p.get(key);
   if(!market||!prediction)throw Error('Missing fixture linkage: '+key);
   if(!market.opening){omitted++;continue;}
   const result=actualByKey.get(key),actual=result.hg>result.ag?0:result.hg===result.ag?1:2;
   const m=market.opening.probabilities,f=Object.values(prediction.form);
   rows.push({date:r.date,fixture_id:key,actual,market_probs:m,form_probs:f,
     market:scores(m,actual),form:scores(f,actual)});
 }
 return {rows,missing_market_quotes:omitted,eligible:eligible.length};
}
function avg(rows,field){
 if(!rows.length)throw Error('No paired forecasts');
 return rows.reduce((s,r)=>s+r[field].loss,0)/rows.length;
}
function evaluateBlend(rows,weight){
 return rows.map(r=>({...r,challenger:scores(blend(r.market_probs,r.form_probs,weight),r.actual)}));
}
function run(calibrationCsv,diagnosticCsvs){
 if(typeof calibrationCsv!=='string'||!Array.isArray(diagnosticCsvs)||!diagnosticCsvs.length)throw Error('Calibration CSV and diagnostic CSVs required');
 const cal=observedPairs(calibrationCsv),diag=diagnosticCsvs.map(observedPairs);
 if(cal.rows.length<100)throw Error('Insufficient calibration quoted fixtures');
 const grid=WEIGHTS.map(weight=>{
   const rows=evaluateBlend(cal.rows,weight);
   return {weight,fixtures:rows.length,market_log_loss:avg(rows,'market'),blend_log_loss:avg(rows,'challenger')};
 });
 // No selected diagnostic set is touched by grid optimization; ties prefer the market-only baseline.
 const winner=grid.reduce((best,item)=>item.blend_log_loss<best.blend_log_loss-1e-12?item:best,grid[0]);
 const after=diag.flatMap(d=>d.rows);
 if(after.length<100)throw Error('Insufficient later diagnostic fixtures');
 const paired=evaluateBlend(after,winner.weight);
 const interval=pairedDateUncertainty(paired,'challenger','market');
 return {stage:'STAGE_13_MARKET_AWARE_PROBABILITY_BLEND',
   coefficients_predeclared:WEIGHTS,calibration:{period:'2023/24',eligible:cal.eligible,priced:cal.rows.length,
     omitted:cal.missing_market_quotes,grid,selected_weight:winner.weight},
   diagnostic:{period:'2024/25–2025/26',eligible:diag.reduce((s,d)=>s+d.eligible,0),
     priced:after.length,omitted:diag.reduce((s,d)=>s+d.missing_market_quotes,0),
     market_log_loss:avg(paired,'market'),recent_form_log_loss:avg(paired,'form'),
     selected_blend_log_loss:avg(paired,'challenger'),
     selected_blend_minus_market_uncertainty:interval},
   archived_quotes_time_verified:false,has_verified_skybet_odds:false,
   untouched_holdout:false,realized_paper_profit_valid:false,
   research_only:true,publication_gate:'BLOCKED',
   note:'Reused historical seasons and unverified archived opening quotes. Weight is not approved for deployment. Compare against market-only, not solely weak Poisson.'};
}
function time(value,name){
 if(typeof value!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(value)||!Number.isFinite(Date.parse(value)))throw Error(name+' must be offset-aware ISO timestamp');
 return Date.parse(value);
}
function auditFutureQuote({fixture_id,kickoff_utc,forecast_cutoff_utc,quote}={}){
 const reasons=[];
 if(typeof fixture_id!=='string'||!fixture_id.trim())throw Error('Fixture id required');
 const kickoff=time(kickoff_utc,'kickoff'),cutoff=time(forecast_cutoff_utc,'cutoff');
 if(cutoff>=kickoff)throw Error('Forecast must precede kickoff');
 if(!quote||typeof quote!=='object')throw Error('Quote object required');
 if(typeof quote.provider!=='string'||!quote.provider.trim())reasons.push('MISSING_PROVIDER');
 if(typeof quote.source_record_id!=='string'||!quote.source_record_id.trim())reasons.push('MISSING_SOURCE_RECORD_ID');
 if(typeof quote.evidence_uri!=='string'||!/^https:\/\/\S+$/.test(quote.evidence_uri))reasons.push('MISSING_SOURCE_EVIDENCE_URL');
 if(quote.market!=='1X2_FULL_TIME')reasons.push('UNSUPPORTED_MARKET');
 if(quote.venue_rule!=='REGULATION_TIME')reasons.push('UNCONFIRMED_SETTLEMENT_RULE');
 const prices=Array.isArray(quote.decimal_odds)?quote.decimal_odds:null;
 if(!prices||prices.length!==3||prices.some(x=>!number(x)||x<=1.001||x>1000))reasons.push('INVALID_ODDS_TRIPLET');
 let captured=null,offered=null;
 try{captured=time(quote.captured_at_utc,'captured_at_utc');}catch{reasons.push('MISSING_CAPTURE_TIMESTAMP');}
 try{offered=time(quote.quoted_at_utc,'quoted_at_utc');}catch{reasons.push('MISSING_PROVIDER_TIMESTAMP');}
 if(captured!==null&&captured>cutoff)reasons.push('CAPTURED_AFTER_CUTOFF');
 if(offered!==null&&offered>cutoff)reasons.push('PROVIDER_QUOTE_AFTER_CUTOFF');
 if(offered!==null&&captured!==null&&offered>captured)reasons.push('QUOTE_AFTER_CAPTURE');
 if(quote.independent_receipt_verified!==true)reasons.push('NO_INDEPENDENT_RECEIPT_VERIFICATION');
 // Even a timestamp claim is not evidence of actual betting availability or acceptance.
 return {fixture_id,source_record_id:quote.source_record_id||null,issues:reasons,
    status:reasons.length?'EVIDENCE_INSUFFICIENT':'EVIDENCE_READY_FOR_MANUAL_REVIEW',
    executable_bet_verified:false,model_validated:false,publication_gate:'BLOCKED',
    note:'Field-level checks only. Independent verification of receipt content, authenticity, market rules, availability, limits and price execution remains required.'};
}
if(require.main===module){
 const paths=process.argv.slice(2);
 if(paths.length!==3)throw Error('Pass 2023/24 calibration then 2024/25, 2025/26 diagnostic EPL CSVs');
 console.log(JSON.stringify(run(fs.readFileSync(paths[0],'utf8'),paths.slice(1).map(x=>fs.readFileSync(x,'utf8'))),null,2));
}
module.exports={WEIGHTS,blend,observedPairs,evaluateBlend,run,auditFutureQuote};
