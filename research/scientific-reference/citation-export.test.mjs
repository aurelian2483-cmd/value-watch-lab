import {test} from 'node:test'
import assert from 'node:assert/strict'
import {load} from './library.mjs'
import {loadLedger,digest} from './review-history.mjs'
import {exportReferences,renderReferenceNotes} from './citation-export.mjs'
const date='2026-11-24'
test('export preserves all registered source and claim metadata without inventing authors or dates',()=>{
 const register=load(),ledger=loadLedger(),before=JSON.stringify(register)
 const r=exportReferences(register,ledger,date)
 assert.equal(r.counts.sources,3);assert.equal(r.counts.claims,3)
 for(const s of r.entries){
  const original=register.sources.find(x=>x.id===s.sourceId)
  assert.equal(s.url,original.url);assert.equal(s.doi,original.doi);assert.equal(s.title,original.title)
  assert.equal(s.authors,null);assert.equal(s.publicationDate,null)
  for(const c of s.claims){
   assert.equal(c.locator,register.claims.find(x=>x.id===c.claimId).locator)
   assert.equal(c.independentReview,false);assert.equal(c.contentVerified,false)
  }
 }
 assert.equal(JSON.stringify(register),before)
 assert.deepEqual(exportReferences(register,ledger,date),r)
 const {exportSha256,...payload}=r;assert.equal(digest(payload),exportSha256)
})
test('changed metadata and earlier dates cannot inherit review status',()=>{
 const r=load(),l=loadLedger()
 r.sources[0].version='Changed release'
 assert.equal(exportReferences(r,l,date).entries[0].claims[0].reviewState,'METADATA_CHANGED_REVIEW_REQUIRED')
 assert.ok(exportReferences(r,l,'2026-11-23').entries.flatMap(x=>x.claims).every(c=>c.reviewState==='NO_REVIEW_RECORDED'))
})
test('reference notes escape markup, retain warnings and reject tampering',()=>{
 const r=load();r.claims[0].statement='<script>alert(1)</script> [example](example)'
 const report=exportReferences(r,loadLedger(),date)
 const md=renderReferenceNotes(report)
 assert.match(md,/PUBLICATION BLOCKED/)
 assert.match(md,/&lt;script&gt;/);assert.doesNotMatch(md,/<script>/)
 assert.match(md,/METADATA/);assert.match(md,/Not recorded/)
 assert.throws(()=>renderReferenceNotes({...report,publicationGate:'OPEN'}))
})
