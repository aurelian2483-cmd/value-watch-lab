import {test} from 'node:test'
import assert from 'node:assert/strict'
import {load,validate,summarize,search} from './library.mjs'
test('checked seed register is internally consistent',()=>{
 const r=load(),s=summarize(r)
 assert.equal(s.counts.sources,3);assert.equal(s.counts.claims,3)
 assert.equal(s.counts.locatorInspected,2);assert.equal(s.counts.independentlyReviewed,0)
 assert.equal(s.counts.empiricallyQualified,0);assert.equal(s.counts.rightsVerified,0)
 assert.deepEqual(summarize(r),s)
 assert.equal(s.publicationGate,'BLOCKED')
})
test('duplicate identity and dangling claims fail closed',()=>{
 const r=load()
 assert.throws(()=>validate({...r,sources:[...r.sources,{...r.sources[0],id:'duplicate-url'}]}))
 assert.throws(()=>validate({...r,claims:[{...r.claims[0],sourceId:'absent'}]}))
 assert.throws(()=>validate({...r,claims:[...r.claims,r.claims[0]]}))
})
test('false permission and evidence claims are rejected',()=>{
 const r=load()
 for(const patch of [{rightsStatus:'VERIFIED'},{contentSha256:'a'.repeat(64)},{url:'file:///tmp/source'},{accessedOn:'2026-02-30'}])
  assert.throws(()=>validate({...r,sources:[{...r.sources[0],...patch},...r.sources.slice(1)]}))
 assert.throws(()=>validate({...r,claims:[{...r.claims[0],empiricalEvidence:true}]}))
 assert.throws(()=>validate({...r,executionAuthorized:true}))
})
test('search is read-only and scoped',()=>{
 const r=load(),before=JSON.stringify(r)
 assert.deepEqual(search(r,'floating-point').map(s=>s.id),['python-math-312'])
 assert.deepEqual(search(r,'not present anywhere'),[])
 assert.equal(JSON.stringify(r),before)
 assert.throws(()=>search(r,''))
})
