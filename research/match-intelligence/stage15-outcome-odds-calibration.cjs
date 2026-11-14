'use strict';
// Research only. All quotes in historical archive lack independently verified availability.
// Do not treat results as forward validation or executable bookmaker returns.
const fs=require('node:fs');
const {prepared,anchor,select}=require('./stage14-market-anchored-ev.cjs');
const LABELS=['HOME','DRAW','AWAY'];
const VARIANTS=Object.freeze([
 {id:'recent-form-uncapped',share:1,maxOdds:null},
 {id:'recent-form-odds-cap-5',share:1,maxOdds:5},
 {id:'half-market-odds-cap-5',share:.5,maxOdds:5}
]);
const PROB_BINS=[[0,.2],[.2,.4],[.4,.6],[.6,.8],[.8,1.0000001]];
const ODDS_BINS=[
 {id:'below-2',low:1,high:2},
 {id:'2-to-below-3',low:2,high:3},
 {id:'3-to-below-5',low:3,high:5},
 {id:'5-to-below-10',low:5,high:10},
 {id:'10-plus',low:10,high:Infinity}
];
function r3(n){return Number(n.toFixed(3));}
function makeStats(){return {n:0,expected_wins:0,actual_wins:0,profit_units:0,stake_units:0,weighted_expected_profit:0,variance_wins:0};}
function add(st,p,won,pnl=0,odds=null){
 st.n++;st.expected_wins+=p;st.actual_wins+=Number(won);st.variance_wins+=p*(1-p);
 if(odds!==null){st.profit_units+=pnl;st.stake_units++;st.weighted_expected_profit+=p*odds-1;}
}
function finish(st){
 return {n:st.n,expected_wins:r3(st.expected_wins),observed_wins:st.actual_wins,
  expected_win_rate:st.n?r3(st.expected_wins/st.n):null,
  observed_win_rate:st.n?r3(st.actual_wins/st.n):null,
  observed_minus_expected:r3(st.actual_wins-st.expected_wins),
  expected_win_count_sd_independent_only:r3(Math.sqrt(st.variance_wins)),
  profit_units:r3(st.profit_units),stake_units:st.stake_units,
  return_on_stake:st.stake_units?r3(st.profit_units/st.stake_units):null,
  nominal_predicted_profit_units:r3(st.weighted_expected_profit)};
}
function summarize(rows,variant){
 const eventByClass=Object.fromEntries(LABELS.map(o=>[o,makeStats()]));
 const eventProbabilityBins=Object.fromEntries(LABELS.map(o=>[o,PROB_BINS.map(()=>makeStats())]));
 const selectionByClass=Object.fromEntries(LABELS.map(o=>[o,makeStats()]));
 const selectionByOdds=Object.fromEntries(ODDS_BINS.map(b=>[b.id,makeStats()]));
 const selectionCross=Object.fromEntries(LABELS.map(o=>[o,Object.fromEntries(ODDS_BINS.map(b=>[b.id,makeStats()]))]));
 const selectedRows=[];
 let passes=0, priced=0;
 for(const row of rows){
  if(!row.odds||!row.market)continue;
  priced++;
  const probs=anchor(row.model,row.market,variant.share);
  for(let i=0;i<3;i++){
   const p=probs[i],actual=row.actual===i;
   add(eventByClass[LABELS[i]],p,actual);
   const b=PROB_BINS.findIndex(([lo,hi])=>p>=lo&&p<hi);
   if(b<0)throw Error('No probability bin: '+p);
   add(eventProbabilityBins[LABELS[i]][b],p,actual);
  }
  const s=select(probs,row.odds,row.actual,variant.maxOdds);
  if(s.selection==='PASS'){passes++;continue;}
  const i=LABELS.indexOf(s.selection),p=probs[i],b=ODDS_BINS.find(x=>s.odds>=x.low&&s.odds<x.high);
  if(i<0||!b)throw Error('Invalid selection or odds');
  add(selectionByClass[s.selection],p,s.won,s.pnl,s.odds);
  add(selectionByOdds[b.id],p,s.won,s.pnl,s.odds);
  add(selectionCross[s.selection][b.id],p,s.won,s.pnl,s.odds);
  selectedRows.push({fixture:row.id,date:row.date,outcome:LABELS[row.actual],
    selection:s.selection,odds:s.odds,predicted_probability:r3(p),won:s.won,profit_units:r3(s.pnl)});
 }
 const result={
  model_id:variant.id,priced_matches:priced,selections:selectedRows.length,passes,
  all_match_outcome_calibration:Object.fromEntries(LABELS.map(o=>[o,finish(eventByClass[o])])),
  all_match_probability_bands:Object.fromEntries(LABELS.map(o=>[o,
   eventProbabilityBins[o].map((s,i)=>({interval:[PROB_BINS[i][0],Math.min(1,PROB_BINS[i][1])],...finish(s)}))])),
  selected_outcome_calibration:Object.fromEntries(LABELS.map(o=>[o,finish(selectionByClass[o])])),
  selected_odds_bands:ODDS_BINS.map(b=>({odds_band:b.id,...finish(selectionByOdds[b.id])})),
  selected_outcome_x_odds:Object.fromEntries(LABELS.map(o=>[o,ODDS_BINS.map(b=>({odds_band:b.id,...finish(selectionCross[o][b.id])}))])),
  selected_fixtures:selectedRows
 };
 // Every priced fixture contributes one event to each event class; every bet to one selected class/band.
 if(LABELS.some(o=>eventByClass[o].n!==priced))throw Error('Event class coverage mismatch');
 const n=LABELS.reduce((s,o)=>s+selectionByClass[o].n,0);
 if(n!==selectedRows.length||selectionByOdds['below-2'].n+selectionByOdds['2-to-below-3'].n+
   selectionByOdds['3-to-below-5'].n+selectionByOdds['5-to-below-10'].n+selectionByOdds['10-plus'].n!==n ||
   n+passes!==priced)throw Error('Selection reconciliation failed');
 return result;
}
function run(texts){
 if(!Array.isArray(texts)||texts.length!==2)throw Error('Need two diagnostic season CSVs');
 const groups=texts.map(prepared);
 const priced=groups.map(rows=>rows.filter(r=>r.market&&r.odds));
 if(priced[0].length<1||priced[1].length<1)throw Error('No prices');
 const combined=[...priced[0],...priced[1]];
 return {experiment:'HOME_DRAW_AWAY_AND_ODDS_BAND_CALIBRATION',
  status:'HISTORICAL_REUSED_DATA_RESEARCH_ONLY',
  source_periods:['2024/25','2025/26'],
  total_eligible_fixtures:groups.reduce((s,r)=>s+r.length,0),
  total_priced_fixtures:combined.length,
  unpriced:groups.reduce((s,r)=>s+r.length,0)-combined.length,
  variants:VARIANTS.map(v=>summarize(combined,v)),
  by_season:VARIANTS.map(v=>({id:v.id,periods:['2024/25','2025/26'].map((name,i)=>({name,calibration:summarize(priced[i],v)}))})),
  warnings:['All match class calibration uses every priced fixture, not only bets.',
   'Selection calibration uses the probability of the selected home/draw/away outcome.',
   'Small class x odds groups can be noisy; expected standard deviation assumes independent fixtures.',
   'Archived PS prices have no independently verified decision-time availability; no verified Sky Bet quotes.',
   'Repeatedly examined games and post-hoc odds caps; NOT untouched holdout or proven profit.'],
  odds_timestamp_attested:false,verified_skybet:false,verified_profit:false,publication_gate:'BLOCKED'};
}
if(require.main===module){
 const paths=process.argv.slice(2);if(paths.length!==2)throw Error('Supply 2024/25 then 2025/26 CSVs');
 console.log(JSON.stringify(run(paths.map(p=>fs.readFileSync(p,'utf8'))),null,2));
}
module.exports={LABELS,VARIANTS,PROB_BINS,ODDS_BINS,summarize,run};
