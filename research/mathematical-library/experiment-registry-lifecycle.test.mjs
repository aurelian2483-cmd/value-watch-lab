import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync, readFileSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { register } from './experiment-registry.mjs'
import { history, append, prepareBatch } from './experiment-registry-lifecycle.mjs'
const spec={formulaId:'poisson',codeRevision:'a'.repeat(40),datasetHash:'b'.repeat(64),configuration:{},seed:1,primaryMetric:'log-loss',partition:'development'}
const artifactHash='c'.repeat(64)
function directory(t){const dir=mkdtempSync(join(tmpdir(),'vw-lifecycle-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));return dir}
test('checkpoint and interruption history survive independent reads',t=>{
  const dir=directory(t), {experimentId:id}=register(dir,spec)
  assert.equal(history(dir,id).status,'REGISTERED')
  append(dir,id,'RUNNING')
  append(dir,id,'CHECKPOINTED',{artifactHash})
  append(dir,id,'INTERRUPTED',{reason:'test interruption'})
  assert.equal(history(dir,id).status,'INTERRUPTED')
  append(dir,id,'RUNNING')
  append(dir,id,'COMPLETED',{artifactHash})
  const h=history(dir,id)
  assert.equal(h.status,'COMPLETED')
  assert.equal(h.events.length,5)
  assert.equal(h.events[1].details.artifactHash,artifactHash)
  assert.throws(()=>append(dir,id,'RUNNING'),/Invalid lifecycle transition/)
})
test('invalid transitions and missing evidence fail without advancing',t=>{
  const dir=directory(t),{experimentId:id}=register(dir,spec)
  assert.throws(()=>append(dir,id,'COMPLETED',{artifactHash}))
  append(dir,id,'RUNNING')
  assert.throws(()=>append(dir,id,'COMPLETED'))
  assert.throws(()=>append(dir,id,'FAILED'))
  assert.equal(history(dir,id).status,'RUNNING')
  append(dir,id,'FAILED',{reason:'synthetic failure'})
  assert.equal(history(dir,id).status,'FAILED')
})
test('batch preparation does not run experiments or touch holdout',t=>{
  const dir=directory(t)
  assert.throws(()=>prepareBatch(dir,[spec,spec]),/Duplicate/)
  assert.throws(()=>prepareBatch(dir,Array.from({length:251},(_,seed)=>({...spec,seed}))))
  assert.throws(()=>prepareBatch(dir,[spec,{...spec,partition:'holdout'}]))
  assert.equal(readdirSync(dir).length,0)
  const batch=prepareBatch(dir,Array.from({length:250},(_,seed)=>({...spec,seed})))
  assert.equal(batch.records.length,250)
  assert.equal(batch.status,'PREPARED_NOT_EXECUTED')
  assert.ok(batch.records.every(r=>history(dir,r.experimentId).status==='REGISTERED'))
  assert.equal(prepareBatch(dir,[spec]).records[0].status,'DUPLICATE')
})
test('invalid identity and modified linked record fail closed',t=>{
  const dir=directory(t),{experimentId:id}=register(dir,spec)
  assert.throws(()=>history(dir,'../bad'))
  append(dir,id,'RUNNING')
  append(dir,id,'FAILED',{reason:'test'})
  const file=join(dir,id,'00000001.json')
  const event=JSON.parse(readFileSync(file,'utf8'));event.details={changed:true}
  writeFileSync(file,JSON.stringify(event))
  assert.throws(()=>history(dir,id),/Invalid lifecycle chain/)
})
