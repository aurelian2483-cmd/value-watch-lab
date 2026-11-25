// Strict contract: source identity, exact fixed specifications and deterministic re-execution.
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {runCampaign,specifications,flags} from './campaign.mjs'
import {digest} from '../scientific-reference/digest.mjs'
const rev='a'.repeat(40)
test('250 predefined cases reconcile by method and every reference tolerance passes',()=>{
 const r=runCampaign(rev)
 assert.deepEqual(r.counts,{total:250,passed:250,failed:0,distinctMethods:4})
 assert.deepEqual(Object.values(r.byMethod).map(m=>m.total),[64,64,64,58])
 assert.equal(new Set(r.rows.map(x=>x.id)).size,250)
 assert.equal(new Set(r.rows.map(x=>x.fixtureSha256)).size,250)
 const specs=specifications()
 for(const [i,row] of r.rows.entries()){
  assert.equal(row.fixtureSha256,digest(specs[i]))
  assert.equal(row.backend,'CPU_NODE')
  assert.ok(row.absoluteError<=row.tolerance)
  assert.equal(row.converged,true)
 }
})
test('campaign output is deterministic and all research gates remain blocked',()=>{
 const r=runCampaign(rev),{campaignSha256,...payload}=r
 assert.equal(digest(payload),campaignSha256)
 assert.deepEqual(runCampaign(rev),r)
 for(const [k,v] of Object.entries(flags))assert.equal(r[k],v)
 assert.throws(()=>runCampaign('main'),/revision/)
})
test('input specifications are isolated copies and power fixtures have dominant eigenvalues',()=>{
 const specs=specifications()
 specs[0].input.k=999
 assert.equal(specifications()[0].input.k,1)
 for(const s of specifications().filter(x=>x.method==='power-iteration-eigenvector')){
  assert.ok(Math.abs(s.input.dominant)>Math.abs(s.input.secondary))
  assert.deepEqual(s.input.start,[1,1])
 }
})
