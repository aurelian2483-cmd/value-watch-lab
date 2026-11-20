#!/usr/bin/env node
// Reproducible, isolated research replay. Node >=18; no third-party libraries.
// Usage: node research/football-baseline-v1/replay.mjs [output-path]
// Downloads only the pinned CC0 openfootball results; does not fetch market odds.
// Does not reproduce or modify original Sky production forecasts.
import fs from "node:fs";
const run = function run(seasons) {
  const rows=[], totals={};
  const clamp=x=>Math.max(.15,Math.min(4,x));
  const mean=(xs,f)=>xs.reduce((s,x)=>s+f(x),0)/xs.length;
  const probs=(lh,la)=>{
    const pH=[Math.exp(-lh)],pA=[Math.exp(-la)];
    for(let i=1;i<=11;i++){pH.push(pH[i-1]*lh/i);pA.push(pA[i-1]*la/i)}
    const p=[0,0,0];for(let h=0;h<=11;h++)for(let a=0;a<=11;a++)p[h>a?0:h===a?1:2]+=pH[h]*pA[a];
    const z=p.reduce((s,x)=>s+x,0);return p.map(x=>x/z);
  };
  const form=(xs,team)=>{
    const last=xs.filter(x=>x.team1===team||x.team2===team).slice(-5);
    return mean(last,x=>x.team1===team?x.score.ft[0]-x.score.ft[1]:x.score.ft[1]-x.score.ft[0]);
  };
  for(const season of Object.keys(seasons).sort()){
    const matches=seasons[season].matches.filter(x=>Array.isArray(x.score?.ft)&&x.score.ft.length===2).sort((a,b)=>a.date.localeCompare(b.date)||a.team1.localeCompare(b.team1)||a.team2.localeCompare(b.team2));
    const prior=[];let eligible=0,seen=0;
    for(let i=0;i<matches.length;){
      let j=i;while(j<matches.length&&matches[j].date===matches[i].date)j++;
      for(const m of matches.slice(i,j)){
        const hm=prior.filter(x=>x.team1===m.team1),am=prior.filter(x=>x.team2===m.team2);
        const hAll=prior.filter(x=>x.team1===m.team1||x.team2===m.team1),aAll=prior.filter(x=>x.team1===m.team2||x.team2===m.team2);
        seen++;
        if(prior.length<30||hm.length<3||am.length<3||hAll.length<3||aAll.length<3)continue;
        eligible++;
        const leagueH=mean(prior,x=>x.score.ft[0]),leagueA=mean(prior,x=>x.score.ft[1]);
        const ha=(hm.reduce((s,x)=>s+x.score.ft[0],0)+5*leagueH)/(hm.length+5);
        const hd=(hm.reduce((s,x)=>s+x.score.ft[1],0)+5*leagueA)/(hm.length+5);
        const aa=(am.reduce((s,x)=>s+x.score.ft[1],0)+5*leagueA)/(am.length+5);
        const ad=(am.reduce((s,x)=>s+x.score.ft[0],0)+5*leagueH)/(am.length+5);
        const lh=clamp(ha*ad/Math.max(.01,leagueA)),la=clamp(aa*hd/Math.max(.01,leagueH));
        const delta=form(hAll,m.team1)-form(aAll,m.team2);
        const base=probs(lh,la),adjusted=probs(lh*Math.exp(.025*delta),la*Math.exp(-.025*delta));
        const win=m.score.ft[0]>m.score.ft[1]?0:m.score.ft[0]===m.score.ft[1]?1:2;
        const rounded=p=>p.map(x=>Number(x.toFixed(12)));
        rows.push({id:`${season}|${m.date}|${m.team1}|${m.team2}`,season,date:m.date,home:m.team1,away:m.team2,ft:m.score.ft,winner_index:win,prior_league_matches:prior.length,p_unadjusted:rounded(base),p_recent_form_alpha_0_025:rounded(adjusted)});
      }
      prior.push(...matches.slice(i,j));i=j;
    }
    totals[season]={completed:seen,eligible};
  }
  const metric=field=>{const all=rows.map(r=>r[field]);let ll=0,brier=0,hits=0;for(let i=0;i<rows.length;i++){const p=all[i],y=rows[i].winner_index;ll-=Math.log(p[y]);brier+=p.reduce((s,v,k)=>s+(v-(k===y?1:0))**2,0);if(p.indexOf(Math.max(...p))===y)hits++}return {n:rows.length,log_loss:ll/rows.length,multiclass_brier:brier/rows.length,top1_accuracy:hits/rows.length}};
  return {meta:{name:"RECONSTRUCTED_POISSON_RESEARCH_V1",historical_source_commit:"e6744429ee395bc86f247348c6184bb08d4eb361",description:"Independent parameterized approximation, NOT recovered original Sky forecast",research_only:true,validated:false,model_publication_gate:"BLOCKED",outcomes_order:["home","draw","away"],input_cutoff:"all earlier calendar dates only; retrospective, not attested forecasts",goal_rate_prior_pseudomatches:5,poisson_grid_goals_max:11,lambda_min:.15,lambda_max:4,form_alpha:.025},counts:totals,metrics:{unadjusted:metric("p_unadjusted"),form:metric("p_recent_form_alpha_0_025")},rows};
};
const commit = "e6744429ee395bc86f247348c6184bb08d4eb361";
const seasons = {};
for (const s of ["2024-25","2025-26"]) {
  const url = `https://raw.githubusercontent.com/openfootball/football.json/${commit}/${s}/en.1.json`;
  const response = await fetch(url);
  if (!response.ok) throw Error(`Could not fetch pinned source ${s}: HTTP ${response.status}`);
  seasons[s] = await response.json();
}
const result=run(seasons);
if (result.rows.length!==608 || result.counts["2024-25"].eligible!==320 || result.counts["2025-26"].eligible!==288) throw Error("Eligibility mismatch; pinned data changed or calculation bug");
if (new Set(result.rows.map(x=>x.id)).size!==608) throw Error("Duplicate match ID");
for (const row of result.rows) for(const p of [row.p_unadjusted,row.p_recent_form_alpha_0_025]) if (Math.abs(p.reduce((a,b)=>a+b,0)-1)>1e-9) throw Error("Invalid probability vector");
const serialized=JSON.stringify(result,null,2)+"\n";
const path=process.argv[2]||"football-baseline-v1-results.json";
fs.writeFileSync(path,serialized,"utf8");
console.log(JSON.stringify({output:path,counts:result.counts,metrics:result.metrics},null,2));
