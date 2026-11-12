'use strict';
// Value Watch Pro display-only source normalizer. No bets, odds, model grades or source writes.
// Shared by Betting Hub and Analyst Terminal to prevent conflicting event counts.
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.ValueWatchProSources=api;
})(typeof window!=='undefined'?window:this,function(){
 const SOURCES=[
  {id:'football',filename:'research-dashboard-data.json',maxAgeHours:24},
  {id:'racing',filename:'racing-research-data.json',maxAgeHours:6},
  {id:'other',filename:'other-sports-data.json',maxAgeHours:24},
  {id:'history',filename:'research-history.json',maxAgeHours:168}
 ];
 const sports=['football','racing','tennis','nfl'];
 function stamp(s){if(typeof s!=='string')return null;const n=Date.parse(s);return Number.isFinite(n)?n:null}
 function safeName(v){return typeof v==='string'&&v.trim()?v.trim().slice(0,220):null}
 function gate(d){return !!(d&&typeof d==='object'&&!Array.isArray(d)&&d.research_only===true&&d.model_validation==='UNVALIDATED'&&d.publication_gate==='BLOCKED')}
 function inspect(id,data,now=Date.now()){
  const def=SOURCES.find(x=>x.id===id);
  if(!def)throw Error('Unknown source');
  if(!gate(data))return {id,state:'GATE_UNVERIFIED',fresh:false,generatedAt:null,records:[],data:null};
  const ts=stamp(data.generated_at_utc),age=ts===null?null:now-ts;
  const fresh=age!==null&&age>=-300000&&age<=def.maxAgeHours*3600000;
  if(!fresh)return {id,state:'STALE_OR_UNDATED',fresh:false,generatedAt:ts,records:[],data};
  if(id==='history')return {id,state:'OBSERVED',fresh:true,generatedAt:ts,records:[],data};
  const records=[],seen=new Set(),invalid=[];
  function add(sport,name,time,key,hasModel){
   const n=safeName(name),t=stamp(time);
   // Reject unknown time, malformed identity, and duplicates; never make a synthetic event.
   if(!n||t===null||!Number.isFinite(t)||!safeName(key)){invalid.push('INVALID_RECORD');return}
   const identity=sport+'|'+String(key);
   if(seen.has(identity)){invalid.push('DUPLICATE_RECORD');return}
   seen.add(identity);
   records.push({sport,name:n,startUTC:new Date(t).toISOString(),startMs:t,hasModel:hasModel===true,source:id});
  }
  if(id==='football'){
   if(!Array.isArray(data.upcoming_fixtures))return {id,state:'SCHEMA_UNVERIFIED',fresh:false,generatedAt:ts,records:[],data};
   for(const e of data.upcoming_fixtures.slice(0,300)){
    if(!e||!safeName(e.home)||!safeName(e.away))continue;
    const name=e.home+' vs '+e.away,key=e.fixture_id||String(e.home)+'|'+String(e.away)+'|'+String(e.kickoff_utc);
    add('football',name,e.kickoff_utc,key,e.has_experimental_model_forecast===true);
   }
  }else if(id==='racing'){
   if(!Array.isArray(data.races))return {id,state:'SCHEMA_UNVERIFIED',fresh:false,generatedAt:ts,records:[],data};
   for(const e of data.races.slice(0,300)){
    if(!e||!safeName(e.racecourse)||!safeName(e.race_id))continue;
    add('racing',e.racecourse+' · '+(safeName(e.name)||'Race '+e.race_id),e.startUTC,String(e.race_id),e.forecast_eligible===true&&e.prediction!=null);
   }
  }else if(id==='other'){
   if(!data.sports||typeof data.sports!=='object'||!sports.slice(2).every(k=>Array.isArray(data.sports[k]?.events)))return {id,state:'SCHEMA_UNVERIFIED',fresh:false,generatedAt:ts,records:[],data};
   for(const sport of ['tennis','nfl'])for(const e of data.sports[sport].events.slice(0,300)){
    if(!e||!safeName(e.id)||!safeName(e.name))continue;
    add(sport,e.name,e.startUTC,e.id,Array.isArray(e.forecast?.outcomes)&&e.forecast.outcomes.length>0);
   }
  }
  return {id,state:invalid.length?'PARTIAL_RECORDS':'OBSERVED',fresh:true,generatedAt:ts,records,data,invalidCount:invalid.length};
 }
 function summarize(results,now=Date.now()){
  const events=[],available=new Set(),counts={football:null,racing:null,tennis:null,nfl:null};
  for(const r of results){
   if(!r||r.fresh!==true||!Array.isArray(r.records))continue;
   for(const sport of r.id==='other'?['tennis','nfl']:[r.id]){
    if(!sports.includes(sport))continue;
    available.add(sport);
    const subset=r.records.filter(x=>x.sport===sport);
    counts[sport]=subset.filter(x=>x.startMs>=now).length;
    events.push(...subset);
   }
  }
  const upcoming=events.filter(x=>x.startMs>=now).sort((a,b)=>a.startMs-b.startMs||a.sport.localeCompare(b.sport)||a.name.localeCompare(b.name));
  return {events,upcoming,counts,available:[...available],totalAvailable:upcoming.length,allSportsAvailable:available.size===4};
 }
 async function load(id,base='',fetcher=fetch,now=Date.now()){
  const source=SOURCES.find(x=>x.id===id);if(!source)throw Error('Unknown source');
  try{
   const response=await fetcher(base+source.filename,{cache:'no-store'});
   if(!response.ok)throw Error('HTTP '+response.status);
   return inspect(id,await response.json(),now);
  }catch(err){return {id,state:'UNAVAILABLE',fresh:false,generatedAt:null,records:[],data:null,error:String(err?.message||err).slice(0,120)}}
 }
 return Object.freeze({SOURCES,sports,stamp,gate,inspect,summarize,load});
});
