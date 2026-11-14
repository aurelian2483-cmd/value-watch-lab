'use strict';
// Stage 3: opponent-adjusted attack/defence, research only. No betting output.
// Test candidate on earlier calibration seasons, then score a later holdout once.
const {readSeason,baseline,metrics}=require('./match_intelligence_backtest.cjs');
const fs=require('node:fs');
const HALF=[0,0.25,0.5,0.75,1];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const mean=x=>x.reduce((s,v)=>s+v,0)/x.length;
function summary(history) {
  const teams=new Map();let n=0,goalsH=0,goalsA=0;
  for(const e of history) {
    const h=teams.get(e.home)||{nh:0,na:0,hf:0,ha:0,af:0,aa:0};
    const a=teams.get(e.away)||{nh:0,na:0,hf:0,ha:0,af:0,aa:0};
    h.nh++;h.hf+=e.hg;h.ha+=e.ag;a.na++;a.af+=e.ag;a.aa+=e.hg;
    teams.set(e.home,h);teams.set(e.away,a);n++;goalsH+=e.hg;goalsA+=e.ag;
  }
  return {teams,n,homeAvg:n?goalsH/n:null,awayAvg:n?goalsA/n:null};
}
function factors(state, fixture) {
  const h=state.teams.get(fixture.home),a=state.teams.get(fixture.away);
  if(!h||!a||h.nh<3||a.na<3||state.n<30)return null;
  const w=5,lh=state.homeAvg,la=state.awayAvg;
  if(!(lh>0&&la>0))return null;
  return {
    homeAttack:(h.hf+w*lh)/(h.nh+w)/lh,
    homeDefence:(h.ha+w*la)/(h.nh+w)/la,
    awayAttack:(a.af+w*la)/(a.na+w)/la,
    awayDefence:(a.aa+w*lh)/(a.na+w)/lh,
  };
}
// At every historical fixture, use opponents' strength known BEFORE that date.
// Adjust each of the four observed offensive/defensive goal signals, then update
// the observed opponent ratings only after every same-day fixture is processed.
function replay(data, gamma) {
  if(!Number.isFinite(gamma)||gamma<0||gamma>1)throw Error('Invalid opponent coefficient');
  const rows=typeof data==='string'?readSeason(data):data;
  const original=[],adjusted=[],last=[];let past=[],rated=[];
  let winners=[];
  for(let i=0;i<rows.length;) {
    let end=i+1;while(end<rows.length&&rows[end].date===rows[i].date)end++;
    const day=rows.slice(i,end),state=summary(past);
    for(const f of day) {
      const base=baseline(past,f);if(!base)continue;
      const history=summary(adjusted);
      const h=history.teams.get(f.home),a=history.teams.get(f.away);
      if(!h||!a||h.nh<3||a.na<3||history.n<30)continue;
      const homeMean=history.homeAvg,awayMean=history.awayAvg,w=5;
      if(!(homeMean>0&&awayMean>0))continue;
      const homeAttack=(h.hf+w*homeMean)/(h.nh+w),homeDef=(h.ha+w*awayMean)/(h.nh+w);
      const awayAttack=(a.af+w*awayMean)/(a.na+w),awayDef=(a.aa+w*homeMean)/(a.na+w);
      const hLam=clamp(homeAttack*awayDef/homeMean,0.15,4);
      const aLam=clamp(awayAttack*homeDef/awayMean,0.15,4);
      const y=f.hg>f.ag?0:f.hg===f.ag?1:2;
      winners.push({date:f.date,match:f.home+' vs '+f.away,baseline:metrics(...base,y),
        candidate:metrics(hLam,aLam,y)});
    }
    for(const f of day) {
      const x=factors(state,f);
      // Without credible opponent history, use a neutral multiplier, never future data.
      const af=x?clamp(x.awayDefence,0.65,1.5):1;
      const hf=x?clamp(x.homeDefence,0.65,1.5):1;
      const ha=x?clamp(x.homeAttack,0.65,1.5):1;
      const aa=x?clamp(x.awayAttack,0.65,1.5):1;
      // Both sides' *goals scored* are adjusted for opponent defensive quality.
      // Goals conceded are adjusted for opponent attacking quality. Four fields
      // are kept separate to avoid treating conceded goals as attack strength.
      adjusted.push({...f,orig_hg:f.hg,orig_ag:f.ag,
        hg:f.hg/Math.pow(af,gamma),
        ag:f.ag/Math.pow(hf,gamma)});
      // Adjusted defensive counters are modeled independently below.
      last.push({home:f.home,away:f.away,date:f.date,ha:f.ag/Math.pow(aa,gamma),
        aa:f.hg/Math.pow(ha,gamma)});
    }
    past.push(...day);i=end;
  }
  return {source_rows:rows.length,eligible:winners.length,rows:winners,
    note:'Scores based on opponent-defence-adjusted goals; independent defensive residuals held for future expanded version, not used here.'};
}
function aggregate(groups) {
  const all=groups.flatMap(x=>x.rows);
  if(!all.length)throw Error('No eligible historical fixtures');
  return {n:all.length,baseline_ll:mean(all.map(x=>x.baseline.log_loss)),
    baseline_brier:mean(all.map(x=>x.baseline.brier)),
    model_ll:mean(all.map(x=>x.candidate.log_loss)),
    model_brier:mean(all.map(x=>x.candidate.brier))};
}
function run(seasons) {
  if(!Array.isArray(seasons)||seasons.length!==6)throw Error('Exactly six seasons required');
  const calibration=HALF.map(gamma=>({gamma,data:aggregate(seasons.slice(0,4).map(s=>replay(s,gamma)))}));
  const selected=calibration.reduce((a,b)=>a.data.model_ll<b.data.model_ll?a:b);
  const holdoutBySeason=seasons.slice(4).map(s=>replay(s,selected.gamma));
  const holdout=aggregate(holdoutBySeason);
  return {research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED',
    methodology:'Same-season dated archive; calibration seasons 2020/21–2023/24, held-out seasons 2024/25–2025/26',
    calibration,selected_gamma:selected.gamma,holdout,holdoutBySeason:holdoutBySeason.map(x=>({source_rows:x.source_rows,eligible:x.eligible})),
    note:'No xG, players, manager impact or betting results; opponent defence adjustment only. Do not deploy.'};
}
if(require.main===module){
  const paths=process.argv.slice(2);
  if(paths.length!==6)throw Error('Provide six season CSV paths in chronological order');
  process.stdout.write(JSON.stringify(run(paths.map(p=>readSeason(fs.readFileSync(p,'utf8')))),null,2)+'\n');
}
module.exports={factors,summary,replay,aggregate,run,HALF};
