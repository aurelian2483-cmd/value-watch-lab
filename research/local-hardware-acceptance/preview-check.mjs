// Read-only localhost Phase 3 acceptance against an already verified extracted preview.
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {resolve,join} from 'node:path'
import {pathToFileURL} from 'node:url'
import {createHash} from 'node:crypto'
const root=resolve(process.argv[2]??'')
const raw=p=>readFileSync(join(root,p))
const json=p=>JSON.parse(raw(p))
const sha=b=>createHash('sha256').update(b).digest('hex')
assert.equal(process.argv.length,3)
assert.equal(Number(process.versions.node.split('.')[0]),22,'Node.js 22 required')
const state=json('evidence/current.json'),reg=json('registry/registry.json'),control=json('registry/control.json'),queue=json('queue/queue.json')
const op=join(root,'orchestration-plan.json'),qp=join(root,'queue-plan.json')
const {startDashboard}=await import(pathToFileURL(join(root,'research','unified-orchestration','dashboard.mjs')).href)
const {supervise}=await import(pathToFileURL(join(root,'research','unified-orchestration','operational-review.mjs')).href)
const args=[join(root,'evidence'),join(root,'registry'),op,sha(raw('orchestration-plan.json')),join(root,'queue'),qp,sha(raw('queue-plan.json'))]
const anchors={registrySha256:reg.registrySha256,controlSha256:control.controlSha256,queueSha256:queue.queueSha256}
const names=['evidence/current.json','registry/registry.json','registry/control.json','queue/queue.json','orchestration-plan.json','queue-plan.json']
const before=names.map(p=>sha(raw(p)))
const report=supervise(args,anchors)
assert.equal(report.status,'OPERATIONAL_READINESS_BLOCKED')
const server=await startDashboard(...args.slice(0,4),{port:0,trustedRegistrySha256:anchors.registrySha256,trustedControlSha256:anchors.controlSha256,queueConfig:{directory:args[4],planPath:qp,planSha256:args[6],trustedQueueSha256:anchors.queueSha256}})
try{
 const url='http://127.0.0.1:'+server.address().port
 const res=await fetch(url+'/status',{signal:AbortSignal.timeout(5000)})
 assert.equal(res.status,200)
 const s=await res.json()
 assert.equal(s.reviewed,7)
 assert.equal(s.queue.status,'AVAILABLE')
 assert.equal(s.queue.view.reviewed,6)
 assert.equal(s.externalRegistryAnchorMatched,true)
 assert.equal(s.externalControlAnchorMatched,true)
 assert.equal(s.queue.anchored,true)
 assert.equal(s.executionAuthorized,false)
 assert.equal(s.queue.view.dispatchAuthorized,false)
 const html=await (await fetch(url+'/',{signal:AbortSignal.timeout(5000)})).text()
 for(const gate of ['UNVALIDATED','PUBLICATION BLOCKED','EXECUTION BLOCKED'])assert.ok(html.includes(gate))
 assert.equal((await fetch(url+'/dispatch',{method:'POST',signal:AbortSignal.timeout(5000)})).status,405)
 assert.deepEqual(names.map(p=>sha(raw(p))),before)
 console.log(JSON.stringify({kind:'LOCAL_PHASE3_HTTP_ACCEPTANCE',status:'PASS',nodeVersion:process.versions.node,platform:process.platform,metadataReviews:s.reviewed,contractReviews:s.queue.view.reviewed,supervisorStatus:report.status,sourceStateSha256:state.stateSha256,filesUnchanged:true,dispatchRejected:true,executionAuthorized:false,publicationGate:'BLOCKED',modelValidation:'UNVALIDATED'}))
}finally{await new Promise(ok=>server.close(ok))}
