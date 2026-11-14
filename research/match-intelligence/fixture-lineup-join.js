'use strict';
// Stage 8D: matchday join for historical lineup archive and dated fixture records.
// Current-match observed lineup never enters a pre-match feature.
const {normalizeHistoricalAvailability}=require('./historical-availability.js');
function validMatch(m){
 const n=Number(String(m?.round||'').replace(/^Matchday /,''));
 return Number.isInteger(n)&&n>=1&&n<=38&&/^Matchday \d{1,2}$/.test(m.round)
  &&/^\d{4}-\d{2}-\d{2}$/.test(m.date||'')
  &&Array.isArray(m.score?.ft)&&m.score.ft.length===2&&m.score.ft.every(x=>Number.isInteger(x)&&x>=0)
  &&typeof m.team1==='string'&&typeof m.team2==='string'&&m.team1!==m.team2?n:null;
}
function auditClubFixtureJoin({archive,results,teamName=archive?.club}={}){
 const x=normalizeHistoricalAvailability(archive);
 if(!results||!Array.isArray(results.matches)||typeof teamName!=='string'||!teamName.trim())throw Error('Results must contain matches and explicit team');
 if(teamName!==x.club)throw Error('Unverified team-name alias: exact match required');
 const records=[],roundSeen=new Set(),dateSeen=new Set(),problems=[];
 for(const m of results.matches){
   if(m.team1!==teamName&&m.team2!==teamName)continue;
   const round=validMatch(m);
   if(!round){problems.push({reason:'INVALID_MATCH',value:m?.round});continue;}
   if(roundSeen.has(round)){problems.push({reason:'DUPLICATE_CLUB_ROUND',round});continue;}
   roundSeen.add(round);
   const id=`${x.season}-${round}-${m.team1}-${m.team2}`;
   if(dateSeen.has(id)){problems.push({reason:'DUPLICATE_FIXTURE',fixture_id:id});continue;}
   dateSeen.add(id);
   records.push({fixture_id:id,round,date:m.date,home:m.team1,away:m.team2,
      goals_home:m.score.ft[0],goals_away:m.score.ft[1]});
 }
 records.sort((a,b)=>a.date.localeCompare(b.date)||a.fixture_id.localeCompare(b.fixture_id));
 const byRound=new Map(x.rounds.map(v=>[v.round,v])),dated=[];
 const byDate=new Map();
 for(const f of records){
   const src=byRound.get(f.round);
   if(!src){problems.push({reason:'MISSING_LINEUP_ROUND',round:f.round});continue;}
   const starters=src.starting_player_ids;
   if(src.starters!==11||src.issues.length)problems.push({reason:'INVALID_RECORDED_XI',round:f.round});
   // Consider solely earlier dated matches. Exclude all same-day rounds.
   const earlier=dated.filter(v=>v.date<f.date&&v.matchdayValid);
   const prior=earlier.at(-1)||null;
   const previousXI=prior?new Set(prior.starters):null;
   const historicalContinuity=previousXI===null?null:starters.filter(p=>previousXI.has(p)).length/11;
   // Deliberately do NOT expose current-match XI or its similarity as pre-match feature.
   const prematchFeatures=prior?{
     previous_known_match_date:prior.date,
     previous_matchday:prior.round,
     prior_match_starters:prior.starters.length,
     prior_match_previous_XI_retention:prior.historicalContinuity
   }:null;
   const row={...f,recorded_starters:src.starters,matchdayValid:src.starters===11&&!src.issues.length,
     starters:[...starters],historicalContinuity,prematchFeatures,
     prematch_player_impact_coefficient:null,forecast_eligible:false};
   dated.push(row);
   byDate.set(f.date,(byDate.get(f.date)||0)+1);
 }
 const missingRounds=x.rounds.filter(r=>!roundSeen.has(r.round)).map(r=>r.round);
 if(missingRounds.length)problems.push({reason:'MISSING_RESULT_MATCHDAYS',rounds:missingRounds});
 const hasIssues=problems.length||x.errors.length||records.length!==38;
 return {club:x.club,season:x.season,archive_retrieved_at:x.source_scraped_at,joined:dated.length,
   records,rows:dated,issues:problems,archive_issues:x.errors,valid_38_rounds:!hasIssues,
   retrospective_xi_does_not_prove_prematch_knowledge:true,
   training_eligible:false,prediction_eligible:false,
   model_validation:'UNVALIDATED',publication_gate:'BLOCKED'};
}
module.exports={auditClubFixtureJoin,validMatch};
