'use strict';
// Visual-only navigation bridge: delegates to existing, tested Value Watch controls.
(()=>{function ready(){
 const root=document.querySelector('.pro-landing');if(!root)return;
 root.querySelectorAll('[data-pro-sport]').forEach(btn=>btn.addEventListener('click',()=>{
  const sport=btn.getAttribute('data-pro-sport');
  const target=document.querySelector('#sport-nav button[data-sport="'+sport+'"]');
  if(target)target.click();
  const main=document.getElementById('main-content');main?.scrollIntoView({behavior:'smooth',block:'start'});
 }));
 root.querySelectorAll('[data-pro-slot]').forEach(btn=>btn.addEventListener('click',()=>{
  const n=btn.getAttribute('data-pro-slot'),target=document.querySelector('#slip-tabs button[data-slot="'+n+'"]');
  if(target)target.click();
  const open=document.getElementById('paper-open');if(open&&window.matchMedia?.('(max-width: 1000px)').matches)open.click();
  document.getElementById('slip-panel')?.scrollIntoView({behavior:'smooth',block:'start'});
 }));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{ready();proFeatured()},{once:true});else {ready();proFeatured()}

function proFeatured(){
 const body=document.getElementById('pro-featured-rows'),state=document.getElementById('pro-featured-status'),feedStatus=document.getElementById('pro-market-feeds');
 if(!body||!state)return;
 const now=Date.now();
 const specs=[{sport:'football',file:'research-dashboard-data.json',array:d=>d.upcoming_fixtures,limit:24},{sport:'racing',file:'racing-research-data.json',array:d=>d.races,limit:6},{sport:'other',file:'other-sports-data.json',array:d=>d.sports,limit:24}];
 const verified=d=>d&&d.research_only===true&&d.model_validation==='UNVALIDATED'&&d.publication_gate==='BLOCKED';
 const time=t=>typeof t==='string'&&Number.isFinite(Date.parse(t))?Date.parse(t):null;
 const uk=t=>new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(t));
 const datum=(sport,name,at)=>({sport,name:String(name||'Source event'),at});
 const draw=rows=>{
  body.replaceChildren();
  for(const x of rows.slice(0,6)){
   const tr=document.createElement('tr');
   for(const value of [x.sport,x.name,uk(x.at),'Not verified','Unavailable','Ungraded']){
    const td=document.createElement('td');td.textContent=value;tr.append(td);
   }body.append(tr);
  }
  if(!rows.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=6;td.textContent='No confirmed upcoming events in available published sources.';tr.append(td);body.append(tr)}
 };
 Promise.all(specs.map(async spec=>{
  try{
   const response=await fetch('./'+spec.file,{cache:'no-store'});
   if(!response.ok)throw Error('Source request failed');
   const data=await response.json(),generated=time(data.generated_at_utc);
   if(!verified(data)||generated===null||generated>now+300000||now-generated>spec.limit*3600000)throw Error('Source not fresh or gated');
   const records=[];
   if(spec.sport==='football'){
    for(const x of (Array.isArray(spec.array(data))?spec.array(data):[])){
      const t=time(x.kickoff_utc),name=x.home&&x.away?x.home+' vs '+x.away:null;
      if(name&&t!==null&&t>=now)records.push(datum('Football',name,t));
    }
   }else if(spec.sport==='racing'){
    for(const x of (Array.isArray(spec.array(data))?spec.array(data):[])){
      const t=time(x.startUTC),name=x.racecourse?x.racecourse+(x.name?' · '+x.name:''):null;
      if(name&&t!==null&&t>=now)records.push(datum('Racing',name,t));
    }
   }else{
    for(const name of ['tennis','nfl'])for(const x of (Array.isArray(data.sports?.[name]?.events)?data.sports[name].events:[])){
      const t=time(x.startUTC);
      if(x.name&&t!==null&&t>=now)records.push(datum(name==='nfl'?'NFL':'Tennis',x.name,t));
    }
   }
   return {ok:true,records};
  }catch(_){return {ok:false,records:[]}}
 })).then(res=>{
  const n=res.filter(x=>x.ok).length,rows=res.flatMap(x=>x.records).sort((a,b)=>a.at-b.at);
  draw(rows);feedStatus.textContent=n+'/3 published source groups checked';
  state.textContent=rows.length?rows.length+' upcoming source-observed event(s). Showing the first '+Math.min(rows.length,6)+'.':n===0?'Research sources currently unavailable or stale.':'No upcoming events in the checked sources.';
 }).catch(()=>{draw([]);state.textContent='Source check unavailable.';feedStatus.textContent='Unavailable'});
}
})();