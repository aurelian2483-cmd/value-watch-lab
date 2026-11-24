import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,rmSync,writeFileSync,readdirSync,readFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {register} from './experiment-registry.mjs'
import {append} from './experiment-registry-lifecycle.mjs'
import {monitor} from './experiment-registry-monitor.mjs'
const spec={formulaId:'synthetic-infrastructure-smoke',codeRevision:'a'.repeat(40),datasetHash:'b'.repeat(64),configuration:{steps:5},seed:1,primaryMetric:'synthetic-checksum',partition:'development'}
function setup(t){const d=mkdtempSync(join(tmpdir(),'vw-monitor-'));t.after(()=>rmSync(d,{recursive:true,force:true}));return d}
test('counts actual lifecycle states and never modifies manifests',t=>{
 const d=setup(t)
 const a=register(d,spec).experimentId
 const b=register(d,{...spec,seed:2}).experimentId
 append(d,b,'RUNNING')
 append(d,b,'FAILED',{reason:'synthetic failure'})
 const before=readFileSync(join(d,a+'.json'),'utf8')
 const names=readdirSync(d)
 const r=monitor(d)
 assert.equal(r.available,true)
 assert.equal(r.statuses.REGISTERED,1)
 assert.equal(r.statuses.FAILED,1)
 assert.equal(r.records.length,2)
 assert.equal(r.integrity,'NO_READ_ERRORS')
 assert.equal(r.publicationGate,'BLOCKED')
 assert.deepEqual(readdirSync(d),names)
 assert.equal(readFileSync(join(d,a+'.json'),'utf8'),before)
})
test('distinguishes missing data from an empty registry and excludes corrupt manifests',t=>{
 const d=setup(t)
 assert.equal(monitor(join(d,'missing')).available,false)
 assert.equal(monitor(join(d,'missing')).statuses,null)
 assert.equal(monitor(d).records.length,0)
 const id=register(d,spec).experimentId
 writeFileSync(join(d,id+'.json'),'damaged')
 const r=monitor(d)
 assert.equal(r.integrity,'DEGRADED')
 assert.equal(r.errors.length,1)
 assert.equal(r.records.length,0)
 assert.equal(readFileSync(join(d,id+'.json'),'utf8'),'damaged')
})
