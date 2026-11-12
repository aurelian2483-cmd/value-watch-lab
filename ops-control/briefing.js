/* Version 4: browser-local Director briefing. No network calls, no unattended jobs. */
(function(root){
 'use strict';
 const KEY='vw-ops-control:director-briefing:v1',MAX_DAYS=45;
 const isTime=s=>typeof s==='string'&&Number.isFinite(Date.parse(s));
 const ukDay=iso=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(iso));
 const blank=()=>({schemaVersion:1,days:[],last:null});
 function load(store){
  if(!store)return {available:false,warning:'Browser storage is unavailable; daily comparisons cannot be saved.',state:blank()};
  try{
   const raw=store.getItem(KEY);
   if(raw===null)return {available:true,warning:null,state:blank()};
   const s=JSON.parse(raw);
   if(!s||s.schemaVersion!==1||!Array.isArray(s.days)||s.days.length>MAX_DAYS+3||!s.days.every(x=>x&&typeof x.date==='string')||(s.last!==null&&typeof s.last!=='object'))throw Error('Unsupported briefing schema');
   return {available:true,warning:null,state:{schemaVersion:1,days:s.days.slice(-MAX_DAYS),last:s.last||null}};
  }catch(_){return {available:false,warning:'Existing local briefing history cannot be read; it has not been overwritten.',state:blank()}}
 }
 function snapshot(now,feeds,history,complete){
  if(!isTime(now))throw Error('Invalid briefing timestamp');
  const incidents=Array.isArray(history?.incidents)?history.incidents:[];
  const active=incidents.filter(x=>x.state==='ACTIVE');
  const resolved=incidents.filter(x=>x.state==='RESOLVED');
  return {at:now,date:ukDay(now),complete:complete===true,feeds:(feeds||[]).map(f=>({id:String(f.id||''),ok:!!f.ok,stale:!!f.stale,gateOK:!!f.gateOK,ageMinutes:Number.isFinite(f.age)?Math.round(f.age/60000):null})),activeKeys:active.map(x=>x.key),resolvedKeys:resolved.map(x=>x.key),p1:active.filter(x=>x.priority==='P1').length,p2:active.filter(x=>x.priority==='P2').length,activeCount:active.length};
 }
 function compare(previous,current){
  if(!previous)return {comparison:'NO_PREVIOUS_AUDIT',newKeys:[],clearedKeys:[],degradedFeeds:[],recoveredFeeds:[]};
  const prev=new Set(previous.activeKeys||[]),next=new Set(current.activeKeys||[]);
  const degraded=[],recovered=[];
  for(const nextFeed of current.feeds){
   const old=(previous.feeds||[]).find(f=>f.id===nextFeed.id);
   if(!old)continue;
   const oldBad=!old.ok||old.stale||!old.gateOK,newBad=!nextFeed.ok||nextFeed.stale||!nextFeed.gateOK;
   if(!oldBad&&newBad)degraded.push(nextFeed.id);
   if(oldBad&&!newBad)recovered.push(nextFeed.id);
  }
  return {comparison:previous.date===current.date?'PREVIOUS_AUDIT_SAME_UK_DAY':'PREVIOUS_AUDIT_PRIOR_UK_DAY',newKeys:[...next].filter(k=>!prev.has(k)),clearedKeys:current.complete?[...prev].filter(k=>!next.has(k)):[],degradedFeeds:degraded,recoveredFeeds:recovered};
 }
 function make(previousState,current,history){
  const previous=previousState.last,delta=compare(previous,current);
  const active=(history?.incidents||[]).filter(x=>x.state==='ACTIVE');
  const age=entry=>isTime(entry.firstSeen)?Math.max(0,Date.parse(current.at)-Date.parse(entry.firstSeen)):null;
  const longOpen=active.filter(x=>age(x)!==null&&age(x)>=86400000).sort((a,b)=>age(b)-age(a));
  const repeated=active.filter(x=>Number(x.occurrences)>=2).sort((a,b)=>(b.reopenCount||0)-(a.reopenCount||0)||(b.occurrences||0)-(a.occurrences||0));
  const reopened=active.filter(x=>Number(x.reopenCount)>0);
  const priority=current.p1>0?'URGENT REVIEW':delta.degradedFeeds.length>0||longOpen.length>0?'REVIEW DETERIORATION':current.activeCount>0?'OPEN REVIEW ITEMS':'NO CURRENT SOURCE EXCEPTIONS';
  const incomplete=!current.complete;
  const notes=[];
  if(!previous)notes.push('This browser has no earlier briefing snapshot; changes cannot yet be established.');
  if(incomplete)notes.push('Audit is incomplete or not fully fresh/gated. Missing incidents are not treated as cleared.');
  if(current.p1)notes.push(current.p1+' outstanding P1 warning(s) require Director review.');
  if(delta.degradedFeeds.length)notes.push('Feed deterioration since the previous saved audit: '+delta.degradedFeeds.join(', ')+'.');
  if(longOpen.length)notes.push(longOpen.length+' active incident(s) observed for at least 24 hours in this browser.');
  if(reopened.length)notes.push(reopened.length+' active incident(s) have reopened at least once.');
  if(!notes.length)notes.push('No new urgent or deteriorating source condition detected in available browser history.');
  return {schemaVersion:1,date:current.date,auditedAt:current.at,comparison:delta.comparison,complete:current.complete,priority,openP1:current.p1,openP2:current.p2,activeCount:current.activeCount,newCount:delta.newKeys.length,clearedCount:delta.clearedKeys.length,degradedFeeds:delta.degradedFeeds,recoveredFeeds:delta.recoveredFeeds,agedCount:longOpen.length,repeatedCount:repeated.length,reopenedCount:reopened.length,newKeys:delta.newKeys,clearedKeys:delta.clearedKeys,notes,suggestedNextStep:current.p1?'Investigate P1 feed and research-gate exceptions first; do not change models automatically.':delta.degradedFeeds.length?'Review deteriorated source freshness or access with IT/QA before relying on observations.':longOpen.length?'Review persistent incidents with the recommended sport manager and record evidence of any corrective action.':'Continue read-only audits and retain evidence. No betting qualification is implied.',independentSignoff:false,automaticRemediation:false};
 }
 function advance(state,current){
  const days=state.days.slice();
  const previousDayIndex=days.findIndex(d=>d.date===current.date);
  if(previousDayIndex>=0)days[previousDayIndex]={date:current.date,first:days[previousDayIndex].first,last:current};
  else days.push({date:current.date,first:current,last:current});
  days.sort((a,b)=>a.date.localeCompare(b.date));
  return {schemaVersion:1,days:days.slice(-MAX_DAYS),last:current};
 }
 function save(store,state){if(!store)return false;try{store.setItem(KEY,JSON.stringify(state));return true}catch(_){return false}}
 const api={KEY,MAX_DAYS,blank,load,snapshot,compare,make,advance,save,ukDay};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.VWDirectorBriefing=api;
})(typeof window!=='undefined'?window:null);
