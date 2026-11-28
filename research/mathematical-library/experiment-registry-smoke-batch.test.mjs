import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,rmSync,readdirSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {runSmokeBatch} from './experiment-registry-smoke-batch.mjs'
import {register} from './experiment-registry.mjs'
import {append} from './experiment-registry-lifecycle.mjs'

const spec={formulaId:'synthetic-infrastructure-smoke',codeRevision:'a'.repeat(40),datasetHash:'b'.repeat(64),configuration:{steps:5},seed:1,primaryMetric:'synthetic-checksum',partition:'development'}
function setup(t){const d=mkdtempSync(join(tmpdir(),'vw-batch-'));t.after(()=>rmSync(d,{recursive:true,force:true}));return d}
test('batch budget is respected across experiments and repeated invocations',t=>{
 const d=setup(t),specs=[spec,{...spec,seed:2},{...spec,seed:3}]
 const first=runSmokeBatch(d,specs,{stepBudget:7})
 assert.equal(first.executedSteps,7)
 assert.deepEqual(first.results.map(r=>r.status),['COMPLETED','INTERRUPTED','REGISTERED'])
 const second=runSmokeBatch(d,specs,{stepBudget:8})
 assert.equal(second.executedSteps,8)
 assert.ok(second.results.every(r=>r.status==='COMPLETED'))
 assert.equal(runSmokeBatch(d,specs).executedSteps,0)
 assert.equal(second.publicationGate,'BLOCKED')
})
test('invalid and duplicate batches are rejected before any registration',t=>{
 const d=setup(t)
 assert.throws(()=>runSmokeBatch(d,[spec,spec]),/Duplicate/)
 assert.throws(()=>runSmokeBatch(d,[spec,{...spec,formulaId:'poisson'}]))
 assert.throws(()=>runSmokeBatch(d,[spec,{...spec,seed:2,partition:'holdout'}]))
 assert.throws(()=>runSmokeBatch(d,[spec],{stepBudget:251}))
 assert.equal(readdirSync(d).length,0)
})
test('existing running work is not taken over',t=>{
 const d=setup(t)
 const {experimentId:id}=register(d,spec)
 append(d,id,'RUNNING')
 const r=runSmokeBatch(d,[spec,{...spec,seed:2}])
 assert.equal(r.results[0].status,'RUNNING')
 assert.equal(r.results[0].executed,0)
 assert.equal(r.results[1].status,'COMPLETED')
})
