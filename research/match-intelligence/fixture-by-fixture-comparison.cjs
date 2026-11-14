'use strict';
// Historical replay fixture-by-fixture: old Poisson vs new raw form.
// Not independent pre-match archived predictions. All past games reused for research.
const fs=require('node:fs');
const {readSeason,evaluateSeason}=require('../../scripts/match_intelligence_backtest.cjs');
const {parseBookmakerSeason,predictionsForSeason,scores}=require('./stage12-market-calibration.cjs');
function run(texts,{limit=12}={}){
 const data=[];
 for(const text of texts){
  const historical=parseBookmakerSeason(text);
  const earlierOnly=predictionsForSeason(historical.results);
  const eligible=new Set(evaluateSeason(historical.results).rows.map(x=>x.date+'|'+x.home+'|'+x.away));
  for(const m of historical.results){
   const key=m.date+'|'+m.home+'|'+m.away;
   if(!eligible.has(key))continue;
   const p=earlierOnly.get(key);
   if(!p)throw Error('Missing prediction for eligible fixture '+key);
   const actual=m.hg>m.ag?0:m.hg===m.ag?1:2;
   const base=Object.values(p.baseline),form=Object.values(p.form);
   const b=scores(base,actual),f=scores(form,actual);
   const market=historical.market.get(key);
   const probs=v=>Object.fromEntries(['home','draw','away'].map((x,i)=>[x,Number(v[i].toFixed(5))]));
   data.push({fixture:key,date:m.date,home:m.home,away:m.away,final_score:m.hg+'-'+m.ag,
      actual_outcome:['HOME','DRAW','AWAY'][actual],
      old_poisson_probabilities:probs(base),
      new_recent_form_probabilities:probs(form),
      old_probability_of_actual:base[actual],
      new_probability_of_actual:form[actual],
      old_log_loss:b.loss,new_log_loss:f.loss,delta_log_loss:f.loss-b.loss,
      old_brier:b.brier,new_brier:f.brier,delta_brier:f.brier-b.brier,
      old_top_choice:['HOME','DRAW','AWAY'][base.indexOf(Math.max(...base))],
      new_top_choice:['HOME','DRAW','AWAY'][form.indexOf(Math.max(...form))],
      archive_ps_open_prices:market?.opening?.odds??null,
      source_quote_time_verified:false,
      forecast_frozen_before_historical_kickoff:false});
  }
 }
 const sorted=[...data].sort((a,b)=>a.date.localeCompare(b.date)||a.fixture.localeCompare(b.fixture));
 const details=sorted.slice(0,limit);
 return {status:'RECONSTRUCTED_HISTORICAL_PREMATCH_STYLE_REPLAY',
   source_scope:'2024/25 and 2025/26 previously inspected seasons',
   scored_fixtures:sorted.length,shown:details.length,
   best_research_examples:[...data].sort((a,b)=>a.delta_log_loss-b.delta_log_loss).slice(0,3),
   worst_research_examples:[...data].sort((a,b)=>b.delta_log_loss-a.delta_log_loss).slice(0,3),
   game_by_game:details,
   summary:{new_model_better_on_games:data.filter(x=>x.delta_log_loss<-1e-12).length,
     old_model_better_on_games:data.filter(x=>x.delta_log_loss>1e-12).length,
     equal:data.filter(x=>Math.abs(x.delta_log_loss)<=1e-12).length,
     average_delta_log_loss:data.reduce((s,x)=>s+x.delta_log_loss,0)/data.length},
   verified_prospective:false,proven_betting_profit:false,publication_gate:'BLOCKED'};
}
if(require.main===module){
 const files=process.argv.slice(2);
 if(!files.length)throw Error('Pass archived EPL CSV files');
 console.log(JSON.stringify(run(files.map(x=>fs.readFileSync(x,'utf8'))),null,2));
}
module.exports={run};
