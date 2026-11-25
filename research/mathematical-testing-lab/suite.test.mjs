import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {bisect,integratePolynomialRule,powerIteration} from './numerical.mjs'
import {runSuite,evaluateKnownAnswer} from './suite.mjs'
const revision='53ce0b33d88e547cccc78796f34a2668b2669074'
test('fixed mathematical fixtures pass with stable identities and complete reports',()=>{
 const r=runSuite(revision)
 assert.deepEqual(r.counts,{total:5,passed:5,failed:0})
 assert.equal(new Set(r.results.map(x=>x.experimentId)).size,5)
 assert.deepEqual(r,runSuite(revision))
 const {reportSha256,...payload}=r
 assert.equal(reportSha256,createHash('sha256').update(JSON.stringify(payload)).digest('hex'))
 assert.notEqual(runSuite('a'.repeat(40)).results[0].experimentId,r.results[0].experimentId)
 assert.equal(r.validationAuthorized,false)
 assert.equal(r.publicationGate,'BLOCKED')
 assert.throws(()=>runSuite('main'))
})
test('known-answer checks preserve failure rather than relaxing tolerances',()=>{
 assert.equal(evaluateKnownAnswer({expected:1,value:1.01,tolerance:0.001,converged:true}).status,'FAIL')
 assert.equal(evaluateKnownAnswer({expected:1,value:NaN,tolerance:0.001,converged:true}).status,'FAIL')
 assert.equal(evaluateKnownAnswer({expected:1,value:1,tolerance:0.001,converged:false}).status,'FAIL')
 assert.throws(()=>evaluateKnownAnswer({expected:1,value:1,tolerance:-1,converged:true}))
})
test('bisection handles endpoints, invalid brackets and exhausted work',()=>{
 assert.equal(bisect(x=>x,0,1).root,0)
 assert.equal(bisect(x=>x-1,0,1).root,1)
 assert.throws(()=>bisect(x=>x*x+1,-1,1),/not bracketed/)
 assert.throws(()=>bisect(()=>Infinity,0,1))
 assert.equal(bisect(x=>x*x-2,1,2,{maxIterations:1,tolerance:1e-15}).converged,false)
})
test('quadrature exact cases and second-order trapezoid error',()=>{
 const q=n=>integratePolynomialRule(x=>x*x,0,1,n,'trapezoid')-1/3
 assert.ok(Math.abs(q(10)/q(20)-4)<1e-9)
 assert.ok(Math.abs(integratePolynomialRule(x=>x**3,0,2,8,'simpson')-4)<1e-12)
 assert.throws(()=>integratePolynomialRule(x=>x,0,1,3,'simpson'))
 assert.throws(()=>integratePolynomialRule(x=>x,0,1,100001,'trapezoid'))
 assert.throws(()=>integratePolynomialRule(()=>NaN,0,1,2,'simpson'))
})
test('symmetric power iteration reports residual and refuses malformed systems',()=>{
 const r=powerIteration([[-5,0],[0,2]],[1,1])
 assert.ok(r.converged&&r.residual<=1e-10&&Math.abs(r.eigenvalue+5)<1e-9)
 assert.throws(()=>powerIteration([[1,2],[0,3]],[1,1]))
 assert.throws(()=>powerIteration([[1,0],[0,2]],[0,0]))
 assert.equal(powerIteration([[5,0],[0,2]],[1,1],{maxIterations:1,tolerance:1e-15}).converged,false)
 // An invariant non-dominant initial direction can converge to a different eigenpair.
 const nondominant=powerIteration([[5,0],[0,2]],[0,1])
 assert.equal(nondominant.eigenvalue,2)
 assert.equal(nondominant.converged,true)
})

test('sparse numerical inputs are rejected before arithmetic',()=>{
 assert.throws(()=>powerIteration(new Array(2),[1,1]),/Invalid symmetric eigenproblem/)
 assert.throws(()=>powerIteration([[1,0],[0,2]],new Array(2)),/Invalid symmetric eigenproblem/)
 assert.throws(()=>powerIteration([[1,,],[0,2]],[1,1]),/Invalid symmetric eigenproblem/)
})
