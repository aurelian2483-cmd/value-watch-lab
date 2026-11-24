import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,rmSync,readdirSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {sharedView} from './experiment-registry-shared-view.mjs'
import {register} from './experiment-registry.mjs'
test('three systems receive matching aggregate counts without raw evidence or authority',t=>{
 const dir=mkdtempSync(join(tmpdir(),'vw-shared-'))
 t.after(()=>rmSync(dir,{recursive:true,force:true}))
 const spec={formulaId:'synthetic-infrastructure-smoke',codeRevision:'a'.repeat(40),datasetHash:'b'.repeat(64),configuration:{steps:5},seed:1,primaryMetric:'synthetic-checksum',partition:'development'}
 const {experimentId}=register(dir,spec)
 const before=readdirSync(dir)
 for(const system of ['value-watch','bottleneck-lab','alpha-hunt']){
   const view=sharedView(dir,system)
   assert.equal(view.system,system)
   assert.equal(view.operational.counts.REGISTERED,1)
   assert.equal(view.executionAuthorized,false)
   assert.equal(view.sourceMutationAuthorized,false)
   assert.equal(view.validationAccessAuthorized,false)
   assert.equal(view.publicationGate,'BLOCKED')
   assert.ok(!JSON.stringify(view).includes(experimentId))
   assert.ok(!JSON.stringify(view).includes(spec.datasetHash))
 }
 assert.throws(()=>sharedView(dir,'unknown'),/Unknown research system/)
 assert.deepEqual(readdirSync(dir),before)
})
