import {test} from 'node:test'
import assert from 'node:assert/strict'
import {researchDecision} from './experiment-registry-alpha-decision.mjs'
test('missing evidence returns explicit blockers and no estimates',()=>{
 const r=researchDecision()
 assert.ok(r.blockers.includes('MATCHED_PERFORMANCE_REPORT_UNAVAILABLE'))
 assert.ok(r.blockers.includes('FALSE_EDGE_INVESTIGATIONS_UNCLEARED'))
 assert.equal(r.status,'BLOCKED')
 assert.deepEqual(r.estimates,{outcomeProbability:null,genuineEdgeProbability:null,persistenceProbability:null})
 assert.equal(r.executionAuthorized,false)
 assert.equal(r.capitalAllocationAuthorized,false)
})
test('zero matched pairs block even when a report exists',()=>{
 const r=researchDecision({performance:{available:true,matchedPairs:0}})
 assert.ok(r.blockers.includes('NO_ESTABLISHED_PAIRED_SAMPLE'))
})
test('caller-asserted positive evidence cannot activate the engine',()=>{
 const r=researchDecision({performance:{available:true,matchedPairs:1000,calibrationEstablished:true},market:{disagreement:{status:'DESCRIPTIVE_ARCHIVE_ONLY'}},falseEdge:{checks:Array.from({length:10},()=>({status:'PASSED'}))},approved:true})
 assert.equal(r.status,'BLOCKED')
 assert.ok(r.blockers.includes('INDEPENDENT_PROTOCOL_AND_POSTERIOR_VALIDATION_NOT_IMPLEMENTED'))
 assert.equal(r.validationAuthorized,false)
 assert.equal(r.publicationGate,'BLOCKED')
})
