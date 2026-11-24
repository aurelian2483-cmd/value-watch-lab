import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,realpathSync,mkdirSync,rmSync,writeFileSync,readdirSync,readFileSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {createHash} from 'node:crypto'
import {inspectRegistry} from './supervisor.mjs'
import {inspectReports} from './report-monitor.mjs'
import {inspectAndPlan,planRecovery} from './recovery-plan.mjs'
const rev='bb1ed479cfe4341bb9c8a87377f0c80cfd75538d',asOf='2026-11-24T21:00:00.000Z'
function setup(t){
 const d=realpathSync(mkdtempSync(join(tmpdir(),'recovery-plan-')));t.after(()=>rmSync(d,{recursive:true,force:true}))
 return ['registry','reports'].map(n=>{const p=join(d,n);mkdirSync(p);return p})
}
test('missing GPU evidence is an acquisition review, not device failure',t=>{
 const [r,a]=setup(t),plan=inspectAndPlan(r,a,rev,{asOf})
 assert.equal(plan.status,'REVIEW_REQUIRED')
 assert.deepEqual(plan.counts,{blocking:0,review:3})
 const gpu=plan.steps.find(s=>s.subject==='scientific-gpu')
 assert.equal(gpu.category,'EVIDENCE_ACQUISITION')
 assert.match(gpu.recommendation,/not treat this as device failure/)
 assert.ok(plan.steps.every(s=>s.approvalRequired&&s.automaticAction===null))
 assert.equal(plan.repairAuthorized,false)
 assert.deepEqual(readdirSync(r),[]);assert.deepEqual(readdirSync(a),[])
 assert.deepEqual(inspectAndPlan(r,a,rev,{asOf}),plan)
 const {planSha256,...payload}=plan
 assert.equal(planSha256,createHash('sha256').update(JSON.stringify(payload)).digest('hex'))
})
test('blocking evidence issues are prioritised without modifying files',t=>{
 const [r,a]=setup(t),file=join(r,'unexpected')
 writeFileSync(file,'preserve me')
 const p=inspectAndPlan(r,a,rev,{asOf})
 assert.equal(p.status,'BLOCKED_PENDING_REVIEW')
 assert.equal(p.steps[0].priority,'BLOCKING')
 assert.equal(p.steps[0].category,'STORE_ACCESS_REVIEW')
 assert.equal(readFileSync(file,'utf8'),'preserve me')
})
test('changed evidence changes plan identity; malformed input fails closed',t=>{
 const [r,a]=setup(t),x=inspectRegistry(r,{asOf}),y=inspectReports(a,rev)
 const p=planRecovery(x,y,rev)
 assert.throws(()=>planRecovery(x,{...y,repairAuthorized:true},rev))
 assert.throws(()=>planRecovery(x,{...y,status:'NO_DETECTED_INCIDENTS'},rev))
 assert.throws(()=>planRecovery(x,{...y,incidents:[...y.incidents,y.incidents[0]]},rev))
 assert.throws(()=>planRecovery(x,{...y,incidents:[{...y.incidents[0],incidentId:'0'.repeat(64)}]},rev))
 writeFileSync(join(a,'lab-status.json'),'invalid')
 const changed=inspectAndPlan(r,a,rev,{asOf})
 assert.notEqual(changed.planSha256,p.planSha256)
 assert.equal(changed.status,'BLOCKED_PENDING_REVIEW')
})
