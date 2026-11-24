// Read-only recovery recommendations for general synthetic QA infrastructure.
import {createHash} from 'node:crypto'
import {pathToFileURL} from 'node:url'
import {inspectRegistry} from './supervisor.mjs'
import {inspectReports} from './report-monitor.mjs'
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex')
const sha=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x)
const revision=x=>typeof x==='string'&&/^[a-f0-9]{40}$/.test(x)
const utc=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x
const flags={researchOnly:true,publicationGate:'BLOCKED',executionAuthorized:false,validationAuthorized:false,repairAuthorized:false}
const rules=Object.freeze({
 STORE_UNAVAILABLE:['STORE_ACCESS_REVIEW','Confirm the dedicated registry location and read permissions.','A readable, stable registry inspection.'],
 UNSAFE_OR_OVERSIZED_STORE:['STORE_ACCESS_REVIEW','Inspect the dedicated store paths and size bounds without following unsafe entries.','A bounded, nonsymlink store passing preflight.'],
 STORE_CHANGED_DURING_INSPECTION:['STABILITY_REVIEW','Confirm writers have finished and obtain a fresh inspection.','Consistent before-and-after fingerprints.'],
 STORE_LOCK_PRESENT:['OWNERSHIP_REVIEW','Confirm the lock owner and whether the current writer is active.','Explicit owner confirmation and a fresh inspection after release.'],
 RUNNING_OWNER_UNVERIFIED:['OWNERSHIP_REVIEW','Confirm the experiment owner and current process state.','Owner confirmation; do not infer a stopped process from history alone.'],
 RUNNING_AGE_EXCEEDS_THRESHOLD:['OWNERSHIP_REVIEW','Review elapsed time and actual process activity.','Owner confirmation and evidence of a genuine interruption if applicable.'],
 NO_CHECKPOINT:['CHECKPOINT_REVIEW','Inspect existing checkpoint records and available backups.','A verified checkpoint or documented absence; do not fabricate one.'],
 CHECKPOINT_UNAVAILABLE_OR_INVALID:['CHECKPOINT_REVIEW','Preserve the current files and inspect checkpoint identity and bytes.','Matching checkpoint fingerprint and experiment identity in a separate recovery copy.'],
 TERMINAL_EVIDENCE_MISSING_OR_INVALID:['EVIDENCE_REVIEW','Preserve original terminal history and inspect the referenced result and backup.','Verified matching evidence in a separate recovery copy.'],
 UNREADABLE_OR_INVALID_HISTORY:['EVIDENCE_REVIEW','Preserve the original lifecycle history and inspect a separate backup.','A valid lifecycle chain and matching evidence in a separate recovery copy.'],
 ORPHAN_LIFECYCLE:['EVIDENCE_REVIEW','Inspect the orphaned lifecycle directory without attaching it to another experiment.','Verified corresponding manifest or documented unresolved orphan.'],
 INVALID_EVENT_TIME:['EVIDENCE_REVIEW','Review recorded timestamps and clock provenance without rewriting history.','A documented explanation and consistent fresh observation.'],
 FAILED_EXPERIMENT:['FAILURE_REVIEW','Review the retained failure and diagnostic evidence.','A documented cause and separately approved synthetic regression plan.'],
 INTERRUPTED_EXPERIMENT:['CHECKPOINT_REVIEW','Confirm ownership and inspect existing recovery evidence.','Verified checkpoint and explicit approval before a separate recovery attempt.'],
 EVIDENCE_MISSING:['EVIDENCE_ACQUISITION','Locate or obtain the required original report.','A supplied report passing its existing producer contract.'],
 EVIDENCE_INCOMPLETE:['EVIDENCE_REVIEW','Inspect the original evidence bundle and missing checks.','Complete reconciled evidence from its existing producer.'],
 INVALID_CONTRACT:['EVIDENCE_REVIEW','Compare original report revision, identity, counts and safeguards.','Fresh producer-validated report; preserve the contradictory original.'],
 INSPECTION_UNSTABLE:['STABILITY_REVIEW','Inspect the report bundle after writers finish.','Consistent before-and-after report fingerprints.'],
 RECORDED_FAILURE:['FAILURE_REVIEW','Inspect the failed synthetic check and its original diagnostic evidence.','Documented cause and separately approved corrective test.']
})
function validatedIncidents(report,source){
 const kind=source==='registry'?'RESEARCH_SUPERVISOR_OPERATIONAL_REPORT':'RESEARCH_SUPERVISOR_REPORT_MONITOR'
 if(!report||report.kind!==kind||report.schemaVersion!==1||!Object.entries(flags).every(([k,v])=>report[k]===v)||
   !Array.isArray(report.incidents)||report.incidents.length>5000)throw Error('Invalid recovery input')
 const seen=new Set()
 const list=Array.from(report.incidents,i=>{
  const subject=source==='registry'?(i?.experimentId??null):i?.system
  if(!i||!sha(i.incidentId)||!['BLOCK','REVIEW'].includes(i.severity)||typeof i.code!=='string'||!/^[A-Z0-9_]{1,100}$/.test(i.code)||
   (source==='registry'?(subject!==null&&!sha(subject)):!['mathematical-lab','scientific-cpu','scientific-gpu'].includes(subject)))throw Error('Invalid incident contract')
  const expected=digest(source==='registry'?[i.code,subject]:[subject,i.code])
  if(expected!==i.incidentId||seen.has(expected))throw Error('Invalid incident identity')
  seen.add(expected)
  return {incidentId:expected,source,subject,code:i.code,severity:i.severity}
 })
 const expectedStatus=list.some(i=>i.severity==='BLOCK')?'BLOCKED':list.length?'REVIEW_REQUIRED':'NO_DETECTED_INCIDENTS'
 if(report.status!==expectedStatus)throw Error('Inconsistent incident severity summary')
 return list
}
export function planRecovery(registry,reports,expectedRevision){
 if(!revision(expectedRevision)||reports?.expectedRevision!==expectedRevision||!utc(registry?.asOf))throw Error('Invalid revision or observation time')
 const incidents=[...validatedIncidents(registry,'registry'),...validatedIncidents(reports,'reports')]
 const evidence={registryReportSha256:digest(registry),monitorReportSha256:digest(reports),declaredRevision:expectedRevision}
 const steps=incidents.map(i=>{
  const rule=Object.hasOwn(rules,i.code)?rules[i.code]:['MANUAL_REVIEW','Preserve the original evidence and obtain specialist review.','Documented diagnosis and a fresh verified observation.']
  const gpuMissing=i.subject==='scientific-gpu'&&i.code==='EVIDENCE_MISSING'
  const priority=i.severity==='BLOCK'?'BLOCKING':'REVIEW'
  return {...i,priority,category:rule[0],recommendation:gpuMissing?'GPU evidence has not been supplied. Do not treat this as device failure.':rule[1],
    acceptanceEvidence:gpuMissing?'An explicitly requested local synthetic GPU receipt, verified by its original producer.':rule[2],
    approvalRequired:true,automaticAction:null,planId:digest([evidence,i.incidentId])}
 }).sort((a,b)=>(a.priority==='BLOCKING'?0:1)-(b.priority==='BLOCKING'?0:1)||a.incidentId.localeCompare(b.incidentId))
 const payload={kind:'RESEARCH_RECOVERY_PLAN',schemaVersion:1,declaredRevision:expectedRevision,observedAt:registry.asOf,
  status:steps.some(s=>s.priority==='BLOCKING')?'BLOCKED_PENDING_REVIEW':steps.length?'REVIEW_REQUIRED':'NO_INCIDENTS_OBSERVED',
  evidence,steps,counts:{blocking:steps.filter(s=>s.priority==='BLOCKING').length,review:steps.filter(s=>s.priority==='REVIEW').length},
  ...flags,limitations:['Recommendations only; not executable commands or recovery approval.',
   'Reinspect original evidence before acting; fingerprints are not signatures.',
   'No observed incidents does not establish scientific qualification or production readiness.']}
 return {...payload,planSha256:digest(payload)}
}
export function inspectAndPlan(registryDirectory,artifactDirectory,expectedRevision,options={}){
 return planRecovery(inspectRegistry(registryDirectory,options),inspectReports(artifactDirectory,expectedRevision),expectedRevision)
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(process.argv.length!==5){console.error('Usage: node recovery-plan.mjs <registry-directory> <artifact-directory> <revision>');process.exitCode=2}
 else{try{const r=inspectAndPlan(...process.argv.slice(2));console.log(JSON.stringify(r,null,2));if(r.status==='BLOCKED_PENDING_REVIEW')process.exitCode=1}catch(e){console.error(e.message);process.exitCode=1}}
}
