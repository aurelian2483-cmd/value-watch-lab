import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,realpathSync,rmSync,writeFileSync,readFileSync,symlinkSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {build,verifySnapshot} from './overview.mjs'
import {render} from './website.mjs'
function fixture(t){const p=realpathSync(mkdtempSync(join(tmpdir(),'unified-centre-')));t.after(()=>rmSync(p,{recursive:true,force:true}));return p}
test('all missing summaries remain unknown and six modules remain navigable',t=>{
 const p=fixture(t),r=build(p)
 assert.equal(r.modules.length,6);assert.equal(r.counts.available,0)
 assert.ok(r.modules.every(m=>m.status==='UNKNOWN'&&m.metrics.length===0))
 assert.equal(r.publicationGate,'BLOCKED');assert.equal(r.executionAuthorized,false)
 const html=render(r)
 assert.match(html,/0 \/ 6 summary contracts checked/)
 assert.doesNotMatch(html,/<(?:script|button|iframe|form)\b/i)
})
test('catalogue count relationships are checked without modifying source',t=>{
 const p=fixture(t),file=join(p,'catalogue.json'),data=JSON.stringify({registered:10,target:1000,remaining:990,qualified:0,byClassification:{synthetic:10}})
 writeFileSync(file,data)
 const r=build(p);assert.equal(r.counts.available,1)
 assert.equal(r.modules[0].metrics[0].value,10);assert.equal(readFileSync(file,'utf8'),data)
 assert.deepEqual(build(p),r)
 writeFileSync(file,JSON.stringify({registered:10,target:1000,remaining:990,qualified:1,byClassification:{synthetic:10}}))
 assert.equal(build(p).modules[0].evidenceState,'INVALID_CONTRACT')
})
test('wrong revisions and promoted flags are rejected',t=>{
 const p=fixture(t)
 writeFileSync(join(p,'lab.json'),JSON.stringify({kind:'SYNTHETIC_LAB_CONTROL_CENTRE_STATUS',schemaVersion:1,researchOnly:true,publicationGate:'OPEN',executionAuthorized:false,validationAuthorized:false}))
 assert.equal(build(p).modules[2].evidenceState,'INVALID_CONTRACT')
 const r=build(p);assert.throws(()=>render({...r,executionAuthorized:true}));assert.throws(()=>verifySnapshot({...r,status:'READY'}))
})
test('symlink summary is never followed',t=>{
 const p=fixture(t),outside=fixture(t)
 writeFileSync(join(outside,'record.json'),'{}')
 symlinkSync(join(outside,'record.json'),join(p,'catalogue.json'))
 assert.equal(build(p).modules[0].evidenceState,'UNSAFE')
})

test('rehashed snapshots cannot promote missing evidence or falsify coverage',async t=>{
 const {digest}=await import('../scientific-reference/digest.mjs')
 const p=fixture(t),r=build(p)
 const changes=[
  x=>{x.status='READY'},
  x=>{x.counts.available=6;x.counts.unavailable=0},
  x=>{x.modules.pop()},
  x=>{x.modules[1]=structuredClone(x.modules[0])},
  x=>{x.modules[0].source.head='0'.repeat(40)},
  x=>{x.modules[0].status='VALIDATED'},
  x=>{x.modules[0].metrics=[{label:'Qualified',value:1000}]},
  x=>{x.modules[0].notes=['Publication authorised']},
  x=>{x.limitations=[]}
 ]
 for(const change of changes){
  const copy=structuredClone(r);change(copy)
  delete copy.snapshotSha256;copy.snapshotSha256=digest(copy)
  assert.throws(()=>verifySnapshot(copy));assert.throws(()=>render(copy))
 }
})
test('rehashed available catalogue cannot display contradictory counts or arbitrary labels',async t=>{
 const {digest}=await import('../scientific-reference/digest.mjs')
 const p=fixture(t)
 writeFileSync(join(p,'catalogue.json'),JSON.stringify({registered:10,target:1000,remaining:990,qualified:0,byClassification:{synthetic:10}}))
 const r=build(p);assert.equal(verifySnapshot(r),true)
 for(const change of [m=>{m.metrics[3].value=10},m=>{m.metrics[2].value=989},m=>{m.metrics[0].label='Qualified winners'},m=>{m.status='VALIDATED'},m=>{m.receiptSha256=null}]){
  const copy=structuredClone(r);change(copy.modules[0]);delete copy.snapshotSha256;copy.snapshotSha256=digest(copy)
  assert.throws(()=>verifySnapshot(copy))
 }
})
