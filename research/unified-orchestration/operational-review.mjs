// Read-only supervisor reconciliation and operator-controlled isolated checkpoint/recovery.
import {createHash} from 'node:crypto'
import {lstatSync,realpathSync,mkdirSync,rmSync,openSync,writeFileSync,fsyncSync,closeSync} from 'node:fs'
import {resolve,relative,isAbsolute,sep,join,dirname} from 'node:path'
import {pathToFileURL} from 'node:url'
import {readBounded,status as evidenceStatus} from '../unified-live/sync.mjs'
import {digest} from '../scientific-reference/digest.mjs'
import {inspect} from './registry.mjs'
import {inspectQueue} from './producer-queue.mjs'
const flags={researchOnly:true,modelValidation:'UNVALIDATED',publicationGate:'BLOCKED',executionAuthorized:false,dispatchAuthorized:false,repairAuthorized:false,accessAuthorized:false,sourceMutationAuthorized:false,validationAuthorized:false,measurementFreshness:'UNKNOWN'}
const need=(x,m)=>{if(!x)throw Error(m)}
const hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x)
const sha=b=>createHash('sha256').update(b).digest('hex')
const same=(a,b)=>digest(a)===digest(b)
const keys=(o,a)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===a.length&&a.every(k=>Object.hasOwn(o,k))
const root=p=>{const q=resolve(p);need(realpathSync(q)===q&&lstatSync(q).isDirectory(),'Unsafe directory');return q}
const within=(a,b)=>{const p=relative(a,b);return p===''||(!isAbsolute(p)&&p!=='..'&&!p.startsWith('..'+sep))}
const separate=(a,b)=>need(!within(a,b)&&!within(b,a),'Recovery locations must be separate')
const LIMIT=4*1024*1024
const names=['evidence/current.json','registry/registry.json','registry/control.json','queue/queue.json','orchestration-plan.json','queue-plan.json']
function validateAnchors(a){
 need(keys(a,['registrySha256','controlSha256','queueSha256'])&&hex(a.registrySha256)&&(a.controlSha256===null||hex(a.controlSha256))&&hex(a.queueSha256),'Explicit registry, control and queue anchors required')
}
function config(args){
 need(Array.isArray(args)&&args.length===7,'Expected seven queue arguments')
 const [e,r,op,os,q,qp,qs]=args
 const roots=[root(e),root(r),root(q)]
 for(let i=0;i<roots.length;i++)for(let j=i+1;j<roots.length;j++)separate(roots[i],roots[j])
 for(const p of [op,qp])need(realpathSync(resolve(p))===resolve(p)&&!roots.some(d=>within(d,resolve(p))),'External plans required')
 need(resolve(op)!==resolve(qp)&&hex(os)&&hex(qs),'Invalid plan anchors')
 return {roots,paths:[join(roots[0],'current.json'),join(roots[1],'registry.json'),join(roots[1],'control.json'),join(roots[2],'queue.json'),resolve(op),resolve(qp)]}
}
export function supervise(args,anchors,{now=new Date().toISOString()}={}){
 validateAnchors(anchors);config(args)
 const [e,r,op,os]=args
 const registry=inspect(e,r,op,os,{now,trustedRegistrySha256:anchors.registrySha256,trustedControlSha256:anchors.controlSha256??undefined})
 need(registry.control.controlSha256===anchors.controlSha256,'Control anchor mismatch')
 const queue=inspectQueue(...args,{now,trustedQueueSha256:anchors.queueSha256})
 const evidence=evidenceStatus(e,{now})
 need(evidence.stateSha256===registry.evidenceStateSha256&&queue.evidenceStateSha256===evidence.stateSha256&&queue.registrySha256===registry.registrySha256&&queue.controlSha256===registry.control.controlSha256,'Cross-module evidence mismatch')
 const modules=evidence.snapshot.modules
 const supervisor=modules.find(m=>m.id==='supervisor')
 const blocking=supervisor.metrics.find(m=>m.label==='Blocking incidents').value
 const review=supervisor.metrics.find(m=>m.label==='Review incidents').value
 const reasons=['SCIENTIFIC_VALIDATION_MISSING','PRODUCTION_PRODUCERS_NOT_CONNECTED','PHYSICAL_HARDWARE_ACCEPTANCE_MISSING']
 if(blocking)reasons.push('HISTORICAL_SUPERVISOR_BLOCKING_INCIDENTS')
 if(review)reasons.push('HISTORICAL_SUPERVISOR_REVIEW_INCIDENTS')
 if(queue.pending)reasons.push('CONTRACT_REVIEWS_PENDING')
 if(queue.cancelled)reasons.push('CONTRACTS_CANCELLED')
 if(registry.control.incidents)reasons.push('LOCAL_REJECTION_HISTORY_RECORDED')
 if(evidence.syncStatus==='STALE')reasons.push('HISTORICAL_RECEIPT_STALE')
 const payload={kind:'ORCHESTRATION_SUPERVISOR_REVIEW',schemaVersion:1,status:'OPERATIONAL_READINESS_BLOCKED',observedAt:now,evidenceStateSha256:evidence.stateSha256,orchestrationPlanSha256:os,queuePlanSha256:args[6],...anchors,metadataReviews:registry.reviewed,queue:{pending:queue.pending,reviewed:queue.reviewed,cancelled:queue.cancelled},historicalSupervisor:{status:supervisor.status,summarySha256:supervisor.receiptSha256,blocking,review,liveMonitor:false},reasons,...flags}
 return {...payload,reviewSha256:digest(payload)}
}
function lock(dir,name,fn){
 const p=join(dir,name);mkdirSync(p,{mode:0o700})
 try{return fn()}finally{rmSync(p,{recursive:true,force:true})}
}
function bytes(path,optional=false){
 try{return readBounded(path,LIMIT)}catch(e){if(optional&&e.code==='ENOENT')return null;throw e}
}
function exclusive(path,raw){
 const fd=openSync(path,'wx',0o600)
 try{writeFileSync(fd,raw);fsyncSync(fd)}finally{closeSync(fd)}
}
export function saveCheckpoint(args,anchors,target,{now=new Date().toISOString()}={}){
 const c=config(args),dest=resolve(target),parent=root(dirname(dest))
 for(const d of c.roots)separate(d,parent)
 need(!c.paths.includes(dest),'Checkpoint destination overlaps inputs')
 return lock(c.roots[1],'.orchestration-lock',()=>lock(c.roots[2],'.queue-lock',()=>{
  const report=supervise(args,anchors,{now})
  const original=c.paths.map((p,i)=>bytes(p,i===2))
  need((original[2]===null)===(anchors.controlSha256===null),'Control presence mismatch')
  const files=original.map((b,i)=>({path:names[i],sha256:b===null?null:sha(b),base64:b===null?null:b.toString('base64')}))
  const payload={kind:'ORCHESTRATION_CHECKPOINT',schemaVersion:1,anchors,orchestrationPlanSha256:args[3],queuePlanSha256:args[6],evidenceStateSha256:report.evidenceStateSha256,files,...flags}
  const raw=Buffer.from(JSON.stringify(payload,null,2)+'\n')
  need(raw.length<=16*1024*1024,'Checkpoint too large')
  supervise(args,anchors,{now})
  for(let i=0;i<original.length;i++){const b=bytes(c.paths[i],i===2);need(b===null?original[i]===null:original[i]!==null&&b.equals(original[i]),'Checkpoint input changed')}
  exclusive(dest,raw)
  need(readBounded(dest,16*1024*1024).equals(raw),'Checkpoint write verification failed')
  return {kind:'ORCHESTRATION_CHECKPOINT_RECEIPT',checkpointSha256:sha(raw),files:files.filter(f=>f.base64!==null).length,...anchors,...flags}
 }))
}
export function restoreCheckpoint(checkpoint,expected,target,{now=new Date().toISOString()}={}){
 need(hex(expected),'Trusted checkpoint fingerprint required')
 const source=resolve(checkpoint),dest=resolve(target)
 need(realpathSync(source)===source&&root(dirname(dest))===dirname(dest)&&!within(dest,source),'Unsafe recovery paths')
 const raw=readBounded(source,16*1024*1024)
 need(sha(raw)===expected,'Checkpoint fingerprint mismatch')
 const s=JSON.parse(raw.toString('utf8'))
 need(keys(s,['kind','schemaVersion','anchors','orchestrationPlanSha256','queuePlanSha256','evidenceStateSha256','files',...Object.keys(flags)])&&s.kind==='ORCHESTRATION_CHECKPOINT'&&s.schemaVersion===1&&Object.entries(flags).every(([k,v])=>s[k]===v)&&hex(s.orchestrationPlanSha256)&&hex(s.queuePlanSha256)&&hex(s.evidenceStateSha256)&&Array.isArray(s.files)&&s.files.length===names.length,'Invalid checkpoint contract')
 validateAnchors(s.anchors)
 const decoded=s.files.map((f,i)=>{
  need(keys(f,['path','sha256','base64'])&&f.path===names[i],'Invalid checkpoint inventory')
  if(i===2&&s.anchors.controlSha256===null){need(f.sha256===null&&f.base64===null,'Unexpected control record');return null}
  need(hex(f.sha256)&&typeof f.base64==='string'&&f.base64.length<=LIMIT*2,'Invalid checkpoint member')
  const b=Buffer.from(f.base64,'base64')
  need(b.length>0&&b.length<=LIMIT&&b.toString('base64')===f.base64&&sha(b)===f.sha256,'Checkpoint member mismatch')
  return b
 })
 mkdirSync(dest,{mode:0o700})
 try{
  for(const d of ['evidence','registry','queue'])mkdirSync(join(dest,d),{mode:0o700})
  for(let i=0;i<decoded.length;i++)if(decoded[i]!==null)exclusive(join(dest,names[i]),decoded[i])
  const args=[join(dest,'evidence'),join(dest,'registry'),join(dest,'orchestration-plan.json'),s.orchestrationPlanSha256,join(dest,'queue'),join(dest,'queue-plan.json'),s.queuePlanSha256]
  const report=supervise(args,s.anchors,{now})
  need(report.evidenceStateSha256===s.evidenceStateSha256,'Recovered evidence mismatch')
  for(let i=0;i<decoded.length;i++)if(decoded[i]!==null)need(bytes(join(dest,names[i])).equals(decoded[i]),'Recovered bytes mismatch')
  need(readBounded(source,16*1024*1024).equals(raw),'Checkpoint changed during recovery')
  return {kind:'ORCHESTRATION_ISOLATED_RECOVERY',checkpointSha256:expected,files:decoded.filter(Boolean).length,...s.anchors,...flags}
 }catch(e){rmSync(dest,{recursive:true,force:true});throw e}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{
  const [cmd,...a]=process.argv.slice(2)
  const anchors=()=>({registrySha256:a[7],controlSha256:a[8]==='NEW'?null:a[8],queueSha256:a[9]})
  let r
  if(cmd==='supervise'&&a.length===10)r=supervise(a.slice(0,7),anchors())
  else if(cmd==='checkpoint'&&a.length===11)r=saveCheckpoint(a.slice(0,7),anchors(),a[10])
  else if(cmd==='recover'&&a.length===3)r=restoreCheckpoint(...a)
  else throw Error('Usage: operational-review.mjs supervise <seven queue args> <registry-sha> <control-sha-or-NEW> <queue-sha> | checkpoint <same ten args> <new-file> | recover <checkpoint-file> <trusted-sha> <new-directory>')
  console.log(JSON.stringify(r,null,2))
 }catch(e){console.error(e.message);process.exitCode=1}
}
