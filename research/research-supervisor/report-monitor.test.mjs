import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,realpathSync,rmSync,writeFileSync,readFileSync,symlinkSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {inspectReports} from './report-monitor.mjs'
const rev='1f338ab9588976a1cbced282cb160fc16bdd13b8',flags={schemaVersion:1,researchOnly:true,publicationGate:'BLOCKED',executionAuthorized:false,validationAuthorized:false}
const count={total:5,passed:5,failed:0}
const lab={...flags,kind:'SYNTHETIC_LAB_CONTROL_CENTRE_STATUS',declaredCodeRevision:rev,modelValidation:'UNVALIDATED',expectedFixtures:5,
 benchmarkReportSha256:'a'.repeat(64),status:'SYNTHETIC_QA_PASSED',checks:{knownAnswer:count,analyticalReference:count,persisted:count,parallel:count,peakActiveWorkers:2,gpuStatus:'DISABLED_NOT_VALIDATED'}}
const cpu={mode:'cpu',status:'RECORDED_LOCAL_PASS',receiptSha256:'b'.repeat(64),passedWorkloads:2,benchmarkRows:4,hardwareIndependentlyVerified:false}
const gpu={mode:'gpu',status:'NOT_SUPPLIED',receiptSha256:null,passedWorkloads:null,benchmarkRows:null,hardwareIndependentlyVerified:false}
const compute={...flags,kind:'SCIENTIFIC_COMPUTE_CONTROL_CENTRE_STATUS',declaredRevision:rev,hardwareIndependentlyVerified:false,status:'CPU_LOCAL_EVIDENCE_AVAILABLE',cpu,gpu}
function setup(t){const d=realpathSync(mkdtempSync(join(tmpdir(),'report-monitor-')));t.after(()=>rmSync(d,{recursive:true,force:true}));return d}
function put(d,name,r){writeFileSync(join(d,name),JSON.stringify(r))}
test('valid synthetic summaries retain missing GPU review and do not mutate evidence',t=>{
 const d=setup(t);put(d,'lab-status.json',lab);put(d,'compute-status.json',compute)
 const bytes=readFileSync(join(d,'compute-status.json')),r=inspectReports(d,rev)
 assert.equal(r.status,'REVIEW_REQUIRED');assert.deepEqual(r.systems.map(s=>s.status),['RECORDED_SYNTHETIC_PASS','RECORDED_SYNTHETIC_PASS','EVIDENCE_MISSING'])
 assert.equal(r.repairAuthorized,false);assert.deepEqual(readFileSync(join(d,'compute-status.json')),bytes)
})
test('contradictory counts, revision and promotion flags block',t=>{
 const d=setup(t);put(d,'compute-status.json',compute)
 for(const r of [{...lab,declaredCodeRevision:'b'.repeat(40)},{...lab,validationAuthorized:true},{...lab,checks:{...lab.checks,parallel:{total:5,passed:4,failed:1}}}]){
  put(d,'lab-status.json',r);assert.equal(inspectReports(d,rev).status,'BLOCKED')
 }
})
test('missing and malformed reports remain distinct',t=>{
 const d=setup(t);assert.equal(inspectReports(d,rev).status,'REVIEW_REQUIRED')
 writeFileSync(join(d,'lab-status.json'),'invalid')
 assert.equal(inspectReports(d,rev).status,'BLOCKED')
})
test('CPU pass cannot impersonate GPU evidence',t=>{
 const d=setup(t);put(d,'lab-status.json',lab);put(d,'compute-status.json',{...compute,gpu:{...cpu,mode:'gpu'}})
 assert.equal(inspectReports(d,rev).systems[2].status,'INVALID_CONTRACT')
})
test('symlink report refused',t=>{
 const d=setup(t),e=setup(t);put(e,'lab-status.json',lab)
 symlinkSync(join(e,'lab-status.json'),join(d,'lab-status.json'))
 assert.equal(inspectReports(d,rev).status,'BLOCKED')
})
