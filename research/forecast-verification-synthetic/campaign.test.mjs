import {test} from 'node:test'
import assert from 'node:assert/strict'
import {brier,logLoss,rankedProbabilityScore,rocArea,fixedBinECE,pinball,intervalScore,calibrationOffset} from './metrics.mjs'
import {campaign,cases} from './campaign.mjs'
import {digest} from '../scientific-reference/digest.mjs'
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10)
test('score conventions and explicit infinite loss',()=>{
 close(brier([[0.75,0.25]],[0]),0.125)
 close(rankedProbabilityScore([[0.25,0.5,0.25]],[1]),0.125)
 close(logLoss([[0.5,0.5]],[1]).value,Math.log(2))
 assert.deepEqual(logLoss([[1,0]],[1]),{status:'INFINITE_LOSS',value:null})
 assert.throws(()=>brier([[0.8,0.8]],[0]))
 assert.throws(()=>rankedProbabilityScore([[0.5,0.5]],[2]))
})
test('ROC ties, single-class rejection and bin endpoints',()=>{
 close(rocArea([2,2,1,3],[1,0,0,1]),0.875)
 assert.throws(()=>rocArea([1,2],[1,1]))
 close(fixedBinECE([0,0.25,0.5,1],[0,1,0,1],4),0.3125)
 assert.throws(()=>fixedBinECE([0.5],[1],1))
})
test('quantile and interval directional penalties',()=>{
 close(pinball(2,3,0.75),0.75);close(pinball(3,2,0.75),0.25)
 close(intervalScore(2,4,1,0.25),10)
 close(intervalScore(2,4,3,0.25),2)
 assert.throws(()=>intervalScore(4,2,3,0.25))
 assert.throws(()=>pinball(2,3,1))
})
test('calibration offset checks mixed labels and interior probabilities',()=>{
 const r=calibrationOffset([0.25,0.25],[0,1]);close(r.offset,Math.log(3));assert.ok(r.residual<=1e-9)
 assert.throws(()=>calibrationOffset([0,0.5],[0,1]))
 assert.throws(()=>calibrationOffset([0.25,0.25],[1,1]))
})
test('250 independent fixture identities and deterministic compute-only results',()=>{
 const r=campaign('a'.repeat(40)),{campaignSha256,...p}=r
 assert.deepEqual(r.counts,{total:250,computed:250,failed:0,distinctMethods:8})
 assert.equal(new Set(r.rows.map(x=>x.id)).size,250)
 assert.equal(new Set(r.rows.map(x=>x.fixtureSha256)).size,250)
 for(const [i,s] of cases().entries())assert.equal(r.rows[i].fixtureSha256,digest(s))
 assert.equal(digest(p),campaignSha256)
 assert.deepEqual(campaign('a'.repeat(40)),r)
 assert.equal(r.executionAuthorized,false);assert.equal(r.publicationGate,'BLOCKED')
})
