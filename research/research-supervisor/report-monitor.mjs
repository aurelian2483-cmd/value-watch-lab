// Read-only monitoring of existing general synthetic QA summaries.
import {lstatSync,realpathSync,readFileSync} from 'node:fs'
import {resolve,join} from 'node:path'
import {createHash} from 'node:crypto'
import {pathToFileURL} from 'node:url'
const hash=x=>createHash('sha256').update(x).digest('hex')
const sha=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x)
const revision=x=>typeof x==='string'&&/^[a-f0-9]{40}$/.test(x)
const natural=x=>Number.isSafeInteger(x)&&x>=0
const files=Object.freeze(['lab-status.json','compute-status.json'])
const flags=r=>r?.schemaVersion===1&&r.researchOnly===true&&r.publicationGate==='BLOCKED'&&r.executionAuthorized===false&&r.validationAuthorized===false
function read(root,name){
 try{
  const p=join(root,name),s=lstatSync(p)
  if(!s.isFile()||s.isSymbolicLink()||s.size>1024*1024)return {name,status:'UNSAFE',sha256:null,data:null}
  const bytes=readFileSync(p)
  if(bytes.length!==s.size||bytes.length>1024*1024)return {name,status:'UNSTABLE',sha256:null,data:null}
  const digest=hash(bytes)
  try{return {name,status:'READ',sha256:digest,data:JSON.parse(bytes.toString('utf8'))}}
  catch{return {name,status:'INVALID',sha256:digest,data:null}}
 }catch(e){return {name,status:e.code==='ENOENT'?'MISSING':'UNREADABLE',sha256:null,data:null}}
}
const countsValid=(r,n)=>r&&natural(r.total)&&natural(r.passed)&&natural(r.failed)&&r.total===n&&r.passed+r.failed===n
function labState(r,rev){
 if(!flags(r)||r.kind!=='SYNTHETIC_LAB_CONTROL_CENTRE_STATUS'||r.declaredCodeRevision!==rev||
    r.modelValidation!=='UNVALIDATED'||r.expectedFixtures!==5)return 'INVALID_CONTRACT'
 if(r.status==='EVIDENCE_INCOMPLETE_OR_INCONSISTENT'&&r.checks===null)return 'EVIDENCE_INCOMPLETE'
 if(!['SYNTHETIC_QA_PASSED','SYNTHETIC_QA_FAILED'].includes(r.status)||!sha(r.benchmarkReportSha256))return 'INVALID_CONTRACT'
 const c=r.checks
 if(!c||!['knownAnswer','analyticalReference','persisted','parallel'].every(k=>countsValid(c[k],5))||
    !Number.isSafeInteger(c.peakActiveWorkers)||c.peakActiveWorkers<1||c.peakActiveWorkers>4||
    c.gpuStatus!=='DISABLED_NOT_VALIDATED')return 'INVALID_CONTRACT'
 const pass=['knownAnswer','analyticalReference','persisted','parallel'].every(k=>c[k].failed===0)
 if(pass!==(r.status==='SYNTHETIC_QA_PASSED'))return 'INVALID_CONTRACT'
 return pass?'RECORDED_SYNTHETIC_PASS':'RECORDED_FAILURE'
}
function computeMode(r,mode){
 if(!r||r.mode!==mode||r.hardwareIndependentlyVerified!==false)return 'INVALID_CONTRACT'
 if(r.status==='RECORDED_LOCAL_PASS'){
  return sha(r.receiptSha256)&&r.passedWorkloads===2&&r.benchmarkRows===(mode==='cpu'?4:12)?'RECORDED_SYNTHETIC_PASS':'INVALID_CONTRACT'
 }
 if(r.status==='RECORDED_LOCAL_FAILURE')return sha(r.receiptSha256)&&natural(r.passedWorkloads)&&r.passedWorkloads<2&&r.benchmarkRows===null?'RECORDED_FAILURE':'INVALID_CONTRACT'
 if(['NOT_SUPPLIED','INVALID_RECEIPT','UNSAFE_RECEIPT','MODE_OR_REVISION_MISMATCH'].includes(r.status)&&r.receiptSha256===null&&r.passedWorkloads===null&&r.benchmarkRows===null)
  return r.status==='NOT_SUPPLIED'?'EVIDENCE_MISSING':'INVALID_CONTRACT'
 return 'INVALID_CONTRACT'
}
export function inspectReports(directory,expectedRevision){
 if(!revision(expectedRevision))throw Error('Full expected revision required')
 const root=resolve(directory)
 if(realpathSync(root)!==root||!lstatSync(root).isDirectory())throw Error('Unsafe report directory')
 const before=files.map(name=>read(root,name)),after=files.map(name=>read(root,name))
 const stable=before.every((r,i)=>r.status===after[i].status&&r.sha256===after[i].sha256)
 const unavailable=r=>r.status==='MISSING'?'EVIDENCE_MISSING':'INVALID_CONTRACT'
 let lab=before[0].status==='READ'?labState(before[0].data,expectedRevision):unavailable(before[0])
 let cpu,gpu
 const c=before[1].data
 if(before[1].status!=='READ')cpu=gpu=unavailable(before[1])
 else if(!flags(c)||c.kind!=='SCIENTIFIC_COMPUTE_CONTROL_CENTRE_STATUS'||c.declaredRevision!==expectedRevision||c.hardwareIndependentlyVerified!==false)cpu=gpu='INVALID_CONTRACT'
 else{
  cpu=computeMode(c.cpu,'cpu');gpu=computeMode(c.gpu,'gpu')
  if(c.status!==(cpu==='RECORDED_SYNTHETIC_PASS'?'CPU_LOCAL_EVIDENCE_AVAILABLE':'CPU_EVIDENCE_INCOMPLETE'))cpu='INVALID_CONTRACT'
 }
 if(!stable)lab=cpu=gpu='INSPECTION_UNSTABLE'
 const systems=[{id:'mathematical-lab',status:lab},{id:'scientific-cpu',status:cpu},{id:'scientific-gpu',status:gpu}]
 const incidents=systems.filter(s=>s.status!=='RECORDED_SYNTHETIC_PASS').map(s=>({
  incidentId:hash(JSON.stringify([s.id,s.status])),system:s.id,code:s.status,
  severity:['EVIDENCE_MISSING','EVIDENCE_INCOMPLETE'].includes(s.status)?'REVIEW':'BLOCK',
  recommendedAction:'Inspect the original synthetic QA evidence; do not rerun or repair automatically.'}))
 return {kind:'RESEARCH_SUPERVISOR_REPORT_MONITOR',schemaVersion:1,expectedRevision,inspectionStable:stable,
  status:incidents.some(i=>i.severity==='BLOCK')?'BLOCKED':incidents.length?'REVIEW_REQUIRED':'NO_DETECTED_INCIDENTS',
  systems,incidents,receipts:before.map(({name,status,sha256})=>({name,status,sha256})),
  researchOnly:true,publicationGate:'BLOCKED',executionAuthorized:false,validationAuthorized:false,repairAuthorized:false,
  limitations:['Summary-level checks only; use the original producers to validate underlying artifacts.',
   'A recorded synthetic pass is not independent hardware or mathematical qualification.',
   'Missing GPU evidence is an open review requirement, not a failed GPU run.',
   'Revision labels and fingerprints are not signatures; inspection is not atomic.']}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(process.argv.length!==4){console.error('Usage: node report-monitor.mjs <artifact-directory> <revision>');process.exitCode=2}
 else{try{const r=inspectReports(process.argv[2],process.argv[3]);console.log(JSON.stringify(r,null,2));if(r.status==='BLOCKED')process.exitCode=1}catch(e){console.error(e.message);process.exitCode=1}}
}
