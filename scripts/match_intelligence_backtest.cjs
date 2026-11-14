'use strict';
// Research-only, same-season historical replay. Does not affect published football forecasts.
// Usage: node scripts/match_intelligence_backtest.cjs data/raw/epl_results_2020_21.csv ... epl_results_2025_26.csv
const fs=require('node:fs');
const path=require('node:path');
const FACT=[1];for(let i=1;i<12;i++)FACT.push(FACT[i-1]*i);
const ALPHAS=[0,0.025,0.05,0.1,0.15,0.2];
const clamp=v=>Math.max(.15,Math.min(4,v));
const mean=a=>a.reduce((s,v)=>s+v,0)/a.length;
function csv(s){
  const out=[];let r=[],value='',quote=false;
  for(let i=0;i<s.length;i++){const c=s[i];
    if(c==='"'){if(quote&&s[i+1]==='"'){value+='"';i++;}else quote=!quote;}
    else if(c===','&&!quote){r.push(value);value='';}
    else if((c==='\n'||c==='\r')&&!quote){if(c==='\r'&&s[i+1]==='\n')i++;r.push(value);if(r.some(x=>x))out.push(r);r=[];value='';}
    else value+=c;
  }
  if(r.length||value){r.push(value);out.push(r);}return out;
}
function readSeason(s){
  const arr=csv(s.replace(/^\uFEFF/,''));if(!arr.length)throw Error('CSV is empty');
  const ix=Object.fromEntries(arr[0].map((h,i)=>[h,i]));
  for(const h of ['Date','HomeTeam','AwayTeam','FTHG','FTAG'])if(ix[h]===undefined)throw Error('Missing CSV field: '+h);
  const rows=[];
  for(const x of arr.slice(1)){
    const parts=(x[ix.Date]||'').split('/');if(parts.length!==3)throw Error('Invalid date');
    let [day,month,year]=parts;if(Number(year)<100)year=String(Number(year)+2000);
    const date=year+'-'+month.padStart(2,'0')+'-'+day.padStart(2,'0');
    const hg=Number(x[ix.FTHG]),ag=Number(x[ix.FTAG]);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!x[ix.HomeTeam]||!x[ix.AwayTeam]||!Number.isInteger(hg)||!Number.isInteger(ag)||hg<0||ag<0)
      throw Error('Bad historical fixture row');
    rows.push({date,home:x[ix.HomeTeam],away:x[ix.AwayTeam],hg,ag});
  }
  rows.sort((a,b)=>a.date.localeCompare(b.date));
  const keys=new Set(rows.map(x=>x.date+'|'+x.home+'|'+x.away));
  if(keys.size!==rows.length)throw Error('Duplicate fixtures');
  return rows;
}
function baseline(past,fixture){
  if(past.length<30)return null;
  const teams={};let sh=0,sa=0;
  for(const e of past){
    const h=teams[e.home]??={hn:0,hgf:0,hga:0,an:0,agf:0,aga:0};
    const a=teams[e.away]??={hn:0,hgf:0,hga:0,an:0,agf:0,aga:0};
    h.hn++;h.hgf+=e.hg;h.hga+=e.ag;
    a.an++;a.agf+=e.ag;a.aga+=e.hg;sh+=e.hg;sa+=e.ag;
  }
  const h=teams[fixture.home],a=teams[fixture.away];
  if(!h||!a||h.hn<3||a.an<3)return null;
  const ah=sh/past.length,aa=sa/past.length,w=5;if(!(ah>0&&aa>0))return null;
  const hgf=(h.hgf+w*ah)/(h.hn+w),hga=(h.hga+w*aa)/(h.hn+w);
  const agf=(a.agf+w*aa)/(a.an+w),aga=(a.aga+w*ah)/(a.an+w);
  return [clamp(hgf*aga/ah),clamp(agf*hga/aa)];
}
function metrics(lh,la,actual){
  let p=[0,0,0],ph=[],pa=[];
  for(let i=0;i<12;i++){ph[i]=Math.exp(-lh)*lh**i/FACT[i];pa[i]=Math.exp(-la)*la**i/FACT[i];}
  for(let i=0;i<12;i++)for(let j=0;j<12;j++)p[i>j?0:i===j?1:2]+=ph[i]*pa[j];
  const z=p.reduce((s,v)=>s+v,0);p=p.map(v=>v/z);
  return {log_loss:-Math.log(p[actual]),brier:p.reduce((s,v,i)=>s+(v-(i===actual?1:0))**2,0)};
}
function evaluateSeason(src){
  const data=typeof src==='string'?readSeason(src):src;
  let past=[],form=new Map(),stats=new Map(),scored=[];
  for(let start=0;start<data.length;){
    let end=start+1;while(end<data.length&&data[end].date===data[start].date)end++;
    const day=data.slice(start,end);
    // All same-day matches are evaluated against exactly the preceding days.
    for(const fx of day){
      const base=baseline(past,fx),home=form.get(fx.home)||[],away=form.get(fx.away)||[];
      if(!base||home.length<3||away.length<3)continue;
      const h=home.slice(-5),a=away.slice(-5);
      const raw=mean(h.map(v=>v.gd))-mean(a.map(v=>v.gd));
      const adjusted=mean(h.map(v=>v.adjusted_gd))-mean(a.map(v=>v.adjusted_gd));
      const actual=fx.hg>fx.ag?0:fx.hg===fx.ag?1:2;
      const scores={baseline:metrics(base[0],base[1],actual)};
      for(const mode of ['raw','adjusted'])for(const alpha of ALPHAS){
        const delta=mode==='raw'?raw:adjusted;
        scores[mode+':'+alpha]=metrics(clamp(base[0]*Math.exp(alpha*delta)),clamp(base[1]*Math.exp(-alpha*delta)),actual);
      }
      scored.push({date:fx.date,home:fx.home,away:fx.away,scores});
    }
    function priorPPG(team){
      const s=stats.get(team)||{points:0,matches:0};
      return (s.points+8*1.35)/(s.matches+8);
    }
    const changes=[];
    for(const fx of day){
      const hp=priorPPG(fx.home),ap=priorPPG(fx.away),gd=fx.hg-fx.ag;
      changes.push({team:fx.home,gd,adjusted_gd:gd+0.5*(ap-1.35),points:gd>0?3:gd===0?1:0});
      changes.push({team:fx.away,gd:-gd,adjusted_gd:-gd+0.5*(hp-1.35),points:gd<0?3:gd===0?1:0});
    }
    // Do not update any team rating until all fixtures on that date have been evaluated.
    for(const c of changes){
      const s=stats.get(c.team)||{points:0,matches:0};s.points+=c.points;s.matches++;stats.set(c.team,s);
      const f=form.get(c.team)||[];f.push({gd:c.gd,adjusted_gd:c.adjusted_gd});form.set(c.team,f);
    }
    past.push(...day);start=end;
  }
  return {source_fixtures:data.length,eligible:scored.length,rows:scored};
}
function aggregate(groups){
  const rows=groups.flatMap(g=>g.rows),keys=['baseline',...['raw','adjusted'].flatMap(m=>ALPHAS.map(a=>m+':'+a))];
  if(!rows.length)throw Error('No eligible fixtures');
  return Object.fromEntries(keys.map(key=>[key,{n:rows.length,
    mean_log_loss:mean(rows.map(r=>r.scores[key].log_loss)),
    mean_brier:mean(rows.map(r=>r.scores[key].brier))}]));
}
function researchReport(six){
  if(six.length!==6)throw Error('Exactly six chronological seasons required');
  const seasons=six.map(evaluateSeason);
  const calibration=aggregate(seasons.slice(0,4));
  const holdout=aggregate(seasons.slice(4));
  const winner=prefix=>Object.keys(calibration).filter(k=>k.startsWith(prefix+':'))
    .sort((a,b)=>calibration[a].mean_log_loss-calibration[b].mean_log_loss)[0];
  const raw=winner('raw'),adjusted=winner('adjusted');
  return {
    status:'EXPLORATORY_RESEARCH_NOT_VALIDATED',research_only:true,publication_gate:'BLOCKED',
    sample:seasons.map(s=>({source_fixtures:s.source_fixtures,eligible:s.eligible})),
    calibration_seasons:[0,1,2,3],holdout_seasons:[4,5],
    chosen_raw:raw,chosen_adjusted:adjusted,
    calibration:{baseline:calibration.baseline,raw:calibration[raw],adjusted:calibration[adjusted]},
    holdout:{baseline:holdout.baseline,raw:holdout[raw],adjusted:holdout[adjusted]},
    note:'Chronological, within-season, day-frozen replay; no published prediction, no market value validation.'
  };
}
if(require.main===module){
  const paths=process.argv.slice(2);
  if(paths.length!==6)throw Error('Pass exactly six local CSV files ordered 2020/21 through 2025/26');
  const report=researchReport(paths.map(p=>fs.readFileSync(path.resolve(p),'utf8')));
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
}
module.exports={readSeason,baseline,metrics,evaluateSeason,aggregate,researchReport,ALPHAS};
