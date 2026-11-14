'use strict';
// Stage 11: regularized teammate-adjusted prior-lineup association and replacement scenarios.
// Actual current-match lineups NEVER used to forecast their fixture.
// These are associative, not identifiable causal effects or validated pre-kickoff lineups.
const fs=require('node:fs');
const {buildSeason}=require('./lagged-xi-diagnostic');
const {baseline,metrics}=require('../../scripts/match_intelligence_backtest.cjs');
const ALPHAS=Object.freeze([-.6,-.3,0,.3,.6]);
const RIDGE=12;
const mean=arr=>arr.reduce((a,v)=>a+v,0)/arr.length;
const clamp=x=>Math.max(.15,Math.min(4,x));
function solveRidge(matrix,vector,penalty){
 const n=vector.length;
 if(!n||matrix.length!==n||matrix.some(row=>row.length!==n))throw Error('Invalid system');
 const a=matrix.map((row,i)=>[...row,vector[i]]);
 for(let i=0;i<n;i++)a[i][i]+=penalty;
 for(let i=0;i<n;i++){
   let idx=i;for(let j=i+1;j<n;j++)if(Math.abs(a[j][i])>Math.abs(a[idx][i]))idx=j;
   if(Math.abs(a[idx][i])<1e-10)throw Error('Singular ridge system');
   [a[i],a[idx]]=[a[idx],a[i]];
   const factor=a[i][i];for(let j=i;j<=n;j++)a[i][j]/=factor;
   for(let k=0;k<n;k++)if(k!==i){const weight=a[k][i];for(let j=i;j<=n;j++)a[k][j]-=weight*a[i][j];}
 }
 return a.map(row=>row[n]);
}
function fittedReplacementSignal(history,{minHistory=12,ridge=RIDGE}={}){
 if(!Array.isArray(history)||history.length<minHistory)return null;
 if(!Number.isFinite(ridge)||ridge<=0)throw Error('Positive ridge required');
 for(const h of history)if(!Number.isFinite(h.residual)||!Array.isArray(h.lineup)||h.lineup.length!==11||new Set(h.lineup).size!==11)throw Error('Invalid previous XI history');
 // Use only players in prior completed games. Fix sorted identity and mean-start reference.
 const ids=[...new Set(history.flatMap(h=>h.lineup))].sort((a,b)=>String(a).localeCompare(String(b)));
 const p=ids.length,n=history.length;
 if(p>80)throw Error('Excessive player identities');
 const index=new Map(ids.map((id,i)=>[id,i]));
 const incidence=history.map(h=>{const x=Array(p).fill(0);for(const id of h.lineup)x[index.get(id)]=1;return x;});
 const frequency=ids.map((_,j)=>mean(incidence.map(row=>row[j])));
 const residualMean=mean(history.map(h=>h.residual));
 const xtx=Array.from({length:p},()=>Array(p).fill(0));
 const xty=Array(p).fill(0);
 for(let i=0;i<n;i++){
   const x=incidence[i].map((v,j)=>v-frequency[j]),y=history[i].residual-residualMean;
   for(let j=0;j<p;j++){
     xty[j]+=x[j]*y;
     for(let k=0;k<p;k++)xtx[j][k]+=x[j]*x[k];
   }
 }
 const coefficients=solveRidge(xtx,xty,ridge);
 const last=new Set(history.at(-1).lineup);
 const relative=coefficients.reduce((v,b,j)=>v+b*((last.has(ids[j])?1:0)-frequency[j]),0);
 // Sensible bounded research feature. No claim on signed player causality.
 const signal=Math.max(-.3,Math.min(.3,relative));
 // Comparison of last XI to an expected roster baseline, not to an invented substitute.
 return {signal,players:p,history:n,reference:'PRIOR_START_FREQUENCY',
    coefficient_l2:Math.sqrt(coefficients.reduce((v,x)=>v+x*x,0)),
    replacement_quality_identified:false,
    coefficients_are_causal:false};
}
function replay(games,alpha){
 if(!ALPHAS.includes(alpha))throw Error('Alpha outside locked research grid');
 if(!Array.isArray(games)||games.length<70)throw Error('At least 70 ordered fixtures required');
 for(let i=1;i<games.length;i++)if(games[i].date<games[i-1].date)throw Error('Fixtures not sorted');
 const played=[],prior=new Map(),rows=[];
 for(let start=0;start<games.length;){
   let end=start+1;while(end<games.length&&games[end].date===games[start].date)end++;
   const day=games.slice(start,end),updates=[];
   for(const g of day){
     for(const lineup of [g.homeLineup,g.awayLineup])
       if(!Array.isArray(lineup)||lineup.length!==11||new Set(lineup).size!==11)throw Error('Invalid actual XI');
     const b=baseline(played,g);
     const hs=fittedReplacementSignal(prior.get(g.home)||[]),as=fittedReplacementSignal(prior.get(g.away)||[]);
     if(b&&hs&&as){
       const diff=hs.signal-as.signal,actual=g.hg>g.ag?0:g.hg===g.ag?1:2;
       const home=clamp(b[0]*Math.exp(alpha*diff)),away=clamp(b[1]*Math.exp(-alpha*diff));
       rows.push({date:g.date,baseline:metrics(b[0],b[1],actual),candidate:metrics(home,away,actual),
         difference:diff,home_history:hs.history,away_history:as.history});
     }
     if(b){
       const rh=Math.max(-1,Math.min(1,Math.log((g.hg+.5)/(b[0]+.5))));
       const ra=Math.max(-1,Math.min(1,Math.log((g.ag+.5)/(b[1]+.5))));
       updates.push([g.home,{lineup:[...g.homeLineup],residual:rh}],[g.away,{lineup:[...g.awayLineup],residual:ra}]);
     }
   }
   // Current fixture lineup, result and residual enter AFTER all that day's forecasts.
   for(const [team,item] of updates){const h=prior.get(team)||[];h.push(item);prior.set(team,h);}
   played.push(...day);start=end;
 }
 return rows;
}
function score(rows){
 if(!rows.length)throw Error('No eligible Stage 11 predictions');
 return {n:rows.length,baseline_ll:mean(rows.map(r=>r.baseline.log_loss)),
   challenger_ll:mean(rows.map(r=>r.candidate.log_loss)),
   baseline_brier:mean(rows.map(r=>r.baseline.brier)),
   challenger_brier:mean(rows.map(r=>r.candidate.brier))};
}
function run(calLeague,calArchive,diagLeague,diagArchive){
 const cal=buildSeason(calLeague,calArchive),diag=buildSeason(diagLeague,diagArchive);
 const calibration=ALPHAS.map(alpha=>({alpha,...score(replay(cal,alpha))}));
 const chosen=calibration.reduce((best,r)=>r.challenger_ll<best.challenger_ll?r:best).alpha;
 const later=score(replay(diag,chosen));
 return {stage:'STAGE_11_TEAMMATE_ADJUSTED_REPLACEMENT_PROXY',
   calibration,selected_alpha:chosen,diagnostic:later,
   data_scope:'2023/24 calibration and already-examined 2024/25 diagnostic',
   player_effect:'ASSOCIATIVE_RIDGE_NOT_CAUSAL',position_controlled:false,
   actual_substitute_quality_known:false,forecast_lineup_known:false,
   opponent_control:'BASELINE_HOME_AWAY_POISSON_ONLY',
   penalty:RIDGE,reference:'prior historical mean lineup composition',
   publication_gate:'BLOCKED',validation:'UNVALIDATED',untouched_holdout:false};
}
if(require.main===module){
 const dir=process.argv[2];if(!dir)throw Error('Pass preexisting Stage 8E fixture/archive directory');
 const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
 const get=s=>({league:read(dir+'/'+s+'/en.1.json'),archives:fs.readdirSync(dir+'/'+s+'/clubs').filter(f=>f.endsWith('.json')).sort().map(f=>read(dir+'/'+s+'/clubs/'+f))});
 const a=get('2023-24'),b=get('2024-25');
 console.log(JSON.stringify(run(a.league,a.archives,b.league,b.archives),null,2));
}
module.exports={solveRidge,fittedReplacementSignal,replay,score,run,ALPHAS};
