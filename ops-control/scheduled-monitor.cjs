'use strict';
// Operations V5 monitor. Reads existing main-branch research snapshots only.
// Writes local Actions artifacts; never edits model files, Pages, or betting gates.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const extraFeeds=require('./extra-feeds.js');
const SOURCES=[
 {id:'football',filename:'research-dashboard-data.json',owner:'Football Manager',maxAgeHours:24},
 {id:'racing',filename:'racing-research-data.json',owner:'Horse Racing Manager',maxAgeHours:0.5},
 {id:'other',filename:'other-sports-data.json',owner:'Tennis / NFL Managers',maxAgeHours:24},
 {id:'horse',filename:'horse-model-data.json',owner:'Horse Racing Manager + IT/QA',maxAgeHours:6},
 ...extraFeeds.specs
];
function safeString(s){return String(s??'').replace(/[\r\n\t]/g,' ').slice(0,150)}
function record(issues,priority,owner,code,description,nextStep){issues.push({priority,owner,code,description,nextStep})}
function awareTime(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/i.test(value))return NaN;
 const day=value.slice(0,10), midnight=new Date(day+'T00:00:00Z');
 return Number.isFinite(+midnight)&&midnight.toISOString().slice(0,10)===day?Date.parse(value):NaN;
}
function matchingIds(forecast, current){
 if(!Array.isArray(forecast)||!Array.isArray(current)||forecast.length<2||forecast.length!==current.length)return false;
 const expected=new Set();
 for(const runner of forecast){
  const id=runner?.horse_id;
  if(typeof id!=='string'||!id||expected.has(id))return false;
  expected.add(id);
 }
 return current.every(id=>expected.delete(id));
}
function forecastEvidence(forecasts, checks, nowMs){
 const maximumAge=30*60*1000, preOff=5*60*1000;
 const evidence={upcoming:0,stale:0,unknown:0,insideCutoff:0,invalidStart:0,currentFieldUnconfirmed:0};
 for(const row of forecasts){
  const start=awareTime(row?.startUTC);
  if(!Number.isFinite(start)){evidence.invalidStart++;continue;}
  if(start<=nowMs)continue;
  evidence.upcoming++;
  if(start-nowMs<=preOff)evidence.insideCutoff++;
  const original=awareTime(row.runner_observed_at_utc), frozen=awareTime(row.generated_at_utc);
  if(!Number.isFinite(original)||!Number.isFinite(frozen)||original>frozen||frozen>nowMs)evidence.unknown++;
  else if(nowMs-original>maximumAge)evidence.stale++;
  if(start-nowMs<=preOff)continue;
  const key=row.record_sha256;
  const check=checks&&typeof key==='string'&&Object.hasOwn(checks,key)?checks[key]:null;
  const seen=awareTime(check?.runner_observed_at_utc), checked=awareTime(check?.checked_at_utc);
  if(check?.status!=='FRESH_MATCHING_FIELD_AND_CONTEXT'||!(seen<=checked&&checked<=nowMs&&nowMs-seen<=maximumAge)||
     !matchingIds(row.runners,check.active_runner_ids)||typeof row.context_signature!=='string'||row.context_signature!==check.context_signature){
    evidence.currentFieldUnconfirmed++;
  }
 }
 return evidence;
}
function audit(root,now=new Date()){
 const timestamp=now instanceof Date?now:new Date(now);
 if(!Number.isFinite(timestamp.getTime()))throw Error('Invalid monitor timestamp');
 const issues=[],feeds=[],sports=[];
 const nowMs=timestamp.getTime();
 for(const spec of SOURCES){
  const file=path.join(root,spec.filename);
  let doc;
  try{
   const stat=fs.statSync(file);
   if(!stat.isFile()||stat.size>8000000)throw Error('Not a readable JSON file within 8MB cap');
   doc=JSON.parse(fs.readFileSync(file,'utf8'));
   if(!doc||typeof doc!=='object'||Array.isArray(doc))throw Error('JSON root must be an object');
  }catch(e){
   record(issues,'P1','IT & QA Manager',spec.id+':FEED_UNAVAILABLE',spec.id+' published source is absent, malformed or unreadable','Investigate the collector and snapshot publication. No unsupported predictions.');
   feeds.push({id:spec.id,state:'UNAVAILABLE',generatedAt:null,ageHours:null,gateOK:false});continue;
  }
  const context=extraFeeds.context(spec.id,doc,nowMs);
  const racingSnapshot=spec.id==='racing'||spec.id==='racing-forecasts';
  const sourceTime=context.observedAt ?? doc.generated_at_utc;
  const ms=racingSnapshot?awareTime(sourceTime):Date.parse(sourceTime);
  const stampOK=Number.isFinite(ms),future=stampOK&&ms>nowMs+(racingSnapshot?0:300000);
  const age=stampOK?Math.max(0,(nowMs-ms)/3600000):null;
  const gateOK=context.gateOK ?? (doc.research_only===true&&doc.model_validation==='UNVALIDATED'&&doc.publication_gate==='BLOCKED');
  if(!gateOK)record(issues,'P1','Operations Director + IT & QA',spec.id+':GATE_CHANGED',spec.id+' research-only / UNVALIDATED / BLOCKED gates are not all present','Inspect the publication gate; do not approve or publish a bet.');
  if(context.pending)record(issues,'P2',spec.owner,spec.id+':PENDING',context.pending,'Check the latest collection and source coverage.');
  else if(!stampOK||future)record(issues,'P1','IT & QA Manager',spec.id+':INVALID_TIMESTAMP',spec.id+' has missing, invalid or future generation timestamp','Check source timestamps, clocks, and publishing process.');
  else if(age>spec.maxAgeHours)record(issues,'P2','IT & QA Manager',spec.id+':STALE',spec.id+' published snapshot exceeds '+spec.maxAgeHours+' hours','Check collector scheduling and data freshness.');
  const state=!gateOK?'BLOCKED':context.pending?'PENDING':!stampOK||future?'BLOCKED':age>spec.maxAgeHours?'STALE':'OBSERVED';
  const feedReport={id:spec.id,state,generatedAt:stampOK?new Date(ms).toISOString():null,
   ageHours:age===null?null:Number(age.toFixed(2)),gateOK};
  feeds.push(feedReport);
  if(spec.id==='football'){
    const count=Array.isArray(doc.upcoming_fixtures)?doc.upcoming_fixtures.length:null;
    sports.push({sport:'football',observedCount:count,status:'RESEARCH ONLY'});
    if(count===null)record(issues,'P2','Football Manager',spec.id+':MISSING_EVENTS','Football upcoming fixture array is unavailable','Review collector schema and current-season feed.');
  }else if(spec.id==='racing'){
    const count=Array.isArray(doc.races)?doc.races.length:null;
    sports.push({sport:'horse racing',observedCount:count,status:'RESEARCH ONLY'});
    if(count===null)record(issues,'P2','Horse Racing Manager',spec.id+':MISSING_RACES','Racing race array is unavailable','Reconcile published discovery feed.');
    if(doc.coverage_verified!==true)record(issues,'P2','Horse Racing Manager',spec.id+':COVERAGE_UNVERIFIED','Full racing meeting coverage has not been independently verified','Reconcile meeting discovery, excluded races and runner status.');
  }else if(spec.id==='other'){
    for(const key of ['tennis','nfl']){
      const events=doc.sports?.[key]?.events;
      const count=Array.isArray(events)?events.length:null;
      sports.push({sport:key,observedCount:count,status:'RESEARCH ONLY'});
      if(count===null)record(issues,'P2',key==='nfl'?'NFL Manager':'Tennis Manager',key+':MISSING_EVENTS',key+' observed event array is unavailable','Review the sport collector schema and schedule coverage.');
      if(doc.collection_errors?.[key])record(issues,'P2',key==='nfl'?'NFL Manager':'Tennis Manager',key+':COLLECTOR_ERROR',key+' collector declares an error','Inspect the source receipt and collector logs.');
    }
  }else if(spec.id==='darts'){
    sports.push({sport:'darts',observedCount:Array.isArray(doc.fixtures)?doc.fixtures.length:null,status:'RESEARCH ONLY'});
  }else if(spec.id==='rugby'){
    for(const [code,sport] of [['RU','rugby union'],['RL','rugby league']]){
      const events=doc.upcoming_fixtures;
      sports.push({sport,observedCount:Array.isArray(events)?events.filter(event=>event.code===code).length:null,status:'PROVIDER FIXTURES ONLY'});
    }
  }else if(spec.id==='racing-forecasts'){
    const forecasts=Array.isArray(doc.forecasts)?doc.forecasts:null;
    const {upcoming,stale,unknown,insideCutoff,invalidStart,currentFieldUnconfirmed}=
      forecastEvidence(forecasts||[],doc.current_field_checks,nowMs);
    feedReport.originalRunnerEvidence={upcoming,stale,unknown};
    feedReport.intakeTiming={insideCutoff,invalidStart,currentFieldUnconfirmed};
    if(!forecasts||invalidStart){
      record(issues,'P1',spec.owner,spec.id+':INVALID_FORECAST_SCHEDULE',
       'Missing forecast list or invalid start time on '+invalidStart+' forecasts',
       'Reconcile the published forecast list and time-zone-aware start times.');
      feedReport.state='BLOCKED';
    }
    if(stale||unknown){
      record(issues,'P2',spec.owner,spec.id+':ORIGINAL_RUNNER_RECEIPTS_NOT_CURRENT',
       stale+' stale and '+unknown+' unconfirmed original runner receipts among '+upcoming+' upcoming forecasts',
       'Check original forecast and runner receipts before prospective capture.');
      if(feedReport.state==='OBSERVED')feedReport.state=unknown?'PENDING':'STALE';
    }
    if(currentFieldUnconfirmed){
      record(issues,'P2',spec.owner,spec.id+':CURRENT_FIELD_RECEIPTS_NOT_CURRENT',
       currentFieldUnconfirmed+' forecasts outside the pre-off cutoff lack a current matching field receipt',
       'Review field and conditions receipts before prospective capture.');
      if(feedReport.state==='OBSERVED')feedReport.state='PENDING';
    }
    const skipped=Array.isArray(doc.skipped)?doc.skipped:[];
    const unknownDiscipline=skipped.filter(item=>item?.reason==='UNKNOWN_RACE_DISCIPLINE').length;
    if(unknownDiscipline)record(issues,'P2',spec.owner,spec.id+':UNKNOWN_DISCIPLINE',unknownDiscipline+' races lack a confirmed discipline','Match individual racecards to their published race type.');
  }else if(spec.id==='horse'){
    if(!Array.isArray(doc.form_forecasts))record(issues,'P2','Horse Racing Manager',spec.id+':MODEL_ARRAY_MISSING','Racing model forecast array not present','Review model source compatibility without synthesising picks.');
  }
 }
 issues.sort((a,b)=>a.priority.localeCompare(b.priority)||a.code.localeCompare(b.code));
 const priority=issues.some(x=>x.priority==='P1')?'P1':issues.some(x=>x.priority==='P2')?'P2':'CLEAR';
 const signature=crypto.createHash('sha256').update(issues.map(x=>x.code).join('|')).digest('hex').slice(0,16);
 return {schemaVersion:1,kind:'OPERATIONS_SCHEDULED_RESEARCH_AUDIT',generatedAt:timestamp.toISOString(),source:'REPOSITORY_MAIN_SNAPSHOTS',notLiveWebsiteCheck:true,gate:'UNVALIDATED / BLOCKED',bookmakerPricesVerified:false,qualifiedBettingApprovals:0,independentExpertSignoff:false,changesApplied:false,priority,issues,feeds,sports,signature};
}
function markdown(report){
 const lines=[
 '# Operations Director — scheduled briefing',
 '',
 '**Checked:** '+safeString(report.generatedAt)+' (UTC)',
 '**Scope:** latest repository snapshots, not a verified live-site or GitHub Pages health check.',
 '**Research publication:** UNVALIDATED / BLOCKED; zero certified betting approvals.',
 '**Overall:** '+report.priority+' — '+report.issues.filter(x=>x.priority==='P1').length+' P1, '+report.issues.filter(x=>x.priority==='P2').length+' P2.',
 '',
 '## Feed health',
 '| Source | State | Age (hours) |','|---|---|---:|'
 ];
 for(const f of report.feeds)lines.push('| '+safeString(f.id)+' | '+safeString(f.state)+' | '+(f.ageHours===null?'unknown':f.ageHours.toFixed(2))+' |');
 lines.push('','## Manager actions');
 if(report.issues.length===0)lines.push('No source exceptions found in the available snapshots. Research remains unvalidated.');
 for(const issue of report.issues){
  lines.push('- **'+issue.priority+' — '+safeString(issue.owner)+' ('+safeString(issue.code)+')**: '+safeString(issue.description)+'. Next: '+safeString(issue.nextStep));
 }
 lines.push('','No wagers placed, no models changed, no independently validated winning probability or market value implied.','', '<!-- ops-monitor-signature:'+report.signature+' -->');
 return lines.join('\n');
}
function main(){
 const root=path.resolve(__dirname,'..'),output=path.resolve(process.argv[2]||path.join(__dirname,'out'));
 const report=audit(root,new Date());
 fs.mkdirSync(output,{recursive:true});
 fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
 fs.writeFileSync(path.join(output,'briefing.md'),markdown(report)+'\n');
 if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,markdown(report)+'\n');
 console.log('Ops monitor:',report.priority,'issues=',report.issues.length,'signature=',report.signature);
}
if(require.main===module)main();
module.exports={audit,markdown,SOURCES};
