// Controlled local summary intake. Does not start producers, fetch data or grant permissions.
import {createHash,randomUUID} from 'node:crypto'
import {constants,openSync,closeSync,fstatSync,lstatSync,realpathSync,readSync,readFileSync,writeFileSync,fsyncSync,mkdirSync,mkdtempSync,renameSync,rmSync} from 'node:fs'
import {join,resolve,relative,isAbsolute} from 'node:path'
import {tmpdir} from 'node:os'
import {pathToFileURL} from 'node:url'
import {build,verifySnapshot} from '../unified-control-centre/overview.mjs'
import {digest} from '../scientific-reference/digest.mjs'
import {verifyAuthentication} from './authentication.mjs'
const pins=JSON.parse(readFileSync(new URL('../unified-control-centre/source-pins.json',import.meta.url),'utf8'))
const MAX=4*1024*1024
const flags={modelValidation:'UNVALIDATED',publicationGate:'BLOCKED',executionAuthorized:false,repairAuthorized:false,accessAuthorized:false,sourceMutationAuthorized:false,validationAuthorized:false,researchOnly:true}
const need=(ok,msg)=>{if(!ok)throw new Error(msg)}
const sha=b=>createHash('sha256').update(b).digest('hex')
const hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x)
const utc=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x
const keys=(o,a)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===a.length&&a.every(k=>Object.hasOwn(o,k))
const safeRoot=p=>{const q=resolve(p);need(realpathSync(q)===q&&lstatSync(q).isDirectory(),'Unsafe directory');return q}
const within=(a,b)=>{const q=relative(a,b);return q===''||(!isAbsolute(q)&&q!=='..'&&!q.startsWith('..'+(process.platform==='win32'?'\\':'/')))}
export function readBounded(path,max=MAX){
 const a=lstatSync(path)
 need(a.isFile()&&!a.isSymbolicLink()&&a.size>0&&a.size<=max,'Unsafe file')
 const fd=openSync(path,constants.O_RDONLY|(constants.O_NOFOLLOW??0)|(constants.O_NONBLOCK??0))
 try{
  const b=fstatSync(fd)
  need(b.isFile()&&b.dev===a.dev&&b.ino===a.ino&&b.size===a.size,'File changed')
  const bytes=Buffer.alloc(b.size)
  let n=0
  while(n<bytes.length){const got=readSync(fd,bytes,n,bytes.length-n,null);need(got>0,'Truncated file');n+=got}
  const c=fstatSync(fd),d=lstatSync(path)
  need(c.size===b.size&&c.mtimeMs===b.mtimeMs&&c.ctimeMs===b.ctimeMs&&d.dev===b.dev&&d.ino===b.ino&&!d.isSymbolicLink(),'Unstable file')
  return bytes
 }finally{closeSync(fd)}
}
function approval(raw,expected){
 need(hex(expected)&&sha(raw)===expected,'Approval fingerprint mismatch')
 const a=JSON.parse(raw.toString('utf8'))
 need(keys(a,['kind','schemaVersion','sequence','approvedAt','sources'])&&a.kind==='APPROVED_SUMMARY_BATCH'&&a.schemaVersion===1&&Number.isSafeInteger(a.sequence)&&a.sequence>0&&utc(a.approvedAt),'Invalid approval')
 need(Array.isArray(a.sources)&&a.sources.length===pins.length,'Incomplete approval')
 for(let i=0;i<pins.length;i++){
  const p=pins[i],s=a.sources[i]
  need(keys(s,['id','head','reportRevision','run','artifact','summarySha256'])&&s.id===p.id&&s.head===p.head&&s.reportRevision===p.reportRevision&&s.run===p.run&&s.artifact===p.artifact&&hex(s.summarySha256),'Unapproved source identity')
 }
 return a
}
function checkState(s){
 need(s?.kind==='CONTROLLED_SUMMARY_STATE'&&s.schemaVersion===1&&Object.entries(flags).every(([k,v])=>s[k]===v)&&utc(s.acceptedAt)&&hex(s.approvalSha256)&&hex(s.stateSha256)&&Number.isSafeInteger(s.sequence)&&s.sequence>0,'Invalid stored state')
 const {stateSha256,...payload}=s
 need(digest(payload)===stateSha256,'Stored state fingerprint mismatch')
 need((s.sequence===1?s.previousApprovalSha256===null:hex(s.previousApprovalSha256)),'Invalid previous approval link')
 need(s.approval?.sequence===s.sequence&&utc(s.approval.approvedAt)&&Date.parse(s.approval.approvedAt)<=Date.parse(s.acceptedAt),'Invalid approval chronology')
 // Stored approval bytes are preserved to bind the exact external fingerprint.
 const raw=Buffer.from(s.approvalBytes,'base64')
 const a=approval(raw,s.approvalSha256)
 need(digest(a)===digest(s.approval),'Stored approval mismatch')
 if(s.authentication!=null)verifyAuthentication(s.authentication,a,s.approvalSha256,s.acceptedAt)
 verifySnapshot(s.snapshot)
 need(s.snapshot.counts.available===6&&s.snapshot.modules.every((m,i)=>m.receiptSha256===a.sources[i].summarySha256),'Stored snapshot not bound to approval')
 need(Array.isArray(s.firstSeen)&&s.firstSeen.length===6&&s.firstSeen.every((x,i)=>x.id===pins[i].id&&utc(x.at)&&Date.parse(x.at)<=Date.parse(s.acceptedAt)),'Invalid freshness receipt')
 return s
}
function load(root){
 try{return checkState(JSON.parse(readBounded(join(root,'current.json'),16*1024*1024).toString('utf8')))}
 catch(e){if(e.code==='ENOENT')return null;throw e}
}
function atomic(root,s,file='current.json'){
 const temp=join(root,'.pending-'+randomUUID()),target=join(root,file)
 try{
  const fd=openSync(temp,'wx',0o600)
  try{writeFileSync(fd,JSON.stringify(s,null,2)+'\n');fsyncSync(fd)}finally{closeSync(fd)}
  renameSync(temp,target)
 }finally{rmSync(temp,{force:true})}
}
// Bounded latest rejected attempt, not a full audit log or producer health monitor.
const rejectionStages=['STORED_STATE','APPROVAL','SEQUENCE','INPUT','CONTRACT','STABILITY','PERSISTENCE']
function recordRejection(root,stage,now,previous){
 const payload={kind:'CONTROLLED_SYNC_REJECTION',schemaVersion:1,stage,observedAt:now,
  previousStateSha256:previous?.stateSha256??null,previousSequence:previous?.sequence??null,
  action:'MANUAL_REVIEW_REQUIRED',automaticRepair:false}
 atomic(root,{...payload,incidentSha256:digest(payload)},'last-rejection.json')
}
function incidentStatus(root,s,now){
 try{
  const raw=readBounded(join(root,'last-rejection.json'),8192),r=JSON.parse(raw.toString('utf8'))
  need(keys(r,['kind','schemaVersion','stage','observedAt','previousStateSha256','previousSequence','action','automaticRepair','incidentSha256']),'Invalid incident shape')
  const {incidentSha256,...payload}=r
  need(hex(incidentSha256)&&digest(payload)===incidentSha256&&r.kind==='CONTROLLED_SYNC_REJECTION'&&r.schemaVersion===1&&rejectionStages.includes(r.stage)&&utc(r.observedAt)&&r.action==='MANUAL_REVIEW_REQUIRED'&&r.automaticRepair===false,'Invalid incident')
  need((r.previousStateSha256===null&&r.previousSequence===null)||(hex(r.previousStateSha256)&&Number.isSafeInteger(r.previousSequence)&&r.previousSequence>0),'Invalid incident binding')
  const sameState=r.previousStateSha256===(s?.stateSha256??null)&&r.previousSequence===(s?.sequence??null)
  const superseded=s&&Date.parse(s.acceptedAt)>=Date.parse(r.observedAt)&&(r.previousSequence===null||s.sequence>r.previousSequence)
  return {status:Date.parse(r.observedAt)>Date.parse(now)?'CLOCK_UNCERTAIN':sameState?'REVIEW_REQUIRED':superseded?'HISTORICAL_REJECTION':'REVIEW_REQUIRED_UNRECONCILED',stage:r.stage,observedAt:r.observedAt,previousSequence:r.previousSequence,automaticRepair:false}
 }catch(e){
  return {status:e.code==='ENOENT'?'NO_REJECTION_RECORDED':'INCIDENT_EVIDENCE_UNAVAILABLE',stage:null,observedAt:null,previousSequence:null,automaticRepair:false}
 }
}
export function synchronise(inboxDir,stateDir,expected,{now=new Date().toISOString(),authentication=null}={}){
 const inbox=safeRoot(inboxDir),root=safeRoot(stateDir)
 need(!within(inbox,root)&&!within(root,inbox),'Input and state must be separate directories')
 need(utc(now),'Invalid clock')
 const lock=join(root,'.sync-lock')
 mkdirSync(lock,{mode:0o700}) // Fail closed on concurrent writer or interrupted lock; manual recovery only.
 let stage,previous=null,phase='STORED_STATE'
 try{
  previous=load(root)
  phase='APPROVAL'
  const raw=readBounded(join(inbox,'approval.json')),a=approval(raw,expected)
  need(Date.parse(a.approvedAt)<=Date.parse(now),'Future approval')
  phase='APPROVAL'
  if(authentication!==null)verifyAuthentication(authentication,a,expected,now)
  // Once signed intake is adopted, the state cannot silently downgrade or rotate keys.
  if(previous?.authentication!=null){
   need(authentication!==null,'Signed state requires signed intake')
   need(authentication.trustSha256===previous.authentication.trustSha256,'Trust registry rotation requires separate reviewed migration')
  }
  phase='SEQUENCE'
  if(previous){
   need(Date.parse(now)>=Date.parse(previous.acceptedAt),'Clock moved backwards')
   if(previous.approvalSha256===expected){
    need((previous.authentication!=null)===(authentication!==null),'Replay cannot change authentication mode')
    if(authentication!==null)need(digest(previous.authentication)===digest(authentication),'Replay cannot change authentication evidence')
    phase='INPUT'
    for(let i=0;i<pins.length;i++)need(sha(readBounded(join(inbox,pins[i].file)))===a.sources[i].summarySha256,'Replay input mismatch')
    need(readBounded(join(inbox,'approval.json')).equals(raw),'Unstable approval')
    return {status:'UNCHANGED',state:previous}
   }
   need(a.sequence===previous.sequence+1&&Date.parse(a.approvedAt)>=Date.parse(previous.approval.approvedAt),'Out-of-order approval')
  }else need(a.sequence===1,'First approval sequence must be one')
  phase='INPUT'
  stage=mkdtempSync(join(tmpdir(),'research-sync-'))
  for(let i=0;i<pins.length;i++){
   const bytes=readBounded(join(inbox,pins[i].file))
   need(sha(bytes)===a.sources[i].summarySha256,'Summary fingerprint mismatch: '+pins[i].id)
   writeFileSync(join(stage,pins[i].file),bytes,{flag:'wx',mode:0o600})
  }
  phase='CONTRACT'
  const snapshot=build(realpathSync(stage))
  verifySnapshot(snapshot)
  need(snapshot.counts.available===6&&snapshot.modules.every((m,i)=>m.receiptSha256===a.sources[i].summarySha256),'Incomplete or invalid summary batch')
  phase='STABILITY'
  need(readBounded(join(inbox,'approval.json')).equals(raw),'Unstable approval')
  for(let i=0;i<pins.length;i++)need(sha(readBounded(join(inbox,pins[i].file)))===a.sources[i].summarySha256,'Input changed during sync')
  const payload={kind:'CONTROLLED_SUMMARY_STATE',schemaVersion:1,...flags,sequence:a.sequence,acceptedAt:now,
   approvalSha256:expected,approvalBytes:raw.toString('base64'),approval:a,previousApprovalSha256:previous?.approvalSha256??null,snapshot,authentication,
   firstSeen:a.sources.map((x,i)=>({id:x.id,at:previous?.approval.sources[i].summarySha256===x.summarySha256?previous.firstSeen[i].at:now}))}
  const s={...payload,stateSha256:digest(payload)}
  phase='PERSISTENCE'
  checkState(s);atomic(root,s)
  return {status:'ACCEPTED',state:s}
 }catch(error){
  try{recordRejection(root,phase,now,previous)}catch{throw new Error('Sync failed; incident receipt could not be recorded',{cause:error})}
  throw error
 }finally{if(stage)rmSync(stage,{recursive:true,force:true});rmSync(lock,{recursive:true,force:true})}
}
// Operator-controlled checkpoint and isolated recovery. Never rolls back active state.
const STATE_LIMIT=16*1024*1024
function separate(a,b){need(!within(a,b)&&!within(b,a),'State and checkpoint directories must be separate')}
function lockRoot(root,operation){
 const lock=join(root,'.sync-lock')
 mkdirSync(lock,{mode:0o700})
 try{return operation()}finally{rmSync(lock,{recursive:true,force:true})}
}
function checkedBytes(raw){return checkState(JSON.parse(raw.toString('utf8')))}
export function checkpoint(stateDir,backupDir){
 const root=safeRoot(stateDir),backup=safeRoot(backupDir)
 separate(root,backup)
 return lockRoot(root,()=>{
  const raw=readBounded(join(root,'current.json'),STATE_LIMIT),s=checkedBytes(raw),fingerprint=sha(raw)
  const name='checkpoint-'+s.sequence+'-'+fingerprint+'.json',target=join(backup,name)
  // Exclusive creation never overwrites an earlier checkpoint. Interrupted files fail hash validation.
  const fd=openSync(target,'wx',0o600)
  try{writeFileSync(fd,raw);fsyncSync(fd)}finally{closeSync(fd)}
  need(readBounded(target,STATE_LIMIT).equals(raw),'Checkpoint verification failed')
  return {kind:'CONTROLLED_CHECKPOINT',file:name,sequence:s.sequence,checkpointSha256:fingerprint,stateSha256:s.stateSha256,...flags}
 })
}
export function recover(backupDir,stateDir,expected,sequence){
 const backup=safeRoot(backupDir),root=safeRoot(stateDir)
 separate(backup,root)
 need(hex(expected)&&Number.isSafeInteger(sequence)&&sequence>0,'Invalid trusted checkpoint receipt')
 return lockRoot(root,()=>{
  // Never replace an existing generation, including corrupt files or dangling links.
  let exists=true
  try{lstatSync(join(root,'current.json'))}catch(e){if(e.code==='ENOENT')exists=false;else throw e}
  need(!exists,'Recovery requires an empty state directory')
  const raw=readBounded(join(backup,'checkpoint-'+sequence+'-'+expected+'.json'),STATE_LIMIT)
  need(sha(raw)===expected,'Checkpoint fingerprint mismatch')
  const s=checkedBytes(raw);need(s.sequence===sequence,'Checkpoint sequence mismatch')
  // Preserve the original timestamps and approval chain exactly; recovery is not new evidence.
  atomic(root,s)
  const saved=load(root)
  need(saved.stateSha256===s.stateSha256,'Recovered state verification failed')
  return {kind:'CONTROLLED_ISOLATED_RECOVERY',sequence:s.sequence,checkpointSha256:expected,stateSha256:s.stateSha256,acceptedAt:s.acceptedAt,...flags}
 })
}
export function status(stateDir,{now=new Date().toISOString(),maxAgeSeconds=3600,trustedTrustSha256=null,trustedStateSha256=null}={}){
 need(utc(now)&&Number.isSafeInteger(maxAgeSeconds)&&maxAgeSeconds>0&&maxAgeSeconds<=86400,'Invalid freshness configuration')
 need(trustedTrustSha256===null||hex(trustedTrustSha256),'Invalid external trust anchor')
 need(trustedStateSha256===null||(hex(trustedStateSha256)&&trustedTrustSha256!==null),'Invalid external state anchor')
 const root=safeRoot(stateDir),s=load(root)
 if(trustedTrustSha256!==null)need(s?.authentication?.trustSha256===trustedTrustSha256,'External trust anchor mismatch or signed state unavailable')
 if(trustedStateSha256!==null)need(s?.stateSha256===trustedStateSha256,'External state anchor mismatch')
 const age=at=>Math.floor((Date.parse(now)-Date.parse(at))/1000)
 const freshness=at=>age(at)<0?'CLOCK_UNCERTAIN':age(at)>maxAgeSeconds?'STALE':'RECENTLY_RECEIVED'
 return {kind:'CONTROLLED_SUMMARY_STATUS',...flags,sequence:s?.sequence??null,acceptedAt:s?.acceptedAt??null,
  syncStatus:s?freshness(s.acceptedAt):'NO_ACCEPTED_BATCH',measurementFreshness:'UNKNOWN',
  sources:pins.map((p,i)=>({id:p.id,receiptStatus:s?freshness(s.firstSeen[i].at):'MISSING',firstSeen:s?.firstSeen[i].at??null,measurementFreshness:'UNKNOWN'})),
  authentication:{mode:!s?'NO_ACCEPTED_BATCH':s.authentication?'SIGNATURES_REVERIFIED_AT_ACCEPTANCE':'MANUAL_DIGEST_APPROVAL',trustSha256:s?.authentication?.trustSha256??null,independentTrustRechecked:trustedTrustSha256!==null,independentStateRechecked:trustedStateSha256!==null},
  lastRejection:incidentStatus(root,s,now),
  snapshot:s?.snapshot??null,limitations:['Receipt age is not measurement age or producer health.','Explicit digest approval; no independent source authenticity or scientific validation.','No producer, scheduler or network service started.']}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{
  const [cmd,...args]=process.argv.slice(2)
  if(cmd==='sync'&&args.length===3){const r=synchronise(...args);console.log(JSON.stringify({status:r.status,sequence:r.state.sequence,stateSha256:r.state.stateSha256,...flags},null,2))}
  else if(cmd==='status'&&args.length>=1&&args.length<=3)console.log(JSON.stringify(status(args[0],{trustedTrustSha256:args[1]??null,trustedStateSha256:args[2]??null}),null,2))
  else if(cmd==='checkpoint'&&args.length===2)console.log(JSON.stringify(checkpoint(...args),null,2))
  else if(cmd==='recover'&&args.length===4)console.log(JSON.stringify(recover(args[0],args[1],args[2],Number(args[3])),null,2))
  else throw Error('Usage: sync.mjs sync <inbox> <state-dir> <trusted-approval-sha256> | status <state-dir> [trusted-trust-sha256 [trusted-state-sha256]] | checkpoint <state-dir> <backup-dir> | recover <backup-dir> <empty-state-dir> <trusted-checkpoint-sha256> <sequence>')
 }catch(e){console.error(e.message);process.exitCode=1}
}
