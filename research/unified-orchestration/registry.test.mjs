import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createHash,generateKeyPairSync,sign} from 'node:crypto'
import {mkdtempSync,mkdirSync,realpathSync,rmSync,writeFileSync,readFileSync,symlinkSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {synchronise,status} from '../unified-live/sync.mjs'
import {digest} from '../scientific-reference/digest.mjs'
import {signedSynchronise,signatureMessage} from '../unified-live/producer-intake.mjs'
import {inspect,advance} from './registry.mjs'
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
