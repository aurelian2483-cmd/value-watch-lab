#!/usr/bin/env node
// RESEARCH ONLY. Pinned CC0 results, no odds, keys or production changes.
// Chronological selection: 2024-25 development; 2025-26 untouched holdout.
import fs from 'node:fs';
const sourceCommit='e6744429ee395bc86f247348c6184bb08d4eb361';
const artifact=JSON.parse(fs.readFileSync(new URL('./608-reconstructed-forecasts.json',import.meta.url),'utf8'));
if(artifact.rows.length!==608)throw Error('Expected 608 baseline fixtures');
const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;
const limit=x=>Math.max(-3,Math.min(3,x));
const tail=(a,n)=>a.slice(-n);
function teamDiff(m,t){return m.team1===t?m.score.ft[0]-m.score.ft[1]:m.score.ft[1]-m.score.ft[0]}
function features(prior,m){
  const h=prior.filter(x=>x.team1===m.team1||x.team2===m.team1);
  const a=prior.filter(x=>x.team1===m.team2||x.team2===m.team2);
  const hvenue=h.filter(x=>x.team1===m.team1), aven=a.filter(x=>x.team2===m.team2);
  const lastDiff=(xs,t,n)=>mean(tail(xs,n).map(x=>teamDiff(x,t)));
  const recent=lastDiff(h,m.team1,5)-lastDiff(a,m.team2,5);
  const venue=lastDiff(hvenue,m.team1,5)-lastDiff(aven,m.team2,5);
  const shift=(xs,t)=>xs.length<6?0:lastDiff(xs,t,3)-mean(xs.slice(-6,-3).map(x=>teamDiff(x,t)));
  return {recent:limit(recent),venue:limit(venue),shock:limit(shift(h,m.team1)-shift(a,m.team2))};
}
const featureMap=new Map();
for(const season of ['2024-25','2025-26']){
 const url=`https://raw.githubusercontent.com/openfootball/football.json/${sourceCommit}/${season}/en.1.json`;
 const resp=await fetch(url);if(!resp.ok)throw Error(`Pinned source unavailable: ${season} ${resp.status}`);
 const data=await resp.json();
 const matches=data.matches.filter(m=>Array.isArray(m.score?.ft)&&m.score.ft.length===2).sort((a,b)=>a.date.localeCompare(b.date)||a.team1.localeCompare(b.team1)||a.team2.localeCompare(b.team2));
 let prior=[];
 for(let i=0;i<matches.length;){
   let j=i;while(j<matches.length&&matches[j].date===matches[i].date)j++;
   for(const m of matches.slice(i,j)){
     featureMap.set(`${season}|${m.date}|${m.team1}|${m.team2}`,features(prior,m));
   }
   prior.push(...matches.slice(i,j));i=j;
 }
}
const rows=artifact.rows.map(r=>{
 const feat=featureMap.get(r.id);if(!feat)throw Error('Missing feature '+r.id);
 if(r.p_recent_form_alpha_0_025.length!==3)throw Error('Bad vector '+r.id);
 return {...r,features:feat};
});
if(new Set(rows.map(r=>r.id)).size!==608)throw Error('Duplicate fixture IDs');
const dev=rows.filter(r=>r.season==='2024-25'), hold=rows.filter(r=>r.season==='2025-26');
if(dev.length!==320||hold.length!==288)throw Error('Split size mismatch');
function adjust(row,signal,theta){
 const p=row.p_recent_form_alpha_0_025;
 if(signal==='baseline'||theta===0)return p;
 const tilt=theta*row.features[signal];
 const unnorm=[p[0]*Math.exp(tilt),p[1],p[2]*Math.exp(-tilt)];
 const z=unnorm.reduce((a,b)=>a+b,0);
 return unnorm.map(x=>x/z);
}
function score(sample,signal,theta){
 let loss=0,brier=0,correct=0;
 for(const r of sample){
  const p=adjust(r,signal,theta),y=r.winner_index;
  loss-=Math.log(Math.max(1e-15,p[y]));
  brier+=p.reduce((s,x,k)=>s+(x-(k===y?1:0))**2,0);
  if(p.indexOf(Math.max(...p))===y)correct++;
 }
 return {n:sample.length,log_loss:loss/sample.length,brier:brier/sample.length,accuracy:correct/sample.length};
}
const coefficients=[-0.2,-0.1,-0.05,0,0.05,0.1,0.2];
const candidates=[{signal:'baseline',theta:0},...['recent','venue','shock'].flatMap(signal=>coefficients.filter(x=>x!==0).map(theta=>({signal,theta})))];
const ranking=candidates.map(c=>({...c,development:score(dev,c.signal,c.theta)})).sort((a,b)=>a.development.log_loss-b.development.log_loss || a.signal.localeCompare(b.signal)||a.theta-b.theta);
const chosen=ranking[0];
const baselineDev=score(dev,'baseline',0),baselineHold=score(hold,'baseline',0),challengerHold=score(hold,chosen.signal,chosen.theta);
const result={status:'RESEARCH_ONLY_UNVALIDATED',source_commit:sourceCommit,development_season:'2024-25',holdout_season:'2025-26',split_rule:'Entire 2025-26 season excluded from coefficient and signal selection; within-season features use strictly prior calendar dates',baseline:'RECONSTRUCTED_POISSON_RESEARCH_V1 form alpha=0.025; NOT original Sky model',candidate_count:candidates.length,development_baseline:baselineDev,development_best:chosen,holdout_baseline:baselineHold,holdout_challenger:challengerHold,holdout_delta_log_loss:challengerHold.log_loss-baselineHold.log_loss,holdout_delta_brier:challengerHold.brier-baselineHold.brier,warning:'Retrospective holdout within two historical seasons only; no external/prospective validation, odds, betting or deployment claims'};
if(!Number.isFinite(result.holdout_delta_log_loss))throw Error('Invalid score');
console.log(JSON.stringify(result,null,2));
