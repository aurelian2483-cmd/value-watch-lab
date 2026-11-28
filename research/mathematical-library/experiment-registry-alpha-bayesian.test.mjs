import {test} from 'node:test'
import assert from 'node:assert/strict'
import {syntheticPosterior} from './experiment-registry-alpha-bayesian.mjs'
const opts={prior:0.5,mode:'SYNTHETIC_MATH_TEST',assumeConditionalIndependence:true}
const evidence={id:'test-one',dependencyGroup:'group-one',likelihoodGivenHypothesis:0.8,likelihoodGivenAlternative:0.2}
const run=(rows,extra={})=>syntheticPosterior({...opts,evidence:rows,...extra})
test('posterior matches elementary Bayes theorem and neutral evidence',()=>{
 assert.equal(run([]).posterior,0.5)
 assert.ok(Math.abs(run([evidence]).posterior-0.8)<1e-12)
 assert.ok(Math.abs(run([{...evidence,likelihoodGivenHypothesis:0.2,likelihoodGivenAlternative:0.8}]).posterior-0.2)<1e-12)
 assert.equal(run([{...evidence,likelihoodGivenHypothesis:0.3,likelihoodGivenAlternative:0.3}]).posterior,0.5)
})
test('separate synthetic evidence updates sequentially and retains a trace',()=>{
 const r=run([evidence,{...evidence,id:'test-two',dependencyGroup:'group-two'}])
 assert.ok(Math.abs(r.posterior-16/17)<1e-12)
 assert.equal(r.trace.length,2)
 assert.equal(r.genuineEdgeProbability,null)
 assert.equal(r.persistenceProbability,null)
 assert.equal(r.executionAuthorized,false)
 assert.equal(r.publicationGate,'BLOCKED')
})
test('rejects duplicates, shared groups, malformed probabilities and unsupported mode',()=>{
 assert.throws(()=>run([evidence,evidence]),/Repeated/)
 assert.throws(()=>run([evidence,{...evidence,id:'different'}]),/dependent/)
 for(const x of [0,1,-1,Infinity,NaN,'0.5']){
  assert.throws(()=>run([],{prior:x}))
  assert.throws(()=>run([{...evidence,likelihoodGivenHypothesis:x}]))
 }
 assert.throws(()=>run([],{mode:'REAL'}))
 assert.throws(()=>run([],{assumeConditionalIndependence:false}))
})
test('extreme finite likelihood ratios retain finite log odds',()=>{
 const rows=Array.from({length:250},(_,i)=>({id:'row-'+i,dependencyGroup:'group-'+i,likelihoodGivenHypothesis:0.99,likelihoodGivenAlternative:1e-300}))
 const r=run(rows)
 assert.ok(Number.isFinite(r.logPosteriorOdds))
 assert.ok(r.posterior>=0&&r.posterior<=1)
 assert.throws(()=>run([...rows,{...evidence}]))
})
