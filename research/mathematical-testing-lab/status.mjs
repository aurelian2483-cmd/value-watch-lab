// Read-only static status adapter for completed fixed synthetic QA artifacts.
// No solver execution, registry mutation, remote access or predictive research.
import {readFileSync,lstatSync,realpathSync} from 'node:fs'
import {resolve,join} from 'node:path'
import {createHash} from 'node:crypto'
import {pathToFileURL} from 'node:url'
import {isDeepStrictEqual} from 'node:util'
import {manifest} from '../mathematical-library/experiment-registry.mjs'
import {suiteSpecifications,fixtureCriteria,evaluateKnownAnswer} from './suite.mjs'
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex')
const sha=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x)
const revision=x=>typeof x==='string'&&/^[a-f0-9]{40}$/.test(x)
const kinds=['SYNTHETIC_MATHEMATICAL_BENCHMARKS','INDEPENDENT_SYNTHETIC_REFERENCE_CHECK','SYNTHETIC_PERSISTENCE_REPORT','SYNTHETIC_CPU_RESOURCE_REPORT']
const files=['report.json','reference-check.json','persistence-repeat.json','cpu-resource-report.json']
const validFlags=r=>r?.schemaVersion===1&&r.researchOnly===true&&r.publicationGate==='BLOCKED'&&r.executionAuthorized===false&&r.validationAuthorized===false
const count=(rows)=>({total:rows.length,passed:rows.filter(r=>r.status==='PASS').length,failed:rows.filter(r=>r.status!=='PASS').length})
const validRows=(rows,ids,key)=>Array.isArray(rows)&&rows.length===ids.length&&ids.every(id=>rows.filter(r=>r?.[key]===id).length===1)
export function consolidate(reports,expectedRevision){
 if(!revision(expectedRevision))throw Error('Full expected revision required')
 const issues=[]
 const specs=suiteSpecifications(expectedRevision),criteria=fixtureCriteria(),ids=specs.map(s=>s.configuration.fixtureId)
 const base={kind:'SYNTHETIC_LAB_CONTROL_CENTRE_STATUS',schemaVersion:1,declaredCodeRevision:expectedRevision,
  expectedFixtures:ids.length,researchOnly:true,modelValidation:'UNVALIDATED',publicationGate:'BLOCKED',executionAuthorized:false,validationAuthorized:false,
  limitations:['Static evidence adapter, not a running service or an authenticated source.',
   'Report fingerprints are not signatures. Secondary reports are reconciled with the benchmark, not independently authenticated.',
   'Five fixed synthetic fixtures only; no real-world validation, GPU testing, or performance qualification.']}
 const unavailable=()=>({...base,status:'EVIDENCE_INCOMPLETE_OR_INCONSISTENT',checks:null,issues})
 if(!Array.isArray(reports)||reports.length!==kinds.length||kinds.some((kind,i)=>!validFlags(reports[i])||reports[i].kind!==kind||reports[i].declaredCodeRevision!==expectedRevision)){
  issues.push('MISSING_OR_INVALID_REPORT_CONTRACT');return unavailable()
 }
 const [benchmark,reference,persistence,cpu]=reports
 const {reportSha256,...payload}=benchmark
 if(!sha(reportSha256)||hash(payload)!==reportSha256||[reference,persistence,cpu].some(r=>r.benchmarkReportSha256!==reportSha256)){
  issues.push('BENCHMARK_FINGERPRINT_MISMATCH');return unavailable()
 }
 if(!validRows(benchmark.results,ids,'id')||!validRows(reference.results,ids,'id')||
    !validRows(persistence.records,ids,'fixtureId')||!validRows(cpu.results,ids,'fixtureId')){
  issues.push('FIXTURE_SET_MISMATCH');return unavailable()
 }
 for(const [i,id] of ids.entries()){
  const spec=specs[i],r=benchmark.results.find(x=>x.id===id),p=persistence.records.find(x=>x.fixtureId===id),c=cpu.results.find(x=>x.fixtureId===id)
  const criterion=criteria[i],verdict=evaluateKnownAnswer({expected:criterion.expected,tolerance:criterion.tolerance,value:r.observed,converged:r.converged})
  if(r.expected!==criterion.expected||r.status!==verdict.status||r.absoluteError!==verdict.absoluteError||
    r.experimentId!==manifest(spec).experimentId||r.fixtureSha256!==spec.datasetHash||r.formulaId!==spec.formulaId||r.tolerance!==spec.configuration.absoluteTolerance||
    p.experimentId!==r.experimentId||p.verdict!==r.status||!sha(p.artifactHash)||c.index!==i||!isDeepStrictEqual(c.observed,r)||c.serialAgreement!==true||c.workerStatus!=='RETURNED'||c.status!==r.status||
    !['PASS','FAIL'].includes(r.status)||!['PASS','FAIL'].includes(reference.results.find(x=>x.id===id).status)||!['PASS','FAIL'].includes(c.status)){
   issues.push('FIXTURE_EVIDENCE_MISMATCH');return unavailable()
  }
 }
 if(![benchmark,reference,cpu].every(r=>isDeepStrictEqual(r.counts,count(r.results)))||
    persistence.expectedFixtures!==ids.length||persistence.complete!==true||!persistence.records.every(r=>r.lifecycle===(r.verdict==='PASS'?'COMPLETED':'FAILED'))||
    cpu.plan?.backend!=='CPU_NODE_WORKER'||!Number.isSafeInteger(cpu.plan?.workers)||cpu.plan.workers<1||cpu.plan.workers>4||!Number.isSafeInteger(cpu.plan.availableCpuSlots)||cpu.plan.workers>cpu.plan.availableCpuSlots||
    !Number.isSafeInteger(cpu.peakActiveWorkers)||cpu.peakActiveWorkers<1||cpu.peakActiveWorkers>cpu.plan.workers||cpu.plan.gpu?.status!=='DISABLED_NOT_VALIDATED'){
  issues.push('REPORT_COUNTS_OR_RESOURCE_CONTRACT_MISMATCH');return unavailable()
 }
 const checks={knownAnswer:benchmark.counts,analyticalReference:reference.counts,persisted:{total:persistence.records.length,passed:persistence.records.filter(r=>r.verdict==='PASS').length,failed:persistence.records.filter(r=>r.verdict==='FAIL').length},
  parallel:cpu.counts,peakActiveWorkers:cpu.peakActiveWorkers,gpuStatus:cpu.plan.gpu.status}
 const passed=[checks.knownAnswer,checks.analyticalReference,checks.persisted,checks.parallel].every(c=>c.total===ids.length&&c.failed===0)
 if(!passed)issues.push('SYNTHETIC_FAILURE_RECORDED')
 return {...base,benchmarkReportSha256:reportSha256,status:passed?'SYNTHETIC_QA_PASSED':'SYNTHETIC_QA_FAILED',checks,issues}
}
export function readStatus(directory,expectedRevision){
 const root=resolve(directory)
 if(realpathSync(root)!==root||!lstatSync(root).isDirectory())throw Error('Unsafe artifact directory')
 const reports=files.map(name=>{
  try{
   const p=join(root,name),s=lstatSync(p)
   if(!s.isFile()||s.isSymbolicLink()||s.size>1024*1024)return null
   return JSON.parse(readFileSync(p,'utf8'))
  }catch{return null}
 })
 return consolidate(reports,expectedRevision)
}
const esc=x=>String(x??'Unavailable').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
export function renderStatus(r){
 const metrics=[['Expected fixtures',r.expectedFixtures],['Known answers passed',r.checks?.knownAnswer.passed],['Analytical references passed',r.checks?.analyticalReference.passed],['Persisted results passed',r.checks?.persisted.passed],['Parallel results passed',r.checks?.parallel.passed],['Peak active CPU workers',r.checks?.peakActiveWorkers]]
 return '<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src &apos;none&apos;; style-src &apos;unsafe-inline&apos;; base-uri &apos;none&apos;; form-action &apos;none&apos;"><title>Mathematical Testing Laboratory</title><style>*{box-sizing:border-box}body{margin:0;background:#101827;color:#edf3fc;font:16px/1.5 system-ui,sans-serif}main{width:100%;max-width:1100px;min-width:0;margin:auto;padding:24px 16px;overflow-wrap:anywhere}h1,h2{overflow-wrap:anywhere;word-break:break-word;max-width:100%}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(200px,100%),1fr));gap:12px}.metric{min-width:0;overflow-wrap:anywhere;padding:16px;background:#19273b;border:1px solid #394b62;border-radius:10px}.metric strong{display:block;font-size:1.5rem}p,span{color:#bfccdc}li,code{overflow-wrap:anywhere}</style></head><body><main><p>RESEARCH CONTROL CENTRE / SYNTHETIC QA</p><h1>Mathematical Testing Laboratory</h1><p>UNVALIDATED · PUBLICATION BLOCKED · NO EXECUTION AUTHORISED</p><p>Declared revision: <code>'+esc(r.declaredCodeRevision)+'</code></p><h2>'+esc(r.status)+'</h2><div class="grid">'+metrics.map(([k,v])=>'<div class="metric"><span>'+esc(k)+'</span><strong>'+esc(v)+'</strong></div>').join('')+'</div><p>GPU: '+esc(r.checks?.gpuStatus)+'</p><h2>Issues</h2><ul>'+r.issues.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul><h2>Limitations</h2><ul>'+r.limitations.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></main></body></html>\n'
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(process.argv.length!==5||!['json','html'].includes(process.argv[4])){console.error('Usage: node status.mjs <artifact-directory> <revision> <json|html>');process.exitCode=2}
 else{try{const r=readStatus(process.argv[2],process.argv[3]);console.log(process.argv[4]==='html'?renderStatus(r):JSON.stringify(r,null,2));if(r.status!=='SYNTHETIC_QA_PASSED')process.exitCode=1}catch(e){console.error(e.message);process.exitCode=1}}
}
