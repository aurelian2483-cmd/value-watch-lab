// Phase 3: persistent, bounded orchestration of metadata reviews, not research execution.
import {createHash,randomUUID} from 'node:crypto'
import {lstatSync,realpathSync,mkdirSync,rmSync,openSync,writeFileSync,fsyncSync,closeSync,renameSync,readFileSync} from 'node:fs'
import {resolve,relative,isAbsolute,sep,join} from 'node:path'
import {pathToFileURL} from 'node:url'
import {readBounded,status as phase2Status} from '../unified-live/sync.mjs'
import {digest} from '../scientific-reference/digest.mjs'
const pins=JSON.parse(readFileSync(new URL('../unified-control-centre/source-pins.json',import.meta.url),'utf8'))
const BASE='79379e17c448f17404d0df70d76b87fcb4f51504'
const flags=Object.freeze({researchOnly:true,modelValidation:'UNVALIDATED',publicationGate:'BLOCKED',executionAuthorized:false,repairAuthorized:false,accessAuthorized:false,sourceMutationAuthorized:false,validationAuthorized:false,measurementFreshness:'UNKNOWN'})
const tasks=Object.freeze([
 {id:'catalogue-review',source:'catalogue',requires:[]},
 {id:'data-review',source:'data',requires:[]},
 {id:'reference-review',source:'references',requires:[]},
 {id:'laboratory-review',source:'lab',requires:['catalogue-review','data-review','reference-review']},
 {id:'compute-review',source:'compute',requires:['laboratory-review']},
 {id:'supervisor-review',source:'supervisor',requires:['compute-review']},
 {id:'readiness-review',source:null,requires:['supervisor-review']}
])
const need=(x,m)=>{if(!x)throw Error(m)}
const sha=b=>createHash('sha256').update(b).digest('hex')
const hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x)
const utc=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x
const keys=(o,a)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===a.length&&a.every(k=>Object.hasOwn(o,k))
const root=p=>{const q=resolve(p);need(realpathSync(q)===q&&lstatSync(q).isDirectory(),'Unsafe directory');return q}
const within=(a,b)=>{const p=relative(a,b);return p===''||(!isAbsolute(p)&&p!=='..'&&!p.startsWith('..'+sep))}
const same=(a,b)=>digest(a)===digest(b)
function context(phase2Dir,registryDir,planPath,expected,now){
 const evidence=root(phase2Dir),registry=root(registryDir),file=resolve(planPath)
 need(!within(evidence,registry)&&!within(registry,evidence),'Evidence and registry must be separate')
 need(realpathSync(file)===file&&!within(registry,file)&&!within(evidence,file),'External plan must be separate')
 need(hex(expected)&&utc(now),'Invalid trusted plan or clock')
 const raw=readBounded(file,65536)
 need(sha(raw)===expected,'Orchestration plan fingerprint mismatch')
 const plan=JSON.parse(raw.toString('utf8'))
 need(keys(plan,['kind','schemaVersion','baseRevision','stateSha256','trustSha256','mode'])&&plan.kind==='APPROVED_ORCHESTRATION_REVIEW'&&plan.schemaVersion===1&&plan.baseRevision===BASE&&hex(plan.stateSha256),'Invalid orchestration plan')
 need((plan.mode==='HISTORICAL_MANUAL_REVIEW'&&plan.trustSha256===null)||(plan.mode==='SIGNED_REPORT_REVIEW'&&hex(plan.trustSha256)),'Invalid review mode')
 const evidenceStatus=()=>phase2Status(evidence,{now,trustedTrustSha256:plan.trustSha256,trustedStateSha256:plan.trustSha256?plan.stateSha256:null})
 const verify=()=>{
  const s=evidenceStatus()
  need(s.stateSha256===plan.stateSha256&&s.snapshot?.counts.available===6&&Object.entries(flags).every(([k,v])=>s[k]===v),'Pinned Phase 2 evidence unavailable or changed')
  need(s.authentication.mode===(plan.trustSha256?'SIGNATURES_REVERIFIED_AT_ACCEPTANCE':'MANUAL_DIGEST_APPROVAL'),'Evidence mode mismatch')
  need(s.snapshot.modules.every((m,i)=>m.id===pins[i].id&&m.source.head===pins[i].head),'Source revision mismatch')
  need(s.syncStatus!=='CLOCK_UNCERTAIN','Evidence receipt clock uncertain')
  need(readBounded(file,65536).equals(raw),'External plan changed')
  return s
 }
 return {registry,plan,expected,verify,evidence:verify()}
}
function observation(task,s){
 if(task.source===null)return {source:null,summarySha256:null,contractStatus:'RESEARCH_NOT_READY',decision:'EXECUTION_BLOCKED'}
 const m=s.snapshot.modules.find(x=>x.id===task.source)
 need(m?.evidenceState==='SUMMARY_CONTRACT_CHECKED'&&hex(m.receiptSha256),'Source summary unavailable')
 return {source:m.id,summarySha256:m.receiptSha256,contractStatus:m.status,decision:'METADATA_REVIEW_ONLY'}
}
function envelope(ctx,events,createdAt){
 const p={kind:'RESEARCH_ORCHESTRATION_REGISTRY',schemaVersion:1,planSha256:ctx.expected,evidenceStateSha256:ctx.plan.stateSha256,mode:ctx.plan.mode,createdAt,events,...flags}
 return {...p,registrySha256:digest(p)}
}
function load(ctx){
 let raw
 try{raw=readBounded(join(ctx.registry,'registry.json'),65536)}catch(e){if(e.code==='ENOENT')return null;throw e}
 const r=JSON.parse(raw.toString('utf8'))
 need(utc(r.createdAt)&&Array.isArray(r.events)&&r.events.length<=tasks.length,'Invalid registry history')
 const events=[]
 let previous=null,last=r.createdAt
 for(let i=0;i<r.events.length;i++){
  const e=r.events[i],t=tasks[i]
  need(utc(e.observedAt)&&Date.parse(e.observedAt)>=Date.parse(last),'Invalid event chronology')
  const payload={sequence:i+1,taskId:t.id,observedAt:e.observedAt,previousEventSha256:previous,evidenceStateSha256:ctx.plan.stateSha256,outcome:observation(t,ctx.evidence)}
  const canonical={...payload,eventSha256:digest(payload)}
  need(same(e,canonical),'Invalid task receipt or event chain')
  events.push(canonical);previous=canonical.eventSha256;last=e.observedAt
 }
 need(same(r,envelope(ctx,events,r.createdAt)),'Registry fingerprint or contract mismatch')
 return r
}
function atomic(root,r){
 const p=join(root,'.pending-'+randomUUID())
 try{
  const fd=openSync(p,'wx',0o600)
  try{writeFileSync(fd,JSON.stringify(r,null,2)+'\n');fsyncSync(fd)}finally{closeSync(fd)}
  renameSync(p,join(root,'registry.json'))
 }finally{rmSync(p,{force:true})}
}
function withLock(root,fn){
 const lock=join(root,'.orchestration-lock')
 mkdirSync(lock,{mode:0o700})
 try{return fn()}finally{rmSync(lock,{recursive:true,force:true})}
}
function view(ctx,r){
 const done=new Set(r?.events.map(e=>e.taskId)??[])
 return {kind:'ORCHESTRATION_STATUS',registrySha256:r?.registrySha256??null,planSha256:ctx.expected,evidenceStateSha256:ctx.plan.stateSha256,mode:ctx.plan.mode,receiptFreshness:ctx.evidence.syncStatus,
  status:!r?'NOT_INITIALIZED':done.size===tasks.length?'METADATA_REVIEW_COMPLETE_EXECUTION_BLOCKED':'REVIEW_PENDING',
  reviewed:done.size,total:tasks.length,tasks:tasks.map(t=>({...t,requires:[...t.requires],status:done.has(t.id)?'REVIEW_RECORDED':t.requires.every(x=>done.has(x))?'READY_FOR_METADATA_REVIEW':'WAITING_FOR_DEPENDENCIES'})),...flags,
  limitations:['Metadata reviews are not executed experiments or scientific qualification.','Pinned historical or signed summary state only; no producer access, scheduler, network or execution.','Registry self-hash is not independent authentication; retain the latest fingerprint separately.']}
}
export function inspect(phase2Dir,registryDir,planPath,expected,{now=new Date().toISOString(),trustedRegistrySha256=undefined}={}){
 const ctx=context(phase2Dir,registryDir,planPath,expected,now),r=load(ctx)
 if(r)need(Date.parse(now)>=Date.parse(r.events.at(-1)?.observedAt??r.createdAt),'Registry clock moved backwards')
 if(trustedRegistrySha256!==undefined)need(hex(trustedRegistrySha256)&&r?.registrySha256===trustedRegistrySha256,'Registry external anchor mismatch')
 return view(ctx,r)
}
export function advance(phase2Dir,registryDir,planPath,expected,previous,{now=new Date().toISOString()}={}){
 const ctx=context(phase2Dir,registryDir,planPath,expected,now)
 need(previous===null||hex(previous),'Explicit previous registry fingerprint required')
 return withLock(ctx.registry,()=>{
  ctx.evidence=ctx.verify()
  const r=load(ctx)
  need((r?.registrySha256??null)===previous,'Previous registry anchor mismatch')
  const last=r?.events.at(-1),createdAt=r?.createdAt??now
  need(Date.parse(now)>=Date.parse(last?.observedAt??createdAt),'Registry clock moved backwards')
  const events=r?.events??[]
  if(events.length===tasks.length)return view(ctx,r)
  const t=tasks[events.length],done=new Set(events.map(e=>e.taskId))
  need(t.requires.every(x=>done.has(x)),'Task dependencies incomplete')
  const payload={sequence:events.length+1,taskId:t.id,observedAt:now,previousEventSha256:last?.eventSha256??null,evidenceStateSha256:ctx.plan.stateSha256,outcome:observation(t,ctx.evidence)}
  const next=envelope(ctx,[...events,{...payload,eventSha256:digest(payload)}],createdAt)
  ctx.verify()
  atomic(ctx.registry,next)
  return view(ctx,load(ctx))
 })
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{
  const [cmd,...args]=process.argv.slice(2)
  if(cmd==='status'&&(args.length===4||args.length===5))console.log(JSON.stringify(inspect(...args.slice(0,4),{trustedRegistrySha256:args[4]}),null,2))
  else if(cmd==='advance'&&args.length===5)console.log(JSON.stringify(advance(...args.slice(0,4),args[4]==='NEW'?null:args[4]),null,2))
  else throw Error('Usage: registry.mjs status <phase2-state-dir> <registry-dir> <plan> <trusted-plan-sha256> [trusted-registry-sha256] | advance <phase2-state-dir> <registry-dir> <plan> <trusted-plan-sha256> <NEW-or-previous-registry-sha256>')
 }catch(e){console.error(e.message);process.exitCode=1}
}
