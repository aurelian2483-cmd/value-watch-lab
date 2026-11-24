// Explicit isolated activation of a reviewed candidate; no active-state replacement.
// Copies only the trusted implementation's fixed module allowlist, never candidate code.
import {createHash} from 'node:crypto'
import {lstatSync,realpathSync,mkdirSync,writeFileSync,rmSync,readFileSync} from 'node:fs'
import {resolve,dirname,relative,isAbsolute,sep,join} from 'node:path'
import {fileURLToPath,pathToFileURL} from 'node:url'
import {readBounded,status} from './sync.mjs'
import {reviewRevision} from './revision-review.mjs'
import {digest} from '../scientific-reference/digest.mjs'
const sourceRoot=realpathSync(fileURLToPath(new URL('../',import.meta.url)))
const pins=JSON.parse(readFileSync(join(sourceRoot,'unified-control-centre','source-pins.json'),'utf8'))
const runtimeFiles=['unified-live/sync.mjs','unified-live/authentication.mjs','unified-live/producer-intake.mjs','unified-live/viewer.mjs','unified-live/collector.mjs','unified-control-centre/overview.mjs','unified-control-centre/website.mjs','scientific-reference/digest.mjs']
const need=(x,m)=>{if(!x)throw Error(m)}
const sha=b=>createHash('sha256').update(b).digest('hex')
const hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x)
const keys=(o,a)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===a.length&&a.every(k=>Object.hasOwn(o,k))
const within=(a,b)=>{const p=relative(a,b);return p===''||(!isAbsolute(p)&&p!=='..'&&!p.startsWith('..'+sep))}
const root=p=>{const q=resolve(p);need(realpathSync(q)===q&&lstatSync(q).isDirectory(),'Unsafe directory');return q}
const separate=(a,b)=>need(!within(a,b)&&!within(b,a),'Activation locations must be separate')
export async function activateRevision(candidateDir,activeStateDir,trustPath,manifestPath,planPath,trustedPlanSha256,targetDir,{now=new Date().toISOString()}={}){
 const candidate=root(candidateDir),active=root(activeStateDir),target=resolve(targetDir)
 const trust=resolve(trustPath),manifest=resolve(manifestPath),planFile=resolve(planPath)
 separate(candidate,active);separate(candidate,target);separate(active,target);separate(sourceRoot,target)
 need(realpathSync(dirname(target))===dirname(target),'Unsafe activation parent')
 for(const path of [trust,manifest,planFile]){
  need(realpathSync(path)===path&&!within(candidate,path)&&!within(active,path)&&!within(target,path),'External review records must be separate')
 }
 need(new Set([trust,manifest,planFile]).size===3&&hex(trustedPlanSha256),'Invalid trusted plan input')
 const planRaw=readBounded(planFile,65536)
 need(sha(planRaw)===trustedPlanSha256,'Activation plan fingerprint mismatch')
 const plan=JSON.parse(planRaw.toString('utf8'))
 need(keys(plan,['kind','schemaVersion','manifestSha256','reviewSha256','baselineStateSha256','trustSha256','approvalSha256'])&&plan.kind==='APPROVED_ISOLATED_REVISION_ACTIVATION'&&plan.schemaVersion===1&&['manifestSha256','reviewSha256','baselineStateSha256','trustSha256','approvalSha256'].every(k=>hex(plan[k])),'Invalid activation plan')
 const trustRaw=readBounded(trust,65536)
 need(sha(trustRaw)===plan.trustSha256,'External trust registry mismatch')
 const baselineRaw=readBounded(join(active,'current.json'),16*1024*1024)
 const baseline=status(active,{now,trustedTrustSha256:plan.trustSha256,trustedStateSha256:plan.baselineStateSha256})
 const review=reviewRevision(candidate,manifest,plan.manifestSha256)
 need(review.reviewSha256===plan.reviewSha256&&review.changedSources>0,'Reviewed changed revision required')
 const approvalRaw=readBounded(join(candidate,'approval.json'),65536)
 need(sha(approvalRaw)===plan.approvalSha256,'Candidate approval fingerprint mismatch')
 const approval=JSON.parse(approvalRaw.toString('utf8'))
 need(approval.kind==='APPROVED_SUMMARY_BATCH'&&approval.schemaVersion===1&&approval.sequence===1&&Array.isArray(approval.sources)&&approval.sources.length===6,'Isolated activation requires a new sequence-one approval')
 const updatedPins=pins.map((p,i)=>{
  const row=review.rows[i],s=approval.sources[i]
  need(keys(s,['id','head','reportRevision','run','artifact','summarySha256'])&&s.id===row.id&&s.head===row.candidateHead&&s.reportRevision===row.reportRevision&&s.run===row.run&&s.artifact===row.artifact&&s.summarySha256===row.summarySha256,'Approval is not bound to reviewed candidate')
  return {...p,head:s.head,reportRevision:s.reportRevision,run:s.run,artifact:s.artifact}
 })
 // Exclusive destination creation; never overwrite an existing runtime.
 mkdirSync(target,{mode:0o700})
 try{
  const runtime=join(target,'runtime'),staged=join(target,'candidate-inbox'),state=join(target,'state')
  mkdirSync(runtime);mkdirSync(staged,{mode:0o700});mkdirSync(state,{mode:0o700})
  const inventory=[]
  for(const file of runtimeFiles){
   const bytes=readBounded(join(sourceRoot,file))
   const dest=join(runtime,file)
   mkdirSync(dirname(dest),{recursive:true})
   writeFileSync(dest,bytes,{flag:'wx',mode:0o600})
   inventory.push({file,sha256:sha(bytes)})
  }
  const pinsFile='unified-control-centre/source-pins.json',pinsBytes=Buffer.from(JSON.stringify(updatedPins,null,2)+'\n')
  writeFileSync(join(runtime,pinsFile),pinsBytes,{flag:'wx',mode:0o600})
  inventory.push({file:pinsFile,sha256:sha(pinsBytes)})
  for(let i=0;i<pins.length;i++){
   const bytes=readBounded(join(candidate,pins[i].file))
   need(sha(bytes)===review.rows[i].summarySha256,'Candidate changed after review')
   writeFileSync(join(staged,pins[i].file),bytes,{flag:'wx',mode:0o600})
  }
  writeFileSync(join(staged,'approval.json'),approvalRaw,{flag:'wx',mode:0o600})
  const signatureRaw=readBounded(join(candidate,'producer-signatures.json'),65536)
  writeFileSync(join(staged,'producer-signatures.json'),signatureRaw,{flag:'wx',mode:0o600})
  const {signedSynchronise}=await import(pathToFileURL(join(runtime,'unified-live','producer-intake.mjs')).href)
  const receipt=signedSynchronise(staged,state,trust,plan.trustSha256,plan.approvalSha256,{now})
  need(receipt.status==='ACCEPTED'&&receipt.sequence===1,'Candidate acceptance failed')
  const {status:reviewedStatus}=await import(pathToFileURL(join(runtime,'unified-live','sync.mjs')).href)
  const view=reviewedStatus(state,{now,trustedTrustSha256:plan.trustSha256,trustedStateSha256:receipt.stateSha256})
  need(view.snapshot.counts.available===6&&view.snapshot.modules.every((m,i)=>m.source.head===updatedPins[i].head&&m.receiptSha256===review.rows[i].summarySha256),'Candidate snapshot reconciliation failed')
  need(readBounded(planFile,65536).equals(planRaw)&&readBounded(trust,65536).equals(trustRaw)&&sha(readBounded(manifest,65536))===plan.manifestSha256,'External review records changed')
  need(readBounded(join(active,'current.json'),16*1024*1024).equals(baselineRaw),'Baseline state changed during isolated activation')
  for(const f of inventory)need(sha(readBounded(join(runtime,f.file)))===f.sha256,'Runtime inventory mismatch')
  rmSync(staged,{recursive:true,force:true})
  const payload={kind:'ISOLATED_REVISION_ACTIVATION_RECEIPT',schemaVersion:1,status:'ISOLATED_CANDIDATE_ACCEPTED',planSha256:trustedPlanSha256,reviewSha256:review.reviewSha256,baselineStateSha256:plan.baselineStateSha256,baselineSequence:baseline.sequence,candidateStateSha256:receipt.stateSha256,candidateSequence:1,trustSha256:plan.trustSha256,changedSources:review.changedSources,runtimeFiles:inventory,activeStateModified:false,activePinsModified:false,productionPromotionAuthorized:false,modelValidation:'UNVALIDATED',publicationGate:'BLOCKED',executionAuthorized:false,measurementFreshness:'UNKNOWN',limitations:['Explicit operator-reviewed activation plan; no independent GitHub origin verification by this tool.','New isolated namespace; active viewer and collector are not switched. No live producer or deployment.','Runtime inventory is a receipt, not a code signature. Retain its fingerprint separately.']}
  const result={...payload,activationSha256:digest(payload)}
  writeFileSync(join(target,'activation-receipt.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600})
  return result
 }catch(error){
  // Only this invocation's newly created target is removed.
  rmSync(target,{recursive:true,force:true})
  throw error
 }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{
  const args=process.argv.slice(2)
  if(args.length!==7)throw Error('Usage: revision-activate.mjs <candidate-dir> <active-state-dir> <trust-file> <review-manifest> <activation-plan> <trusted-plan-sha256> <new-runtime-directory>')
  console.log(JSON.stringify(await activateRevision(...args),null,2))
 }catch(e){console.error(e.message);process.exitCode=1}
}
