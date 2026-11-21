'use strict';
// Value Watch Pro display-only source normalizer. No bets, odds, model grades or source writes.
// Shared by Betting Hub and Analyst Terminal to prevent conflicting event counts.
(function(root,factory){
 const api=factory(typeof module==="object" && module.exports ? require("./research-audit-core.js") : root.ResearchAudit);
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.ValueWatchProSources=api;
})(typeof window!=='undefined'?window:this,function(Audit){
 const SOURCES=[
  {id:'football',filename:'research-dashboard-data.json',maxAgeHours:24},
  {id:'racing',filename:'racing-research-data.json',maxAgeHours:6},
  {id:'other',filename:'other-sports-data.json',maxAgeHours:24},
  {id:'darts',filename:'darts/feed.json',maxAgeHours:48},
  {id:'rugby',filename:'rugby-research-data.json',maxAgeHours:48},
  {id:'history',filename:'research-history.json',maxAgeHours:168}
 ];
 const sports=['football','racing','tennis','nfl','darts','rugby'];
 function stamp(s){if(typeof s!=='string'||!/(?:Z|[+-]\d{2}:\d{2})$/.test(s))return null;const n=Date.parse(s);return Number.isFinite(n)?n:null}
 function safeName(v){return typeof v==='string'&&v.trim()?v.trim().slice(0,220):null}
 function gate(d){return !!(d&&typeof d==='object'&&!Array.isArray(d)&&d.research_only===true&&d.model_validation==='UNVALIDATED'&&d.publication_gate==='BLOCKED')}
 function inspect(id,data,now=Date.now(),footballEvidence=globalThis.FootballMatchEvidence){
  const def=SOURCES.find(x=>x.id===id);
  if(!def)throw Error('Unknown source');
  if(!gate(data))return {id,state:'GATE_UNVERIFIED',fresh:false,generatedAt:null,records:[],data:null};
  const ts=stamp(data.generated_at_utc),age=ts===null?null:now-ts;
  const fresh=age!==null&&age>=-300000&&age<=def.maxAgeHours*3600000;
  if(!fresh)return {id,state:'STALE_OR_UNDATED',fresh:false,generatedAt:ts,records:[],data};
  if(id==='history')return {id,state:'OBSERVED',fresh:true,generatedAt:ts,records:[],data};
  const seen=new Map(),conflicts=new Set(),invalid=[];
  const result=()=>[...seen].filter(([id])=>!conflicts.has(id)).map(([,record])=>record);
  function add(sport,name,time,key,hasModel,fixtureKey){
   const n=safeName(name),t=stamp(time);
   // Reject unknown time, malformed identity, and duplicates; never make a synthetic event.
   if(!n||t===null||!Number.isFinite(t)||!safeName(key)){invalid.push('INVALID_RECORD');return}
   const identity=sport+'|'+String(key);
   const record={sport,name:n,startUTC:new Date(t).toISOString(),startMs:t,hasModel:hasModel===true,source:id};
   if(fixtureKey)record.fixtureKey=fixtureKey;
   const previous=seen.get(identity);
   if(previous){
    if(previous.name!==record.name||previous.startMs!==record.startMs||previous.hasModel!==record.hasModel||previous.fixtureKey!==record.fixtureKey){
     conflicts.add(identity);
     invalid.push('CONFLICTING_RECORD');
    }else invalid.push('DUPLICATE_RECORD');
    return;
   }
   seen.set(identity,record);
  }
  if(id==='football'){
   if(!Array.isArray(data.upcoming_fixtures))return {id,state:'SCHEMA_UNVERIFIED',fresh:false,generatedAt:ts,records:[],data};
   for(const e of data.upcoming_fixtures.slice(0,300)){
    if(!e||!safeName(e.home)||!safeName(e.away))continue;
    const name=e.home+' vs '+e.away,key=e.fixture_id||String(e.home)+'|'+String(e.away)+'|'+String(e.kickoff_utc);
    add('football',name,e.kickoff_utc,key,e.has_experimental_model_forecast===true,
      data.schema_version===1 && footballEvidence?.fixtureKey(e));
   }
  }else if(id==='racing'){
   if(!Array.isArray(data.races))return {id,state:'SCHEMA_UNVERIFIED',fresh:false,generatedAt:ts,records:[],data};
   for(const e of data.races.slice(0,300)){
    if(!e||!safeName(e.racecourse)||!safeName(e.race_id))continue;
    add('racing',e.racecourse+' · '+(safeName(e.name)||'Race '+e.race_id),e.startUTC,String(e.race_id),e.forecast_eligible===true&&e.prediction!=null);
   }
  }else if(id==='other'){
   if(!data.sports||!['tennis','nfl'].some(k=>Array.isArray(data.sports[k]?.events)))return {id,state:'SCHEMA_UNVERIFIED',fresh:false,generatedAt:ts,records:[],data};
   const usableSports=[];
   for(const sport of ['tennis','nfl']){
    const part=data.sports[sport];
    if(!Array.isArray(part?.events)){invalid.push('MISSING_SPORT');continue;}
    const seenAt=part.generated_at_utc??data.generated_at_utc;
    if(!Audit.freshness(seenAt,def.maxAgeHours*3600000,now).fresh||stamp(seenAt)>ts){
     invalid.push('STALE_SPORT');continue;
    }
    usableSports.push(sport);
    for(const e of part.events.slice(0,300)){
     const observed=stamp(e?.source_collected_at_utc??seenAt);
     if(!Audit.validateOtherIdentity(e,sport)||(e.sport!=null&&e.sport!==sport)||
        observed===null||observed>stamp(seenAt)||now-observed>def.maxAgeHours*3600000||
        /cancel|postpon|suspend|final|finish|running/i.test(e.status||e.event_status||'')){
      invalid.push('INVALID_OR_UNAVAILABLE_EVENT');continue;
     }
     add(sport,e.name,e.startUTC,e.id,Audit.validateOtherForecast(e,sport,seenAt,now));
    }
   }
   return {id,state:invalid.length?'PARTIAL_RECORDS':'OBSERVED',fresh:usableSports.length>0,
    generatedAt:ts,records:result(),data,usableSports,invalidCount:invalid.length};
  }else if(id==='darts'){
   if(data.schema_version!==1||data.source_verification!=='PROVIDER_OBSERVED_UNCORROBORATED'||!Array.isArray(data.fixtures))
    return {id,state:'SCHEMA_UNVERIFIED',fresh:false,generatedAt:ts,records:[],data};
   for(const e of data.fixtures.slice(0,12)){
    if(e?.status!=='SCHEDULED'||!safeName(e.player_a?.name)||!safeName(e.player_b?.name)||
       !safeName(e.player_a?.id)||!safeName(e.player_b?.id)||e.player_a.id===e.player_b.id)continue;
    add('darts',e.player_a.name+' vs '+e.player_b.name,e.start_utc,e.id,false);
   }
  }else if(id==='rugby'){
   if(!Array.isArray(data.upcoming_fixtures))return {id,state:'SCHEMA_UNVERIFIED',fresh:false,generatedAt:ts,records:[],data};
   for(const e of data.upcoming_fixtures.slice(0,300)){
    if(!e||!safeName(e.home)||!safeName(e.away)||!safeName(e.event_id))continue;
    add('rugby',e.home+' vs '+e.away,e.kickoff_utc,e.event_id,false);
   }
  }
  return {id,state:invalid.length?'PARTIAL_RECORDS':'OBSERVED',fresh:true,generatedAt:ts,records:result(),data,invalidCount:invalid.length};
 }
 function summarize(results,now=Date.now()){
  const events=[],available=new Set(),counts=Object.fromEntries(sports.map(s=>[s,null]));
  for(const r of results){
   if(!r||r.fresh!==true||!Array.isArray(r.records))continue;
   for(const sport of r.id==='other'?r.usableSports:[r.id]){
    if(!sports.includes(sport))continue;
    available.add(sport);
    const subset=r.records.filter(x=>x.sport===sport);
    counts[sport]=subset.filter(x=>x.startMs>=now).length;
    events.push(...subset);
   }
  }
  const upcoming=events.filter(x=>x.startMs>=now).sort((a,b)=>a.startMs-b.startMs||a.sport.localeCompare(b.sport)||a.name.localeCompare(b.name));
  return {events,upcoming,counts,available:[...available],totalAvailable:upcoming.length,allSportsAvailable:available.size===sports.length};
 }
 function featuredOrder(upcoming){
  if(!Array.isArray(upcoming))return [];
  const buckets=new Map(sports.map(s=>[s,[]]));
  for(const e of upcoming){if(buckets.has(e.sport))buckets.get(e.sport).push(e)}
  const out=[];const index=Object.fromEntries(sports.map(s=>[s,0]));
  while(sports.some(s=>index[s]<buckets.get(s).length)){
   for(const s of sports){const bucket=buckets.get(s);if(index[s]<bucket.length)out.push(bucket[index[s]++])}
  }
  return out;
 }
 async function load(id,base='',fetcher=fetch,now=Date.now()){
  const source=SOURCES.find(x=>x.id===id);if(!source)throw Error('Unknown source');
  try{
   const response=await fetcher(base+source.filename,{cache:'no-store',signal:AbortSignal.timeout(12000)});
   if(!response.ok)throw Error('HTTP '+response.status);
   return inspect(id,await response.json(),now);
  }catch(err){return {id,state:'UNAVAILABLE',fresh:false,generatedAt:null,records:[],data:null,error:String(err?.message||err).slice(0,120)}}
 }
 return Object.freeze({SOURCES,sports,stamp,gate,inspect,summarize,featuredOrder,load});
});
