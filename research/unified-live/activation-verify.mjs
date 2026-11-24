// Verify an isolated activation against a separately retained receipt fingerprint.
// Never runs candidate code; reads only the fixed runtime inventory and accepted state.
import {createHash} from 'node:crypto'
import {lstatSync,realpathSync,readFileSync,readdirSync} from 'node:fs'
import {resolve,join,relative,sep} from 'node:path'
import {fileURLToPath,pathToFileURL} from 'node:url'
import {readBounded} from './sync.mjs'
import {digest} from '../scientific-reference/digest.mjs'
const sourceRoot=realpathSync(fileURLToPath(new URL('../',import.meta.url)))
const pins=JSON.parse(readFileSync(join(sourceRoot,'unified-control-centre','source-pins.json'),'utf8'))
const codeFiles=['unified-live/sync.mjs','unified-live/authentication.mjs','unified-live/producer-intake.mjs','unified-live/viewer.mjs','unified-live/collector.mjs','unified-control-centre/overview.mjs','unified-control-centre/website.mjs','scientific-reference/digest.mjs']
const pinsFile='unified-control-centre/source-pins.json',files=[...codeFiles,pinsFile]
const need=(x,m)=>{if(!x)throw Error(m)}
const sha=b=>createHash('sha256').update(b).digest('hex')
const hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x)
const commit=x=>typeof x==='string'&&/^[a-f0-9]{40}$/.test(x)
const positive=x=>Number.isSafeInteger(x)&&x>0
const same=(a,b)=>digest(a)===digest(b)
function directory(path){
 const s=lstatSync(path)
 need(s.isDirectory()&&!s.isSymbolicLink()&&realpathSync(path)===path,'Unsafe directory')
 return path
}
function inventory(root){
 const found=[]
 const dirs=new Set(files.flatMap(f=>[f.split('/')[0]]))
 function walk(dir){
  for(const name of readdirSync(dir)){
   const path=join(dir,name),rel=relative(root,path).split(sep).join('/'),s=lstatSync(path)
   need(!s.isSymbolicLink(),'Unsafe runtime link')
   if(s.isDirectory()){need(dirs.has(rel),'Unexpected runtime directory');walk(directory(path))}
   else{need(s.isFile()&&files.includes(rel),'Unexpected runtime file');found.push(rel)}
  }
 }
 walk(directory(root))
 need(same(found.sort(),[...files].sort()),'Runtime inventory incomplete')
}
export function verifyActivation(targetDir,trustedActivationSha256){
 need(hex(trustedActivationSha256),'Invalid trusted activation fingerprint')
 const target=directory(resolve(targetDir)),runtime=directory(join(target,'runtime')),stateDir=directory(join(target,'state'))
 need(same(readdirSync(target).sort(),['activation-receipt.json','runtime','state']),'Incomplete or unexpected activation layout')
 const receiptRaw=readBounded(join(target,'activation-receipt.json'),65536),receipt=JSON.parse(receiptRaw.toString('utf8'))
 const {activationSha256,...payload}=receipt
 need(activationSha256===trustedActivationSha256&&digest(payload)===trustedActivationSha256,'Activation receipt fingerprint mismatch')
 need(receipt.kind==='ISOLATED_REVISION_ACTIVATION_RECEIPT'&&receipt.schemaVersion===1&&receipt.status==='ISOLATED_CANDIDATE_ACCEPTED'&&receipt.activeStateModified===false&&receipt.activePinsModified===false&&receipt.productionPromotionAuthorized===false&&receipt.executionAuthorized===false&&receipt.modelValidation==='UNVALIDATED'&&receipt.publicationGate==='BLOCKED'&&receipt.measurementFreshness==='UNKNOWN'&&receipt.candidateSequence===1&&positive(receipt.baselineSequence)&&positive(receipt.changedSources)&&receipt.changedSources<=6&&['planSha256','reviewSha256','baselineStateSha256','candidateStateSha256','trustSha256'].every(k=>hex(receipt[k])),'Unsafe activation receipt')
 need(Array.isArray(receipt.runtimeFiles)&&receipt.runtimeFiles.length===files.length,'Invalid inventory receipt')
 inventory(runtime)
 const observed=new Map()
 for(let i=0;i<files.length;i++){
  const file=files[i],entry=receipt.runtimeFiles[i]
  need(entry&&Object.keys(entry).length===2&&entry.file===file&&hex(entry.sha256),'Invalid runtime inventory entry')
  const bytes=readBounded(join(runtime,file))
  need(sha(bytes)===entry.sha256,'Runtime fingerprint mismatch: '+file)
  if(file!==pinsFile)need(bytes.equals(readBounded(join(sourceRoot,file))),'Runtime differs from trusted implementation: '+file)
  observed.set(file,bytes)
 }
 const candidatePins=JSON.parse(observed.get(pinsFile).toString('utf8'))
 need(Array.isArray(candidatePins)&&candidatePins.length===6,'Invalid candidate pins')
 let changed=0
 for(let i=0;i<pins.length;i++){
  const p=pins[i],q=candidatePins[i]
  need(q&&commit(q.head)&&positive(q.run)&&(p.reportRevision===null?q.reportRevision===null:commit(q.reportRevision))&&(p.artifact===null?q.artifact===null:positive(q.artifact)),'Invalid candidate identity')
  need(same(q,{...p,head:q.head,reportRevision:q.reportRevision,run:q.run,artifact:q.artifact}),'Unexpected pin layout')
  if(q.head!==p.head){changed++;need(q.run!==p.run&&(p.artifact===null||q.artifact!==p.artifact)&&(p.reportRevision===null||q.reportRevision!==p.reportRevision),'Invalid changed revision evidence')}
  else need(same(q,p),'Unchanged pin substituted')
 }
 need(changed===receipt.changedSources,'Changed source count mismatch')
 const stateRaw=readBounded(join(stateDir,'current.json'),16*1024*1024),state=JSON.parse(stateRaw.toString('utf8'))
 const {stateSha256,...statePayload}=state
 need(stateSha256===receipt.candidateStateSha256&&digest(statePayload)===stateSha256,'Candidate state fingerprint mismatch')
 need(state.kind==='CONTROLLED_SUMMARY_STATE'&&state.schemaVersion===1&&state.sequence===1&&state.previousApprovalSha256===null&&state.authentication?.kind==='SIGNED_LOCAL_ACCEPTANCE_V1'&&state.authentication.trustSha256===receipt.trustSha256&&state.modelValidation==='UNVALIDATED'&&state.publicationGate==='BLOCKED'&&state.executionAuthorized===false&&state.repairAuthorized===false&&state.accessAuthorized===false&&state.sourceMutationAuthorized===false&&state.validationAuthorized===false&&state.researchOnly===true,'Unsafe candidate state')
 need(Array.isArray(state.snapshot?.modules)&&state.snapshot.modules.length===6&&state.snapshot.counts?.available===6&&state.snapshot.modules.every((m,i)=>m.id===candidatePins[i].id&&m.source?.head===candidatePins[i].head&&m.source?.reportRevision===candidatePins[i].reportRevision&&m.source?.run===candidatePins[i].run&&m.source?.artifact===candidatePins[i].artifact&&m.evidenceState==='SUMMARY_CONTRACT_CHECKED'),'Candidate state pin mismatch')
 // Recheck read-only evidence after inventory inspection; operator-owned directory remains a trust boundary.
 inventory(runtime)
 for(const [file,bytes] of observed)need(readBounded(join(runtime,file)).equals(bytes),'Runtime changed during review')
 need(readBounded(join(target,'activation-receipt.json'),65536).equals(receiptRaw)&&readBounded(join(stateDir,'current.json'),16*1024*1024).equals(stateRaw),'Activation evidence changed during review')
 return {kind:'ISOLATED_RUNTIME_INTEGRITY_REVIEW',status:'MATCHED_TRUSTED_ACTIVATION',activationSha256:trustedActivationSha256,candidateStateSha256:stateSha256,trustSha256:receipt.trustSha256,runtimeFilesVerified:files.length,changedSources:changed,executionAuthorized:false,productionPromotionAuthorized:false,modelValidation:'UNVALIDATED',publicationGate:'BLOCKED',limitations:['Exact initial state only; subsequent updates need a separately reviewed receipt.','No candidate modules executed; this is an integrity review, not independent scientific or GitHub provenance validation.','Not a sandbox or protection against later filesystem changes.']}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{
  const args=process.argv.slice(2)
  if(args.length!==2)throw Error('Usage: activation-verify.mjs <isolated-runtime-directory> <trusted-activation-sha256>')
  console.log(JSON.stringify(verifyActivation(...args),null,2))
 }catch(e){console.error(e.message);process.exitCode=1}
}
