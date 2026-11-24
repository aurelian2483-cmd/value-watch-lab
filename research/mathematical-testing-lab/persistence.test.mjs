import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,rmSync,writeFileSync,readFileSync,realpathSync,symlinkSync,readdirSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {persistSuite} from './persistence.mjs'
import {history} from '../mathematical-library/experiment-registry-lifecycle.mjs'
const rev='405c5496bedf4bea081d48413742cf4847e2c686'
function fixture(t){const d=realpathSync(mkdtempSync(join(tmpdir(),'synthetic-persistence-')));t.after(()=>rmSync(d,{recursive:true,force:true}));return d}
test('five fixtures persist, terminal history is reused without duplicate writes',t=>{
 const d=fixture(t),a=persistSuite(d,rev)
 assert.equal(a.complete,true)
 assert.equal(a.records.length,5)
 assert.ok(a.records.every(r=>r.lifecycle==='COMPLETED'&&r.verdict==='PASS'))
 const old=a.records.map(r=>history(d,r.experimentId))
 const b=persistSuite(d,rev)
 assert.ok(b.records.every(r=>r.action==='REUSED_VERIFIED'))
 assert.deepEqual(b.records.map(r=>history(d,r.experimentId)),old)
 assert.equal(b.validationAuthorized,false)
})
test('explicit recovery finalizes a saved fixture checkpoint',t=>{
 const d=fixture(t),a=persistSuite(d,rev,{pauseAfterCheckpoint:true})
 assert.equal(a.complete,false)
 assert.equal(a.records[0].lifecycle,'CHECKPOINTED')
 assert.throws(()=>persistSuite(d,rev),/explicit review/)
 const b=persistSuite(d,rev,{recover:true})
 assert.equal(b.complete,true)
 assert.equal(b.records[0].action,'RECOVERED_CHECKPOINT')
 assert.equal(b.records[0].artifactHash,a.records[0].artifactHash)
})
test('corrupted terminal artifact is never reported as reused',t=>{
 const d=fixture(t),r=persistSuite(d,rev)
 const file=join(d,'artifacts',r.records[0].artifactHash+'.json')
 writeFileSync(file,'{}')
 assert.throws(()=>persistSuite(d,rev),/integrity failure/)
 assert.equal(readFileSync(file,'utf8'),'{}')
})
test('unrelated directory and active lock are refused',t=>{
 const d=fixture(t);writeFileSync(join(d,'unrelated.json'),'{}')
 assert.throws(()=>persistSuite(d,rev),/must be empty/)
 assert.deepEqual(readdirSync(d),['unrelated.json'])
 const e=fixture(t);writeFileSync(join(e,'.synthetic-math-lock'),'active')
 assert.throws(()=>persistSuite(e,rev),{code:'EEXIST'})
 assert.equal(readFileSync(join(e,'.synthetic-math-lock'),'utf8'),'active')
})
test('symlinked result artifact is refused',t=>{
 const d=fixture(t),r=persistSuite(d,rev),e=fixture(t)
 const path=join(d,'artifacts',r.records[0].artifactHash+'.json'),outside=join(e,'original')
 writeFileSync(outside,readFileSync(path));rmSync(path);symlinkSync(outside,path)
 assert.throws(()=>persistSuite(d,rev),/Unsafe registry path/)
})
