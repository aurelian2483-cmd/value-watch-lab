(()=>{'use strict';
const $=id=>document.getElementById(id);
const SOURCES=[
  {id:'football',label:'Football research',file:'../research-dashboard-data.json',limitHours:24},
  {id:'racing',label:'Racing racecards',file:'../racing-research-data.json',limitHours:6},
  {id:'sports',label:'Tennis + NFL',file:'../other-sports-data.json',limitHours:24},
  {id:'horse',label:'Racing model audit',file:'../horse-model-data.json',limitHours:6}
];
const sportDefs=[
  {id:'football',label:'Football Manager',icon:'⚽',source:'football'},
  {id:'racing',label:'Horse Racing Manager',icon:'♞',source:'racing'},
  {id:'tennis',label:'Tennis Manager',icon:'🎾',source:'sports'},
  {id:'nfl',label:'NFL Manager',icon:'🏈',source:'sports'}
];
let latest=null,busy=false;
const txt=(id,value)=>{const e=$(id);if(e)e.textContent=String(value)};
const safeDate=s=>{if(typeof s!=='string'||s.length>70)return null;const n=Date.parse(s);return Number.isFinite(n)?n:null};
const ncount=(v)=>Array.isArray(v)?v.length:null;
const niceNumber=v=>Number.isInteger(v)&&v>=0?v.toLocaleString('en-GB'):'Unavailable';
const hourAge=ms=>!Number.isFinite(ms)||ms<0?'Unknown':ms<3600000?Math.floor(ms/60000)+' min':(ms/3600000).toFixed(1)+' hr';
const fmtTime=ms=>Number.isFinite(ms)?new Date(ms).toISOString().replace('T',' ').slice(0,16)+' UTC':'Unavailable';
function cls(label,value){const el=document.createElement('span');el.className='flag '+(label==='good'?'good':label==='caution'?'caution':label==='blocked'?'blocked':'neutral');el.textContent=value;return el}
function add(parent,tag,value,className){const e=document.createElement(tag);if(className)e.className=className;if(value!==undefined)e.textContent=String(value);parent.append(e);return e}
function issue(messages,kind,msg){messages.push({kind,message:msg})}
async function fetchSource(spec,now){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),14000);
 try{const response=await fetch(spec.file,{cache:'no-store',signal:controller.signal});
  if(!response.ok)throw Error('HTTP '+response.status);
  const data=await response.json();
  if(!data||typeof data!=='object'||Array.isArray(data))throw Error('Invalid data object');
  const stamp=safeDate(data.generated_at_utc);const age=stamp===null?null:now-stamp;
  const gate=data.publication_gate,model=data.model_validation;
  const gateOK=gate==='BLOCKED'&&model==='UNVALIDATED'&&data.research_only===true;
  const stale=age===null||age<0||age>spec.limitHours*3600000;
  const result={id:spec.id,label:spec.label,file:spec.file,ok:true,data,age,stamp,stale,gateOK,limitHours:spec.limitHours};
  return result;
 }catch(error){return{id:spec.id,label:spec.label,file:spec.file,ok:false,error:error?.name==='AbortError'?'Request timeout':String(error?.message||error),age:null,stamp:null,stale:true,gateOK:false}}
 finally{clearTimeout(timer)}
}
function evaluateSport(spec,feeds,messages){
 const d=feeds.find(x=>x.id===spec.source),f=d?.data;
 if(!d?.ok)return{id:spec.id,label:spec.label,icon:spec.icon,level:'blocked',status:'FEED UNAVAILABLE',count:null,details:['Published source could not be loaded','No candidate or model approval inferred'],source:spec.source};
 const details=[];let count=null;
 if(spec.id==='football'){
   count=ncount(f.upcoming_fixtures);const forecasts=ncount(f.experimental_model_forecasts);
   details.push('Experimental model forecasts: '+niceNumber(forecasts));
   details.push('Official prospective challenge: '+(Number.isInteger(f.official_challenge?.completed)?f.official_challenge.completed:'unavailable')+' / 100');
   details.push('Football manager or transfer changes are not independently verified here');
 }else if(spec.id==='racing'){
   count=ncount(f.races);
   details.push('Candidate selections: '+niceNumber(ncount(f.candidate_selections)));
   details.push('Qualified selections: '+niceNumber(ncount(f.qualified_selections)));
   details.push('Full external race coverage: '+(f.coverage_verified===true?'Claimed verified':'Not verified'));
   const r=feeds.find(x=>x.id==='horse');
   if(!r?.ok)details.push('Separate racing model audit unavailable');
   else details.push('Racing model snapshots: '+niceNumber(ncount(r.data.form_forecasts)));
 }else{
   const sport=f.sports?.[spec.id];
   count=ncount(sport?.events);
   details.push('Collection status: '+String(sport?.collection_status||'Not reported').slice(0,70));
   if(spec.id==='tennis'){
     details.push('Schedule conflicts: '+niceNumber(ncount(sport?.schedule_conflicts)));
     details.push('Surface, fatigue and injuries not independently confirmed');
   }else{
     details.push('NFL shortlisting requires supported evidence, not a selection quota');
     details.push('Quarterback, weather and injury changes need separate checks');
   }
 }
 if(!Number.isInteger(count))issue(messages,'caution',spec.label+': event count unavailable');
 if(d.stale)issue(messages,'caution',spec.label+': published research is stale or un-timestamped');
 if(!d.gateOK)issue(messages,'blocked',spec.label+': research safeguards not confirmed by source');
 return {id:spec.id,label:spec.label,icon:spec.icon,count,details,source:spec.source,level:!d.gateOK?'blocked':d.stale?'caution':'good',status:!d.gateOK?'REVIEW SAFEGUARDS':d.stale?'STALE SOURCE':'SOURCE AVAILABLE'};
}
function renderSports(sports,feeds){
 const root=$('sports');root.replaceChildren();
 for(const s of sports){const box=add(root,'article',undefined,'panel sport'),head=add(box,'div',undefined,'sport-head');
   add(head,'div',s.icon,'sport-icon');head.append(cls(s.level,s.status));
   add(box,'h3',s.label);add(box,'div',niceNumber(s.count),'number');
   add(box,'div',s.id==='racing'?'observed race records':s.id==='football'?'upcoming fixture records':'observed event records','number-label');
   const list=add(box,'ul');for(const line of s.details)add(list,'li',line);
   const f=feeds.find(x=>x.id===s.source);
   add(box,'div','Source observed: '+(f?.ok?fmtTime(f.stamp):'Unavailable'),'source-label');
 }
}
function planActions(messages){
 const rules=[
  [/unavailable|timeout|HTTP [45]|fail|error|not found/i,'P1','IT & QA Manager','Investigate collector output, source access and publication; rerun the read-only check.'],
  [/gate|safeguard/i,'P1','Operations Director + IT & QA','Check research-only / UNVALIDATED / BLOCKED gates; never permit automatic betting approval.'],
  [/racing.*coverage|external meeting coverage/i,'P2','Horse Racing Manager','Reconcile meeting discovery and exclusions with published racecards.'],
  [/stale|timestamp|source age/i,'P2','IT & QA Manager','Investigate data age, collector scheduling and snapshot publication.'],
  [/football/i,'P2','Football Manager','Review current-season form, manager or transfer changes and source completeness.'],
  [/tennis/i,'P2','Tennis Manager','Review fixture completeness, surfaces, injury and fatigue inputs.'],
  [/nfl/i,'P2','NFL Manager','Review fixture completeness, quarterback status and injury evidence.'],
  [/racing|horse/i,'P2','Horse Racing Manager','Review race conditions, non-runners and runner observations.']
 ];
 const grouped=new Map();
 for(const m of messages){const rule=rules.find(r=>r[0].test(m.message))||['','P3','Operations Director','Review source evidence, identify the relevant owner and document follow-up.'];
  const [pattern,priority,owner,action]=rule,key=owner+'|'+action;
  if(!grouped.has(key))grouped.set(key,{priority,owner,recommendedAction:action,status:'RECOMMENDED — NOT ASSIGNED',observations:[]});
  grouped.get(key).observations.push(m.message);
 }
 const tasks=[...grouped.values()].sort((a,b)=>a.priority.localeCompare(b.priority)||a.owner.localeCompare(b.owner));
 if(!tasks.length)tasks.push({priority:'P3',owner:'Operations Director',recommendedAction:'Continue routine monitoring. Experimental models and market value remain unvalidated.',status:'RECOMMENDED — NOT ASSIGNED',observations:['No source, age or gate exception in this browser audit']});
 tasks.forEach((t,i)=>t.id='OPS-'+String(i+1).padStart(3,'0'));
 return tasks;
}
function renderActions(tasks){
 const root=$('action-board');root.replaceChildren();
 txt('action-summary',tasks.length+' recommended action(s) • '+tasks.filter(t=>t.priority==='P1').length+' urgent (P1) • '+tasks.filter(t=>t.priority==='P2').length+' review (P2) • No actions executed');
 for(const task of tasks){const row=add(root,'article',undefined,'action-row'),header=add(row,'div',undefined,'action-row-head');
  header.append(cls(task.priority==='P1'?'blocked':task.priority==='P2'?'caution':'good',task.priority));
  add(header,'strong',task.owner);add(header,'span',task.id,'action-code');
  add(row,'p',task.recommendedAction,'action-guidance');
  add(row,'p','Evidence: '+task.observations.join('; '),'action-meta');
  add(row,'div',task.status,'action-status');
 }
}
function updateHistory(actions,feeds,now){
 const api=typeof window!=='undefined'?window.VWIncidentHistory:null;
 const panel=$('history-board');panel.replaceChildren();
 if(!api){txt('history-summary','History engine unavailable. Current audit is still displayed.');txt('history-warning','History is not being saved.');return null}
 let storage=null;try{storage=window.localStorage}catch(_){}
 const loaded=api.load(storage);
 /* Only a complete set of parsed, timestamped research feeds may resolve past incidents. */
 const complete=feeds.every(f=>f.ok&&f.stamp!==null);
 const state=api.reconcile(loaded.state,actions,new Date(now).toISOString(),complete);
 const saved=loaded.available&&api.save(storage,state);
 const storageStatus=!loaded.available?loaded.warning:!saved?'Unable to save history in this browser; the current view is temporary.':null;
 const active=state.incidents.filter(x=>x.state==='ACTIVE'),resolved=state.incidents.filter(x=>x.state==='RESOLVED');
 txt('history-summary',active.length+' active • '+resolved.length+' resolved • '+active.filter(x=>x.reopenCount>0).length+' reopened • '+(saved?'saved on this device':'not saved'));
 txt('history-warning',storageStatus||'Stored only in this browser. Clearing website data, changing devices or private mode may erase history.');
 for(const entry of state.incidents.slice(0,25)){
  const row=add(panel,'article',undefined,'history-row'),head=add(row,'div',undefined,'history-head');
  head.append(cls(entry.state==='RESOLVED'?'good':entry.priority==='P1'?'blocked':'caution',entry.state==='RESOLVED'?'RESOLVED':entry.priority));
  add(head,'strong',entry.owner);
  add(row,'p',entry.action,'history-action');
  add(row,'div','First seen: '+fmtTime(Date.parse(entry.firstSeen))+' • Last seen: '+fmtTime(Date.parse(entry.lastSeen)),'history-meta');
  const elapsed=entry.state==='RESOLVED'&&entry.resolvedAt?Date.parse(entry.resolvedAt)-Date.parse(entry.firstSeen):now-Date.parse(entry.firstSeen);
  add(row,'div',(entry.state==='ACTIVE'?'Open for: ':'Observed window: ')+(Number.isFinite(elapsed)?hourAge(Math.max(0,elapsed)):'Unknown')+' • Observed audits: '+entry.occurrences+' • Reopened: '+entry.reopenCount,'history-meta');
  if(entry.state==='RESOLVED')add(row,'div','No longer detected by a complete audit; not proof of a repaired source','history-resolved');
 }
 if(!state.incidents.length)add(panel,'p','No incident observations recorded on this device yet.','history-empty');
 if(state.incidents.length>25)add(panel,'p','Showing 25 most recent; the report export includes the full local history.','history-empty');
 return {history:state,storageSaved:saved,storageWarning:storageStatus,completeAudit:complete};
}
function renderIssues(messages){
 const root=$('issues');root.replaceChildren();
 if(!messages.length){add(root,'div','✓ No source transport, age or research-gate exception found in these checks. This does not certify betting value.','issue good');return}
 for(const entry of messages)add(root,'div',(entry.kind==='blocked'?'✕ ':'! ')+entry.message,'issue');
}
function renderSources(feeds){
 const body=$('source-table');body.replaceChildren();
 for(const f of feeds){const tr=add(body,'tr');
   add(tr,'td',f.label);add(tr,'td',f.ok?fmtTime(f.stamp):'—');add(tr,'td',hourAge(f.age));
   const cell=add(tr,'td');cell.append(cls(!f.ok||!f.gateOK?'blocked':f.stale?'caution':'good',!f.ok?'UNAVAILABLE':!f.gateOK?'GATE NOT VERIFIED':f.stale?'STALE':'RESPONDING'));
 }
}
function exportReport(){if(!latest)return;const blob=new Blob([JSON.stringify(latest,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;anchor.download='value-watch-operations-'+new Date(latest.checkedAt).toISOString().slice(0,10)+'.json';document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),2000)}
async function audit(){
 if(busy)return;busy=true;$('refresh').disabled=true;txt('decision-title','Checking published research snapshots');
 const now=Date.now();
 try{
   const feeds=await Promise.all(SOURCES.map(spec=>fetchSource(spec,now))),messages=[];
   for(const f of feeds){if(!f.ok)issue(messages,'blocked',f.label+': '+f.error);
     else {if(f.stale)issue(messages,'caution',f.label+': source age exceeds '+f.limitHours+' hours, or timestamp is invalid');
       if(!f.gateOK)issue(messages,'blocked',f.label+': expected research-only / UNVALIDATED / BLOCKED gates not established');
     }}
   const sports=sportDefs.map(spec=>evaluateSport(spec,feeds,messages));
   const other=feeds.find(f=>f.id==='sports');
   if(other?.ok&&other.data.collection_errors&&Object.keys(other.data.collection_errors).length){issue(messages,'caution','Tennis/NFL collector reports errors: '+Object.keys(other.data.collection_errors).join(', '))}
   const race=feeds.find(f=>f.id==='racing');
   if(race?.ok&&race.data.coverage_verified!==true)issue(messages,'caution','Racing: full external meeting coverage is not verified');
   const actions=planActions(messages);
   const clean=feeds.every(f=>f.ok&&!f.stale&&f.gateOK);
   const blocked=feeds.some(f=>!f.ok||!f.gateOK);
   const level=blocked?'bad':messages.length?'warn':'good';
   const decision=blocked?'ESCALATE SOURCE / GATE EXCEPTIONS':messages.length?'REVIEW SOURCE COVERAGE AND FRESHNESS':'DATA CHECKS PASSED — MODELS STILL UNVALIDATED';
   const summary='Automated review of published snapshots only. '+(messages.length?messages.length+' issues recorded for follow-up. ':'No source exceptions detected. ')+'No independently certified bookmaker odds, calibrated edge or manager sign-off is available. Betting publication remains blocked.';
   txt('m-feeds',feeds.filter(f=>f.ok).length+' / '+feeds.length);
   txt('m-alerts',messages.length);txt('m-approved','0');
   const badge=$('director-badge');badge.className='hero-status '+level;badge.textContent=blocked?'ATTENTION REQUIRED':messages.length?'REVIEW REQUIRED':'SOURCE CHECKS CLEAR';
   const tag=$('decision-tag');tag.className='flag '+(blocked?'blocked':messages.length?'caution':'good');tag.textContent=blocked?'ESCALATE':messages.length?'REVIEW':'SOURCE CHECKS CLEAR';
   txt('decision-title',decision);txt('decision-summary',summary);txt('audit-time','Checked '+fmtTime(now));
   renderSports(sports,feeds);renderIssues(messages);renderSources(feeds);renderActions(actions);
   const journal=updateHistory(actions,feeds,now);
   const it=$('it-status');it.className='flag '+(blocked?'blocked':messages.length?'caution':'good');it.textContent=blocked?'FEED / GATE ISSUE':messages.length?'ATTENTION':'CHECKS PASSED';
   txt('it-summary',feeds.filter(f=>f.ok).length+' of '+feeds.length+' sources responded; '+messages.length+' issues recorded. This browser-only check does not inspect GitHub Actions, GitHub Pages deployment or real bookmaker prices.');
   latest={schemaVersion:1,kind:'VALUE_WATCH_OPERATIONS_READ_ONLY_AUDIT',checkedAt:new Date(now).toISOString(),sourceStatuses:feeds.map(({id,label,file,ok,error,stamp,age,stale,gateOK,limitHours})=>({id,label,file,ok,error,observedAt:stamp===null?null:new Date(stamp).toISOString(),ageMinutes:age===null?null:Math.floor(age/60000),stale,gateOK,limitHours})),sports,issues:messages,actionRegister:actions,historySnapshot:journal?.history||null,historySaved:journal?.storageSaved===true,historyCompleteAudit:journal?.completeAudit===true,historyWarning:journal?.storageWarning||null,decision,bettingPublication:'BLOCKED',modelValidation:'UNVALIDATED',independentExpertSignoff:false,readsOnly:true};
   $('export').disabled=false;
 }catch(error){txt('decision-title','Control centre check failed');txt('decision-summary',String(error?.message||error));const badge=$('director-badge');badge.textContent='CHECK FAILED';badge.className='hero-status bad';$('export').disabled=!latest;}
 finally{busy=false;$('refresh').disabled=false}
}
$('refresh').addEventListener('click',audit);$('export').addEventListener('click',exportReport);
function clock(){txt('clock',new Intl.DateTimeFormat('en-GB',{timeZone:'UTC',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date())+' UTC')}
clock();setInterval(clock,60000);audit();
setInterval(()=>{if(!document.hidden)void audit()},300000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&latest&&Date.now()-Date.parse(latest.checkedAt)>300000)void audit()});
})();