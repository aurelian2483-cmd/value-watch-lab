import {test} from 'node:test'
import assert from 'node:assert/strict'
import {load,summarize} from './library.mjs'
import {loadLedger,assessReviews,digest} from './review-history.mjs'
import {compareValues,loadAnnotations} from './compare-claims.mjs'
import {dashboard} from './dashboard.mjs'
test('shared register fingerprint is canonical and legacy labels are explicitly historical',()=>{
 const r=load(),l=loadLedger(),s=summarize(r),v=assessReviews(r,l,'2026-11-24')
 assert.equal(s.registerSha256,v.registerSha256)
 assert.equal(s.reviewLabelMeaning,'REGISTERED_LABELS_ONLY_USE_REVIEW_LEDGER_FOR_CURRENT_STATE')
 assert.equal(summarize(Object.fromEntries(Object.entries(r).reverse())).registerSha256,s.registerSha256)
})
test('a metadata-matching observation with incompatible review type or earlier access date is stale',()=>{
 const r=load(),l=loadLedger(),e=l.events[0]
 for(const change of [{reviewType:'METADATA_INSPECTED'},{observedOn:'2026-11-23'}]){
  const altered={...e,...change};delete altered.eventSha256
  const ledger={...l,events:[{...altered,eventSha256:digest(altered)}]}
  assert.equal(assessReviews(r,ledger,'2026-11-24').rows[0].state,'METADATA_CHANGED_REVIEW_REQUIRED')
 }
})
test('invalid direct comparison inputs cannot become agreement',()=>{
 const x={concept:'synthetic',conditions:'fixed',value:{type:'boolean',value:true}}
 assert.throws(()=>compareValues(x,{...x,value:{type:'boolean',value:'true'}}))
 assert.throws(()=>compareValues(x,{...x,value:{type:'closed-interval',lower:3,upper:1,unit:'metre'}}))
})
test('dashboard reports historical coverage and metadata-bound fingerprints',()=>{
 const r=load(),l=loadLedger(),d=dashboard(r,l,loadAnnotations(),'2026-11-24')
 assert.equal(d.evidence.summarySha256,summarize(r).summarySha256)
 assert.deepEqual(d.reviewHistory,{retainedEvents:3,orphanEvents:0,futureEvents:0})
})
