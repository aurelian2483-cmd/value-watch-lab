// Append-only local incident observations. No repair, closure, or workload execution.
import {createHash,randomUUID} from 'node:crypto'
import {readFileSync,writeFileSync,lstatSync,realpathSync,readdirSync,linkSync,unlinkSync,openSync,closeSync} from 'node:fs'
import {join,resolve,relative,isAbsolute,sep} from 'node:path'
import {pathToFileURL} from 'node:url'
import {inspectRegistry} from './supervisor.mjs'
import {inspectReports} from './report-monitor.mjs'
const hash=x=>createHash('sha256').update(x).digest('hex')
const sha=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x)
const rev=x=>typeof x==='string'&&/^[a-f0-9]{40}$/.test(x)
const utc=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x
const lock='.incident-history-lock',limit=1000,maxBytes=2*1024*1024
const flags={researchOnly:true,publicationGate:'BLOCKED',executionAuthorized:false,validationAuthorized:false,repairAuthorized:false}
function rootPath(directory){
 const root=resolve(directory)
 if(realpathSync(root)!==root||!lstatSync(root).isDirectory())throw Error('Expected an existing nonsymlink directory')
 return root
}
function nested(a,b){const p=relative(a,b);return p===''||(!isAbsolute(p)&&p!=='..'&&!p.startsWith('..'+sep))}
function safeIncident(i,source){
 if(!i||!sha(i.incidentId)||typeof i.code!=='string'||! /^[A-Z0-9_]{1,100}$/.test(i.code)||!['BLOCK','REVIEW'].includes(i.severity))throw Error('Invalid incident')
 const subject=source==='registry'?(i.experimentId??null):i.system
 if(source==='registry'?(subject!==null&&!sha(subject)):!['mathematical-lab','scientific-cpu','scientific-gpu'].includes(subject))throw Error('Invalid incident subject')
 const expected=hash(JSON.stringify(source==='registry'?[i.code,subject]:[subject,i.code]))
 if(expected!==i.incidentId)throw Error('Incident identity mismatch')
 return {id:i.incidentId,source,subject,code:i.code,severity:i.severity}
}
function derive(registry,reports,revision){
 if(!rev(revision)||registry?.kind!=='RESEARCH_SUPERVISOR_OPERATIONAL_REPORT'||reports?.kind!=='RESEARCH_SUPERVISOR_REPORT_MONITOR'||reports.expectedRevision!==revision)throw Error('Wrong observation contract')
 for(const r of [registry,reports]){
  if(!Object.entries(flags).every(([k,v])=>r[k]===v)||!Array.isArray(r.incidents)||r.incidents.length>5000)throw Error('Invalid observation flags or incidents')
 }
 const incidents=[...registry.incidents.map(i=>safeIncident(i,'registry')),...reports.incidents.map(i=>safeIncident(i,'reports'))].sort((a,b)=>a.id.localeCompare(b.id))
 if(new Set(incidents.map(i=>i.id)).size!==incidents.length)throw Error('Duplicate incident identity')
 return {incidents,coverage:{registry:registry.inspectionStable===true&&registry.counts!==null,reports:reports.inspectionStable===true&&reports.systems?.every(s=>!['EVIDENCE_MISSING','EVIDENCE_INCOMPLETE','INVALID_CONTRACT','INSPECTION_UNSTABLE'].includes(s.status))===true},
  registryReportSha256:hash(JSON.stringify(registry)),monitorReportSha256:hash(JSON.stringify(reports))}
}
function verifyEntry(entry,sequence,previous,revision){
 if(!entry||entry.kind!=='RESEARCH_INCIDENT_OBSERVATION'||entry.schemaVersion!==1||entry.sequence!==sequence||entry.previous!==previous||entry.declaredRevision!==revision||!utc(entry.observedAt)||
   !Object.entries(flags).every(([k,v])=>entry[k]===v)||!Array.isArray(entry.incidents)||entry.incidents.length>10000||!sha(entry.registryReportSha256)||!sha(entry.monitorReportSha256)||
   typeof entry.coverage?.registry!=='boolean'||typeof entry.coverage?.reports!=='boolean')throw Error('Invalid incident history entry')
 const {entrySha256,...payload}=entry
 if(hash(JSON.stringify(payload))!==entrySha256)throw Error('Incident history fingerprint mismatch')
 const ids=new Set()
 for(const i of entry.incidents){
  if(!['registry','reports'].includes(i.source)||ids.has(i.id))throw Error('Invalid stored incident')
  safeIncident({incidentId:i.id,code:i.code,severity:i.severity,experimentId:i.subject,system:i.subject},i.source)
  ids.add(i.id)
 }
}
function load(root,revision){
 const names=readdirSync(root).filter(n=>n!==lock).sort()
 if(names.length>limit||names.some((n,i)=>n!==String(i+1).padStart(8,'0')+'.json'))throw Error('Unexpected incident history entry or sequence gap')
 const entries=[]
 for(const name of names){
  const p=join(root,name),s=lstatSync(p)
  if(!s.isFile()||s.isSymbolicLink()||s.size>maxBytes)throw Error('Unsafe history entry')
  const bytes=readFileSync(p)
  if(bytes.length!==s.size)throw Error('History changed during read')
  const entry=JSON.parse(bytes)
  verifyEntry(entry,entries.length+1,entries.at(-1)?.entrySha256??null,revision)
  if(entries.length&&entry.observedAt<=entries.at(-1).observedAt)throw Error('Non-increasing observation time')
  entries.push(entry)
 }
 return entries
}
export function summarizeHistory(entries){
 const known=new Map()
 for(const entry of entries){
  const current=new Set(entry.incidents.map(i=>i.id))
  for(const i of known.values()){
   if(!current.has(i.id))i.state=entry.coverage[i.source]?'NOT_OBSERVED':'UNKNOWN_COVERAGE'
  }
  for(const incident of entry.incidents){
   const old=known.get(incident.id)
   known.set(incident.id,{...incident,firstObservedAt:old?.firstObservedAt??entry.observedAt,lastObservedAt:entry.observedAt,
    observations:(old?.observations??0)+1,state:!old?'NEW':old.state==='NOT_OBSERVED'?'RECURRING':'OBSERVED_AGAIN'})
  }
 }
 return [...known.values()].sort((a,b)=>a.id.localeCompare(b.id))
}
export function recordObservation(historyDirectory,registryDirectory,artifactDirectory,revision,{observedAt=new Date().toISOString()}={}){
 if(!rev(revision)||!utc(observedAt))throw Error('Invalid revision or observation time')
 const root=rootPath(historyDirectory),registry=rootPath(registryDirectory),artifacts=rootPath(artifactDirectory)
 if([registry,artifacts].some(p=>nested(root,p)||nested(p,root)))throw Error('History directory must be separate from evidence directories')
 const lockPath=join(root,lock),fd=openSync(lockPath,'wx',0o600)
 closeSync(fd)
 try{
  const entries=load(root,revision)
  if(entries.length>=limit)throw Error('History limit reached; retain this history and begin a new explicitly scoped directory')
  if(entries.length&&observedAt<=entries.at(-1).observedAt)throw Error('Observation time must increase')
  const observation=derive(inspectRegistry(registry,{asOf:observedAt}),inspectReports(artifacts,revision),revision)
  const payload={kind:'RESEARCH_INCIDENT_OBSERVATION',schemaVersion:1,sequence:entries.length+1,previous:entries.at(-1)?.entrySha256??null,declaredRevision:revision,observedAt,...observation,...flags}
  const entry={...payload,entrySha256:hash(JSON.stringify(payload))}
  const data=JSON.stringify(entry)
  if(Buffer.byteLength(data)>maxBytes)throw Error('Observation exceeds history size limit')
  const target=join(root,String(entry.sequence).padStart(8,'0')+'.json'),temp=target+'.'+randomUUID()+'.tmp'
  try{writeFileSync(temp,data,{flag:'wx',mode:0o600,flush:true});linkSync(temp,target)}
  finally{try{unlinkSync(temp)}catch(e){if(e.code!=='ENOENT')throw e}}
  const incidents=summarizeHistory([...entries,entry])
  return {kind:'RESEARCH_INCIDENT_HISTORY_SUMMARY',schemaVersion:1,declaredRevision:revision,observations:entry.sequence,latestEntrySha256:entry.entrySha256,incidents,...flags,
   limitations:['Observations are not authenticated or tamper-proof. History is revision-scoped and bounded.',
    'Not observed does not mean resolved; incomplete coverage cannot close an incident.',
    'No automatic repair, restart, or background monitoring.']}
 }finally{unlinkSync(lockPath)}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(process.argv.length!==6){console.error('Usage: node incident-history.mjs <history-directory> <registry-directory> <artifact-directory> <revision>');process.exitCode=2}
 else{try{console.log(JSON.stringify(recordObservation(...process.argv.slice(2)),null,2))}catch(e){console.error(e.message);process.exitCode=1}}
}
