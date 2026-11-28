import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,rmSync,writeFileSync,readFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {createHash} from 'node:crypto'
import {inventoryHistorical} from './experiment-registry-historical-evidence.mjs'
const row={competition:'Example',home:'A',away:'B',kickoff_utc:'2026-08-28T23:59:59Z',actual_outcome:'H',score_home:2,score_away:1,source_url:'https://example.org/results.csv',upstream_provider:'example',time_precision:'DATE_ONLY_END_OF_DAY'}
function setup(t,results,overrides={}){
 const dir=mkdtempSync(join(tmpdir(),'vw-evidence-'))
 t.after(()=>rmSync(dir,{recursive:true,force:true}))
 const path=join(dir,'historical-reliability-data.json')
 writeFileSync(path,JSON.stringify({schema_version:1,research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED',source_verification:'SINGLE_SOURCE_UNVERIFIED',generated_at_utc:'2026-11-24T01:42:08Z',results,...overrides}))
 return {dir,path}
}
test('reconciles duplicates conflicts and malformed rows without modifying source',t=>{
 const {dir,path}=setup(t,[row,row,{...row,home:'C'},{...row,home:'C',score_home:3},{...row,home:'D',actual_outcome:'A'},{...row,home:'E'}])
 const before=readFileSync(path)
 const r=inventoryHistorical(dir)
 assert.deepEqual(r.counts,{input:6,accepted:2,duplicates:1,conflicting:2,rejected:1})
 assert.equal(r.competitions.Example,2)
 assert.equal(r.sourceSha256,createHash('sha256').update(before).digest('hex'))
 assert.equal(r.prospectiveEligible,false)
 assert.equal(r.validationEligible,false)
 assert.equal(r.executionAuthorized,false)
 assert.deepEqual(readFileSync(path),before)
})
test('rejects unsupported headers and malformed timestamp precision',t=>{
 const a=setup(t,[row],{publication_gate:'OPEN'})
 assert.throws(()=>inventoryHistorical(a.dir),/Unsupported historical/)
 const b=setup(t,[{...row,time_precision:'EXACT'},{...row,source_url:'http://example.org'}])
 assert.equal(inventoryHistorical(b.dir).counts.rejected,2)
})
test('inventories checked-in source without promoting evidence',()=>{
 const r=inventoryHistorical(fileURLToPath(new URL('../../',import.meta.url)))
 assert.equal(r.counts.input,r.counts.accepted+r.counts.duplicates+r.counts.conflicting+r.counts.rejected)
 assert.equal(r.evidenceTier,'SINGLE_SOURCE_UNVERIFIED')
 assert.equal(r.publicationGate,'BLOCKED')
})
