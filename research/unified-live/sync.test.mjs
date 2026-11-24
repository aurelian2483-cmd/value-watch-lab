import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createHash,generateKeyPairSync,sign} from 'node:crypto'
import {mkdtempSync,mkdirSync,realpathSync,rmSync,writeFileSync,readFileSync,symlinkSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {synchronise,status,checkpoint,recover} from './sync.mjs'
import {digest} from '../scientific-reference/digest.mjs'
import {signedSynchronise,signatureMessage} from './producer-intake.mjs'
import {createCollector,collect} from './collector.mjs'
import {reviewRevision} from './revision-review.mjs'
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

test('stored signed proof survives checkpoint recovery and expiry without promoting measurement freshness',t=>{
 const f=setup(t),s=signedFixture(f);signed(f,s)
 const before=stored(f),current=JSON.parse(before)
 assert.equal(current.authentication.trustSha256,s.trustSha)
 assert.equal(current.authentication.kind,'SIGNED_LOCAL_ACCEPTANCE_V1')
 const late=status(f.state,{now:T3})
 assert.equal(late.authentication.mode,'SIGNATURES_REVERIFIED_AT_ACCEPTANCE')
 assert.equal(late.authentication.independentTrustRechecked,false)
 assert.equal(late.measurementFreshness,'UNKNOWN')
 assert.equal(late.syncStatus,'STALE')
 const backup=join(f.root,'backup'),restored=join(f.root,'restored')
 mkdirSync(backup);mkdirSync(restored)
 const receipt=checkpoint(f.state,backup)
 recover(backup,restored,receipt.checkpointSha256,1)
 assert.deepEqual(status(restored,{now:T3}),late)
 assert.deepEqual(stored(f),before)
})
test('signed state cannot silently downgrade or switch trusted keys',t=>{
 const f=setup(t),s=signedFixture(f);signed(f,s);const before=stored(f)
 assert.throws(()=>sync(f,s.approvalSha),/requires signed intake/)
 const changed=signedFixture(f,{sequence:2})
 assert.throws(()=>signed(f,changed),/rotation requires separate reviewed migration/)
 assert.deepEqual(stored(f),before)
 const next=signedFixture(f,{sequence:2,privateKeys:s.pairs})
 assert.equal(signed(f,next).sequence,2)
})
test('manual replay cannot be retroactively marked signed',t=>{
 const f=setup(t),s=signedFixture(f);sync(f,s.approvalSha);const before=stored(f)
 assert.throws(()=>signed(f,s),/Replay cannot change authentication mode/)
 assert.deepEqual(stored(f),before)
 assert.equal(status(f.state,{now:T}).authentication.mode,'MANUAL_DIGEST_APPROVAL')
})
test('rehashed stored state with altered cryptographic evidence fails verification',t=>{
 const f=setup(t),s=signedFixture(f);signed(f,s)
 const current=JSON.parse(stored(f)),bundle=JSON.parse(Buffer.from(current.authentication.signatureBundleBytes,'base64').toString('utf8'))
 bundle.signatures[0].signature=Buffer.alloc(64).toString('base64')
 const raw=JSON.stringify(bundle)
 current.authentication.signatureBundleBytes=Buffer.from(raw).toString('base64')
 current.authentication.signatureBundleSha256=hash(raw)
 delete current.stateSha256;current.stateSha256=digest(current)
 writeFileSync(join(f.state,'current.json'),JSON.stringify(current))
 assert.throws(()=>status(f.state,{now:T}),/signature verification failed/)
})

test('external trust and exact state anchors are opt-in and independently matched',t=>{
 const f=setup(t),s=signedFixture(f);signed(f,s)
 const current=JSON.parse(stored(f)),anchor={trustedTrustSha256:s.trustSha,trustedStateSha256:current.stateSha256}
 const view=status(f.state,{now:T3,...anchor})
 assert.equal(view.authentication.independentTrustRechecked,true)
 assert.equal(view.authentication.independentStateRechecked,true)
 assert.equal(view.measurementFreshness,'UNKNOWN')
 assert.equal(view.syncStatus,'STALE')
 assert.equal(status(f.state,{now:T3,trustedTrustSha256:s.trustSha}).authentication.independentStateRechecked,false)
 assert.throws(()=>status(f.state,{now:T,...anchor,trustedTrustSha256:'0'.repeat(64)}),/trust anchor mismatch/)
 assert.throws(()=>status(f.state,{now:T,...anchor,trustedStateSha256:'0'.repeat(64)}),/state anchor mismatch/)
 assert.throws(()=>status(f.state,{now:T,trustedStateSha256:current.stateSha256}),/Invalid external state anchor/)
 assert.throws(()=>status(f.state,{now:T,trustedTrustSha256:'bad'}),/Invalid external trust anchor/)
})
test('external anchor rejects valid substituted trust registry, stripped proof and changed state',t=>{
 const f=setup(t),s=signedFixture(f);signed(f,s)
 const original=JSON.parse(stored(f)),path=join(f.state,'current.json')
 const substitute=signedFixture(f)
 const replacement={...original.authentication,trustSha256:substitute.trustSha,trustBytes:readFileSync(substitute.trustPath).toString('base64'),signatureBundleSha256:hash(readFileSync(substitute.sigPath)),signatureBundleBytes:readFileSync(substitute.sigPath).toString('base64')}
 function rewrite(change){
  const v=structuredClone(original);change(v);delete v.stateSha256;v.stateSha256=digest(v)
  writeFileSync(path,JSON.stringify(v))
 }
 rewrite(v=>{v.authentication=replacement})
 assert.equal(status(f.state,{now:T}).authentication.independentTrustRechecked,false)
 assert.throws(()=>status(f.state,{now:T,trustedTrustSha256:s.trustSha}),/trust anchor mismatch/)
 rewrite(v=>{v.authentication=null})
 assert.throws(()=>status(f.state,{now:T,trustedTrustSha256:s.trustSha}),/signed state unavailable/)
 rewrite(v=>{v.firstSeen[0].at='2026-11-24T21:00:00.000Z'})
 assert.throws(()=>status(f.state,{now:T,trustedTrustSha256:s.trustSha,trustedStateSha256:original.stateSha256}),/state anchor mismatch/)
})
test('anchored viewer refuses mismatched startup and fails closed when accepted state changes',async t=>{
 const {startViewer}=await import('./viewer.mjs')
 const f=setup(t),s=signedFixture(f);signed(f,s)
 const original=JSON.parse(stored(f)),anchor={trustedTrustSha256:s.trustSha,trustedStateSha256:original.stateSha256}
 await assert.rejects(startViewer(f.state,{port:0,...anchor,trustedTrustSha256:'0'.repeat(64)}),/trust anchor mismatch/)
 const server=await startViewer(f.state,{port:0,...anchor})
 t.after(async()=>{await new Promise(ok=>server.close(ok))})
 const url='http://127.0.0.1:'+server.address().port
 const response=await fetch(url+'/status')
 assert.equal(response.status,200)
 assert.equal((await response.json()).authentication.independentStateRechecked,true)
 const home=await fetch(url+'/')
 assert.match(await home.text(),/External trust anchor: matched · External state anchor: matched/)
 const next=signedFixture(f,{sequence:2,privateKeys:s.pairs})
 signed(f,next)
 const rejected=await fetch(url+'/status')
 assert.equal(rejected.status,503)
 assert.match(await rejected.text(),/PUBLICATION BLOCKED/)
})

function collectionPlan(f,s,digests=[s.approvalSha]){
 const path=join(f.root,'collection-plan.json')
 const raw=JSON.stringify({kind:'APPROVED_COLLECTION_PLAN',schemaVersion:1,trustSha256:s.trustSha,approvedDigests:digests})
 writeFileSync(path,raw)
 return {path,sha:hash(raw)}
}
test('collector accepts only separately approved signed batches and skips processed approval',t=>{
 const f=setup(t),s=signedFixture(f)
 const plan=collectionPlan(f,s,['0'.repeat(64)])
 const waiting=createCollector(f.inbox,f.state,s.trustPath,plan.path,plan.sha)
 assert.equal(waiting.tick({now:T}).status,'WAITING_FOR_EXPLICIT_APPROVAL')
 assert.equal(status(f.state,{now:T}).snapshot,null)
 const approved=collectionPlan(f,s)
 const collector=createCollector(f.inbox,f.state,s.trustPath,approved.path,approved.sha)
 assert.equal(collector.tick({now:T}).status,'ACCEPTED')
 const before=stored(f)
 assert.equal(collector.tick({now:T2}).status,'ALREADY_PROCESSED')
 assert.deepEqual(stored(f),before)
 assert.equal(status(f.state,{now:T3}).syncStatus,'STALE')
})
test('collector retries a rejected batch only after valid inputs arrive and stops on changed trust',t=>{
 const f=setup(t),s=signedFixture(f),plan=collectionPlan(f,s)
 const collector=createCollector(f.inbox,f.state,s.trustPath,plan.path,plan.sha)
 const original=readFileSync(s.sigPath)
 writeFileSync(s.sigPath,'{invalid')
 assert.equal(collector.tick({now:T}).status,'SIGNED_BATCH_REJECTED')
 assert.equal(status(f.state,{now:T}).snapshot,null)
 writeFileSync(s.sigPath,original)
 assert.equal(collector.tick({now:T}).status,'ACCEPTED')
 const before=stored(f)
 writeFileSync(s.trustPath,'{}')
 assert.equal(collector.tick({now:T}).status,'TRUSTED_CONFIGURATION_CHANGED')
 assert.deepEqual(stored(f),before)
})
test('collector rejects untrusted or duplicate plans and separates control records',t=>{
 const f=setup(t),s=signedFixture(f),plan=collectionPlan(f,s)
 assert.throws(()=>createCollector(f.inbox,f.state,s.trustPath,plan.path,'f'.repeat(64)),/fingerprint mismatch/)
 const duplicates=collectionPlan(f,s,[s.approvalSha,s.approvalSha])
 assert.throws(()=>createCollector(f.inbox,f.state,s.trustPath,duplicates.path,duplicates.sha),/Invalid collection plan/)
 const unsafe=join(f.inbox,'plan.json');writeFileSync(unsafe,readFileSync(plan.path))
 assert.throws(()=>createCollector(f.inbox,f.state,s.trustPath,unsafe,hash(readFileSync(unsafe))),/separate/)
})
test('bounded collection lifecycle obeys cycle limit, stop signal and trust changes',async()=>{
 let ticks=0
 const collector={tick(){ticks++;return {status:'WAITING_FOR_EXPLICIT_APPROVAL'}}}
 assert.equal((await collect(collector,{maxCycles:1})).reason,'CYCLE_LIMIT')
 assert.equal(ticks,1)
 const ac=new AbortController()
 const stopped=await collect(collector,{maxCycles:3,signal:ac.signal,onReceipt:()=>ac.abort()})
 assert.equal(stopped.reason,'STOP_REQUESTED');assert.equal(stopped.cycles,1)
 const halted=await collect({tick:()=>({status:'TRUSTED_CONFIGURATION_CHANGED'})},{maxCycles:3})
 assert.equal(halted.reason,'TRUSTED_CONFIGURATION_STOP');assert.equal(halted.cycles,1)
 await assert.rejects(collect(collector,{intervalMs:1}),/Invalid polling bounds/)
 await assert.rejects(collect(collector,{intervalMs:60000,maxCycles:240}),/Invalid polling bounds/)
})

function revisionManifest(f,change=a=>a){
 const raw=JSON.stringify(change({kind:'SOURCE_REVISION_REVIEW',schemaVersion:1,
 baselinePinsSha256:hash(readFileSync(new URL('../unified-control-centre/source-pins.json',import.meta.url))),
 sources:pins.map(({id,head,reportRevision,run,artifact,file})=>({id,head,reportRevision,run,artifact,summarySha256:hash(readFileSync(join(f.inbox,file)))}))}))
 const path=join(f.root,'revision-review.json');writeFileSync(path,raw)
 return {path,sha:hash(raw)}
}
test('isolated revision review validates unchanged baseline without writing accepted state',t=>{
 const f=setup(t);sync(f,approve(f.inbox));const before=stored(f)
 const m=revisionManifest(f),r=reviewRevision(f.inbox,m.path,m.sha)
 assert.equal(r.status,'NO_REVISION_CHANGE');assert.equal(r.changedSources,0)
 assert.equal(r.rows.length,6);assert.equal(r.promotionAuthorized,false)
 assert.equal(r.activePinsModified,false);assert.equal(r.publicationGate,'BLOCKED')
 assert.deepEqual(reviewRevision(f.inbox,m.path,m.sha),r)
 assert.deepEqual(stored(f),before)
})
test('candidate revision is reviewed in isolation without changing current pins or approval state',t=>{
 const f=setup(t);sync(f,approve(f.inbox));const before=stored(f)
 const candidate=fixtures().data;candidate.declaredSourceRevision='b'.repeat(40)
 writeFileSync(join(f.inbox,'data.json'),JSON.stringify(candidate))
 const m=revisionManifest(f,a=>{
  Object.assign(a.sources[1],{head:'a'.repeat(40),reportRevision:'b'.repeat(40),run:111,artifact:222});return a
 })
 const result=reviewRevision(f.inbox,m.path,m.sha)
 assert.equal(result.status,'COMPATIBLE_CANDIDATE_REQUIRES_INDEPENDENT_REVIEW')
 assert.equal(result.changedSources,1);assert.equal(result.rows[1].originStatus,'DECLARED_REVIEW_INPUT_NOT_INDEPENDENTLY_VERIFIED')
 assert.equal(result.promotionAuthorized,false)
 assert.throws(()=>sync(f,approve(f.inbox,2,T2),T2))
 assert.deepEqual(stored(f),before)
})
test('revision review rejects stale workflow identity, wrong contract, wrong hashes and unsafe paths',t=>{
 const f=setup(t)
 let m=revisionManifest(f,a=>{a.sources[1].head='a'.repeat(40);return a})
 assert.throws(()=>reviewRevision(f.inbox,m.path,m.sha),/distinct workflow/)
 m=revisionManifest(f,a=>{a.sources[1].run=a.sources[2].run;return a})
 assert.throws(()=>reviewRevision(f.inbox,m.path,m.sha))
 m=revisionManifest(f,a=>{a.baselinePinsSha256='0'.repeat(64);return a})
 assert.throws(()=>reviewRevision(f.inbox,m.path,m.sha),/baseline/)
 m=revisionManifest(f)
 assert.throws(()=>reviewRevision(f.inbox,m.path,'0'.repeat(64)),/fingerprint mismatch/)
 writeFileSync(join(f.inbox,'lab.json'),'{invalid')
 assert.throws(()=>reviewRevision(f.inbox,m.path,m.sha),/fingerprint mismatch/)
 m=revisionManifest(f)
 assert.throws(()=>reviewRevision(f.inbox,m.path,m.sha),/contract rejected/)
 const unsafe=join(f.inbox,'review.json');writeFileSync(unsafe,readFileSync(m.path))
 assert.throws(()=>reviewRevision(f.inbox,unsafe,hash(readFileSync(unsafe))),/separate/)
})
