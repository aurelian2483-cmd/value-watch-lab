import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,rmSync,unlinkSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {register} from './experiment-registry.mjs'
import {append} from './experiment-registry-lifecycle.mjs'
import {saveCheckpoint} from './experiment-registry-checkpoint.mjs'
import {supervise} from './experiment-registry-supervisor.mjs'
const spec={formulaId:'synthetic-infrastructure-smoke',codeRevision:'a'.repeat(40),datasetHash:'b'.repeat(64),configuration:{steps:5},seed:1,primaryMetric:'synthetic-checksum',partition:'development'}
function setup(t){const d=mkdtempSync(join(tmpdir(),'vw-supervisor-'));t.after(()=>rmSync(d,{recursive:true,force:true}));return d}
test('missing storage blocks and healthy storage never grants execution authority',t=>{
 const d=setup(t)
 assert.equal(supervise(join(d,'missing')).status,'BLOCKED')
 const r=supervise(d)
 assert.equal(r.status,'NO_DETECTED_INCIDENTS')
 assert.equal(r.executionAuthorized,false)
 assert.equal(r.publicationGate,'BLOCKED')
})
test('running ownership requires review; missing checkpoint blocks',t=>{
 const d=setup(t),{experimentId:id}=register(d,spec)
 append(d,id,'RUNNING')
 assert.equal(supervise(d).status,'REVIEW_REQUIRED')
 const event=saveCheckpoint(d,id,{cursor:1,total:1})
 assert.equal(supervise(d).status,'NO_DETECTED_INCIDENTS')
 unlinkSync(join(d,'artifacts',event.details.artifactHash+'.json'))
 const r=supervise(d)
 assert.equal(r.status,'BLOCKED')
 assert.ok(r.incidents.some(i=>i.code==='CHECKPOINT_UNAVAILABLE_OR_INVALID'))
})
test('interrupted experiment without saved state requires review',t=>{
 const d=setup(t),{experimentId:id}=register(d,spec)
 append(d,id,'RUNNING')
 append(d,id,'INTERRUPTED',{reason:'synthetic interruption'})
 assert.ok(supervise(d).incidents.some(i=>i.code==='NO_CHECKPOINT'))
})
