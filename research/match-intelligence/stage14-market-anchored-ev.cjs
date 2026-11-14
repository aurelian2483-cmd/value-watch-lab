'use strict';
// Stage 14: explicit hypothesis test — does market anchoring / longshot exposure
// reduce spurious EV selection? Reused historical source, NOT prospective proof.
// Market quote timestamps and executable odds are NOT independently verified.
const fs=require('node:fs');
const {parseBookmakerSeason,predictionsForSeason,implied,scores}=require('./stage12-market-calibration.cjs');
const {evaluateSeason}=require('../../scripts/match_intelligence_backtest.cjs');
const {pick}=require('./fixture-winnings-audit.cjs');
const WEIGHTS=Object.freeze([1,.75,.5,.25,.1,0]); // model share; 1 = old recent-form
const CAPS=Object.freeze([null,10,5,3]); // null means no cap
const outcomes=['HOME','DRAW','AWAY'];
function anchor(model,market,share){
 if(!WEIGHTS.includes(share))throw Error('Unregistered model share');
 if(!Array.isArray(model)||!Array.isArray(market)||model.length!==3||market.length!==3)throw Error('Missing 1X2 vector');
 const p=market.map((x,i)=>(1-share)*x+share*model[i]);
 if(p.some(x=>!Number.isFinite(x)||x<0||x>1)||Math.abs(p.reduce((a,b)=>a+b,0)-1)>1e-7)throw Error('Invalid blended probability');
 return p;
}
function select(p,odds,actual,maxOdds=null){
 if(maxOdds!==null&&!CAPS.includes(maxOdds))throw Error('Unknown odds cap');
 if(maxOdds===null)return pick(p,odds,actual);
 if(!odds)return pick(p,null,actual);
 const masked=odds.map((x)=>x>maxOdds?null:x);
 const choices=p.map((prob,i)=>({i,odds:masked[i],ev:masked[i]===null?-Infinity:prob*masked[i]-1}))
  .filter(x=>x.ev>=.05).sort((a,b)=>b.ev-a.ev||a.i-b.i);
 if(!choices.length)return {selection:'PASS',odds:null,estimated_ev:null,won:null,pnl:0};
 const c=choices[0];return {selection:outcomes[c.i],odds:c.odds,estimated_ev:c.ev,won:c.i===actual,pnl:c.i===actual?c.odds-1:-1};
}
function prepared(text){
 const season=parseBookmakerSeason(text),pred=predictionsForSeason(season.results);
 const eligible=new Set(evaluateSeason(season.results).rows.map(r=>r.date+'|'+r.home+'|'+r.away));
 const all=[];
 for(const m of season.results){
  const key=m.date+'|'+m.home+'|'+m.away;
  if(!eligible.has(key))continue;
  const p=pred.get(key),quote=season.market.get(key)?.opening;
  if(!p)throw Error('Missing predate-only prediction '+key);
  all.push({id:key,date:m.date,score:m.hg+'-'+m.ag,
   actual:m.hg>m.ag?0:m.hg===m.ag?1:2,
   model:Object.values(p.form),
   market:quote?.probabilities??null,
   odds:quote?.odds??null});
 }
 return all;
}
function audit(rows,share,cap){
 let bets=0,wins=0,pnl=0,logloss=0,brier=0,peak=0,maxDrawdown=0;
 const bands={under2:{bets:0,wins:0,pnl:0},twoToFive:{bets:0,wins:0,pnl:0},fiveToTen:{bets:0,wins:0,pnl:0},overTen:{bets:0,wins:0,pnl:0}};
 const examples=[];
 for(const r of rows){
  const probs=anchor(r.model,r.market,share);
  const d=select(probs,r.odds,r.actual,cap);
  if(d.selection!=='PASS'){
    bets++;wins+=Number(d.won);pnl+=d.pnl;
    const band=d.odds<2?bands.under2:d.odds<5?bands.twoToFive:d.odds<10?bands.fiveToTen:bands.overTen;
    band.bets++;band.wins+=Number(d.won);band.pnl+=d.pnl;
    if(examples.length<4)examples.push({fixture:r.id,result:r.score,selection:d.selection,odds:d.odds,pnl:d.pnl});
  }
  peak=Math.max(peak,pnl);maxDrawdown=Math.max(maxDrawdown,peak-pnl);
  const sc=scores(probs,r.actual);
  logloss+=sc.loss;brier+=sc.brier;
 }
 return {model_share:share,max_odds:cap??'NONE',matches:rows.length,bets,wins,
  losing_bets:bets-wins,pass:rows.length-bets,pnl_units:Number(pnl.toFixed(2)),
  quote_only_roi:bets?pnl/bets:null,mean_logloss:logloss/rows.length,
  mean_brier:brier/rows.length,max_drawdown_units:Number(maxDrawdown.toFixed(2)),
  odds_bands:bands,first_examples:examples};
}
function run(texts){
 if(!Array.isArray(texts)||texts.length!==3)throw Error('Pass 2023/24, 2024/25 and 2025/26 CSV data');
 const groups=texts.map(prepared),priced=groups.map(s=>s.filter(r=>r.odds&&r.market));
 const cal=priced[0],diagnostic=[...priced[1],...priced[2]];
 if(cal.length<200||diagnostic.length<300)throw Error('Too few priced records');
 const grid=(rows)=>WEIGHTS.flatMap(share=>CAPS.map(cap=>audit(rows,share,cap)));
 const calStats=grid(cal),afterStats=grid(diagnostic);
 const bestCal=calStats.filter(x=>x.max_odds==='NONE').reduce((a,b)=>a.mean_logloss<=b.mean_logloss?a:b);
 const head=afterStats.find(x=>x.model_share===1&&x.max_odds==='NONE');
 const contrast=afterStats.filter(x=>(x.model_share===.25||x.model_share===.5||x.model_share===1)&&
   (x.max_odds==='NONE'||x.max_odds===5));
 return {experiment:'MARKET_ANCHOR_AND_ODDS_EXPOSURE_SENSITIVITY',
  status:'EXPLORATORY_REUSED_HISTORICAL_RESULTS',
  formula:'p_new=(1-model_share)*p_de_vig_open_market+model_share*p_recent_form; EV=p_new*decimal_odds-1; max odds cap optional',
  fixed_model_shares:WEIGHTS,predeclared_odds_caps:CAPS,ev_threshold:.05,
  calibration:{period:'2023/24',priced:cal.length,unpriced:groups[0].length-cal.length,
    best_calibration_logloss_share:bestCal.model_share,model_only:calStats.find(x=>x.model_share===1&&x.max_odds==='NONE'),grid:calStats},
  historical_diagnostic:{priced:diagnostic.length,
    eligible:groups[1].length+groups[2].length,
    missing_quotes:groups[1].length+groups[2].length-diagnostic.length,
    by_period:[{period:'2024/25',priced:priced[1].length,grid:grid(priced[1])},
      {period:'2025/26',priced:priced[2].length,grid:grid(priced[2])}],
    raw_form_baseline:head,selected_contrasts:contrast,full_grid:afterStats},
  source_quote_timestamp_verified:false,skybet_odds_verified:false,
  untouched_holdout:false,verified_executable_profit:false,
  publication_gate:'BLOCKED',
  notes:'Candidate filters are sensitivity comparisons on already examined games, not tuned profitable recommendations. If calibration-selected market-only share=0, it offers no nominal EV at its own overround prices. Improvements in hindsight returns may not repeat.'};
}
if(require.main===module){
 const files=process.argv.slice(2);if(files.length!==3)throw Error('Provide calibration and two subsequent historical EPL CSVs');
 const result=run(files.map(f=>fs.readFileSync(f,'utf8')));
 console.log(JSON.stringify(result,null,2));
}
module.exports={WEIGHTS,CAPS,anchor,select,prepared,audit,run};
