import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { manifest, register } from './experiment-registry.mjs'

const spec = { formulaId:'poisson', codeRevision:'a'.repeat(40), datasetHash:'b'.repeat(64), configuration:{ a:1,b:2 }, seed:42, primaryMetric:'log-loss', partition:'development' }
function temporary(t) {
  const dir = mkdtempSync(join(tmpdir(),'vw-registry-'))
  t.after(()=>rmSync(dir,{recursive:true,force:true}))
  return dir
}
test('stable identity independent of configuration property order',()=>{
  assert.equal(manifest(spec).experimentId,manifest({...spec,configuration:{b:2,a:1}}).experimentId)
  for (const delta of [{seed:43},{datasetHash:'c'.repeat(64)},{formulaId:'elo'},{codeRevision:'d'.repeat(40)},{primaryMetric:'brier'},{configuration:{a:2,b:2}}])
    assert.notEqual(manifest(spec).experimentId,manifest({...spec,...delta}).experimentId)
})
test('rejects missing or invalid metadata and non-development partitions',()=>{
  for(const delta of [{partition:'holdout'},{partition:'prospective'},{datasetHash:'bad'},{seed:NaN},{configuration:{x:Infinity}},{configuration:{x:undefined}},{formulaId:'../bad'},{primaryMetric:''}])
    assert.throws(()=>manifest({...spec,...delta}))
})
test('persistent registration is idempotent and remains research only',t=>{
  const dir=temporary(t)
  const first=register(dir,spec)
  assert.equal(first.status,'REGISTERED')
  assert.equal(register(dir,spec).status,'DUPLICATE')
  const saved=JSON.parse(readFileSync(join(dir,first.experimentId+'.json'),'utf8'))
  assert.equal(saved.researchOnly,true)
  assert.equal(saved.publicationGate,'BLOCKED')
  assert.equal(saved.experimentId,first.experimentId)
})
test('corrupt existing record is not silently overwritten',t=>{
  const dir=temporary(t)
  const {experimentId}=register(dir,spec)
  const path=join(dir,experimentId+'.json')
  writeFileSync(path,'corrupt')
  assert.throws(()=>register(dir,spec),/corrupt or conflicting/)
  assert.equal(readFileSync(path,'utf8'),'corrupt')
})
