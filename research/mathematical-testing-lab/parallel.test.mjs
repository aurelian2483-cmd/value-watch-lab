import {test} from 'node:test'
import assert from 'node:assert/strict'
import {resourcePlan,runParallel} from './parallel.mjs'
import {runFixture,runSuite} from './suite.mjs'
const rev='7ff8e8c7dff1dedb08835300a191fc54e55d4717'
test('fixed fixture extraction preserves serial result identity',()=>{
 const r=runSuite(rev)
 assert.deepEqual(r.results.map((_,i)=>runFixture(rev,i)),r.results)
 for(const i of [-1,5,0.5])assert.throws(()=>runFixture(rev,i))
})
test('resource limits reject oversized or malformed requests',()=>{
 for(const x of [{workers:0},{workers:5},{timeoutMs:0},{timeoutMs:30001},{heapMiB:128}])assert.throws(()=>resourcePlan(x))
 const p=resourcePlan({workers:4})
 assert.ok(p.workers>=1&&p.workers<=4&&p.workers<=p.availableCpuSlots)
 assert.equal(p.gpu.status,'DISABLED_NOT_VALIDATED')
})
test('bounded parallel outputs agree with serial known answers',async()=>{
 const r=await runParallel(rev,{workers:2})
 assert.deepEqual(r.counts,{total:5,passed:5,failed:0})
 assert.ok(r.peakActiveWorkers<=r.plan.workers)
 assert.ok(r.results.every(x=>x.serialAgreement&&x.workerElapsedMs>=0&&x.heapUsedBytes>0))
 assert.deepEqual(r.results.map(x=>x.observed),runSuite(rev).results)
 assert.equal(r.validationAuthorized,false)
})
test('single-worker mode preserves fixture ordering and limits',async()=>{
 const r=await runParallel(rev,{workers:1})
 assert.equal(r.peakActiveWorkers,1)
 assert.deepEqual(r.results.map(x=>x.index),[0,1,2,3,4])
 assert.equal(r.counts.failed,0)
 await assert.rejects(()=>runParallel('main'))
})
