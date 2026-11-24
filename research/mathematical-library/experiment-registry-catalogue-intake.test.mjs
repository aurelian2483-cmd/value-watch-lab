import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {assessCandidates} from './experiment-registry-catalogue-intake.mjs'
import {loadCatalogue} from './validate-v1.mjs'
const url=new URL('./candidate-batch-019.json',import.meta.url)
const candidates=JSON.parse(readFileSync(url,'utf8'))
test('staged candidates pass structural intake without inflating registered counts',()=>{
 const manifestUrl=new URL('./catalogue.v1.json',import.meta.url)
 const before=readFileSync(manifestUrl)
 const r=assessCandidates(candidates)
 assert.equal(r.registered,loadCatalogue().entries.length)
 assert.equal(r.candidates,3)
 assert.equal(r.prospectiveCount,r.registered+3)
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
 for(const batch of ['016','017','018']){
  const archived=JSON.parse(readFileSync(new URL('./candidate-batch-'+batch+'.json',import.meta.url),'utf8'))
  assert.deepEqual(entries.filter(e=>e.batch===batch),archived)
 }
})
