'use strict';
// Stage 10 research: rolling associative player residuals from finished earlier games.
// NEVER use the current fixture's observed XI to forecast that fixture.
// The measured per-player coefficient is NOT causal, nor a validated pre-match availability estimate.
const fs=require('node:fs');
const {buildSeason}=require('./lagged-xi-diagnostic');
const {baseline,metrics}=require('../../scripts/match_intelligence_backtest.cjs');
const ALPHAS=Object.freeze([0,.15,.30,.60,1]);
const K=20;
const mean=arr=>arr.reduce((a,b)=>a+b,0)/arr.length;
const clamp=x=>Math.max(.15,Math.min(4,x));
function key(team,id){return team+':'+id;}
function priorPlayerSignal(team,history){
  if(!history.length)return null;
  const recent=history.at(-1);
  if(!recent?.lineup?.length)return null;
  const allMean=mean(history.map(x=>x.residual));
  const stats=new Map();
  for(const x of history)for(const id of x.lineup){
    const k=key(team,id),s=stats.get(k)||{n:0,sum:0};
    s.n++;s.sum+=x.residual;
    stats.set(k,s);
  }
  const playerEffects=recent.lineup.map(id=>{
    const x=stats.get(key(team,id));
    return x?Math.max(-.35,Math.min(.35,(x.sum/x.n-allMean)*x.n/(x.n+K))):0;
  });
  return {signal:mean(playerEffects),known_previous_matches:history.length,
    included_players:recent.lineup.length,max_player_training_matches:Math.max(...[...stats.values()].map(x=>x.n))};
}
function rollingReplay(games,alpha){
  if(!ALPHAS.includes(alpha))throw Error('Alpha outside preregistered grid');
  if(!Array.isArray(games)||games.length<70)throw Error('At least 70 fixture records required');
  for(let i=1;i<games.length;i++)if(games[i].date<games[i-1].date)throw Error('Fixture order must be chronological');
  const completed=[],history=new Map(),rows=[],audit={prior_observations:0,postmatch_updates:0};
  for(let start=0;start<games.length;){
    let end=start+1;while(end<games.length&&games[end].date===games[start].date)end++;
    const day=games.slice(start,end),observed=[];
    for(const m of day){
      if(!Array.isArray(m.homeLineup)||m.homeLineup.length!==11||new Set(m.homeLineup).size!==11
        ||!Array.isArray(m.awayLineup)||m.awayLineup.length!==11||new Set(m.awayLineup).size!==11)
        throw Error('Actual XI must contain 11 unique IDs');
      const base=baseline(completed,m);
      const home=priorPlayerSignal(m.home,history.get(m.home)||[]);
      const away=priorPlayerSignal(m.away,history.get(m.away)||[]);
      if(base&&home&&away&&home.known_previous_matches>=3&&away.known_previous_matches>=3){
        const actual=m.hg>m.ag?0:m.hg===m.ag?1:2;
        // team-specific residual signal, not direct current XI: only last completed XI is used
        const bh=base[0],ba=base[1];
        const lh=clamp(bh*Math.exp(alpha*(home.signal-away.signal)));
        const la=clamp(ba*Math.exp(alpha*(away.signal-home.signal)));
        rows.push({date:m.date,home:m.home,away:m.away,
          home_signal:home.signal,away_signal:away.signal,
          baseline:metrics(bh,ba,actual),candidate:metrics(lh,la,actual)});
      }
      if(base){
        // A bounded log-goal deviation, after match; baseline already uses prior home/away goal rates.
        const rh=Math.max(-1,Math.min(1,Math.log((m.hg+.5)/(base[0]+.5))));
        const ra=Math.max(-1,Math.min(1,Math.log((m.ag+.5)/(base[1]+.5))));
        observed.push({team:m.home,residual:rh,lineup:[...m.homeLineup]});
        observed.push({team:m.away,residual:ra,lineup:[...m.awayLineup]});
      }
    }
    // Freeze all team forecasts within each calendar date; no same-day results into any prediction.
    for(const item of observed){
      const teamHistory=history.get(item.team)||[];
      teamHistory.push(item);
      history.set(item.team,teamHistory);
      audit.postmatch_updates++;
    }
    completed.push(...day);start=end;
  }
  return {rows,audit};
}
function summary(rows) {
 if(!rows.length)throw Error('No eligible real-match evaluations');
 return {n:rows.length,baseline_log_loss:mean(rows.map(x=>x.baseline.log_loss)),
   candidate_log_loss:mean(rows.map(x=>x.candidate.log_loss)),
   baseline_brier:mean(rows.map(x=>x.baseline.brier)),
   candidate_brier:mean(rows.map(x=>x.candidate.brier))};
}
function run(calLeague,calArchives,diagLeague,diagArchives){
 const cal=buildSeason(calLeague,calArchives),diagnostic=buildSeason(diagLeague,diagArchives);
 const grid=ALPHAS.map(alpha=>({alpha,...summary(rollingReplay(cal,alpha).rows)}));
 const selected=grid.reduce((a,b)=>b.candidate_log_loss<a.candidate_log_loss?b:a).alpha;
 const tested=rollingReplay(diagnostic,selected);
 return {stage:'STAGE_10_REAL_ASSOCIATIVE_PLAYER_DIAGNOSTIC',
   input:'observed XI in finished past matches only',player_impact_type:'ASSOCIATION_NOT_CAUSATION',
   hypothesis:'prior XI player-level bounded residual goal performance centered against team history, ridge shrunken',
   calibration_season:'2023/24',diagnostic_season:'2024/25',calibration:grid,
   selected_alpha:selected,diagnostic:summary(tested.rows),diagnostic_audit:tested.audit,
   untouched_holdout:false,has_verified_first_known_pre_match_coverage:false,
   validation:'UNVALIDATED',publication_gate:'BLOCKED',research_only:true,
   note:'Feature is last completed XI and prior player-level residuals, not forecast upcoming XI; source archives retrospective. Do not infer actual player value or betting profitability.'};
}
if(require.main===module){
 const path=process.argv[2];
 if(!path)throw Error('Pass parent folder containing 2023-24 and 2024-25 fixtures and club files');
 const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
 const load=s=>({league:read(path+'/'+s+'/en.1.json'),archives:fs.readdirSync(path+'/'+s+'/clubs').filter(x=>x.endsWith('.json')).sort().map(file=>read(path+'/'+s+'/clubs/'+file))});
 const a=load('2023-24'),b=load('2024-25');
 console.log(JSON.stringify(run(a.league,a.archives,b.league,b.archives),null,2));
}
module.exports={priorPlayerSignal,rollingReplay,summary,run,ALPHAS};
