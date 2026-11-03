'use strict';
(()=>{
 const $=id=>document.getElementById(id),add=(p,t,s,c)=>{const e=document.createElement(t);if(s!==undefined)e.textContent=String(s);if(c)e.className=c;p.append(e);return e};
 const fmt=s=>new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',dateStyle:'medium',timeStyle:'short'}).format(new Date(s))+' UK';
 const safe=d=>d?.research_only===true&&d.publication_gate==='BLOCKED'&&d.model_validation==='UNVALIDATED'&&Number.isFinite(Date.parse(d.generated_at_utc))&&Date.parse(d.generated_at_utc)<=Date.now()+300000;
 const vector=r=>[r.prob_home,r.prob_draw,r.prob_away].every(p=>Number.isFinite(p)&&p>0&&p<1)&&Math.abs(r.prob_home+r.prob_draw+r.prob_away-1)<1e-8;
 const key=r=>[r.home,r.away,r.kickoff_utc].join('|');
 function stat(label,value,description){const a=add($('lab-summary'),'article');add(a,'span',label,'small');add(a,'strong',value);add(a,'p',description,'small')}
 async function get(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error('Published snapshot unavailable');return r.json()}
 async function load(){
  $('dashboard-state').textContent='Checking published lab data…';
  const results=await Promise.allSettled([get('./research-dashboard-data.json'),get('./football-expanded-data.json'),get('./horse-model-data.json')]);
  const feeds=results.map(r=>r.status==='fulfilled'&&safe(r.value)?r.value:null),football=feeds.slice(0,2),horse=feeds[2];
  $('lab-summary').replaceChildren();const forecasts=new Map(),fixtures=new Map();
  for(const [i,f]of football.entries()){if(!f)continue;for(const r of f.experimental_model_forecasts||[])if(Date.parse(r.kickoff_utc)>Date.now()&&vector(r))forecasts.set(key(r),r);for(const r of f.upcoming_fixtures||[])if(Date.parse(r.kickoff_utc)>Date.now())fixtures.set(key(r),{...r,league_name:r.league_name||(i===0?'Premier League':'Competition not supplied'),snapshot:f.generated_at_utc})}
  stat('Upcoming football research forecasts',football.some(Boolean)?forecasts.size:'—','Published experimental 1X2 vectors; not qualified betting selections.');
  stat('Racing provisionally scored',horse?horse.performance?.scored_forecasts??0:'—',horse?'Source snapshot '+fmt(horse.generated_at_utc)+'.':'Racing snapshot could not be verified.');
  stat('Racing two-publisher checks',horse?horse.performance?.cross_source_verified_results??0:'—','Corroboration is separate from independent data origin and model validation.');
  stat('Official challenge','0/100','Research forecasts and provisional results do not automatically qualify for this challenge.');
  const missing=feeds.filter(x=>!x).length;
  $('dashboard-state').textContent=(missing?'Partial data: '+missing+' lab snapshot(s) unavailable. ':'Published lab data loaded. ')+'Models remain unvalidated; review each source timestamp below.';
  const out=$('autofeedfixtures');out.replaceChildren();
  if(!football.some(Boolean)){$('autofeedstatus').textContent='Snapshot unavailable';$('autofeednote').textContent='The published football lab files could not be verified. This does not establish an account or provider configuration problem.';return}
  const timestamps=football.filter(Boolean).map(f=>f.generated_at_utc),oldest=Math.min(...timestamps.map(Date.parse)),age=Date.now()-oldest;
  $('autofeedstatus').textContent=age>2*3600000?'Published · older snapshot':'Published · recent snapshot';
  $('autofeednote').textContent=football.map((f,i)=>f?(i===0?'Premier League':'Additional leagues')+': '+fmt(f.generated_at_utc)+'.':(i===0?'Premier League':'Additional leagues')+': unavailable.').join(' ')+' These are scheduled fixture observations, not live scores or verified prices.';
  const upcoming=[...fixtures.values()].sort((a,b)=>Date.parse(a.kickoff_utc)-Date.parse(b.kickoff_utc));
  if(!upcoming.length){add(out,'p','No future fixtures in the available published snapshots.','small');return}
  add(out,'p',upcoming.length+' upcoming fixture observations · first '+Math.min(8,upcoming.length)+' shown.','small');
  for(const r of upcoming.slice(0,8)){const a=add(out,'article',undefined,'card');add(a,'strong',r.home+' vs '+r.away);add(a,'p',r.league_name+' · '+fmt(r.kickoff_utc),'small');add(a,'span',r.verification==='SCHEDULE_CROSS_CHECK'?'Schedule cross-checked':'Schedule requires review','pill');add(a,'p',forecasts.has(key(r))?'Experimental 1X2 forecast available in the football lab.':'No model vector in this snapshot.','small')}
  const p=add(out,'p'),a=add(p,'a','View all leagues and forecast evidence');a.href='./football-leagues/';a.className='btn';
 }
 $('refresh-dashboard').onclick=()=>window.location.reload();load();
})();
