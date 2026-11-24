import {test} from 'node:test'
import assert from 'node:assert/strict'
import {load} from './library.mjs'
import {loadLedger,validateLedger,assessReviews,digest} from './review-history.mjs'
const asOf='2026-11-24'
test('publisher observations bind to current metadata',()=>{
 const r=assessReviews(load(),loadLedger(),asOf)
 assert.equal(r.counts.CURRENT_RECORDED_LOCATOR_REVIEW,2)
 assert.equal(r.counts.CURRENT_RECORDED_METADATA_REVIEW,1)
 assert.ok(r.rows.every(x=>!x.independentReview&&!x.contentVerified&&!x.rightsVerified))
 assert.equal(r.retainedEvents,3)
})
test('changed source or claim metadata requires fresh review',()=>{
 const r=load(),l=loadLedger();r.sources[0].version='Different release';r.claims[1].locator='Different locator'
 assert.equal(assessReviews(r,l,asOf).counts.METADATA_CHANGED_REVIEW_REQUIRED,2)
})
test('ledger tampering and broken chain rejected',()=>{
 for(const mutate of [l=>l.events[0].note='changed',l=>l.events[1].previous=null,l=>l.events[0].independentReview=true,l=>l.events.reverse()]){
  const l=loadLedger();mutate(l);assert.throws(()=>validateLedger(l))
 }
})
test('future review excluded and removed claim retains orphan',()=>{
 const r=load(),l=loadLedger()
 assert.equal(assessReviews(r,l,'2026-11-23').counts.NO_REVIEW_RECORDED,3)
 r.claims.pop();assert.equal(assessReviews(r,l,asOf).orphanEvents,1)
})
test('canonical object ordering',()=>{
 assert.equal(digest({a:1,b:2}),digest({b:2,a:1}));assert.notEqual(digest([1,2]),digest([2,1]))
})
