import {test} from 'node:test'
import assert from 'node:assert/strict'
import {load} from './library.mjs'
import {loadLedger,reviewBinding} from './review-history.mjs'
import {compareClaims,compareValues,loadAnnotations,validateAnnotations} from './compare-claims.mjs'
const date='2026-11-24'
const boolean=value=>({type:'boolean',value})
const interval=(lower,upper,unit='metre')=>({type:'closed-interval',lower,upper,unit})
const synthetic=(value,conditions='same synthetic conditions')=>({concept:'synthetic-example',conditions,value})
test('unannotated actual references remain unassessed, not in agreement',()=>{
 const r=compareClaims(load(),loadLedger(),loadAnnotations(),date)
 assert.equal(r.counts.unannotatedClaims,3)
 assert.equal(r.counts.comparablePairs,0)
 assert.equal(r.counts.confirmedContradictions,0)
 assert.equal(r.validationAuthorized,false)
 assert.deepEqual(r.pairs,[])
})
test('synthetic boolean and interval comparisons',()=>{
 assert.equal(compareValues(synthetic(boolean(true)),synthetic(boolean(false))),'POTENTIAL_CONFLICT')
 assert.equal(compareValues(synthetic(boolean(true)),synthetic(boolean(true))),'AGREEMENT_RECORDED')
 assert.equal(compareValues(synthetic(interval(1,2)),synthetic(interval(3,4))),'POTENTIAL_CONFLICT')
 assert.equal(compareValues(synthetic(interval(1,2)),synthetic(interval(2,3))),'INTERVALS_OVERLAP')
})
test('conditions, units and value types prevent false conflicts',()=>{
 assert.equal(compareValues(synthetic(boolean(true)),synthetic(boolean(false),'different')),'CONDITIONS_DIFFER')
 assert.equal(compareValues(synthetic(interval(1,2)),synthetic(interval(3,4,'second'))),'UNITS_DIFFER')
 assert.equal(compareValues(synthetic(boolean(true)),synthetic(interval(1,2))),'VALUE_TYPES_DIFFER')
})
function annotate(r,i,value){
 const c=r.claims[i],s=r.sources.find(s=>s.id===c.sourceId)
 return {claimId:c.id,sourceId:s.id,...reviewBinding(s,c),concept:'synthetic-example',conditions:'synthetic test annotation only',value,interpretationNote:'Invented solely to test software; not a claim about this source.',independentlyReviewed:false}
}
test('in-memory synthetic annotations require current locator review and matching metadata',()=>{
 const r=load(),l=loadLedger(),a=loadAnnotations()
 a.annotations=[annotate(r,0,boolean(true)),annotate(r,1,boolean(false)),annotate(r,2,boolean(false))]
 const report=compareClaims(r,l,a,date)
 assert.equal(report.counts.eligibleAnnotations,2)
 assert.equal(report.counts.potentialConflicts,1)
 assert.equal(report.pairs[0].truthDetermined,false)
 assert.equal(report.rows[2].state,'LOCATOR_REVIEW_REQUIRED')
 r.claims[0].scope='Changed test scope'
 const changed=compareClaims(r,l,a,date)
 assert.equal(changed.rows[0].state,'STALE_ANNOTATION')
 assert.equal(changed.counts.comparablePairs,0)
})
test('invalid annotation values, duplicate identities and promotion rejected',()=>{
 const r=load(),a=loadAnnotations(),x=annotate(r,0,interval(1,2))
 for(const value of [interval(3,2),interval(NaN,2),boolean('true')])assert.throws(()=>validateAnnotations({...a,annotations:[{...x,value}]}))
 assert.throws(()=>validateAnnotations({...a,annotations:[x,x]}))
 assert.throws(()=>validateAnnotations({...a,annotations:[{...x,independentlyReviewed:true}]}))
})
