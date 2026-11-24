import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,realpathSync,mkdirSync,rmSync,readFileSync,writeFileSync,readdirSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {recordObservation,summarizeHistory} from './incident-history.mjs'
const rev='23f9d4419b36f96fc4a50a6c93c9a207822ecdef'
function setup(t){
 const d=realpathSync(mkdtempSync(join(tmpdir(),'incident-history-')));t.after(()=>rmSync(d,{recursive:true,force:true}))
 return ['history','registry','reports'].map(n=>{const p=join(d,n);mkdirSync(p);return p})
}
const at=i=>({observedAt:new Date(Date.UTC(2026,10,24,21,0,i)).toISOString()})
test('repeat observations are appended without rewriting prior evidence',t=>{
 const dirs=setup(t),a=recordObservation(...dirs,rev,at(0)),file=join(dirs[0],'00000001.json'),bytes=readFileSync(file)
 assert.equal(a.observations,1);assert.equal(a.incidents.length,3);assert.ok(a.incidents.every(i=>i.state==='NEW'))
 const b=recordObservation(...dirs,rev,at(1))
 assert.equal(b.observations,2);assert.ok(b.incidents.every(i=>i.observations===2&&i.state==='OBSERVED_AGAIN'))
 assert.deepEqual(readFileSync(file),bytes);assert.deepEqual(readdirSync(dirs[1]),[]);assert.deepEqual(readdirSync(dirs[2]),[])
 assert.throws(()=>recordObservation(...dirs,rev,at(1)),/must increase/)
 assert.throws(()=>recordObservation(...dirs,'a'.repeat(40),at(2)),/Invalid incident history/)
})
test('history corruption and unrelated paths fail closed',t=>{
 const dirs=setup(t);recordObservation(...dirs,rev,at(0))
 const file=join(dirs[0],'00000001.json');writeFileSync(file,'{}')
 assert.throws(()=>recordObservation(...dirs,rev,at(1)),/Invalid incident history/)
 assert.equal(readFileSync(file,'utf8'),'{}')
 assert.throws(()=>recordObservation(dirs[1],dirs[1],dirs[2],rev,at(2)),/separate/)
})
test('absence, recurrence and unknown coverage do not imply closure',()=>{
 const i={id:'a',source:'registry',code:'EXAMPLE',severity:'REVIEW'}
 const e=(n,incidents,coverage)=>({observedAt:at(n).observedAt,incidents,coverage:{registry:coverage}})
 assert.equal(summarizeHistory([e(0,[i],true),e(1,[],false)])[0].state,'UNKNOWN_COVERAGE')
 assert.equal(summarizeHistory([e(0,[i],true),e(1,[],true)])[0].state,'NOT_OBSERVED')
 assert.equal(summarizeHistory([e(0,[i],true),e(1,[],true),e(2,[i],true)])[0].state,'RECURRING')
})
