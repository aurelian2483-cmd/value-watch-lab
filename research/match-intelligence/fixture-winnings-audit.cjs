'use strict';
// Same-fixture hypothetical betting P&L under fixed EV >= 5% rule.
// Archived PS opening prices have NO verified availability/capture timestamps.
// These were NOT recorded as genuine historical bets; no betting advantage established.
const fs=require('node:fs');
const {parseBookmakerSeason,predictionsForSeason}=require('./stage12-market-calibration.cjs');
const {evaluateSeason}=require('../../scripts/match_intelligence_backtest.cjs');
const EV=.05;
function pick(probs,odds,actual){
 if(!odds)return {selection:'PASS',odds:null,estimated_ev:null,won:null,pnl:0};
 const options=probs.map((p,i)=>({i,p,odds:odds[i],estimated_ev:p*odds[i]-1}))
   .filter(o=>Number.isFinite(o.estimated_ev)&&o.estimated_ev>=EV)
   .sort((a,b)=>b.estimated_ev-a.estimated_ev||a.i-b.i);
 if(!options.length)return {selection:'PASS',odds:null,estimated_ev:null,won:null,pnl:0};
 const best=options[0],won=best.i===actual;
 return {selection:['HOME','DRAW','AWAY'][best.i],odds:best.odds,estimated_ev:best.estimated_ev,
   won,pnl:won?best.odds-1:-1};
}

function pairedProfitUncertainty(rows,{draws=4000,seed=20261114}={}){
 const priced=rows.filter(r=>r.archive_open_odds);
 if(priced.length<30||!Number.isInteger(draws)||draws<200)throw Error('Not enough paired pricing observations');
 const groups=new Map();
 for(const row of priced){
  const group=groups.get(row.date)||[];
  group.push(row.delta_new_minus_old);
  groups.set(row.date,group);
 }
 const samples=[...groups.values()],baselineCount=priced.length,distribution=[];
 let state=seed>>>0;
 const rnd=()=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return state/4294967296;};
 for(let i=0;i<draws;i++){
  let sum=0,n=0;
  for(let j=0;j<samples.length;j++){
    const group=samples[Math.floor(rnd()*samples.length)];
    for(const value of group){sum+=value;n++;}
  }
  distribution.push(sum/n*baselineCount);
 }
 distribution.sort((a,b)=>a-b);
 const actual=priced.reduce((s,r)=>s+r.delta_new_minus_old,0);
 return {paired_priced_fixtures:baselineCount,fixture_date_clusters:samples.length,
  observed_total_profit_difference_units:actual,
  bootstrap_95_percent_interval_for_total_units:[distribution[Math.floor(draws*.025)],distribution[Math.floor(draws*.975)]],
  resamples:draws,meaning:'Exploratory date-cluster paired difference under archived unverified quotations. Not proof of executable betting edge.'};
}
function run(texts){
 const rows=[];
 for(const txt of texts){
   const season=parseBookmakerSeason(txt),predictions=predictionsForSeason(season.results);
   const eligible=new Set(evaluateSeason(season.results).rows.map(x=>x.date+'|'+x.home+'|'+x.away));
   for(const result of season.results){
     const fixture=result.date+'|'+result.home+'|'+result.away;
     if(!eligible.has(fixture))continue;
     const p=predictions.get(fixture),market=season.market.get(fixture);
     if(!p||!market)throw Error('Missing chronological fixture join: '+fixture);
     const actual=result.hg>result.ag?0:result.hg===result.ag?1:2;
     const o=market.opening?.odds??null;
     const old=pick(Object.values(p.baseline),o,actual);
     const recent=pick(Object.values(p.form),o,actual);
     rows.push({fixture,date:result.date,home:result.home,away:result.away,
       score:result.hg+'-'+result.ag,outcome:['HOME','DRAW','AWAY'][actual],
       archive_open_odds:o,old,new:recent,delta_new_minus_old:recent.pnl-old.pnl,
       old_running_pnl:0,new_running_pnl:0,
       quote_timestamp_verified:false,real_bet_executed:false});
   }
 }
 rows.sort((a,b)=>a.date.localeCompare(b.date)||a.fixture.localeCompare(b.fixture));
 let oldSum=0,newSum=0;
 const chosen=rows.filter(x=>x.archive_open_odds);
 for(const row of rows){
    oldSum+=row.old.pnl;newSum+=row.new.pnl;
    row.old_running_pnl=Number(oldSum.toFixed(2));row.new_running_pnl=Number(newSum.toFixed(2));
 }
 const calc=m=>{
   const bets=chosen.filter(x=>x[m].selection!=='PASS');
   const wins=bets.filter(x=>x[m].won).length;
   const profit=bets.reduce((s,x)=>s+x[m].pnl,0);
   let high=0,running=0,maxDD=0;
   for(const row of rows){running+=row[m].pnl;high=Math.max(high,running);maxDD=Math.max(maxDD,high-running);}
   return {bets:bets.length,wins,losses:bets.length-wins,passes:rows.length-bets.length,
     stake_units:bets.length,profit_units:profit,roi:bets.length?profit/bets.length:null,max_drawdown_units:maxDD};
 };
 const changes={same_selection:0,different_selections:0,old_only:0,new_only:0,both_pass:0};
 for(const r of rows){
   if(r.old.selection==='PASS'&&r.new.selection==='PASS')changes.both_pass++;
   else if(r.old.selection==='PASS')changes.new_only++;
   else if(r.new.selection==='PASS')changes.old_only++;
   else if(r.old.selection===r.new.selection)changes.same_selection++;
   else changes.different_selections++;
 }
 const diff=chosen.reduce((s,x)=>s+x.delta_new_minus_old,0);
 return {
    type:'REUSED_ARCHIVED_ODDS_HYPOTHETICAL_PROFIT_AUDIT',
    fixed_rule:'1 unit per eligible match, single max nominal EV >= 5% 1X2 selection or PASS',
    total_historical_fixtures:rows.length,complete_archived_price_fixtures:chosen.length,
    missing_price_fixtures:rows.length-chosen.length,
    old_model:calc('old'),recent_form_model:calc('new'),
    same_fixture_total_pnl_improvement_new_minus_old:diff,
    fixture_selection_changes:changes,
    paired_profit_uncertainty:pairedProfitUncertainty(rows),
    by_season:Object.entries(Object.groupBy(rows,r=>(()=>{const y=Number(r.date.slice(0,4)),m=Number(r.date.slice(5,7)),start=m>=7?y:y-1;return start+'/'+(start+1);})())).map(([period,list])=>({period,fixtures:list.length,priced:list.filter(x=>x.archive_open_odds).length,old_profit:list.reduce((s,x)=>s+x.old.pnl,0),new_profit:list.reduce((s,x)=>s+x.new.pnl,0),delta_new_minus_old:list.reduce((s,x)=>s+x.delta_new_minus_old,0)})),
    examples:rows.filter(x=>x.archive_open_odds).slice(0,12),
    biggest_hypothetical_positive_changes:[...chosen].sort((a,b)=>b.delta_new_minus_old-a.delta_new_minus_old).slice(0,5),
    biggest_hypothetical_negative_changes:[...chosen].sort((a,b)=>a.delta_new_minus_old-b.delta_new_minus_old).slice(0,5),
    all_fixtures:rows,
    timestamp_verified:false,skybet_odds_verified:false,
    prospective_holdout:false,real_money_return:false,independent_positive_ev_proven:false,
    release_gate:'BLOCKED'};
}
if(require.main===module){
 const paths=process.argv.slice(2);if(!paths.length)throw Error('Historical CSV paths required');
 console.log(JSON.stringify(run(paths.map(p=>fs.readFileSync(p,'utf8'))),null,2));
}
module.exports={pick,pairedProfitUncertainty,run};
