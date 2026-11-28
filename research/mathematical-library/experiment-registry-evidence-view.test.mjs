import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,rmSync,readdirSync,readFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {evidenceView} from './experiment-registry-evidence-view.mjs'
const root=fileURLToPath(new URL('../../',import.meta.url))
function setup(t){
 const dir=mkdtempSync(join(tmpdir(),'vw-evidence-view-'))
 t.after(()=>rmSync(dir,{recursive:true,force:true}))
 return dir
}
test('all research roles receive separate evidence tiers without authority',t=>{
 const dir=setup(t)
 const before=readFileSync(join(root,'historical-reliability-data.json'))
 for(const system of ['value-watch','bottleneck-lab','alpha-hunt']){
   const view=evidenceView(root,dir,system)
   assert.equal(view.system,system)
   assert.equal(view.status,'INVENTORIES_AVAILABLE')
   assert.equal(view.historical.data.evidenceTier,'SINGLE_SOURCE_UNVERIFIED')
   assert.equal(view.historical.data.validationEligible,false)
   assert.equal(view.prospective.data.validationAuthorized,false)
   assert.equal(view.executionAuthorized,false)
   assert.equal(view.sourceMutationAuthorized,false)
   assert.equal(view.publicationGate,'BLOCKED')
   assert.equal(view.operations.data.operational.available,true)
 }
 assert.deepEqual(readFileSync(join(root,'historical-reliability-data.json')),before)
 assert.deepEqual(readdirSync(dir),[])
 assert.throws(()=>evidenceView(root,dir,'unknown'),/Unknown research system/)
})
test('missing sources stay unavailable, not zero or validated',t=>{
 const dir=setup(t)
 const view=evidenceView(dir,join(dir,'missing'),'alpha-hunt')
 assert.equal(view.status,'INCOMPLETE')
 assert.equal(view.historical.available,false)
 assert.equal(view.historical.data,null)
 assert.equal(view.historical.error,'SOURCE_MISSING')
 assert.equal(view.prospective.data,null)
 assert.equal(view.operations.data.operational.available,false)
 assert.equal(view.validationAuthorized,false)
})
