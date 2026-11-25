import {test} from 'node:test'
import assert from 'node:assert/strict'
import {fileURLToPath} from 'node:url'
import {mkdtempSync,rmSync,readdirSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {qualityReport} from './quality-report.mjs'
import {makeReviewPacket,reviewPacket,verifyPacket} from './review-packet.mjs'
const root=fileURLToPath(new URL('../../',import.meta.url)),rev='8054ea205042c8bf558b34c0c11f807068833007'
test('review handoff covers every allowlisted source without inventing approvals',()=>{
 const q=qualityReport(root,rev),p=makeReviewPacket(q)
 assert.equal(p.tasks.length,9)
 assert.equal(p.counts.documentaryReviewRequired+p.counts.sourceUnavailable,9)
 assert.equal(p.counts.independentlyVerified,0)
 assert.equal(new Set(p.tasks.map(t=>t.taskId)).size,9)
 assert.ok(p.tasks.every(t=>t.checklist.length===5&&!t.accessAuthorized&&!t.independentReviewRecorded))
 assert.ok(verifyPacket(p))
 assert.equal(makeReviewPacket(q).packetSha256,p.packetSha256)
 assert.ok(!verifyPacket({...p,accessAuthorized:true}))
 assert.ok(!verifyPacket({...p,counts:{...p.counts,independentlyVerified:9}}))
 assert.throws(()=>makeReviewPacket({...q,executionAuthorized:true}))
})
test('receipt changes create a different review binding',()=>{
 const q=qualityReport(root,rev),a=makeReviewPacket(q)
 const changed=structuredClone(q)
 changed.sources[0].sha256='b'.repeat(64)
 const b=makeReviewPacket(changed)
 assert.notEqual(a.tasks[0].taskId,b.tasks[0].taskId)
 assert.notEqual(a.packetSha256,b.packetSha256)
 assert.equal(b.accessAuthorized,false)
})
test('missing checkout data does not fabricate evidence',t=>{
 const d=mkdtempSync(join(tmpdir(),'review-packet-'));t.after(()=>rmSync(d,{recursive:true,force:true}))
 const p=reviewPacket(d,rev)
 assert.equal(p.counts.sourceUnavailable,9)
 assert.ok(p.tasks.every(x=>x.sourceSha256===null))
 assert.equal(p.counts.independentlyVerified,0)
 assert.deepEqual(readdirSync(d),[])
})
