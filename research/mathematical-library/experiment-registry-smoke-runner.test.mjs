import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,rmSync,readdirSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {runSmoke} from './experiment-registry-smoke-runner.mjs'
import {history} from './experiment-registry-lifecycle.mjs'
const spec={formulaId:'synthetic-infrastructure-smoke',codeRevision:'a'.repeat(40),datasetHash:'b'.repeat(64),configuration:{steps:10},seed:1,primaryMetric:'synthetic-checksum',partition:'development'}
function setup(t){const d=mkdtempSync(join(tmpdir(),'vw-smoke-'));t.after(()=>rmSync(d,{recursive:true,force:true}));return d}
test('interrupt, reopen, finish and avoid duplicate execution',t=>{
 const dir=setup(t)
 const first=runSmoke(dir,spec,{stopAfter:4})
 assert.equal(first.status,'INTERRUPTED')
 assert.equal(first.executed,4)
 const second=runSmoke(dir,spec)
 assert.equal(second.id,first.id)
 assert.equal(second.executed,6)
 assert.equal(second.total,55)
 assert.equal(history(dir,first.id).status,'COMPLETED')
 assert.equal(runSmoke(dir,spec).executed,0)
})
test('reject real formulas, protected partition and invalid limits before execution',t=>{
 const dir=setup(t)
 assert.throws(()=>runSmoke(dir,{...spec,formulaId:'poisson'}))
 assert.throws(()=>runSmoke(dir,{...spec,partition:'holdout'}))
 assert.throws(()=>runSmoke(dir,spec,{maxSteps:101}))
 assert.throws(()=>runSmoke(dir,spec,{maxSteps:9}))
 assert.equal(readdirSync(dir).length,0)
})
