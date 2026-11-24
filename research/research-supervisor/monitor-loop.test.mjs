import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,realpathSync,mkdirSync,rmSync,writeFileSync,readdirSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {monitorBounded} from './monitor-loop.mjs'
const rev='82fbd1789a0ef2283060e7bfab55603b88e85bc0'
function setup(t){
 const d=realpathSync(mkdtempSync(join(tmpdir(),'monitor-loop-')));t.after(()=>rmSync(d,{recursive:true,force:true}))
 return ['history','registry','reports'].map(n=>{const p=join(d,n);mkdirSync(p);return p})
}
test('two actual observations suppress repeat alerts and preserve evidence',async t=>{
 const dirs=setup(t),rows=[]
 const r=await monitorBounded(...dirs,rev,{intervalSeconds:1,maxCycles:2,onObservation:x=>rows.push(x)})
 assert.equal(r.reason,'CYCLE_LIMIT');assert.equal(r.cycles,2)
 assert.equal(rows[0].alerts.length,3);assert.equal(rows[1].alerts.length,0)
 assert.equal(r.suppressed,3);assert.equal(r.repairAuthorized,false)
 assert.equal(readdirSync(dirs[0]).length,2)
 assert.deepEqual(readdirSync(dirs[1]),[]);assert.deepEqual(readdirSync(dirs[2]),[])
})
test('blocking incident stops by default',async t=>{
 const dirs=setup(t);writeFileSync(join(dirs[1],'unexpected'),'preserve')
 const r=await monitorBounded(...dirs,rev,{intervalSeconds:1,maxCycles:3})
 assert.equal(r.reason,'BLOCKING_INCIDENT');assert.equal(r.cycles,1);assert.equal(r.status,'BLOCKED')
})
test('explicit cancellation stops between scans',async t=>{
 const dirs=setup(t),c=new AbortController()
 const r=await monitorBounded(...dirs,rev,{intervalSeconds:1,maxCycles:3,signal:c.signal,onObservation:()=>c.abort()})
 assert.equal(r.reason,'STOP_REQUESTED');assert.equal(r.cycles,1)
})
test('history lock is retained and monitoring stops on failure',async t=>{
 const dirs=setup(t);writeFileSync(join(dirs[0],'.incident-history-lock'),'existing')
 const r=await monitorBounded(...dirs,rev,{intervalSeconds:1,maxCycles:2})
 assert.equal(r.reason,'OBSERVATION_FAILED');assert.equal(r.cycles,0)
 assert.deepEqual(readdirSync(dirs[0]),['.incident-history-lock'])
})
test('invalid policies rejected before observation',async t=>{
 const dirs=setup(t)
 for(const opts of [{maxCycles:0},{intervalSeconds:0},{intervalSeconds:3600,maxCycles:3},{maxCycles:121}])
  await assert.rejects(monitorBounded(...dirs,rev,opts),/Invalid bounded/)
 assert.deepEqual(readdirSync(dirs[0]),[])
})
