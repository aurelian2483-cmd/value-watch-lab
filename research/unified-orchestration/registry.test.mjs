import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createHash,generateKeyPairSync,sign} from 'node:crypto'
import {mkdtempSync,mkdirSync,realpathSync,rmSync,writeFileSync,readFileSync,symlinkSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {synchronise,status} from '../unified-live/sync.mjs'
import {digest} from '../scientific-reference/digest.mjs'
import {signedSynchronise,signatureMessage} from '../unified-live/producer-intake.mjs'
import {inspect,advance,setReviewControl} from './registry.mjs'
import {inspectQueue,reviewQueue} from './producer-queue.mjs'
import {startDashboard} from './dashboard.mjs'
import {request} from 'node:http'
const pins=JSON.parse(readFileSync(new URL('../unified-control-centre/source-pins.json',import.meta.url),'utf8'))
const hash=x=>createHash('sha256').update(x).digest('hex')
const T='2026-11-24T22:00:00.000Z',T2='2026-11-24T23:00:00.000Z',T3='2026-11-25T00:00:01.000Z'
const gate={schemaVersion:1,researchOnly:true,publicationGate:'BLOCKED',executionAuthorized:false,validationAuthorized:false}
const pin=id=>pins.find(p=>p.id===id)
const withHash=(r,canonical=false)=>({...r,dashboardSha256:canonical?digest(r):hash(JSON.stringify(r))})
function fixtures(){
 const checks=Object.fromEntries(['knownAnswer','analyticalReference','persisted','parallel'].map(k=>[k,{total:5,passed:5,failed:0}]))
 const cpu={mode:'cpu',hardwareIndependentlyVerified:false,status:'RECORDED_LOCAL_PASS',receiptSha256:'a'.repeat(64),passedWorkloads:2,benchmarkRows:4}
 const gpu={mode:'gpu',hardwareIndependentlyVerified:false,status:'NOT_SUPPLIED',receiptSha256:null,passedWorkloads:null,benchmarkRows:null}
 return {
 catalogue:{registered:10,target:1000,remaining:990,qualified:0,byClassification:{synthetic:10}},
 data:{...gate,kind:'INTEGRATED_RESEARCH_DATA_STATUS',declaredSourceRevision:pin('data').reportRevision,modelValidation:'UNVALIDATED',sourceMutationAuthorized:false,accessAuthorized:false,dataQuality:{sourceCount:9,filesPresent:9,sourcesRequiringReview:9,aggregateCountsAgree:true}},
 lab:{...gate,kind:'SYNTHETIC_LAB_CONTROL_CENTRE_STATUS',declaredCodeRevision:pin('lab').reportRevision,modelValidation:'UNVALIDATED',expectedFixtures:5,status:'SYNTHETIC_QA_PASSED',checks},
 compute:{...gate,kind:'SCIENTIFIC_COMPUTE_CONTROL_CENTRE_STATUS',declaredRevision:pin('compute').reportRevision,hardwareIndependentlyVerified:false,cpu,gpu,status:'CPU_LOCAL_EVIDENCE_AVAILABLE'},
 supervisor:withHash({...gate,kind:'RESEARCH_SUPERVISOR_DASHBOARD',declaredRevision:pin('supervisor').reportRevision,repairAuthorized:false,observedAt:T,monitoringService:'NOT_STARTED_BY_DASHBOARD',incidentCounts:{blocking:0,review:0},recommendations:[],registryCounts:{COMPLETED:0},status:'NO_INCIDENTS_OBSERVED'}),
 references:withHash({...gate,kind:'SCIENTIFIC_REFERENCE_DASHBOARD',asOf:'2026-11-24',status:'REVIEW_REQUIRED',counts:{sources:1,claims:1,recordedLocatorReviews:1,recordedMetadataReviews:0,comparablePairs:0,potentialConflicts:0,independentlyReviewed:0,rightsVerified:0,empiricallyQualified:0},sources:[{claims:[{}]}],comparisonCoverage:'NO_COMPARABLE_PAIRS'},true)
 }
}
function setup(t){
 const root=realpathSync(mkdtempSync(join(tmpdir(),'live-sync-test-'))),inbox=join(root,'inbox'),state=join(root,'state')
 mkdirSync(inbox);mkdirSync(state);t.after(()=>rmSync(root,{recursive:true,force:true}))
 for(const [id,r] of Object.entries(fixtures()))writeFileSync(join(inbox,id+'.json'),JSON.stringify(r))
 return {root,inbox,state}
}
function approve(inbox,sequence=1,approvedAt=T,change=a=>a){
 const a=change({kind:'APPROVED_SUMMARY_BATCH',schemaVersion:1,sequence,approvedAt,sources:pins.map(({id,head,reportRevision,run,artifact,file})=>({id,head,reportRevision,run,artifact,summarySha256:hash(readFileSync(join(inbox,file)))}))})
 const b=JSON.stringify(a);writeFileSync(join(inbox,'approval.json'),b);return hash(b)
}
const sync=(f,h,now=T)=>synchronise(f.inbox,f.state,h,{now})
const stored=f=>readFileSync(join(f.state,'current.json'))

function planFixture(t,{signed=false}={}){
 const f=setup(t),registry=join(f.root,'registry'),path=join(f.root,'plan.json')
 mkdirSync(registry)
 const h=approve(f.inbox)
 let trustSha256=null
 if(signed){
  const a=JSON.parse(readFileSync(join(f.inbox,'approval.json')))
  const pairs=pins.map(()=>generateKeyPairSync('ed25519'))
  const producers=pins.map((p,i)=>{
   const der=pairs[i].publicKey.export({type:'spki',format:'der'})
   return {id:p.id,publicKeyDer:der.toString('base64'),keySha256:hash(der)}
  })
  const trustRaw=JSON.stringify({kind:'TRUSTED_RESEARCH_PRODUCERS',schemaVersion:1,producers}),trustPath=join(f.root,'trust.json')
  trustSha256=hash(trustRaw);writeFileSync(trustPath,trustRaw)
  const signatures=a.sources.map((s,i)=>{
   const keySha256=producers[i].keySha256,signedAt=T,expiresAt=T2
   return {id:s.id,keySha256,signedAt,expiresAt,signature:sign(null,signatureMessage({...s,approvalSha256:h,sequence:1,signedAt,expiresAt,keySha256}),pairs[i].privateKey).toString('base64')}
  })
  writeFileSync(join(f.inbox,'producer-signatures.json'),JSON.stringify({kind:'SIGNED_RESEARCH_SUMMARIES',schemaVersion:1,signatures}))
  signedSynchronise(f.inbox,f.state,trustPath,trustSha256,h,{now:T})
 }else sync(f,h)
 const plan={kind:'APPROVED_ORCHESTRATION_REVIEW',schemaVersion:1,baseRevision:'79379e17c448f17404d0df70d76b87fcb4f51504',stateSha256:status(f.state,{now:T}).stateSha256,trustSha256,mode:signed?'SIGNED_REPORT_REVIEW':'HISTORICAL_MANUAL_REVIEW'}
 const raw=JSON.stringify(plan);writeFileSync(path,raw)
 return {...f,registry,path,plan,sha:hash(raw),before:stored(f)}
}
const args=f=>[f.state,f.registry,f.path,f.sha]
const read=f=>inspect(...args(f),{now:T})
const step=(f,previous)=>advance(...args(f),previous,{now:T})
test('persistent seven-task dependency review completes without executing or modifying source evidence',t=>{
 const f=planFixture(t)
 let s=read(f)
 assert.equal(s.status,'NOT_INITIALIZED');assert.equal(s.reviewed,0)
 assert.equal(s.tasks.filter(x=>x.status==='READY_FOR_METADATA_REVIEW').length,3)
 for(let i=0;i<7;i++){
  s=step(f,s.registrySha256)
  assert.equal(s.reviewed,i+1)
  assert.equal(s.executionAuthorized,false);assert.equal(s.publicationGate,'BLOCKED')
  assert.deepEqual(inspect(...args(f),{now:T,trustedRegistrySha256:s.registrySha256}),s)
 }
 assert.equal(s.status,'METADATA_REVIEW_COMPLETE_EXECUTION_BLOCKED')
 const before=readFileSync(join(f.registry,'registry.json'))
 assert.deepEqual(step(f,s.registrySha256),s)
 assert.deepEqual(readFileSync(join(f.registry,'registry.json')),before)
 assert.deepEqual(stored(f),f.before)
})
test('signed state is separately anchored and never upgrades research readiness',t=>{
 const f=planFixture(t,{signed:true}),s=step(f,null)
 assert.equal(s.mode,'SIGNED_REPORT_REVIEW');assert.equal(s.measurementFreshness,'UNKNOWN')
 assert.equal(s.modelValidation,'UNVALIDATED')
 assert.equal(s.accessAuthorized,false)
 assert.deepEqual(stored(f),f.before)
})
test('wrong plan, state anchor, registry anchor and stale writer are rejected',t=>{
 const f=planFixture(t),s=step(f,null),before=readFileSync(join(f.registry,'registry.json'))
 assert.throws(()=>advance(...args(f),null,{now:T}),/Previous registry anchor/)
 assert.throws(()=>inspect(...args(f),{now:T,trustedRegistrySha256:'0'.repeat(64)}),/external anchor mismatch/)
 assert.throws(()=>inspect(f.state,f.registry,f.path,'0'.repeat(64),{now:T}),/plan fingerprint mismatch/)
 const altered={...f.plan,stateSha256:'0'.repeat(64)},raw=JSON.stringify(altered)
 writeFileSync(f.path,raw)
 assert.throws(()=>inspect(f.state,f.registry,f.path,hash(raw),{now:T}),/evidence unavailable or changed/)
 assert.deepEqual(readFileSync(join(f.registry,'registry.json')),before)
})
test('corruption and recomputed forged task outcome fail closed',t=>{
 const f=planFixture(t);step(f,null)
 const path=join(f.registry,'registry.json'),v=JSON.parse(readFileSync(path))
 v.events[0].outcome.decision='EXECUTION_AUTHORIZED'
 delete v.events[0].eventSha256;v.events[0].eventSha256=digest(v.events[0])
 delete v.registrySha256;v.registrySha256=digest(v)
 writeFileSync(path,JSON.stringify(v))
 assert.throws(()=>read(f),/Invalid task receipt/)
 assert.throws(()=>step(f,v.registrySha256),/Invalid task receipt/)
 assert.deepEqual(stored(f),f.before)
})
test('registry clock, writer lock, source disappearance and unsafe layout are rejected',t=>{
 const f=planFixture(t),s=step(f,null)
 assert.throws(()=>inspect(...args(f),{now:'2026-11-24T21:00:00.000Z'}))
 mkdirSync(join(f.registry,'.orchestration-lock'))
 assert.throws(()=>step(f,s.registrySha256),/EEXIST/)
 rmSync(join(f.registry,'.orchestration-lock'),{recursive:true})
 assert.throws(()=>inspect(f.state,f.state,f.path,f.sha,{now:T}),/separate/)
 rmSync(join(f.state,'current.json'))
 assert.throws(()=>read(f),/evidence unavailable or changed/)
 assert.equal(JSON.parse(readFileSync(join(f.registry,'registry.json'))).registrySha256,s.registrySha256)
})
test('status cannot mutate dependency rules and historical receipt remains stale',t=>{
 const f=planFixture(t),s=step(f,null)
 s.tasks[3].requires.length=0
 const later=inspect(...args(f),{now:T3})
 assert.equal(later.tasks[3].requires.length,3)
 assert.equal(later.receiptFreshness,'STALE')
 assert.equal(later.measurementFreshness,'UNKNOWN')
})

test('dashboard exposes dependency lifecycle without mutating source or registry',async t=>{
 const f=planFixture(t),server=await startDashboard(...args(f),{port:0})
 t.after(async()=>{await new Promise(ok=>server.close(ok))})
 assert.equal(server.address().address,'127.0.0.1')
 const url='http://127.0.0.1:'+server.address().port
 const first=await fetch(url+'/status'),initial=await first.json()
 assert.equal(initial.reviewed,0);assert.equal(initial.externalRegistryAnchorMatched,false)
 assert.equal(first.headers.get('cache-control'),'no-store')
 assert.match(first.headers.get('content-security-policy'),/default-src 'none'/)
 let s=step(f,null)
 for(let i=1;i<7;i++)s=step(f,s.registrySha256)
 const before=readFileSync(join(f.registry,'registry.json'))
 const page=await fetch(url+'/')
 assert.match(await page.text(),/7 \/ 7 metadata reviews recorded/)
 assert.equal((await (await fetch(url+'/status')).json()).status,'METADATA_REVIEW_COMPLETE_EXECUTION_BLOCKED')
 assert.equal((await fetch(url+'/',{method:'HEAD'})).status,200)
 assert.equal((await fetch(url+'/',{method:'POST'})).status,405)
 assert.equal((await fetch(url+'/advance')).status,404)
 assert.equal((await fetch(url+'/',{headers:{Origin:'https://untrusted.example'}})).status,403)
 assert.deepEqual(readFileSync(join(f.registry,'registry.json')),before)
 assert.deepEqual(stored(f),f.before)
})
test('exact external registry anchor prevents display of later or corrupt registry states',async t=>{
 const f=planFixture(t),s=step(f,null)
 await assert.rejects(startDashboard(...args(f),{port:0,trustedRegistrySha256:'0'.repeat(64)}),/anchor mismatch/)
 const server=await startDashboard(...args(f),{port:0,trustedRegistrySha256:s.registrySha256})
 t.after(async()=>{await new Promise(ok=>server.close(ok))})
 const url='http://127.0.0.1:'+server.address().port
 assert.equal((await (await fetch(url+'/status')).json()).externalRegistryAnchorMatched,true)
 step(f,s.registrySha256)
 const res=await fetch(url+'/')
 assert.equal(res.status,503);assert.match(await res.text(),/EXECUTION BLOCKED/)
 writeFileSync(join(f.registry,'registry.json'),'{corrupt')
 assert.equal((await fetch(url+'/status')).status,503)
 assert.deepEqual(stored(f),f.before)
})
test('dashboard fails closed on missing pinned evidence and rejects forged host',async t=>{
 const f=planFixture(t),server=await startDashboard(...args(f),{port:0})
 t.after(async()=>{await new Promise(ok=>server.close(ok))})
 const port=server.address().port
 const code=await new Promise((ok,fail)=>{
  const req=request({host:'127.0.0.1',port,path:'/',headers:{Host:'untrusted.example'}},res=>{res.resume();res.on('end',()=>ok(res.statusCode))})
  req.on('error',fail);req.end()
 })
 assert.equal(code,403)
 rmSync(join(f.state,'current.json'))
 assert.equal((await fetch('http://127.0.0.1:'+port+'/status')).status,503)
})

const control=(f,action,registry,anchor,now=T)=>setReviewControl(...args(f),action,registry,anchor,{now})
test('operator pause and explicit resume persist across reload and require both anchors',t=>{
 const f=planFixture(t),s=step(f,null),before=readFileSync(join(f.registry,'registry.json'))
 const paused=control(f,'PAUSE',s.registrySha256,null)
 assert.equal(paused.control.status,'REVIEW_HOLD')
 assert.equal(read(f).control.controlSha256,paused.control.controlSha256)
 assert.throws(()=>step(f,s.registrySha256),/Control external anchor mismatch/)
 assert.throws(()=>advance(...args(f),s.registrySha256,{now:T,trustedControlSha256:paused.control.controlSha256}),/on hold/)
 assert.throws(()=>control(f,'RESUME',s.registrySha256,null),/Previous control anchor/)
 assert.deepEqual(readFileSync(join(f.registry,'registry.json')),before)
 const resumed=control(f,'RESUME',s.registrySha256,paused.control.controlSha256)
 assert.equal(resumed.control.status,'METADATA_REVIEW_AVAILABLE')
 assert.equal(resumed.control.events,2)
 assert.equal(resumed.executionAuthorized,false)
 const next=advance(...args(f),s.registrySha256,{now:T,trustedControlSha256:resumed.control.controlSha256})
 assert.equal(next.reviewed,2)
 assert.deepEqual(stored(f),f.before)
})
test('rejected advance records redacted persistent incident and holds further reviews',t=>{
 const f=planFixture(t),s=step(f,null),before=readFileSync(join(f.registry,'registry.json'))
 assert.throws(()=>step(f,null),/Previous registry anchor mismatch/)
 const observed=read(f),c=observed.control
 assert.equal(c.status,'REVIEW_HOLD');assert.equal(c.incidents,1)
 assert.equal(c.lastEvent.stage,'PREVIOUS_ANCHOR')
 assert.equal(c.lastEvent.registrySha256,s.registrySha256)
 assert.deepEqual(readFileSync(join(f.registry,'registry.json')),before)
 assert.doesNotMatch(readFileSync(join(f.registry,'control.json'),'utf8'),/Previous registry anchor mismatch|live-sync-test/)
 assert.throws(()=>advance(...args(f),s.registrySha256,{now:T,trustedControlSha256:c.controlSha256}),/on hold/)
 assert.equal(read(f).control.events,1)
 const resumed=control(f,'RESUME',s.registrySha256,c.controlSha256)
 assert.equal(resumed.control.incidents,1)
 assert.equal(resumed.control.events,2)
 assert.equal(resumed.publicationGate,'BLOCKED')
})
test('control tampering, removed ledger with external anchor and forged gate fail closed',t=>{
 const f=planFixture(t),s=step(f,null),p=control(f,'PAUSE',s.registrySha256,null)
 const path=join(f.registry,'control.json'),original=readFileSync(path),v=JSON.parse(original)
 v.executionAuthorized=true;delete v.controlSha256;v.controlSha256=digest(v)
 writeFileSync(path,JSON.stringify(v))
 assert.throws(()=>read(f),/Control ledger fingerprint or contract mismatch/)
 assert.throws(()=>advance(...args(f),s.registrySha256,{now:T,trustedControlSha256:p.control.controlSha256}))
 rmSync(path)
 assert.throws(()=>inspect(...args(f),{now:T,trustedControlSha256:p.control.controlSha256}),/Control external anchor mismatch/)
 assert.throws(()=>advance(...args(f),s.registrySha256,{now:T,trustedControlSha256:p.control.controlSha256}),/Control external anchor mismatch/)
 writeFileSync(path,original)
 assert.equal(read(f).control.status,'REVIEW_HOLD')
 assert.deepEqual(stored(f),f.before)
})
test('control ledger capacity stops further review without silently discarding history',t=>{
 const f=planFixture(t),s=step(f,null)
 let c=null
 for(let i=0;i<64;i++)c=control(f,i%2===0?'PAUSE':'RESUME',s.registrySha256,c?.control.controlSha256??null)
 assert.equal(c.control.capacityRemaining,0)
 assert.equal(c.control.events,64)
 assert.throws(()=>advance(...args(f),s.registrySha256,{now:T,trustedControlSha256:c.control.controlSha256}),/capacity reached/)
 assert.throws(()=>control(f,'PAUSE',s.registrySha256,c.control.controlSha256),/capacity reached/)
 assert.equal(read(f).control.events,64)
})

function queueFixture(t){
 const f=planFixture(t)
 let s=read(f)
 for(let i=0;i<7;i++)s=step(f,s.registrySha256)
 const queue=join(f.root,'queue'),qp=join(f.root,'queue-plan.json')
 mkdirSync(queue)
 const source=status(f.state,{now:T})
 const plan={kind:'APPROVED_SYNTHETIC_CONTRACT_QUEUE',schemaVersion:1,orchestrationPlanSha256:f.sha,evidenceStateSha256:s.evidenceStateSha256,registrySha256:s.registrySha256,controlSha256:s.control.controlSha256,requests:source.snapshot.modules.map(m=>({producerId:m.id,sourceHead:m.source.head,summarySha256:m.receiptSha256,operation:'SYNTHETIC_CONTRACT_CHECK',declaredBudget:{cpuSlots:1,memoryMiB:64,maxSeconds:5,gpu:false,network:false}}))}
 const raw=JSON.stringify(plan);writeFileSync(qp,raw)
 return {...f,queue,qp,queuePlan:plan,queuePlanSha:hash(raw),registryBefore:readFileSync(join(f.registry,'registry.json'))}
}
const qargs=f=>[...args(f),f.queue,f.qp,f.queuePlanSha]
const qread=f=>inspectQueue(...qargs(f),{now:T})
const qstep=(f,previous,id,action)=>reviewQueue(...qargs(f),previous,id,action,{now:T})
test('six producer contracts support explicit review and cancellation without dispatch',t=>{
 const f=queueFixture(t)
 let v=qread(f)
 assert.equal(v.pending,6);assert.equal(v.queueSha256,null)
 for(const [i,request] of f.queuePlan.requests.entries()){
  v=qstep(f,v.queueSha256,request.producerId,i===1?'CANCEL':'REVIEW')
  assert.equal(v.pending,5-i)
  assert.equal(v.dispatchAuthorized,false);assert.equal(v.executionAuthorized,false)
  assert.deepEqual(inspectQueue(...qargs(f),{now:T,trustedQueueSha256:v.queueSha256}),v)
 }
 assert.equal(v.reviewed,5);assert.equal(v.cancelled,1)
 assert.deepEqual(stored(f),f.before)
 assert.deepEqual(readFileSync(join(f.registry,'registry.json')),f.registryBefore)
})
test('producer queue rejects unapproved operation, extra fields, wrong revision and excessive resources',t=>{
 const f=queueFixture(t)
 for(const change of [
  r=>{r.operation='RUN_COMMAND'},
  r=>{r.command='unapproved'},
  r=>{r.sourceHead='0'.repeat(40)},
  r=>{r.summarySha256='0'.repeat(64)},
  r=>{r.declaredBudget.gpu=true},
  r=>{r.declaredBudget.memoryMiB=9999}
 ]){
  const p=structuredClone(f.queuePlan);change(p.requests[0])
  const raw=JSON.stringify(p);writeFileSync(f.qp,raw)
  assert.throws(()=>inspectQueue(...qargs({...f,queuePlanSha:hash(raw)}),{now:T}),/Unsupported, duplicate or unbound/)
 }
 const p=structuredClone(f.queuePlan);p.requests[1]=p.requests[0]
 const raw=JSON.stringify(p);writeFileSync(f.qp,raw)
 assert.throws(()=>inspectQueue(...qargs({...f,queuePlanSha:hash(raw)}),{now:T}),/duplicate/)
 assert.throws(()=>readFileSync(join(f.queue,'queue.json')),/ENOENT/)
})
test('queue rejects stale anchors, replay and held or changed control state',t=>{
 const f=queueFixture(t),v=qstep(f,null,'catalogue','REVIEW')
 const before=readFileSync(join(f.queue,'queue.json'))
 assert.throws(()=>qstep(f,null,'data','REVIEW'),/Previous queue anchor/)
 assert.throws(()=>qstep(f,v.queueSha256,'catalogue','REVIEW'),/already resolved/)
 assert.throws(()=>inspectQueue(...qargs(f),{now:T,trustedQueueSha256:'0'.repeat(64)}),/Queue external anchor/)
 const s=read(f),held=control(f,'PAUSE',s.registrySha256,null)
 assert.equal(held.control.status,'REVIEW_HOLD')
 assert.throws(()=>qstep(f,v.queueSha256,'data','REVIEW'),/control anchor mismatch/)
 assert.deepEqual(readFileSync(join(f.queue,'queue.json')),before)
 assert.deepEqual(stored(f),f.before)
})
test('queue enforces complete metadata reviews and independent storage paths',t=>{
 const f=queueFixture(t)
 rmSync(join(f.registry,'registry.json'))
 assert.throws(()=>qread(f),/Registry external anchor mismatch/)
 assert.throws(()=>inspectQueue(...qargs({...f,queue:f.state}),{now:T}),/must be separate/)
 assert.throws(()=>readFileSync(join(f.queue,'queue.json')),/ENOENT/)
})
test('queue corruption and rehashed forged dispatch outcome fail closed',t=>{
 const f=queueFixture(t),v=qstep(f,null,'catalogue','REVIEW')
 const file=join(f.queue,'queue.json'),q=JSON.parse(readFileSync(file))
 q.events[0].outcome='DISPATCH_AUTHORIZED'
 delete q.events[0].eventSha256;q.events[0].eventSha256=digest(q.events[0])
 delete q.queueSha256;q.queueSha256=digest(q)
 writeFileSync(file,JSON.stringify(q))
 assert.throws(()=>qread(f),/Queue event integrity mismatch/)
 assert.throws(()=>qstep(f,v.queueSha256,'data','REVIEW'),/Queue event integrity mismatch/)
 assert.deepEqual(stored(f),f.before)
})

test('dashboard presents the verified queue and does not expose a dispatch endpoint',async t=>{
 const f=queueFixture(t)
 const q=qstep(f,null,'catalogue','REVIEW')
 const server=await startDashboard(...args(f),{port:0,queueConfig:{directory:f.queue,planPath:f.qp,planSha256:f.queuePlanSha,trustedQueueSha256:q.queueSha256}})
 t.after(async()=>{await new Promise(ok=>server.close(ok))})
 const url='http://127.0.0.1:'+server.address().port
 const v=await (await fetch(url+'/status')).json()
 assert.equal(v.queue.status,'AVAILABLE');assert.equal(v.queue.anchored,true)
 assert.equal(v.queue.view.pending,5);assert.equal(v.queue.view.reviewed,1)
 assert.equal(v.queue.view.dispatchAuthorized,false)
 const html=await (await fetch(url+'/')).text()
 assert.match(html,/5 pending · 1 reviewed · 0 cancelled/)
 assert.match(html,/Dispatch blocked/)
 assert.equal((await fetch(url+'/dispatch',{method:'POST'})).status,405)
 assert.equal((await fetch(url+'/queue')).status,404)
 qstep(f,q.queueSha256,'data','CANCEL')
 const changed=await (await fetch(url+'/status')).json()
 assert.deepEqual(changed.queue,{status:'UNAVAILABLE'})
 assert.match(await (await fetch(url+'/')).text(),/Queue unavailable or changed/)
 assert.deepEqual(stored(f),f.before)
})
test('dashboard suppresses queue rows on changed control and absent configuration',async t=>{
 const f=queueFixture(t),cfg={directory:f.queue,planPath:f.qp,planSha256:f.queuePlanSha}
 const server=await startDashboard(...args(f),{port:0,queueConfig:cfg})
 t.after(async()=>{await new Promise(ok=>server.close(ok))})
 const url='http://127.0.0.1:'+server.address().port
 assert.equal((await (await fetch(url+'/status')).json()).queue.view.pending,6)
 const s=read(f);control(f,'PAUSE',s.registrySha256,null)
 const v=await (await fetch(url+'/status')).json()
 assert.equal(v.control.status,'REVIEW_HOLD');assert.deepEqual(v.queue,{status:'UNAVAILABLE'})
 const html=await (await fetch(url+'/')).text()
 assert.doesNotMatch(html,/data-producer=/)
 assert.match(html,/Metadata review on hold/)
})
