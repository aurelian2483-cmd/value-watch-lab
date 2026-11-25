import {test} from 'node:test'
import assert from 'node:assert/strict'
import {reviewSyntheticIdentities} from './identity-review.mjs'
const l={namespace:'fixture-a',nativeId:'one',domain:'synthetic',collection:'example',contract:'contract-a',scheduledAt:'2026-01-02T12:00:00.000Z',observedAt:'2026-01-01T12:00:00.000Z',timePrecision:'EXACT_MILLISECOND',participantIds:['a','b'],receiptSha256:'a'.repeat(64)}
const r={...l,namespace:'fixture-b',nativeId:'two',participantIds:['x','y'],receiptSha256:'b'.repeat(64)}
const c={leftNamespace:l.namespace,leftId:l.nativeId,rightNamespace:r.namespace,rightId:r.nativeId,mappingReceiptSha256:'c'.repeat(64),participantMappings:[{left:'a',right:'x'},{left:'b',right:'y'}]}
const run=(left=[l],right=[r],crosswalk=[c])=>reviewSyntheticIdentities({mode:'SYNTHETIC_IDENTITY_TEST',left,right,crosswalk})
test('exact explicit mapping reconciles synthetic identity but cannot certify it',()=>{
 const out=run()
 assert.equal(out.counts.structurallyConsistent,1)
 assert.equal(out.leftRowsNotLinked,0)
 assert.equal(out.rightRowsNotLinked,0)
 assert.equal(out.validationAuthorized,false)
 assert.equal(out.publicationGate,'BLOCKED')
 assert.equal(run([l],[r],[]).leftRowsNotLinked,1)
})
test('duplicate records and nonbijective mapping are withheld or rejected',()=>{
 assert.equal(run([l,l]).counts.ambiguous,1)
 assert.equal(run([l],[r],[c,c]).counts.ambiguous,2)
 assert.equal(run([], [r]).counts.missingRecord,1)
 assert.throws(()=>run([l],[r],[{...c,participantMappings:[{left:'a',right:'x'},{left:'b',right:'x'}]}]))
})
test('domain, ordered participants, contract and precise time are distinct checks',()=>{
 assert.equal(run([l],[{...r,domain:'other'}]).counts.identityConflict,1)
 assert.equal(run([l],[{...r,participantIds:['y','x']}]).counts.identityConflict,1)
 assert.equal(run([l],[{...r,contract:'other'}]).counts.contractConflict,1)
 assert.equal(run([l],[{...r,scheduledAt:'2026-01-02T12:00:00.001Z'}]).counts.chronologyConflict,1)
 assert.throws(()=>run([l],[{...r,timePrecision:'DATE_ONLY'}]))
 assert.throws(()=>run([l],[{...r,scheduledAt:'2026-02-30T12:00:00.000Z'}]))
})
test('only synthetic input accepted; source claims cannot authorize execution',()=>{
 assert.throws(()=>reviewSyntheticIdentities({mode:'REAL',left:[l],right:[r],crosswalk:[c]}))
 assert.throws(()=>run([{...l,receiptSha256:'bad'}]))
 assert.equal(reviewSyntheticIdentities({mode:'SYNTHETIC_IDENTITY_TEST',left:[l],right:[r],crosswalk:[c],approved:true}).executionAuthorized,false)
})
