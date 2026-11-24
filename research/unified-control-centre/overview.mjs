// Read-only aggregation of explicitly supplied, revision-labelled summary artifacts.
// Never invokes experiment producers, accesses source datasets, or grants permissions.
import {createHash} from 'node:crypto'
import {lstatSync,realpathSync,readFileSync} from 'node:fs'
import {resolve,join} from 'node:path'
import {fileURLToPath,pathToFileURL} from 'node:url'
import {digest as canonicalDigest} from '../scientific-reference/digest.mjs'
const pins=JSON.parse(readFileSync(fileURLToPath(new URL('./source-pins.json',import.meta.url)),'utf8'))
const flags={researchOnly:true,publicationGate:'BLOCKED',executionAuthorized:false,validationAuthorized:false}
const sha=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x)
const num=x=>Number.isSafeInteger(x)&&x>=0
const hash=x=>createHash('sha256').update(x).digest('hex')
const utc=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x
const check=(x,message)=>{if(!x)throw Error(message)}
const metric=(label,value)=>({label,value})
const statusIn=(x,values)=>values.includes(x)
function verifySelfHash(r,key,canonical=false){
 const {[key]:declared,...payload}=r
 check(sha(declared)&&(canonical?canonicalDigest(payload):hash(JSON.stringify(payload)))===declared,'Report fingerprint mismatch')
}
function standard(r,kind){
 check(r?.kind===kind&&r.schemaVersion===1&&Object.entries(flags).every(([k,v])=>r[k]===v),'Unsafe report contract')
}
function project(pin,r){
 let status,metrics,notes=[]
 switch(pin.id){
 case 'catalogue':
  check(num(r.registered)&&r.target===1000&&num(r.remaining)&&r.registered+r.remaining===r.target&&r.qualified===0,'Invalid catalogue counts')
  check(r.byClassification&&Object.values(r.byClassification).every(num)&&Object.values(r.byClassification).reduce((a,b)=>a+b,0)===r.registered,'Catalogue classification mismatch')
  status='CATALOGUE_REGISTERED_UNVALIDATED'
  metrics=[metric('Registered specifications',r.registered),metric('Target',r.target),metric('Remaining',r.remaining),metric('Empirically qualified',r.qualified)]
  notes=['Pinned catalogue metadata snapshot; specifications are not empirical evidence.']
  break
 case 'data':{
  standard(r,'INTEGRATED_RESEARCH_DATA_STATUS')
  check(r.declaredSourceRevision===pin.reportRevision&&r.modelValidation==='UNVALIDATED'&&r.sourceMutationAuthorized===false&&r.accessAuthorized===false,'Data revision or gate mismatch')
  const d=r.dataQuality
  check(d&&typeof d.aggregateCountsAgree==='boolean'&&[d.sourceCount,d.filesPresent,d.sourcesRequiringReview].every(x=>x===null||num(x)),'Invalid data quality counts')
  if(d.sourceCount!==null)check((d.filesPresent===null||d.filesPresent<=d.sourceCount)&&(d.sourcesRequiringReview===null||d.sourcesRequiringReview<=d.sourceCount),'Invalid data count relationship')
  status='INDEPENDENT_SOURCE_REVIEW_REQUIRED'
  metrics=[metric('Allowlisted files',d.sourceCount),metric('Files present',d.filesPresent),metric('Sources requiring review',d.sourcesRequiringReview),metric('Aggregate counts agree',d.aggregateCountsAgree?'Yes — aggregate only':'No or unresolved')]
  notes=['Separate sibling branch snapshot. Source rights and record authenticity remain unverified.']
  break}
 case 'lab':{
  standard(r,'SYNTHETIC_LAB_CONTROL_CENTRE_STATUS')
  check(r.declaredCodeRevision===pin.reportRevision&&r.modelValidation==='UNVALIDATED'&&r.expectedFixtures===5,'Lab revision or fixture mismatch')
  check(statusIn(r.status,['SYNTHETIC_QA_PASSED','SYNTHETIC_QA_FAILED','EVIDENCE_INCOMPLETE_OR_INCONSISTENT']),'Unknown laboratory status')
  const keys=['knownAnswer','analyticalReference','persisted','parallel']
  if(r.checks!==null){
   check(keys.every(k=>r.checks[k]?.total===5&&num(r.checks[k].passed)&&num(r.checks[k].failed)&&r.checks[k].passed+r.checks[k].failed===5),'Invalid lab counts')
   check(r.status===(keys.every(k=>r.checks[k].failed===0)?'SYNTHETIC_QA_PASSED':'SYNTHETIC_QA_FAILED'),'Contradictory lab verdict')
  }else check(r.status==='EVIDENCE_INCOMPLETE_OR_INCONSISTENT','Missing lab evidence')
  status=r.status
  metrics=[metric('Expected fixtures',r.expectedFixtures),metric('Known answers passed',r.checks?.knownAnswer.passed??null),metric('Reference checks passed',r.checks?.analyticalReference.passed??null),metric('Persisted fixtures passed',r.checks?.persisted.passed??null)]
  notes=['Fixed synthetic fixtures only. No real-world qualification.']
  break}
 case 'compute':
  standard(r,'SCIENTIFIC_COMPUTE_CONTROL_CENTRE_STATUS')
  check(r.declaredRevision===pin.reportRevision&&r.hardwareIndependentlyVerified===false,'Compute revision or hardware claim mismatch')
  for(const mode of ['cpu','gpu']){
   const m=r[mode]
   check(m?.mode===mode&&m.hardwareIndependentlyVerified===false,'Invalid device mode')
   if(m.status==='RECORDED_LOCAL_PASS')check(sha(m.receiptSha256)&&m.passedWorkloads===2&&m.benchmarkRows===(mode==='cpu'?4:12),'Invalid compute pass')
   else if(m.status==='RECORDED_LOCAL_FAILURE')check(sha(m.receiptSha256)&&num(m.passedWorkloads)&&m.passedWorkloads<2&&m.benchmarkRows===null,'Invalid compute failure')
   else check(statusIn(m.status,['NOT_SUPPLIED','INVALID_RECEIPT','UNSAFE_RECEIPT','MODE_OR_REVISION_MISMATCH'])&&m.receiptSha256===null&&m.passedWorkloads===null&&m.benchmarkRows===null,'Invalid device evidence')
  }
  check(r.status===(r.cpu.status==='RECORDED_LOCAL_PASS'?'CPU_LOCAL_EVIDENCE_AVAILABLE':'CPU_EVIDENCE_INCOMPLETE'),'Contradictory CPU summary')
  status=r.status
  metrics=[metric('CPU evidence',r.cpu.status),metric('GPU evidence',r.gpu.status),metric('CPU benchmark rows',r.cpu.benchmarkRows),metric('GPU benchmark rows',r.gpu.benchmarkRows)]
  notes=['Hosted Linux CPU report; no independent physical GPU or user-PC acceptance.']
  break
 case 'supervisor':
  standard(r,'RESEARCH_SUPERVISOR_DASHBOARD');verifySelfHash(r,'dashboardSha256')
  check(r.declaredRevision===pin.reportRevision&&r.repairAuthorized===false&&utc(r.observedAt)&&r.monitoringService==='NOT_STARTED_BY_DASHBOARD','Unsafe supervisor state')
  check(num(r.incidentCounts?.blocking)&&num(r.incidentCounts?.review)&&Array.isArray(r.recommendations)&&r.recommendations.length===r.incidentCounts.blocking+r.incidentCounts.review,'Invalid incident counts')
  check(r.recommendations.every(s=>s.approvalRequired===true&&s.automaticAction===null&&statusIn(s.priority,['BLOCKING','REVIEW']))&&r.recommendations.filter(s=>s.priority==='BLOCKING').length===r.incidentCounts.blocking,'Unsafe recommendation')
  check(r.status===(r.incidentCounts.blocking?'BLOCKED_PENDING_REVIEW':r.incidentCounts.review?'REVIEW_REQUIRED':'NO_INCIDENTS_OBSERVED'),'Contradictory incident verdict')
  status=r.status
  metrics=[metric('Blocking incidents',r.incidentCounts.blocking),metric('Review incidents',r.incidentCounts.review),metric('Completed registry entries',num(r.registryCounts?.COMPLETED)?r.registryCounts.COMPLETED:null),metric('Monitoring service','Not started by dashboard')]
  notes=['Point-in-time synthetic registry inspection. No automatic recovery.']
  break
 case 'references':{
  standard(r,'SCIENTIFIC_REFERENCE_DASHBOARD');verifySelfHash(r,'dashboardSha256',true)
  const c=r.counts
  check(r.asOf==='2026-11-24'&&r.status==='REVIEW_REQUIRED'&&c&&['sources','claims','recordedLocatorReviews','recordedMetadataReviews','comparablePairs','potentialConflicts'].every(k=>num(c[k]))&&c.independentlyReviewed===0&&c.rightsVerified===0&&c.empiricallyQualified===0,'Invalid reference review')
  check(Array.isArray(r.sources)&&r.sources.length===c.sources&&r.sources.every(s=>Array.isArray(s.claims))&&r.sources.reduce((n,s)=>n+s.claims.length,0)===c.claims,'Reference counts disagree')
  check(c.potentialConflicts<=c.comparablePairs&&r.comparisonCoverage===(c.comparablePairs?'STRUCTURED_PAIRS_AVAILABLE':'NO_COMPARABLE_PAIRS'),'Invalid comparison coverage')
  status=r.status
  metrics=[metric('Registered sources',c.sources),metric('Scientific claims',c.claims),metric('Locator reviews recorded',c.recordedLocatorReviews),metric('Potential conflicts',c.comparablePairs?c.potentialConflicts:'Unassessed')]
  notes=['Metadata-bound review only; source content, rights and independence not certified.']
  break}
 default:throw Error('Unknown module')
 }
 return {status,metrics,notes}
}
function read(root,file){
 try{
  const p=join(root,file),s=lstatSync(p)
  if(!s.isFile()||s.isSymbolicLink()||s.size>4*1024*1024)return {state:'UNSAFE',bytes:null}
  const b=readFileSync(p)
  if(b.length!==s.size||b.length>4*1024*1024)return {state:'UNSTABLE',bytes:null}
  return {state:'READ',bytes:b}
 }catch(e){return {state:e.code==='ENOENT'?'MISSING':'UNREADABLE',bytes:null}}
}
export function build(directory){
 const root=resolve(directory)
 check(realpathSync(root)===root&&lstatSync(root).isDirectory(),'Unsafe evidence directory')
 const modules=pins.map(pin=>{
  const first=read(root,pin.file)
  const source={pr:pin.pr,head:pin.head,reportRevision:pin.reportRevision,run:pin.run,artifact:pin.artifact,
   provenance:'DECLARED_PINNED_SOURCE_NOT_AUTHENTICATED_BY_VIEWER'}
  const unavailable=state=>({id:pin.id,name:pin.name,source,evidenceState:state,receiptSha256:null,status:'UNKNOWN',metrics:[],notes:['Supply the original matching summary artifact; no values inferred.']})
  if(first.state!=='READ')return unavailable(first.state)
  try{
   const r=JSON.parse(first.bytes.toString('utf8')),p=project(pin,r),second=read(root,pin.file)
   if(second.state!=='READ'||!first.bytes.equals(second.bytes))return unavailable('UNSTABLE')
   return {id:pin.id,name:pin.name,source,evidenceState:'SUMMARY_CONTRACT_CHECKED',receiptSha256:hash(first.bytes),...p}
  }catch{return unavailable('INVALID_CONTRACT')}
 })
 const payload={kind:'UNIFIED_RESEARCH_CONTROL_CENTRE',schemaVersion:1,status:'RESEARCH_NOT_READY',
  modules,counts:{modules:modules.length,available:modules.filter(m=>m.evidenceState==='SUMMARY_CONTRACT_CHECKED').length,unavailable:modules.filter(m=>m.evidenceState!=='SUMMARY_CONTRACT_CHECKED').length},
  modelValidation:'UNVALIDATED',...flags,repairAuthorized:false,accessAuthorized:false,sourceMutationAuthorized:false,
  limitations:['Pinned summaries are from different revisions and times, not a synchronized live system.',
   'Local input byte receipts and summary checks do not authenticate source origin or revalidate raw evidence.',
   'Software acceptance is distinct from research qualification. Missing and invalid summaries remain unknown.',
   'No source data collection, execution, repair, capital allocation or publication.']}
 return {...payload,snapshotSha256:canonicalDigest(payload)}
}
// A self-hash detects corruption, not semantic forgery or source authenticity.
const snapshotContracts={
 catalogue:[['CATALOGUE_REGISTERED_UNVALIDATED'],['Registered specifications','Target','Remaining','Empirically qualified'],'Pinned catalogue metadata snapshot; specifications are not empirical evidence.'],
 data:[['INDEPENDENT_SOURCE_REVIEW_REQUIRED'],['Allowlisted files','Files present','Sources requiring review','Aggregate counts agree'],'Separate sibling branch snapshot. Source rights and record authenticity remain unverified.'],
 lab:[['SYNTHETIC_QA_PASSED','SYNTHETIC_QA_FAILED','EVIDENCE_INCOMPLETE_OR_INCONSISTENT'],['Expected fixtures','Known answers passed','Reference checks passed','Persisted fixtures passed'],'Fixed synthetic fixtures only. No real-world qualification.'],
 compute:[['CPU_LOCAL_EVIDENCE_AVAILABLE','CPU_EVIDENCE_INCOMPLETE'],['CPU evidence','GPU evidence','CPU benchmark rows','GPU benchmark rows'],'Hosted Linux CPU report; no independent physical GPU or user-PC acceptance.'],
 supervisor:[['BLOCKED_PENDING_REVIEW','REVIEW_REQUIRED','NO_INCIDENTS_OBSERVED'],['Blocking incidents','Review incidents','Completed registry entries','Monitoring service'],'Point-in-time synthetic registry inspection. No automatic recovery.'],
 references:[['REVIEW_REQUIRED'],['Registered sources','Scientific claims','Locator reviews recorded','Potential conflicts'],'Metadata-bound review only; source content, rights and independence not certified.']
}
const snapshotLimitations=['Pinned summaries are from different revisions and times, not a synchronized live system.',
 'Local input byte receipts and summary checks do not authenticate source origin or revalidate raw evidence.',
 'Software acceptance is distinct from research qualification. Missing and invalid summaries remain unknown.',
 'No source data collection, execution, repair, capital allocation or publication.']
const same=(a,b)=>canonicalDigest(a)===canonicalDigest(b)
const exactKeys=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k))
const optionalNum=x=>x===null||num(x)
function verifyMetrics(m){
 const v=m.metrics.map(x=>x.value),[a,b,c,d]=v
 switch(m.id){
 case 'catalogue':return num(a)&&b===1000&&num(c)&&a+c===1000&&d===0
 case 'data':return [a,b,c].every(optionalNum)&&(a===null||[b,c].every(x=>x===null||x<=a))&&['Yes — aggregate only','No or unresolved'].includes(d)
 case 'lab':return a===5&&(m.status==='EVIDENCE_INCOMPLETE_OR_INCONSISTENT'?[b,c,d].every(x=>x===null):[b,c,d].every(x=>num(x)&&x<=5)&&(m.status!=='SYNTHETIC_QA_PASSED'||[b,c,d].every(x=>x===5)))
 case 'compute':{
  const states=['RECORDED_LOCAL_PASS','RECORDED_LOCAL_FAILURE','NOT_SUPPLIED','INVALID_RECEIPT','UNSAFE_RECEIPT','MODE_OR_REVISION_MISMATCH']
  return states.includes(a)&&states.includes(b)&&c===(a==='RECORDED_LOCAL_PASS'?4:null)&&d===(b==='RECORDED_LOCAL_PASS'?12:null)&&m.status===(a==='RECORDED_LOCAL_PASS'?'CPU_LOCAL_EVIDENCE_AVAILABLE':'CPU_EVIDENCE_INCOMPLETE')
 }
 case 'supervisor':return num(a)&&num(b)&&optionalNum(c)&&d==='Not started by dashboard'&&m.status===(a?'BLOCKED_PENDING_REVIEW':b?'REVIEW_REQUIRED':'NO_INCIDENTS_OBSERVED')
 case 'references':return [a,b,c].every(num)&&(d==='Unassessed'||num(d))
 default:return false
 }
}
export function verifySnapshot(r){
 check(r&&r.kind==='UNIFIED_RESEARCH_CONTROL_CENTRE'&&r.schemaVersion===1&&r.status==='RESEARCH_NOT_READY'&&Object.entries(flags).every(([k,v])=>r[k]===v)&&r.repairAuthorized===false&&r.accessAuthorized===false&&r.sourceMutationAuthorized===false&&r.modelValidation==='UNVALIDATED','Invalid dashboard snapshot')
 verifySelfHash(r,'snapshotSha256',true)
 check(Array.isArray(r.modules)&&r.modules.length===pins.length&&same(r.limitations,snapshotLimitations),'Invalid module coverage or limitations')
 let available=0
 for(let i=0;i<pins.length;i++){
  const p=pins[i],m=r.modules[i]
  check(exactKeys(m,['id','name','source','evidenceState','receiptSha256','status','metrics','notes'])&&m.id===p.id&&m.name===p.name,'Invalid module identity')
  check(same(m.source,{pr:p.pr,head:p.head,reportRevision:p.reportRevision,run:p.run,artifact:p.artifact,provenance:'DECLARED_PINNED_SOURCE_NOT_AUTHENTICATED_BY_VIEWER'}),'Invalid source pin')
  check(Array.isArray(m.metrics),'Invalid metrics')
  if(m.evidenceState==='SUMMARY_CONTRACT_CHECKED'){
   available++
   const [states,labels,note]=snapshotContracts[m.id]
   check(sha(m.receiptSha256)&&states.includes(m.status)&&same(m.notes,[note])&&m.metrics.length===labels.length&&m.metrics.every((x,j)=>exactKeys(x,['label','value'])&&x.label===labels[j])&&verifyMetrics(m),'Invalid projected metrics or status')
  }else{
   check(['MISSING','UNREADABLE','UNSAFE','UNSTABLE','INVALID_CONTRACT'].includes(m.evidenceState)&&m.status==='UNKNOWN'&&m.receiptSha256===null&&m.metrics.length===0&&same(m.notes,['Supply the original matching summary artifact; no values inferred.']),'Unavailable evidence must remain unknown')
  }
 }
 check(same(r.counts,{modules:pins.length,available,unavailable:pins.length-available}),'Invalid coverage counts')
 return true
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{if(process.argv.length!==3)throw Error('Usage: node overview.mjs <summary-directory>');console.log(JSON.stringify(build(process.argv[2]),null,2))}
 catch(e){console.error(e.message);process.exitCode=1}
}
