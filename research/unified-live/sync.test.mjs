import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createHash,generateKeyPairSync,sign} from 'node:crypto'
import {mkdtempSync,mkdirSync,realpathSync,rmSync,writeFileSync,readFileSync,symlinkSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {synchronise,status,checkpoint,recover} from './sync.mjs'
import {digest} from '../scientific-reference/digest.mjs'
import {signedSynchronise,signatureMessage} from './producer-intake.mjs'
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
test('six approved summaries commit as one generation; source files unchanged',t=>{
 const f=setup(t),h=approve(f.inbox),before=pins.map(p=>readFileSync(join(f.inbox,p.file)))
 assert.equal(status(f.state,{now:T}).syncStatus,'NO_ACCEPTED_BATCH')
 const r=sync(f,h)
 assert.equal(r.status,'ACCEPTED');assert.equal(r.state.snapshot.counts.available,6)
 assert.equal(status(f.state,{now:T}).measurementFreshness,'UNKNOWN')
 assert.equal(r.state.publicationGate,'BLOCKED')
 pins.forEach((p,i)=>assert.deepEqual(readFileSync(join(f.inbox,p.file)),before[i]))
})
test('exact replay does not refresh receipt age or change bytes',t=>{
 const f=setup(t),h=approve(f.inbox);sync(f,h);const before=stored(f)
 assert.equal(sync(f,h,T2).status,'UNCHANGED')
 assert.deepEqual(stored(f),before)
 assert.equal(status(f.state,{now:T3}).syncStatus,'STALE')
 assert.ok(status(f.state,{now:T3}).sources.every(x=>x.receiptStatus==='STALE'))
})
test('explicit next approval preserves unchanged source receipt age',t=>{
 const f=setup(t);sync(f,approve(f.inbox))
 const cat=fixtures().catalogue;cat.registered=11;cat.remaining=989;cat.byClassification.synthetic=11
 writeFileSync(join(f.inbox,'catalogue.json'),JSON.stringify(cat))
 sync(f,approve(f.inbox,2,T2),T2)
 const s=status(f.state,{now:T3,maxAgeSeconds:4000})
 assert.equal(s.sequence,2);assert.equal(s.snapshot.modules[0].metrics[0].value,11)
 assert.equal(s.sources[0].receiptStatus,'RECENTLY_RECEIVED')
 assert.ok(s.sources.slice(1).every(x=>x.receiptStatus==='STALE'))
 assert.equal(s.measurementFreshness,'UNKNOWN')
})
test('corrupted, missing or unapproved inputs never overwrite accepted generation',t=>{
 const f=setup(t);sync(f,approve(f.inbox));const before=stored(f)
 const h=approve(f.inbox,2,T2)
 writeFileSync(join(f.inbox,'lab.json'),'{broken')
 assert.throws(()=>sync(f,h,T2));assert.deepEqual(stored(f),before)
 assert.throws(()=>sync(f,approve(f.inbox,2,T2),T2));assert.deepEqual(stored(f),before)
 rmSync(join(f.inbox,'compute.json'))
 assert.throws(()=>sync(f,h,T2));assert.deepEqual(stored(f),before)
})
test('wrong approval digest, source identity, sequence and chronology fail closed',t=>{
 const f=setup(t),h=approve(f.inbox)
 assert.throws(()=>sync(f,'0'.repeat(64)))
 sync(f,h);const before=stored(f)
 for(const [sequence,at,mutate] of [[3,T2,a=>a],[2,T3,a=>a],[2,T2,a=>{a.sources[0].head='0'.repeat(40);return a}]]){
  assert.throws(()=>sync(f,approve(f.inbox,sequence,at,mutate),T2));assert.deepEqual(stored(f),before)
 }
})
test('symlinks and concurrent writers rejected, last generation remains readable',t=>{
 const f=setup(t),h=approve(f.inbox);sync(f,h);const before=stored(f)
 mkdirSync(join(f.state,'.sync-lock'));assert.throws(()=>sync(f,h,T2));rmSync(join(f.state,'.sync-lock'),{recursive:true})
 const target=join(f.inbox,'catalogue.json'),outside=join(f.root,'outside.json')
 writeFileSync(outside,readFileSync(target));rmSync(target);symlinkSync(outside,target)
 assert.throws(()=>sync(f,h,T2));assert.deepEqual(stored(f),before)
 assert.throws(()=>synchronise(f.inbox,f.inbox,h,{now:T2}))
})
test('stored corruption or clock reversal never silently promotes evidence',t=>{
 const f=setup(t),h=approve(f.inbox);sync(f,h)
 assert.equal(status(f.state,{now:'2026-11-24T21:00:00.000Z'}).syncStatus,'CLOCK_UNCERTAIN')
 assert.throws(()=>sync(f,h,'2026-11-24T21:00:00.000Z'))
 const s=JSON.parse(stored(f));s.snapshot.publicationGate='OPEN'
 writeFileSync(join(f.state,'current.json'),JSON.stringify(s))
 assert.throws(()=>status(f.state,{now:T2}));assert.throws(()=>sync(f,h,T2))
})

test('checkpoint restores exact approved state into isolated directory, without refreshing evidence',t=>{
 const f=setup(t);sync(f,approve(f.inbox));const before=stored(f)
 const backup=join(f.root,'backup'),restored=join(f.root,'restored')
 mkdirSync(backup);mkdirSync(restored)
 const receipt=checkpoint(f.state,backup)
 assert.equal(receipt.sequence,1);assert.equal(receipt.checkpointSha256,hash(before))
 assert.deepEqual(readFileSync(join(backup,receipt.file)),before)
 const recovered=recover(backup,restored,receipt.checkpointSha256,receipt.sequence)
 assert.equal(recovered.stateSha256,receipt.stateSha256)
 assert.deepEqual(status(restored,{now:T3}),status(f.state,{now:T3}))
 assert.equal(status(restored,{now:T3}).syncStatus,'STALE')
 assert.deepEqual(stored(f),before)
 assert.throws(()=>checkpoint(f.state,backup))
 assert.throws(()=>recover(backup,restored,receipt.checkpointSha256,1))
 assert.throws(()=>recover(backup,f.state,receipt.checkpointSha256,1))
 assert.deepEqual(stored(f),before)
})
test('wrong trusted receipt, corrupt checkpoint and recovery lock fail closed',t=>{
 const f=setup(t);sync(f,approve(f.inbox))
 const backup=join(f.root,'backup'),restored=join(f.root,'restored')
 mkdirSync(backup);mkdirSync(restored)
 const receipt=checkpoint(f.state,backup),before=stored(f)
 assert.throws(()=>recover(backup,restored,'0'.repeat(64),1))
 assert.throws(()=>recover(backup,restored,receipt.checkpointSha256,2))
 mkdirSync(join(restored,'.sync-lock'))
 assert.throws(()=>recover(backup,restored,receipt.checkpointSha256,1))
 rmSync(join(restored,'.sync-lock'),{recursive:true})
 writeFileSync(join(backup,receipt.file),'{corrupt')
 assert.throws(()=>recover(backup,restored,receipt.checkpointSha256,1))
 assert.equal(status(restored,{now:T3}).syncStatus,'NO_ACCEPTED_BATCH')
 assert.deepEqual(stored(f),before)
})
test('checkpoint and recovery reject unsafe directories and existing dangling state links',t=>{
 const f=setup(t);sync(f,approve(f.inbox))
 const backup=join(f.root,'backup'),restored=join(f.root,'restored')
 mkdirSync(backup);mkdirSync(restored)
 const receipt=checkpoint(f.state,backup)
 assert.throws(()=>checkpoint(f.state,f.state))
 assert.throws(()=>recover(backup,backup,receipt.checkpointSha256,1))
 symlinkSync(join(f.root,'nonexistent'),join(restored,'current.json'))
 assert.throws(()=>recover(backup,restored,receipt.checkpointSha256,1))
 const original=readFileSync(join(backup,receipt.file))
 rmSync(join(backup,receipt.file))
 const outside=join(f.root,'outside.json');writeFileSync(outside,original)
 symlinkSync(outside,join(backup,receipt.file))
 rmSync(join(restored,'current.json'))
 assert.throws(()=>recover(backup,restored,receipt.checkpointSha256,1))
 assert.equal(status(restored,{now:T}).syncStatus,'NO_ACCEPTED_BATCH')
})
test('recovered sequence can continue through explicitly approved next batch',t=>{
 const f=setup(t);sync(f,approve(f.inbox))
 const backup=join(f.root,'backup'),restored=join(f.root,'restored')
 mkdirSync(backup);mkdirSync(restored)
 const receipt=checkpoint(f.state,backup)
 recover(backup,restored,receipt.checkpointSha256,1)
 const h=approve(f.inbox,2,T2)
 const r=synchronise(f.inbox,restored,h,{now:T2})
 assert.equal(r.state.sequence,2)
 assert.equal(r.state.previousApprovalSha256,JSON.parse(stored(f)).approvalSha256)
 assert.ok(status(restored,{now:T3}).sources.every(x=>x.receiptStatus==='STALE'))
 assert.equal(status(f.state,{now:T3}).sequence,1)
})

test('rejected batch receipt is redacted, bound to last accepted state and persists across reads',t=>{
 const f=setup(t),h=approve(f.inbox);sync(f,h);const before=stored(f)
 const next=approve(f.inbox,2,T2)
 writeFileSync(join(f.inbox,'data.json'),'private synthetic payload not for display')
 assert.throws(()=>sync(f,next,T2))
 const s=status(f.state,{now:T2})
 assert.equal(s.lastRejection.status,'REVIEW_REQUIRED')
 assert.equal(s.lastRejection.stage,'INPUT')
 assert.equal(s.lastRejection.previousSequence,1)
 assert.equal(s.lastRejection.automaticRepair,false)
 assert.equal(s.publicationGate,'BLOCKED')
 assert.deepEqual(stored(f),before)
 const raw=readFileSync(join(f.state,'last-rejection.json'),'utf8')
 assert.doesNotMatch(raw,/private synthetic payload|data\.json|live-sync-test/)
 assert.deepEqual(status(f.state,{now:T2}),s)
 writeFileSync(join(f.inbox,'data.json'),JSON.stringify(fixtures().data))
 sync(f,approve(f.inbox,2,T2),T2)
 assert.equal(status(f.state,{now:T2}).lastRejection.status,'HISTORICAL_REJECTION')
 assert.equal(status(f.state,{now:T2}).sequence,2)
})
test('initial rejection, damaged incident and clock uncertainty remain explicit',t=>{
 const f=setup(t),h=approve(f.inbox)
 assert.equal(status(f.state,{now:T}).lastRejection.status,'NO_REJECTION_RECORDED')
 assert.throws(()=>sync(f,'0'.repeat(64),T2))
 let s=status(f.state,{now:T2})
 assert.equal(s.syncStatus,'NO_ACCEPTED_BATCH')
 assert.equal(s.lastRejection.status,'REVIEW_REQUIRED')
 assert.equal(s.lastRejection.stage,'APPROVAL')
 assert.equal(s.lastRejection.previousSequence,null)
 assert.equal(status(f.state,{now:T}).lastRejection.status,'CLOCK_UNCERTAIN')
 sync(f,h,T2);const before=stored(f)
 assert.equal(status(f.state,{now:T2}).lastRejection.status,'HISTORICAL_REJECTION')
 writeFileSync(join(f.state,'last-rejection.json'),'{corrupt')
 s=status(f.state,{now:T2})
 assert.equal(s.lastRejection.status,'INCIDENT_EVIDENCE_UNAVAILABLE')
 assert.equal(s.snapshot.counts.available,6)
 assert.deepEqual(stored(f),before)
})
test('incident record tampering and rehashed unapproved action cannot authorize repair',t=>{
 const f=setup(t);sync(f,approve(f.inbox))
 assert.throws(()=>sync(f,'f'.repeat(64),T2))
 const path=join(f.state,'last-rejection.json'),r=JSON.parse(readFileSync(path,'utf8'))
 r.automaticRepair=true;delete r.incidentSha256;r.incidentSha256=digest(r)
 writeFileSync(path,JSON.stringify(r))
 const s=status(f.state,{now:T2})
 assert.equal(s.lastRejection.status,'INCIDENT_EVIDENCE_UNAVAILABLE')
 assert.equal(s.repairAuthorized,false)
 assert.equal(s.lastRejection.automaticRepair,false)
})

function signedFixture(f,{sequence=1,approvedAt=T,signedAt=T,expiresAt=T2,privateKeys=null}={}){
 const approvalSha=approve(f.inbox,sequence,approvedAt)
 const a=JSON.parse(readFileSync(join(f.inbox,'approval.json'),'utf8'))
 const pairs=privateKeys??pins.map(()=>generateKeyPairSync('ed25519'))
 const producers=pins.map((p,i)=>{
  const der=pairs[i].publicKey.export({format:'der',type:'spki'})
  return {id:p.id,publicKeyDer:der.toString('base64'),keySha256:hash(der)}
 })
 const trust={kind:'TRUSTED_RESEARCH_PRODUCERS',schemaVersion:1,producers}
 const trustPath=join(f.root,'trust.json'),trustRaw=JSON.stringify(trust)
 writeFileSync(trustPath,trustRaw)
 const bundle={kind:'SIGNED_RESEARCH_SUMMARIES',schemaVersion:1,signatures:a.sources.map((s,i)=>{
  const keySha256=producers[i].keySha256
  const signature=sign(null,signatureMessage({...s,approvalSha256:approvalSha,sequence,signedAt,expiresAt,keySha256}),pairs[i].privateKey).toString('base64')
  return {id:s.id,keySha256,signedAt,expiresAt,signature}
 })}
 const sigPath=join(f.inbox,'producer-signatures.json')
 writeFileSync(sigPath,JSON.stringify(bundle))
 return {approvalSha,trustPath,trustSha:hash(trustRaw),sigPath,bundle,pairs,trust}
}
const signed=(f,s,now=T)=>signedSynchronise(f.inbox,f.state,s.trustPath,s.trustSha,s.approvalSha,{now})
test('six distinct trusted signing keys authenticate approved reports; replay is idempotent',t=>{
 const f=setup(t),s=signedFixture(f)
 const receipt=signed(f,s)
 assert.equal(receipt.status,'ACCEPTED')
 assert.equal(receipt.producers.length,6)
 assert.equal(receipt.measurementFreshness,'UNKNOWN')
 assert.equal(receipt.publicationGate,'BLOCKED')
 const before=stored(f)
 assert.equal(signed(f,s,'2026-11-24T22:30:00.000Z').status,'UNCHANGED')
 assert.deepEqual(stored(f),before)
 assert.equal(status(f.state,{now:T}).snapshot.counts.available,6)
})
test('producer signature alteration or source substitution preserves accepted state',t=>{
 const f=setup(t),s=signedFixture(f);signed(f,s);const before=stored(f)
 const changed=structuredClone(s.bundle);changed.signatures[0].signature=Buffer.alloc(64).toString('base64')
 writeFileSync(s.sigPath,JSON.stringify(changed))
 assert.throws(()=>signed(f,s),/signature verification failed/)
 writeFileSync(s.sigPath,JSON.stringify(s.bundle))
 writeFileSync(join(f.inbox,'catalogue.json'),JSON.stringify({registered:1,target:1000,remaining:999,qualified:0,byClassification:{synthetic:1}}))
 assert.throws(()=>signed(f,s),/fingerprint mismatch/)
 assert.deepEqual(stored(f),before)
})
test('expired, future and incomplete signatures never create accepted state',t=>{
 const f=setup(t),s=signedFixture(f)
 assert.throws(()=>signed(f,s,T2),/time window/)
 const future=signedFixture(f,{signedAt:T2,expiresAt:'2026-11-25T00:00:00.000Z'})
 assert.throws(()=>signed(f,future),/time window/)
 future.bundle.signatures.pop()
 writeFileSync(future.sigPath,JSON.stringify(future.bundle))
 assert.throws(()=>signed(f,future),/Incomplete signatures/)
 assert.equal(status(f.state,{now:T}).snapshot,null)
})
test('trust registry substitution and duplicate producer keys are rejected',t=>{
 const f=setup(t),s=signedFixture(f)
 assert.throws(()=>signed(f,{...s,trustSha:'0'.repeat(64)}),/Trust registry fingerprint/)
 s.trust.producers[1]={...s.trust.producers[0],id:pins[1].id}
 const raw=JSON.stringify(s.trust);writeFileSync(s.trustPath,raw)
 assert.throws(()=>signed(f,{...s,trustSha:hash(raw)}),/duplicated producer key/)
 assert.equal(status(f.state,{now:T}).snapshot,null)
})
test('old signatures cannot authorize a different approval generation',t=>{
 const f=setup(t),s=signedFixture(f);signed(f,s);const before=stored(f)
 const h=approve(f.inbox,2,T)
 assert.throws(()=>signed(f,{...s,approvalSha:h}),/signature verification failed/)
 assert.deepEqual(stored(f),before)
 const next=signedFixture(f,{sequence:2,privateKeys:s.pairs})
 const result=signed(f,next)
 assert.equal(result.sequence,2)
 assert.equal(status(f.state,{now:T}).sequence,2)
})
