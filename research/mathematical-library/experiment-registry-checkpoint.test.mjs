import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { register } from './experiment-registry.mjs'
import { append, history } from './experiment-registry-lifecycle.mjs'
import { saveCheckpoint, restoreCheckpoint } from './experiment-registry-checkpoint.mjs'

function setup(t) {
 const dir=mkdtempSync(join(tmpdir(),'vw-checkpoint-'))
 t.after(()=>rmSync(dir,{recursive:true,force:true}))
 const spec={formulaId:'poisson',codeRevision:'a'.repeat(40),datasetHash:'b'.repeat(64),configuration:{},seed:1,primaryMetric:'log-loss',partition:'development'}
 const {experimentId:id}=register(dir,spec)
 append(dir,id,'RUNNING')
 return {dir,id}
}
test('restores latest saved state after interruption',t=>{
 const {dir,id}=setup(t)
 assert.equal(restoreCheckpoint(dir,id),null)
 saveCheckpoint(dir,id,{cursor:1,values:[1,2]})
 append(dir,id,'RUNNING')
 const event=saveCheckpoint(dir,id,{cursor:2,values:[1,2,3]})
 append(dir,id,'INTERRUPTED',{reason:'synthetic shutdown'})
 assert.deepEqual(restoreCheckpoint(dir,id),{sequence:event.sequence,artifactHash:event.details.artifactHash,state:{cursor:2,values:[1,2,3]}})
 append(dir,id,'RUNNING')
 assert.equal(history(dir,id).status,'RUNNING')
})
test('rejects corrupted or missing artifacts',t=>{
 const {dir,id}=setup(t)
 const event=saveCheckpoint(dir,id,{cursor:1})
 const path=join(dir,'artifacts',event.details.artifactHash+'.json')
 writeFileSync(path,'corrupted')
 assert.throws(()=>restoreCheckpoint(dir,id),/integrity failure/)
 unlinkSync(path)
 assert.throws(()=>restoreCheckpoint(dir,id),{code:'ENOENT'})
})
test('rejects invalid state without advancing lifecycle',t=>{
 const {dir,id}=setup(t)
 for(const state of [null,[],{value:Infinity},{value:undefined},{value:'x'.repeat(4*1024*1024)}])
   assert.throws(()=>saveCheckpoint(dir,id,state))
 assert.equal(history(dir,id).status,'RUNNING')
 saveCheckpoint(dir,id,{cursor:1})
 assert.throws(()=>saveCheckpoint(dir,id,{cursor:2}),/not running/)
})
