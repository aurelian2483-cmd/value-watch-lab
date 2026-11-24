import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,realpathSync,rmSync,writeFileSync,mkdirSync,readdirSync,readFileSync,symlinkSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {register} from '../mathematical-library/experiment-registry.mjs'
import {append} from '../mathematical-library/experiment-registry-lifecycle.mjs'
import {persistSuite} from '../mathematical-testing-lab/persistence.mjs'
import {inspectRegistry} from './supervisor.mjs'
const rev='7c95c0bce1c428c0d9d24fd230f009304c289837'
function fixture(t){const d=realpathSync(mkdtempSync(join(tmpdir(),'research-supervisor-')));t.after(()=>rmSync(d,{recursive:true,force:true}));return d}
function create(d){return register(d,{formulaId:'bisection',codeRevision:rev,datasetHash:'a'.repeat(64),configuration:{scope:'synthetic'},seed:0,primaryMetric:'absolute-error',partition:'development'}).experimentId}
test('existing synthetic registry is read-only and terminal artifacts verified',t=>{
 const d=fixture(t),p=persistSuite(d,rev),before=readFileSync(join(d,p.records[0].experimentId+'.json'))
 const r=inspectRegistry(d)
 assert.equal(r.status,'NO_DETECTED_INCIDENTS');assert.equal(r.counts.COMPLETED,5)
 assert.equal(r.inspectionStable,true);assert.equal(r.repairAuthorized,false)
 assert.deepEqual(readFileSync(join(d,p.records[0].experimentId+'.json')),before)
 rmSync(join(d,'artifacts',p.records[0].artifactHash+'.json'))
 const missing=inspectRegistry(d)
 assert.equal(missing.status,'BLOCKED')
 assert.ok(missing.incidents.some(i=>i.code==='TERMINAL_EVIDENCE_MISSING_OR_INVALID'))
})
test('running and age warnings do not assert stalled ownership',t=>{
 const d=fixture(t),id=create(d);append(d,id,'RUNNING')
 const asOf=new Date(Date.now()+7200000).toISOString(),a=inspectRegistry(d,{asOf}),b=inspectRegistry(d,{asOf})
 assert.equal(a.status,'REVIEW_REQUIRED')
 assert.ok(a.incidents.some(i=>i.code==='RUNNING_AGE_EXCEEDS_THRESHOLD'))
 assert.deepEqual(a,b)
})
test('failed and interrupted jobs remain visible',t=>{
 const d=fixture(t),id=create(d);append(d,id,'RUNNING');append(d,id,'FAILED',{reason:'synthetic failure'})
 const r=inspectRegistry(d)
 assert.ok(r.incidents.some(i=>i.code==='FAILED_EXPERIMENT'))
 assert.equal(r.counts.FAILED,1)
})
test('orphan history and unknown store entries block',t=>{
 const d=fixture(t);mkdirSync(join(d,'a'.repeat(64)))
 assert.ok(inspectRegistry(d).incidents.some(i=>i.code==='ORPHAN_LIFECYCLE'))
 writeFileSync(join(d,'unexpected'),'not inspected')
 assert.equal(inspectRegistry(d).counts,null)
})
test('lock suppresses inspection and missing store remains unknown',t=>{
 const d=fixture(t);writeFileSync(join(d,'.synthetic-math-lock'),'active')
 const r=inspectRegistry(d)
 assert.equal(r.counts,null);assert.equal(r.status,'REVIEW_REQUIRED')
 assert.equal(inspectRegistry(join(d,'missing')).status,'BLOCKED')
 assert.equal(readFileSync(join(d,'.synthetic-math-lock'),'utf8'),'active')
})
test('symlink path is rejected before inherited readers',t=>{
 const d=fixture(t),e=fixture(t);writeFileSync(join(e,'outside'),'{}')
 symlinkSync(join(e,'outside'),join(d,'a'.repeat(64)+'.json'))
 assert.equal(inspectRegistry(d).status,'BLOCKED')
 assert.equal(inspectRegistry(d).counts,null)
})
