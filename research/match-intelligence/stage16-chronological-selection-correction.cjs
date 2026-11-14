'use strict';
// Stage16 historical TRAIN-THEN-TEST EV bias shrinkage.
// 2023/24 is calibration; 2024/25 and 2025/26 are later reused diagnostics.
// NOT prospective, not deployable, not verified executable odds.
const fs=require('node:fs');
const {prepared,anchor,select}=require('./stage14-market-anchored-ev.cjs');
const OUT=['HOME','DRAW','AWAY'];
const CAPS=[null,5];
function validRows(text){return prepared(text).filter(r=>r.odds&&r.market);}
function round(x){return Number(x.toFixed(4));}
function train(rows,{share=.5,cap=5,prior=30}={}){
 if(![.5,1].includes(share)||!CAPS.includes(cap)||prior!==30)throw Error('Unregistered training hypothesis');
 const buckets=OUT.map(()=>({n:0,sumExpected:0,sumObserved:0}));
 for(const r of rows){
  const p=anchor(r.model,r.market,share),d=select(p,r.odds,r.actual,cap);
  if(d.selection==='PASS')continue;
  const i=OUT.indexOf(d.selection),b=buckets[i];b.n++;b.sumExpected+=p[i];b.sumObserved+=Number(d.won);
 }
 // Positive deficit = optimistic selection bias; only shrink identified optimism.
 // Prior sample weight prevents huge changes in tiny draw class.
 const adjustments=buckets.map(b=>b.n?(Math.max(0,b.sumExpected-b.sumObserved)/(b.n+prior)):0);
 return {share,cap,prior,seen:rows.length,buckets:buckets.map((b,i)=>({outcome:OUT[i],n:b.n,expected:round(b.sumExpected),actual:b.sumObserved,optimism_adjustment:round(adjustments[i])})),adjustments};
}
function choose(r,trained,{applyCorrection=true}={}){
 const base=anchor(r.model,r.market,trained.share),odds=r.odds;
 const candidates=base.map((p,i)=>{
  const correction=applyCorrection?trained.adjustments[i]:0;
  const effectiveP=Math.max(0,p-correction);
  return {i,p,correction,effectiveP,odds:odds[i],ev:effectiveP*odds[i]-1};
 }).filter(x=>x.odds>1&&x.ev>=.05&&(trained.cap===null||x.odds<=trained.cap))
   .sort((a,b)=>b.ev-a.ev||a.i-b.i);
 if(!candidates.length)return {selection:'PASS',pnl:0};
 const c=candidates[0],won=r.actual===c.i;
 return {selection:OUT[c.i],odds:c.odds,raw_p:c.p,adjustment:c.correction,
   adjusted_ev:c.ev,won,pnl:won?c.odds-1:-1};
}
function score(rows,t,applyCorrection){
 let bets=0,wins=0,profit=0,expected=0;const classes=OUT.map(()=>({bets:0,wins:0,profit:0}));
 const ledger=[];
 for(const r of rows){
  const d=choose(r,t,{applyCorrection});
  if(d.selection!=='PASS'){
   bets++;wins+=Number(d.won);profit+=d.pnl;expected+=d.raw_p;
   const x=classes[OUT.indexOf(d.selection)];x.bets++;x.wins+=Number(d.won);x.profit+=d.pnl;
  }
  ledger.push({fixture:r.id,actual:OUT[r.actual],selection:d.selection,odds:d.odds??null,
   pnl:round(d.pnl),raw_selected_probability:d.raw_p===undefined?null:round(d.raw_p),
   applied_probability_deduction:d.adjustment===undefined?null:round(d.adjustment)});
 }
 return {priced:rows.length,bets,wins,losses:bets-wins,passes:rows.length-bets,
  pnl:round(profit),roi:bets?round(profit/bets):null,raw_expected_wins:round(expected),
  by_outcome:Object.fromEntries(OUT.map((k,i)=>[k,{...classes[i],profit:round(classes[i].profit)}])),
  ledger};
}
function run(texts){
 if(texts.length!==3)throw Error('Provide 2023/24 calibration + 2024/25 and 2025/26 diagnostic CSVs');
 const [cal,yr1,yr2]=texts.map(validRows);if(cal.length<200||yr1.length<200||yr2.length<100)throw Error('Insufficient source coverage');
 const variants=[];
 for(const share of [.5,1])for(const cap of [5,null]){
  const model=train(cal,{share,cap}),periods=[{name:'2024/25',rows:yr1},{name:'2025/26',rows:yr2},{name:'combined-reused',rows:[...yr1,...yr2]}];
  variants.push({share,cap:cap??'NONE',training:model,
    diagnostics:periods.map(({name,rows})=>({name,unchanged:score(rows,model,false),bias_corrected:score(rows,model,true)}))});
 }
 return {kind:'PREDECLARED_TRAIN_ON_2023_24_TEST_ON_LATER_REUSED_RESULTS',
  training_priced:cal.length,later_priced:yr1.length+yr2.length,
  objective:'Estimate selected-bet positive optimism by class on training only; shrink candidate EV without changing normalized 1X2 model forecasts.',
  formula:'EV_corrected,i = max(0,p_model,i - max(0,sum_selected_predicted_i - sum_selected_actual_i)/(n_selected_i+30))*decimal_odds_i - 1',
  variants,important_limitation:'2024/25, 2025/26 outcomes previously explored repeatedly. This is a chronological retrospective falsification, NOT untouched holdout. 2023/24 selection and choice of shrink formula not independently pre-registered. Market quotes not verified for decision times or Sky Bet.',
  production_gate:'BLOCKED',real_money_profit_verified:false};
}
if(require.main===module){
 const paths=process.argv.slice(2);if(paths.length!==3)throw Error('Three CSV paths required');
 console.log(JSON.stringify(run(paths.map(p=>fs.readFileSync(p,'utf8'))),null,2));
}
module.exports={train,choose,score,run};
