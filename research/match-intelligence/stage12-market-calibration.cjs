'use strict';
// Stage 12 — real historical probability calibration and margin-normalized market audit.
// All archived bookmaker quotations have UNVERIFIED collection/availability timestamps.
// This is a REUSED retrospective diagnostic, not executable historical bets/validated EV.
const fs=require('node:fs');
const {csv,readSeason,evaluateSeason}=require('../../scripts/match_intelligence_backtest.cjs');
const {poisson1x2}=require('./dynamic-player-impact.js');
const ALPHA=.025; // locked Stage 2 calibration-selected raw form; not reoptimized here
const choice=['H','D','A'];
function finite(n){return typeof n==='number'&&Number.isFinite(n);}
function implied(odds){
 if(!Array.isArray(odds)||odds.length!==3||odds.some(x=>!finite(x)||x<=1.001||x>1000))return null;
 const raw=odds.map(x=>1/x),sum=raw.reduce((x,y)=>x+y,0);
 if(sum<=0)return null;
 return {probabilities:raw.map(x=>x/sum),overround:sum-1,odds};
}
function parseBookmakerSeason(text){
 const records=csv(text.replace(/^\uFEFF/,''));
 if(records.length<2)throw Error('No historical market data');
 const header=records[0],index=Object.fromEntries(header.map((x,i)=>[x,i]));
 for(const h of ['Date','HomeTeam','AwayTeam','FTHG','FTAG','PSH','PSD','PSA','PSCH','PSCD','PSCA'])
   if(index[h]===undefined)throw Error('Required market field missing '+h);
 const results=readSeason(text),market=new Map(),raw=records.slice(1);
 if(results.length!==raw.length)throw Error('Result rows mismatch parsed market rows');
 for(let i=0;i<raw.length;i++){
   const row=raw[i],parts=(row[index.Date]||'').split('/');
   if(parts.length!==3)throw Error('Invalid market row date');
   let [day,month,year]=parts;year=year.length===2?String(2000+Number(year)):year;
   const date=year+'-'+month.padStart(2,'0')+'-'+day.padStart(2,'0');
   const home=row[index.HomeTeam],away=row[index.AwayTeam],key=date+'|'+home+'|'+away;
   if(market.has(key))throw Error('Duplicate quoted fixture');
   const odds=names=>names.map(k=>{const x=(row[index[k]]||'').trim();return x?Number(x):NaN;});
   market.set(key,{opening:implied(odds(['PSH','PSD','PSA'])),
     closing:implied(odds(['PSCH','PSCD','PSCA'])),source_row:i+2,
     opening_available_at:null,closing_available_at:null,source_timestamp_verified:false});
 }
 return {results,market};
}
function scores(p,actual){
 const loss=-Math.log(Math.max(1e-15,p[actual]));
 const brier=p.reduce((s,x,i)=>s+(x-(i===actual?1:0))**2,0);
 return {loss,brier,confidence:Math.max(...p),correct:p.indexOf(Math.max(...p))===actual?1:0};
}
function summarize(rows,key){
 const filtered=rows.filter(x=>x[key]);if(!filtered.length)return null;
 return {n:filtered.length,log_loss:filtered.reduce((s,x)=>s+x[key].loss,0)/filtered.length,
   brier:filtered.reduce((s,x)=>s+x[key].brier,0)/filtered.length,
   top_choice_accuracy:filtered.reduce((s,x)=>s+x[key].correct,0)/filtered.length,
   mean_max_confidence:filtered.reduce((s,x)=>s+x[key].confidence,0)/filtered.length};
}
function bins(rows,key){
 const out=[];
 for(let min=0;min<1;min+=.1){
   const bucket=rows.filter(x=>x[key]&&x[key].confidence>=min&&x[key].confidence<min+.1);
   if(!bucket.length)continue;
   out.push({range:[Number(min.toFixed(1)),Number((min+.1).toFixed(1))],
     n:bucket.length,mean_confidence:bucket.reduce((s,r)=>s+r[key].confidence,0)/bucket.length,
     observed_accuracy:bucket.reduce((s,r)=>s+r[key].correct,0)/bucket.length});
 }
 return out;
}
function evaluate(rows){
 const all=[];
 for(const season of rows){
   const parsed=parseBookmakerSeason(season);
   const evaluated=evaluateSeason(parsed.results);
   for(const r of evaluated.rows){
     const market=parsed.market.get(r.date+'|'+r.home+'|'+r.away);
     if(!market)throw Error('Missing fixture market linkage');
     const original=parsed.results.find(m=>m.date===r.date&&m.home===r.home&&m.away===r.away);
     if(!original)throw Error('Cannot join final result');
     const actual=original.hg>original.ag?0:original.hg===original.ag?1:2;
     const base=baselinePrediction(parsed.results,r); // independently reconstructed from the same past matches
     const rawForm=rawFormPrediction(parsed.results,r);
     if(!base||!rawForm)throw Error('Missing chronological predictions');
     all.push({date:r.date,fixture_id:r.date+'|'+r.home+'|'+r.away,actual,
       baseline:scores(base,actual),form:scores(rawForm,actual),
       market_open:market.opening?scores(market.opening.probabilities,actual):null,
       market_close:market.closing?scores(market.closing.probabilities,actual):null,
       opening_overround:market.opening?.overround??null,closing_overround:market.closing?.overround??null,
       odds_open:market.opening?.odds??null,source_timestamp_verified:false});
   }
 }
 return {rows:all,report:{status:'HISTORICAL_REUSED_MARKET_DIAGNOSTIC_ONLY',model_coeff_alpha:ALPHA,
   model_baseline:summarize(all,'baseline'),model_recent_form:summarize(all,'form'),
   market_open:summarize(all,'market_open'),market_close:summarize(all,'market_close'),
   market_open_calibration_bins:bins(all,'market_open'),model_form_calibration_bins:bins(all,'form'),
   market_open_coverage:all.filter(x=>x.market_open).length,
   opening_average_overround:all.filter(x=>x.opening_overround!==null).reduce((s,x)=>s+x.opening_overround,0)/Math.max(1,all.filter(x=>x.opening_overround!==null).length),
   opening_quote_timestamp_certified:false,execution_eligibility:false,
   realized_return_proven:false,positive_ev_proven:false,
   untouched_holdout:false,publication_gate:'BLOCKED',research_only:true,
   note:'Historical PS odds do not establish actual attainable price or snapshot timing; selected model was researched on these seasons. No valid live bet edge/ROI is claimed.'}};
}
// Reconstruct fixed earlier-only 5-game form from exactly the same eligible fixture.
const {baseline}=require('../../scripts/match_intelligence_backtest.cjs');
function predictionsForSeason(results){
 const out=new Map(),played=[],form=new Map();
 const mean=x=>x.reduce((a,b)=>a+b,0)/x.length;
 const clamp=x=>Math.max(.15,Math.min(4,x));
 for(let i=0;i<results.length;){
   let j=i+1;while(j<results.length&&results[j].date===results[i].date)j++;
   const day=results.slice(i,j);
   for(const m of day){
     const b=baseline(played,m),home=form.get(m.home)||[],away=form.get(m.away)||[];
     if(!b||home.length<3||away.length<3)continue;
     const gd=mean(home.slice(-5))-mean(away.slice(-5));
     out.set(m.date+'|'+m.home+'|'+m.away,{
       baseline:poisson1x2(...b),
       form:poisson1x2(clamp(b[0]*Math.exp(ALPHA*gd)),clamp(b[1]*Math.exp(-ALPHA*gd)))});
   }
   for(const m of day){
     const h=form.get(m.home)||[],a=form.get(m.away)||[];
     h.push(m.hg-m.ag);a.push(m.ag-m.hg);
     form.set(m.home,h);form.set(m.away,a);
   }
   played.push(...day);i=j;
 }
 return out;
}
function run(texts){
 if(!Array.isArray(texts)||!texts.length)throw Error('Required source seasons');
 const data=[];
 for(const text of texts){
   const parsed=parseBookmakerSeason(text);
   const predictions=predictionsForSeason(parsed.results);
   const eligible=evaluateSeason(parsed.results).rows;
   for(const fixture of eligible){
     const key=fixture.date+'|'+fixture.home+'|'+fixture.away;
     const p=predictions.get(key);if(!p)throw Error('Missing earlier-only model prediction '+key);
     const market=parsed.market.get(key);if(!market)throw Error('Market join missing '+key);
     const m=parsed.results.find(x=>x.date===fixture.date&&x.home===fixture.home&&x.away===fixture.away);
     const actual=m.hg>m.ag?0:m.hg===m.ag?1:2;
     data.push({date:fixture.date,fixture_id:key,actual,baseline:scores(Object.values(p.baseline),actual),
       form:scores(Object.values(p.form),actual),
       market_open:market.opening?scores(market.opening.probabilities,actual):null,
       market_close:market.closing?scores(market.closing.probabilities,actual):null,
       odds_open:market.opening?.odds??null,
       opening_overround:market.opening?.overround??null,
       closing_overround:market.closing?.overround??null,
       source_timestamp_verified:false});
   }
 }
 const report={status:'EXPLORATORY_REUSED_MARKET_BENCHMARK_ONLY',sample:data.length,alpha:ALPHA,
  scores:{baseline:summarize(data,'baseline'),form:summarize(data,'form'),
    market_open:summarize(data,'market_open'),market_close:summarize(data,'market_close')},
  bins:{form:bins(data,'form'),market_open:bins(data,'market_open')},
  opening_odds_coverage:data.filter(x=>x.market_open).length,
  closing_odds_coverage:data.filter(x=>x.market_close).length,
  no_verified_price_timestamps:true,realized_bet_roi_verified:false,
  fresh_holdout:false,publication_gate:'BLOCKED',research_only:true};
 return report;
}
if(require.main===module){
 if(process.argv.length<3)throw Error('Expected one or more archived EPL season CSV paths');
 const input=process.argv.slice(2).map(p=>fs.readFileSync(p,'utf8'));
 console.log(JSON.stringify(run(input),null,2));
}
module.exports={implied,parseBookmakerSeason,scores,bins,predictionsForSeason,run};
