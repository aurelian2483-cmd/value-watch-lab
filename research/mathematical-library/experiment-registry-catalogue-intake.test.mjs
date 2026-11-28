import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {assessCandidates,nextCandidateName} from './experiment-registry-catalogue-intake.mjs'
import {loadCatalogue} from './validate-v1.mjs'
const url=new URL('./'+nextCandidateName(),import.meta.url)
const candidates=JSON.parse(readFileSync(url,'utf8'))
test('staged candidates pass structural intake without inflating registered counts',()=>{
 const manifestUrl=new URL('./catalogue.v1.json',import.meta.url)
 const before=readFileSync(manifestUrl)
 const r=assessCandidates(candidates)
 assert.equal(r.registered,loadCatalogue().entries.length)
 assert.equal(r.candidates,candidates.length)
 assert.equal(r.prospectiveCount,r.registered+candidates.length)
 assert.equal(r.registeredNewEntries,0)
 assert.equal(r.executionAuthorized,false)
 assert.equal(r.publicationGate,'BLOCKED')
 assert.deepEqual(readFileSync(manifestUrl),before)
 assert.equal(assessCandidates(candidates).candidateFingerprint,r.candidateFingerprint)
})
test('duplicate and unsupported lifecycle claims fail closed',()=>{
 assert.throws(()=>assessCandidates([candidates[0],candidates[0]]),/Duplicate IDs/)
 assert.throws(()=>assessCandidates([{...candidates[0],id:'poisson'}]),/Duplicate IDs/)
 assert.throws(()=>assessCandidates([{...candidates[0],test_evidence:{pass:true}}]))
 assert.throws(()=>assessCandidates([{...candidates[0],batch:'999'}]))
 assert.throws(()=>assessCandidates([]))
})

test('admitted batch preserves all reviewed specifications',()=>{
 const entries=loadCatalogue().entries
 const dispositions=JSON.parse(readFileSync(new URL('./candidate-dispositions.json',import.meta.url),'utf8'))
 for(const batch of loadCatalogue().manifest.batches.slice(16).map(name=>name.match(/^batch-(\d{3})\.json$/)[1])){
  const archived=JSON.parse(readFileSync(new URL('./candidate-batch-'+batch+'.json',import.meta.url),'utf8'))
  const withheld=dispositions[batch]??[]
  assert.equal(new Set(withheld.map(x=>x.id)).size,withheld.length)
  for(const x of withheld){
   assert.ok(archived.some(e=>e.id===x.id))
   assert.equal(x.disposition,'WITHHELD_DERIVATIVE')
   assert.ok(typeof x.reason==='string'&&x.reason.trim().length>0)
   assert.ok(!entries.some(e=>e.id===x.id))
  }
  assert.deepEqual(entries.filter(e=>e.batch===batch),archived.filter(e=>!withheld.some(x=>x.id===e.id)))
 }
})
