import {test} from 'node:test'
import assert from 'node:assert/strict'
import {falseEdgeReadiness} from './experiment-registry-alpha-false-edge.mjs'
test('all ten checks remain uncertain without empirical test evidence',()=>{
 const r=falseEdgeReadiness()
 assert.equal(r.checks.length,10)
 assert.equal(new Set(r.checks.map(c=>c.id)).size,10)
 assert.ok(r.checks.every(c=>c.status==='UNCERTAIN'&&c.evidence===null&&c.requirement.length>0))
 assert.ok(Object.values(r.context).every(v=>v===null))
 assert.equal(r.executionAuthorized,false)
})
test('zero pairs and structural conflicts identify specific blockers',()=>{
 const r=falseEdgeReadiness({historical:{counts:{rejected:0,conflicting:2}},performance:{available:true,matchedPairs:0},market:{available:true,counts:{observations:0}}})
 assert.equal(r.checks.find(c=>c.id==='data-quality').blocker,'STRUCTURAL_ISSUES_REQUIRE_REVIEW')
 assert.equal(r.checks.find(c=>c.id==='sample-size').blocker,'NO_CONTRACT_MATCHED_PAIRS')
 assert.equal(r.checks.find(c=>c.id==='bookmaker-margin').blocker,'NO_MATCHED_MARKET_OBSERVATIONS')
 assert.equal(r.publicationGate,'BLOCKED')
})
test('large counts alone cannot establish clearance',()=>{
 const r=falseEdgeReadiness({performance:{available:true,matchedPairs:100000},market:{available:true,counts:{observations:100000}}})
 assert.ok(r.checks.every(c=>c.status==='UNCERTAIN'))
})
