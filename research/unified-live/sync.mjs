// Controlled local summary intake. Does not start producers, fetch data or grant permissions.
import {createHash,randomUUID} from 'node:crypto'
import {constants,openSync,closeSync,fstatSync,lstatSync,realpathSync,readSync,readFileSync,writeFileSync,fsyncSync,mkdirSync,mkdtempSync,renameSync,rmSync} from 'node:fs'
import {join,resolve,relative,isAbsolute} from 'node:path'
import {tmpdir} from 'node:os'
import {pathToFileURL} from 'node:url'
import {build,verifySnapshot} from '../unified-control-centre/overview.mjs'
import {digest} from '../scientific-reference/digest.mjs'
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
function readBounded(path,max=MAX){
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
 verifySnapshot(s.snapshot)
 need(s.snapshot.counts.available===6&&s.snapshot.modules.every((m,i)=>m.receiptSha256===a.sources[i].summarySha256),'Stored snapshot not bound to approval')
 need(Array.isArray(s.firstSeen)&&s.firstSeen.length===6&&s.firstSeen.every((x,i)=>x.id===pins[i].id&&utc(x.at)&&Date.parse(x.at)<=Date.parse(s.acceptedAt)),'Invalid freshness receipt')
 return s
}
function load(root){
 try{return checkState(JSON.parse(readBounded(join(root,'current.json'),16*1024*1024).toString('utf8')))}
 catch(e){if(e.code==='ENOENT')return null;throw e}
}
function atomic(root,s){
 const temp=join(root,'.pending-'+randomUUID()),target=join(root,'current.json')
 try{
  const fd=openSync(temp,'wx',0o600)
  try{writeFileSync(fd,JSON.stringify(s,null,2)+'\n');fsyncSync(fd)}finally{closeSync(fd)}
  renameSync(temp,target)
 }finally{rmSync(temp,{force:true})}
}
export function synchronise(inboxDir,stateDir,expected,{now=new Date().toISOString()}={}){
 const inbox=safeRoot(inboxDir),root=safeRoot(stateDir)
 need(!within(inbox,root)&&!within(root,inbox),'Input and state must be separate directories')
 need(utc(now),'Invalid clock')
 const lock=join(root,'.sync-lock')
 mkdirSync(lock,{mode:0o700}) // Fail closed on concurrent writer or interrupted lock; manual recovery only.
 let stage
 try{
  const previous=load(root)
  const raw=readBounded(join(inbox,'approval.json')),a=approval(raw,expected)
  need(Date.parse(a.approvedAt)<=Date.parse(now),'Future approval')
  if(previous){
   need(Date.parse(now)>=Date.parse(previous.acceptedAt),'Clock moved backwards')
   if(previous.approvalSha256===expected){
    for(let i=0;i<pins.length;i++)need(sha(readBounded(join(inbox,pins[i].file)))===a.sources[i].summarySha256,'Replay input mismatch')
    need(readBounded(join(inbox,'approval.json')).equals(raw),'Unstable approval')
    return {status:'UNCHANGED',state:previous}
   }
   need(a.sequence===previous.sequence+1&&Date.parse(a.approvedAt)>=Date.parse(previous.approval.approvedAt),'Out-of-order approval')
  }else need(a.sequence===1,'First approval sequence must be one')
  stage=mkdtempSync(join(tmpdir(),'research-sync-'))
  for(let i=0;i<pins.length;i++){
   const bytes=readBounded(join(inbox,pins[i].file))
   need(sha(bytes)===a.sources[i].summarySha256,'Summary fingerprint mismatch: '+pins[i].id)
   writeFileSync(join(stage,pins[i].file),bytes,{flag:'wx',mode:0o600})
  }
  const snapshot=build(realpathSync(stage))
  verifySnapshot(snapshot)
  need(snapshot.counts.available===6&&snapshot.modules.every((m,i)=>m.receiptSha256===a.sources[i].summarySha256),'Incomplete or invalid summary batch')
  need(readBounded(join(inbox,'approval.json')).equals(raw),'Unstable approval')
  for(let i=0;i<pins.length;i++)need(sha(readBounded(join(inbox,pins[i].file)))===a.sources[i].summarySha256,'Input changed during sync')
  const payload={kind:'CONTROLLED_SUMMARY_STATE',schemaVersion:1,...flags,sequence:a.sequence,acceptedAt:now,
   approvalSha256:expected,approvalBytes:raw.toString('base64'),approval:a,previousApprovalSha256:previous?.approvalSha256??null,snapshot,
   firstSeen:a.sources.map((x,i)=>({id:x.id,at:previous?.approval.sources[i].summarySha256===x.summarySha256?previous.firstSeen[i].at:now}))}
  const s={...payload,stateSha256:digest(payload)}
  checkState(s);atomic(root,s)
  return {status:'ACCEPTED',state:s}
 }finally{if(stage)rmSync(stage,{recursive:true,force:true});rmSync(lock,{recursive:true,force:true})}
}
export function status(stateDir,{now=new Date().toISOString(),maxAgeSeconds=3600}={}){
 need(utc(now)&&Number.isSafeInteger(maxAgeSeconds)&&maxAgeSeconds>0&&maxAgeSeconds<=86400,'Invalid freshness configuration')
 const s=load(safeRoot(stateDir))
 const age=at=>Math.floor((Date.parse(now)-Date.parse(at))/1000)
 const freshness=at=>age(at)<0?'CLOCK_UNCERTAIN':age(at)>maxAgeSeconds?'STALE':'RECENTLY_RECEIVED'
 return {kind:'CONTROLLED_SUMMARY_STATUS',...flags,sequence:s?.sequence??null,acceptedAt:s?.acceptedAt??null,
  syncStatus:s?freshness(s.acceptedAt):'NO_ACCEPTED_BATCH',measurementFreshness:'UNKNOWN',
  sources:pins.map((p,i)=>({id:p.id,receiptStatus:s?freshness(s.firstSeen[i].at):'MISSING',firstSeen:s?.firstSeen[i].at??null,measurementFreshness:'UNKNOWN'})),
  snapshot:s?.snapshot??null,limitations:['Receipt age is not measurement age or producer health.','Explicit digest approval; no independent source authenticity or scientific validation.','No producer, scheduler or network service started.']}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{
  const [cmd,...args]=process.argv.slice(2)
  if(cmd==='sync'&&args.length===3){const r=synchronise(...args);console.log(JSON.stringify({status:r.status,sequence:r.state.sequence,stateSha256:r.state.stateSha256,...flags},null,2))}
  else if(cmd==='status'&&args.length===1)console.log(JSON.stringify(status(args[0]),null,2))
  else throw Error('Usage: sync.mjs sync <inbox> <state-dir> <trusted-approval-sha256> | status <state-dir>')
 }catch(e){console.error(e.message);process.exitCode=1}
}
