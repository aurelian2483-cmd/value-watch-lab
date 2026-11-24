// Fixed producer interfaces and approval-bound review queue; no dispatch or workload execution.
import {createHash,randomUUID} from 'node:crypto'
import {lstatSync,realpathSync,readFileSync,mkdirSync,rmSync,openSync,writeFileSync,fsyncSync,closeSync,renameSync} from 'node:fs'
import {resolve,relative,isAbsolute,sep,join} from 'node:path'
import {pathToFileURL} from 'node:url'
import {readBounded,status as evidenceStatus} from '../unified-live/sync.mjs'
import {digest} from '../scientific-reference/digest.mjs'
import {inspect} from './registry.mjs'
const pins=JSON.parse(readFileSync(new URL('../unified-control-centre/source-pins.json',import.meta.url),'utf8'))
const flags={researchOnly:true,modelValidation:'UNVALIDATED',publicationGate:'BLOCKED',executionAuthorized:false,repairAuthorized:false,accessAuthorized:false,sourceMutationAuthorized:false,validationAuthorized:false,measurementFreshness:'UNKNOWN'}
const need=(x,m)=>{if(!x)throw Error(m)}
const hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x)
const utc=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x
const sha=b=>createHash('sha256').update(b).digest('hex')
const same=(a,b)=>digest(a)===digest(b)
const keys=(o,a)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===a.length&&a.every(k=>Object.hasOwn(o,k))
const root=p=>{const q=resolve(p);need(realpathSync(q)===q&&lstatSync(q).isDirectory(),'Unsafe directory');return q}
const within=(a,b)=>{const p=relative(a,b);return p===''||(!isAbsolute(p)&&p!=='..'&&!p.startsWith('..'+sep))}
const budget={cpuSlots:1,memoryMiB:64,maxSeconds:5,gpu:false,network:false}
function contract(m){
 return {producerId:m.id,sourceHead:m.source.head,summarySha256:m.receiptSha256,operation:'SYNTHETIC_CONTRACT_CHECK',declaredBudget:{...budget}}
}
function context(evidenceDir,registryDir,orchestrationPlan,orchestrationSha,queueDir,queuePlan,queuePlanSha,now){
 const evidence=root(evidenceDir),registry=root(registryDir),queue=root(queueDir)
 for(const [a,b] of [[evidence,registry],[evidence,queue],[registry,queue]])need(!within(a,b)&&!within(b,a),'Evidence, registry and queue must be separate')
 const op=resolve(orchestrationPlan),qp=resolve(queuePlan)
 for(const path of [op,qp])need(realpathSync(path)===path&&![evidence,registry,queue].some(d=>within(d,path)),'External plans must be separate')
 need(op!==qp&&hex(orchestrationSha)&&hex(queuePlanSha)&&utc(now),'Invalid queue context')
 const raw=readBounded(qp,65536)
 need(sha(raw)===queuePlanSha,'Queue plan fingerprint mismatch')
 const p=JSON.parse(raw.toString('utf8'))
 need(keys(p,['kind','schemaVersion','orchestrationPlanSha256','evidenceStateSha256','registrySha256','controlSha256','requests'])&&p.kind==='APPROVED_SYNTHETIC_CONTRACT_QUEUE'&&p.schemaVersion===1&&p.orchestrationPlanSha256===orchestrationSha&&hex(p.evidenceStateSha256)&&hex(p.registrySha256)&&(p.controlSha256===null||hex(p.controlSha256))&&Array.isArray(p.requests)&&p.requests.length>=1&&p.requests.length<=6,'Invalid queue plan')
 const verify=()=>{
  const r=inspect(evidence,registry,op,orchestrationSha,{now,trustedRegistrySha256:p.registrySha256,trustedControlSha256:p.controlSha256??undefined})
  need(r.evidenceStateSha256===p.evidenceStateSha256&&r.control.controlSha256===p.controlSha256,'Queue evidence or control anchor mismatch')
  need(r.status==='METADATA_REVIEW_COMPLETE_EXECUTION_BLOCKED'&&r.reviewed===7,'Complete metadata reviews required')
  need(r.control.status==='METADATA_REVIEW_AVAILABLE'&&r.control.capacityRemaining>0,'Operational review hold or exhausted control ledger')
  const s=evidenceStatus(evidence,{now})
  need(s.stateSha256===p.evidenceStateSha256&&s.snapshot?.counts.available===6&&Object.entries(flags).every(([k,v])=>s[k]===v),'Pinned evidence unavailable or changed')
  const seen=new Set()
  for(const request of p.requests){
   const m=s.snapshot.modules.find(x=>x.id===request?.producerId)
   need(m&&pins.some(x=>x.id===m.id&&x.head===m.source.head)&&m.evidenceState==='SUMMARY_CONTRACT_CHECKED'&&hex(m.receiptSha256)&&!seen.has(m.id)&&same(request,contract(m)),'Unsupported, duplicate or unbound producer request')
   seen.add(m.id)
  }
  need(readBounded(qp,65536).equals(raw),'Queue plan changed')
  return r
 }
 return {registry,queue,p,queuePlanSha,now,verify}
}
function envelope(ctx,events){
 const payload={kind:'SYNTHETIC_CONTRACT_QUEUE',schemaVersion:1,planSha256:ctx.queuePlanSha,events,...flags}
 return {...payload,queueSha256:digest(payload)}
}
function makeEvent(ctx,events,id,action,now){
 const r=ctx.p.requests.find(x=>x.producerId===id)
 need(r&&!events.some(e=>e.producerId===id)&&['REVIEW','CANCEL'].includes(action),'Invalid or already resolved queue request')
 need(utc(now)&&(!events.length||Date.parse(now)>=Date.parse(events.at(-1).observedAt)),'Queue clock moved backwards')
 const payload={sequence:events.length+1,previousEventSha256:events.at(-1)?.eventSha256??null,producerId:id,action,observedAt:now,requestSha256:digest(r),outcome:action==='REVIEW'?'CONTRACT_REVIEWED_EXECUTION_BLOCKED':'CANCELLED'}
 return {...payload,eventSha256:digest(payload)}
}
function load(ctx){
 let raw
 try{raw=readBounded(join(ctx.queue,'queue.json'),65536)}catch(e){if(e.code==='ENOENT')return null;throw e}
 const stored=JSON.parse(raw.toString('utf8'))
 need(Array.isArray(stored.events)&&stored.events.length>0&&stored.events.length<=ctx.p.requests.length,'Invalid queue history')
 const events=[]
 for(const e of stored.events){
  need(e&&Date.parse(e.observedAt)<=Date.parse(ctx.now),'Future queue event')
  const expected=makeEvent(ctx,events,e.producerId,e.action,e.observedAt)
  need(same(e,expected),'Queue event integrity mismatch')
  events.push(expected)
 }
 need(same(stored,envelope(ctx,events)),'Queue ledger integrity mismatch')
 return stored
}
function view(ctx,s){
 const events=s?.events??[]
 const requests=ctx.p.requests.map(r=>({...r,declaredBudget:{...r.declaredBudget},status:events.find(e=>e.producerId===r.producerId)?.outcome??'PENDING_CONTRACT_REVIEW'}))
 return {kind:'PRODUCER_CONTRACT_QUEUE_STATUS',queuePlanSha256:ctx.queuePlanSha,queueSha256:s?.queueSha256??null,evidenceStateSha256:ctx.p.evidenceStateSha256,registrySha256:ctx.p.registrySha256,controlSha256:ctx.p.controlSha256,requests,pending:requests.filter(r=>r.status==='PENDING_CONTRACT_REVIEW').length,reviewed:events.filter(e=>e.action==='REVIEW').length,cancelled:events.filter(e=>e.action==='CANCEL').length,dispatchAuthorized:false,...flags,limitations:['Declared synthetic resource envelope only; no resources allocated or enforced.','Contract review is metadata validation, not workload execution or producer connectivity.','Fixed evidence and control anchors; new state or control requires a separately reviewed queue plan.']}
}
function lock(dir,name,fn){
 const path=join(dir,name);mkdirSync(path,{mode:0o700})
 try{return fn()}finally{rmSync(path,{recursive:true,force:true})}
}
function atomic(ctx,s){
 const temp=join(ctx.queue,'.pending-'+randomUUID())
 try{
  const fd=openSync(temp,'wx',0o600)
  try{writeFileSync(fd,JSON.stringify(s,null,2)+'\n');fsyncSync(fd)}finally{closeSync(fd)}
  renameSync(temp,join(ctx.queue,'queue.json'))
 }finally{rmSync(temp,{force:true})}
}
export function inspectQueue(evidence,registry,op,opSha,queue,qp,qpSha,{now=new Date().toISOString(),trustedQueueSha256=undefined}={}){
 const ctx=context(evidence,registry,op,opSha,queue,qp,qpSha,now)
 ctx.verify();const s=load(ctx)
 if(trustedQueueSha256!==undefined)need(hex(trustedQueueSha256)&&s?.queueSha256===trustedQueueSha256,'Queue external anchor mismatch')
 return view(ctx,s)
}
export function reviewQueue(evidence,registry,op,opSha,queue,qp,qpSha,previous,producerId,action,{now=new Date().toISOString()}={}){
 const ctx=context(evidence,registry,op,opSha,queue,qp,qpSha,now)
 need(previous===null||hex(previous),'Explicit previous queue fingerprint required')
 // Same registry lock as pause/resume, then queue lock: never approve against a concurrent control transition.
 return lock(ctx.registry,'.orchestration-lock',()=>lock(ctx.queue,'.queue-lock',()=>{
  ctx.verify()
  const s=load(ctx)
  need((s?.queueSha256??null)===previous,'Previous queue anchor mismatch')
  const events=s?.events??[],next=envelope(ctx,[...events,makeEvent(ctx,events,producerId,action,now)])
  ctx.verify();atomic(ctx,next)
  return view(ctx,load(ctx))
 }))
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{
  const [cmd,...args]=process.argv.slice(2)
  if(cmd==='status'&&(args.length===7||args.length===8))console.log(JSON.stringify(inspectQueue(...args.slice(0,7),{trustedQueueSha256:args[7]}),null,2))
  else if(cmd==='review'&&args.length===10)console.log(JSON.stringify(reviewQueue(...args.slice(0,7),args[7]==='NEW'?null:args[7],args[8],args[9]),null,2))
  else throw Error('Usage: producer-queue.mjs status <evidence> <registry> <orchestration-plan> <plan-sha> <queue-dir> <queue-plan> <queue-plan-sha> [queue-sha] | review <same seven arguments> <NEW-or-previous-queue-sha> <producer-id> <REVIEW-or-CANCEL>')
 }catch(e){console.error(e.message);process.exitCode=1}
}
