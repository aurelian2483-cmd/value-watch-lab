import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, readFileSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { alphaReadiness } from './experiment-registry-alpha-readiness.mjs'
const root=fileURLToPath(new URL('../../',import.meta.url))
function setup(t){
 const dir=mkdtempSync(join(tmpdir(),'vw-alpha-'))
 t.after(()=>rmSync(dir,{recursive:true,force:true}))
 return dir
}
test('all nine stages preserve uncertainty and research gates',t=>{
 const dir=setup(t)
 const original=readFileSync(join(root,'prediction-ledger.json'))
 const r=alphaReadiness(root,dir)
 assert.equal(r.inventoryStatus,'INVENTORIES_AVAILABLE')
 assert.equal(r.status,'RESEARCH_NOT_READY')
 assert.equal(r.stages.length,9)
 assert.equal(new Set(r.stages.map(s=>s.id)).size,9)
 assert.ok(r.stages.every(s=>s.executionAuthorized===false))
 assert.equal(r.falseEdgeChecks.length,10)
 assert.ok(r.falseEdgeChecks.every(c=>c.status==='UNCERTAIN'&&c.evidence===null))
 assert.deepEqual(r.estimates,{outcomeProbability:null,genuineEdgeProbability:null,persistenceProbability:null})
 assert.equal(r.publicationGate,'BLOCKED')
 assert.equal(r.estimands.length,3)
 assert.equal(r.decision.status,'BLOCKED')
 assert.equal(r.decision.capitalAllocationAuthorized,false)
 assert.ok(r.decision.blockers.includes('INDEPENDENT_PROTOCOL_AND_POSTERIOR_VALIDATION_NOT_IMPLEMENTED'))
 assert.equal(r.sourceMutationAuthorized,false)
 assert.equal(r.validationAuthorized,false)
 assert.equal(r.evidence.historical.evidenceTier,'SINGLE_SOURCE_UNVERIFIED')
 assert.deepEqual(readFileSync(join(root,'prediction-ledger.json')),original)
 assert.deepEqual(readdirSync(dir),[])
})
test('missing evidence never becomes a zero-valued or validated estimate',t=>{
 const dir=setup(t),r=alphaReadiness(dir,join(dir,'missing'))
 assert.equal(r.inventoryStatus,'INCOMPLETE')
 assert.equal(r.evidence.historical,null)
 assert.equal(r.evidence.prospective,null)
 assert.equal(r.stages.find(s=>s.id==='prediction-model').status,'EVIDENCE_UNAVAILABLE')
 assert.equal(r.estimates.genuineEdgeProbability,null)
 assert.equal(r.executionAuthorized,false)
})
