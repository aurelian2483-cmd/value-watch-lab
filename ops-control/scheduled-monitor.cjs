'use strict';
// Operations V5 monitor. Reads existing main-branch research snapshots only.
// Writes local Actions artifacts; never edits model files, Pages, or betting gates.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const SOURCES=[
 {id:'football',filename:'research-dashboard-data.json',owner:'Football Manager',maxAgeHours:24},
 {id:'racing',filename:'racing-research-data.json',owner:'Horse Racing Manager',maxAgeHours:6},
 {id:'other',filename:'other-sports-data.json',owner:'Tennis / NFL Managers',maxAgeHours:24},
 {id:'horse',filename:'horse-model-data.json',owner:'Horse Racing Manager + IT/QA',maxAgeHours:6}
];
function safeString(s){return String(s??'').replace(/[\r\n\t]/g,' ').slice(0,150)}
function record(issues,priority,owner,code,description,nextStep){issues.push({priority,owner,code,description,nextStep})}
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
  const ms=typeof doc.generated_at_utc==='string'?Date.parse(doc.generated_at_utc):NaN;
  const stampOK=Number.isFinite(ms),future=stampOK&&ms>nowMs+300000;
  const age=stampOK?Math.max(0,(nowMs-ms)/3600000):null;
  const gateOK=doc.research_only===true&&doc.model_validation==='UNVALIDATED'&&doc.publication_gate==='BLOCKED';
  if(!gateOK)record(issues,'P1','Operations Director + IT & QA',spec.id+':GATE_CHANGED',spec.id+' research-only / UNVALIDATED / BLOCKED gates are not all present','Inspect the publication gate; do not approve or publish a bet.');
  if(!stampOK||future)record(issues,'P1','IT & QA Manager',spec.id+':INVALID_TIMESTAMP',spec.id+' has missing, invalid or future generation timestamp','Check source timestamps, clocks, and publishing process.');
  else if(age>spec.maxAgeHours)record(issues,'P2','IT & QA Manager',spec.id+':STALE',spec.id+' published snapshot exceeds '+spec.maxAgeHours+' hours','Check collector scheduling and data freshness.');
  const state=!gateOK||!stampOK||future?'BLOCKED':age>spec.maxAgeHours?'STALE':'OBSERVED';
  feeds.push({id:spec.id,state,generatedAt:stampOK?new Date(ms).toISOString():null,ageHours:age===null?null:Number(age.toFixed(2)),gateOK});
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
