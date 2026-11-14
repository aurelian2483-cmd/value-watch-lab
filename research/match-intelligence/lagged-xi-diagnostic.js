'use strict';
// Stage 8E: REAL historical matchday-lineup stability challenger, NOT individual player effects.
// Source archives were scraped retrospectively; use ONLY completed earlier matches as features.
// Evaluations on 2024/25 are diagnostics (previously examined), NOT untouched validation.
const {normalizeHistoricalAvailability}=require('./historical-availability');
const {baseline,metrics}=require('../../scripts/match_intelligence_backtest.cjs');
const fs=require('node:fs');
const ALPHAS=[-.2,-.1,-.05,0,.05,.1,.2];
const NORMALIZE=s=>s.toLowerCase().replace(/\bfc\b/g,'').replace(/[^a-z0-9]/g,'');
const roundOf=s=>/^Matchday (?:[1-9]|[12]\d|3[0-8])$/.test(s)?Number(s.slice(9)):null;
const mean=x=>x.reduce((s,v)=>s+v,0)/x.length;
const clamp=x=>Math.max(.15,Math.min(4,x));
function buildSeason(league,archives){
 if(!league||!Array.isArray(league.matches)||league.matches.length!==380)throw Error('Require complete 380-match league season');
 if(!Array.isArray(archives)||archives.length!==20)throw Error('Require 20 retrospective league team archives');
 const byTeam=new Map();
 for(const d of archives) {
   const a=normalizeHistoricalAvailability(d),name=NORMALIZE(a.club);
   if(byTeam.has(name))throw Error('Ambiguous club name');
   const rounds=new Map(a.rounds.map(r=>[r.round,r]));
   if(a.rounds.length!==38||a.errors.length||a.rounds.some(r=>r.starters!==11||r.issues.length))throw Error('Archive starting XI coverage is not complete');
   byTeam.set(name,{name:a.club,rounds});
 }
 const games=[],seenTeamRounds=new Set();
 for(const m of league.matches){
   const round=roundOf(m.round);
   const home=NORMALIZE(m.team1),away=NORMALIZE(m.team2);
   if(!round||!byTeam.has(home)||!byTeam.has(away)||home===away)throw Error('Unmapped team or invalid round');
   if(!/^\d{4}-\d\d-\d\d$/.test(m.date)||!m.score||!Array.isArray(m.score.ft)||m.score.ft.length!==2||!m.score.ft.every(x=>Number.isInteger(x)&&x>=0))throw Error('Invalid match date or result');
   for(const team of [home,away]){
     const key=team+':'+round;
     if(seenTeamRounds.has(key))throw Error('Duplicate team-round fixture assignment');
     seenTeamRounds.add(key);
     if(!byTeam.get(team).rounds.has(round))throw Error('Missing club lineup round');
   }
   games.push({date:m.date,round,home,away,hg:m.score.ft[0],ag:m.score.ft[1],
     homeLineup:byTeam.get(home).rounds.get(round).starting_player_ids,
     awayLineup:byTeam.get(away).rounds.get(round).starting_player_ids});
 }
 if(seenTeamRounds.size!==760)throw Error('Incomplete team-round mapping');
 games.sort((a,b)=>a.date.localeCompare(b.date)||a.home.localeCompare(b.home));
 return games;
}
function replay(games,alpha){
 if(!ALPHAS.includes(alpha))throw Error('Unregistered coefficient');
 const played=[],priorXI=new Map(),scored=[];
 for(let start=0;start<games.length;){
   let end=start+1;while(end<games.length&&games[end].date===games[start].date)end++;
   const day=games.slice(start,end);
   for(const match of day){
     const h=priorXI.get(match.home)||[],a=priorXI.get(match.away)||[];
     const hm=h.length>=2?new Set(h.at(-1)).size&&h.at(-1).filter(id=>new Set(h.at(-2)).has(id)).length/11:null;
     const am=a.length>=2?a.at(-1).filter(id=>new Set(a.at(-2)).has(id)).length/11:null;
     // In historical archive, player IDs are per-team; never compare across teams.
     const p=baseline(played,match);
     if(!p||hm===null||am===null)continue;
     const delta=hm-am;
     const actual=match.hg>match.ag?0:match.hg===match.ag?1:2;
     const candidateH=clamp(p[0]*Math.exp(alpha*delta));
     const candidateA=clamp(p[1]*Math.exp(-alpha*delta));
     scored.push({date:match.date,round:match.round,delta,
       baseline:metrics(p[0],p[1],actual),challenger:metrics(candidateH,candidateA,actual)});
   }
   // Same-date match results and lineups only become available after all forecasts for that date.
   for(const m of day){
     for(const [team,players] of [[m.home,m.homeLineup],[m.away,m.awayLineup]]){
       const h=priorXI.get(team)||[];h.push(players);priorXI.set(team,h);
     }
     played.push(m);
   }
   start=end;
 }
 return scored;
}
function summarise(rows){
 if(!rows.length)throw Error('No eligible forecasts');
 return {n:rows.length,baseline_ll:mean(rows.map(r=>r.baseline.log_loss)),
  model_ll:mean(rows.map(r=>r.challenger.log_loss)),
  baseline_brier:mean(rows.map(r=>r.baseline.brier)),
  model_brier:mean(rows.map(r=>r.challenger.brier))};
}
function run(calibrationLeague,calibrationArchives,diagnosticLeague,diagnosticArchives){
 const cal=buildSeason(calibrationLeague,calibrationArchives);
 const diag=buildSeason(diagnosticLeague,diagnosticArchives);
 const trial=ALPHAS.map(alpha=>({alpha,...summarise(replay(cal,alpha))}));
 const selected=trial.reduce((best,x)=>x.model_ll<best.model_ll?x:best).alpha;
 const diagResult=summarise(replay(diag,selected));
 return {status:'REAL_OUTCOME_EXPLORATORY_DIAGNOSTIC_ONLY',research_only:true,publication_gate:'BLOCKED',
  feature:'lagged consecutive starting-XI overlap from two prior completed team matches',
  calibration_year:2023,diagnostic_year:2024,holdout_untouched:false,
  train_grid:trial,selected_alpha:selected,diagnostic:diagResult,
  warning:'Archived XI data retrospectively collected; no actual current-match XI or pre-kickoff injury data used. Previous outcomes already studied. This is NOT proof of player impact.'};
}
if(require.main===module){
 const path=process.argv[2];
 if(!path)throw Error('Pass directory with 2023-24/en.1.json, 2024-25/en.1.json, and 20 team JSON files in each year folder');
 const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
 const load=year=>({league:read(path+'/'+year+'/en.1.json'),
  archives:fs.readdirSync(path+'/'+year+'/clubs').filter(x=>x.endsWith('.json')).sort().map(x=>read(path+'/'+year+'/clubs/'+x))});
 const a=load('2023-24'),b=load('2024-25');
 console.log(JSON.stringify(run(a.league,a.archives,b.league,b.archives),null,2));
}
module.exports={buildSeason,replay,summarise,run,ALPHAS};
