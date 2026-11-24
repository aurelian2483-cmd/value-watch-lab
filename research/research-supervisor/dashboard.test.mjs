import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,realpathSync,mkdirSync,rmSync,writeFileSync,readdirSync,readFileSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {createHash} from 'node:crypto'
import {dashboard,renderDashboard} from './dashboard.mjs'
const rev='c50b66a4c616222b516899ce3707d037fb1d5d4a',asOf='2026-11-24T21:10:00.000Z'
function setup(t){
 const d=realpathSync(mkdtempSync(join(tmpdir(),'supervisor-dashboard-')));t.after(()=>rmSync(d,{recursive:true,force:true}))
 return ['registry','reports'].map(n=>{const p=join(d,n);mkdirSync(p);return p})
}
test('dashboard uses fresh paired evidence and leaves originals unchanged',t=>{
 const dirs=setup(t),r=dashboard(...dirs,rev,{asOf})
 assert.equal(r.status,'REVIEW_REQUIRED')
 assert.deepEqual(r.incidentCounts,{blocking:0,review:3})
 assert.equal(r.monitoringService,'NOT_STARTED_BY_DASHBOARD')
 assert.equal(r.repairAuthorized,false)
 assert.equal(r.systems.length,3)
 assert.deepEqual(dashboard(...dirs,rev,{asOf}),r)
 const {dashboardSha256,...payload}=r
 assert.equal(dashboardSha256,createHash('sha256').update(JSON.stringify(payload)).digest('hex'))
 assert.deepEqual(readdirSync(dirs[0]),[]);assert.deepEqual(readdirSync(dirs[1]),[])
 const html=renderDashboard(r)
 assert.match(html,/PUBLICATION BLOCKED/)
 assert.match(html,/EVIDENCE_MISSING/)
 assert.doesNotMatch(html,/<(?:script|button|form|iframe)\b/i)
})
test('blocking source failure keeps counts unknown and preserves evidence',t=>{
 const dirs=setup(t),p=join(dirs[0],'unexpected')
 writeFileSync(p,'original')
 const r=dashboard(...dirs,rev,{asOf})
 assert.equal(r.status,'BLOCKED_PENDING_REVIEW')
 assert.equal(r.registryCounts,null)
 assert.equal(r.recommendations[0].priority,'BLOCKING')
 assert.match(renderDashboard(r),/Unavailable/)
 assert.equal(readFileSync(p,'utf8'),'original')
})
test('rendering escapes untrusted strings and revision mismatches reject',t=>{
 const dirs=setup(t),r=dashboard(...dirs,rev,{asOf})
 r.recommendations[0].recommendation='<script>alert(1)</script>'
 assert.match(renderDashboard(r),/&lt;script&gt;/)
 assert.doesNotMatch(renderDashboard(r),/<script>/)
 assert.throws(()=>dashboard(...dirs,'bad',{asOf}))
})
