'use strict';
(()=>{
 const el=id=>document.getElementById(id);
 const labels={RU:'Rugby Union',RL:'Rugby League'};
 let snapshot=null,selected='RU';
 function node(parent,tag,value,cls){const x=document.createElement(tag);if(value!==undefined)x.textContent=String(value);if(cls)x.className=cls;parent.append(x);return x}
 function render(){
   el('sport-heading').textContent=labels[selected];
   for(const b of document.querySelectorAll('[data-code]'))b.setAttribute('aria-pressed',String(b.dataset.code===selected));
   const health=el('source-health'),fixtures=el('fixtures');health.replaceChildren();fixtures.replaceChildren();
   if(!snapshot){node(health,'p','No usable source snapshot. Never infer that the fixture calendar is complete.','notice');node(fixtures,'p','Source data unavailable.');return}
   const h=snapshot.source_health?.[selected];
   if(!h){node(health,'p','This sport has no source-health report.','notice');return}
   const stats=node(health,'div',undefined,'stat-grid');
   for(const [name,value] of [['Collector state',h.collection_status||'UNKNOWN'],['Days checked',h.days_succeeded+' / '+h.days_requested],['Provider rows',h.rows_matching_sport],['Confirmed fixtures',h.events]]){
     const box=node(stats,'div',undefined,'stat');node(box,'span',name);node(box,'strong',value);
   }
   const errors=Array.isArray(h.source_errors)?h.source_errors.length:0;
   node(health,'p',(h.all_dates_checked?'All dates in the window checked; event coverage may still be incomplete.':h.complete_horizon_coverage?'Reported source window checked.':'Partial source sample only — remaining dates were not exhaustively checked.')+' Provider request errors: '+errors+'. Free-source event coverage may be incomplete.','notice');
   const rows=snapshot.upcoming_fixtures.filter(f=>f&&f.code===selected&&f.forecast_eligible===false&&typeof f.kickoff_utc==='string'&&Date.parse(f.kickoff_utc)>Date.now()+300000);
   if(!rows.length){node(fixtures,'p','No source-confirmed future fixtures in the current sampled coverage. This is not evidence that no matches are scheduled.');return}
   for(const f of rows.slice(0,60)){
     const card=node(fixtures,'article',undefined,'fixture');
     node(card,'small',(f.competition_name||'Competition unverified')+' · '+new Date(f.kickoff_utc).toLocaleString('en-GB',{timeZone:'Europe/London',dateStyle:'medium',timeStyle:'short'})+' UK');
     node(card,'h4',(f.home||'?')+' vs '+(f.away||'?'));
     node(card,'small','Schedule observation only · No validated model probability or betting price');
   }
 }
 async function load(){
   try{
     const response=await fetch('../rugby-research-data.json?v='+Date.now(),{cache:'no-store'});
     if(!response.ok)throw Error('Feed unavailable');
     const d=await response.json();
     if(d?.schema_version!==1||d.research_only!==true||d.model_validation!=='UNVALIDATED'||d.publication_gate!=='BLOCKED'||!Array.isArray(d.upcoming_fixtures)||d.upcoming_fixtures.length>1000||!d.source_health||!['RU','RL'].every(k=>d.source_health[k]))throw Error('Unsafe research feed');
     snapshot=d;
     const age=Date.now()-Date.parse(d.generated_at_utc);
     el('refreshed').textContent='Observed at '+new Date(d.generated_at_utc).toLocaleString('en-GB',{timeZone:'Europe/London',dateStyle:'medium',timeStyle:'short'})+' UK · '+(age>172800000?'STALE SNAPSHOT':'Research snapshot available');
   }catch(e){snapshot=null;el('refreshed').textContent='Source unavailable or invalid · no predictions displayed';}
   render();
 }
 for(const b of document.querySelectorAll('[data-code]'))b.addEventListener('click',()=>{selected=b.dataset.code;render()});
 load();
})();