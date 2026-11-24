import {test} from 'node:test'
import assert from 'node:assert/strict'
import {distributionDistance,summarizeDisagreement} from './experiment-registry-alpha-disagreement.mjs'
const asOf=10000
const model={cutoffReason:null,observed:100,row:{prob_home:0.5,prob_draw:0.3,prob_away:0.2}}
const latest={observed:200,snapshot:300,metrics:{proportionalNoVig:{home:0.4,draw:0.3,away:0.3}}}
const m={fixture:{id:'synthetic-one',start:5000,marketCutoff:5000},model,sourceHistories:[{sourceId:'SKY_BET',latest}]}
test('total variation satisfies basic mathematical properties',()=>{
 const a=[0.5,0.3,0.2],b=[0.4,0.3,0.3]
 assert.ok(Math.abs(distributionDistance(a,b)-0.1)<1e-12)
 assert.equal(distributionDistance(a,a),0)
 assert.equal(distributionDistance(a,b),distributionDistance(b,a))
 assert.equal(distributionDistance([1,0,0],[0,1,0]),1)
 assert.throws(()=>distributionDistance(a,[0.4,0.4,0.4]))
})
test('archive diagnostic aggregates without exposing event selections',()=>{
 const r=summarizeDisagreement([m],asOf)
 assert.equal(r.eligibleFixtures,1)
 assert.equal(r.bySource.SKY_BET.pairs,1)
 assert.ok(Math.abs(r.bySource.SKY_BET.meanTotalVariation-0.1)<1e-12)
 assert.equal(r.executionAuthorized,false)
 assert.equal(r.publicationGate,'BLOCKED')
 assert.ok(!JSON.stringify(r).includes(m.fixture.id))
})
test('missing, ambiguous, future and inconsistent observations cannot produce a comparison',()=>{
 for(const bad of [{...m,model:null},{...m,model:{...model,cutoffReason:'late'}},
 {...m,sourceHistories:[{sourceId:'SKY_BET',latest:{...latest,observed:99}}]},
 {...m,sourceHistories:[{sourceId:'SKY_BET',latest:{...latest,snapshot:5001}}]},
 {...m,sourceHistories:[...m.sourceHistories,...m.sourceHistories]},
 {...m,fixture:{...m.fixture,start:asOf+1}}]){
  const r=summarizeDisagreement([bad],asOf)
  assert.equal(r.status,'NO_ALIGNED_ARCHIVE_PAIRS')
  assert.equal(r.eligibleFixtures,0)
  assert.deepEqual(r.bySource,{})
 }
})
