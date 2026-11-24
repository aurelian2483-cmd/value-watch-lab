// Bounded, opt-in polling of a local inbox. Never approves reports, starts producers or uses the network.
import {createHash} from 'node:crypto'
import {lstatSync,realpathSync} from 'node:fs'
import {resolve,join,relative,isAbsolute,sep} from 'node:path'
import {pathToFileURL} from 'node:url'
import {setTimeout as delay} from 'node:timers/promises'
import {readBounded,status as readStatus} from './sync.mjs'
import {signedSynchronise} from './producer-intake.mjs'
const need=(x,m)=>{if(!x)throw Error(m)}
const hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x)
const sha=x=>createHash('sha256').update(x).digest('hex')
const keys=(o,a)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===a.length&&a.every(k=>Object.hasOwn(o,k))
const root=p=>{const q=resolve(p);need(realpathSync(q)===q&&lstatSync(q).isDirectory(),'Unsafe directory');return q}
const within=(a,b)=>{const p=relative(a,b);return p===''||(!isAbsolute(p)&&p!=='..'&&!p.startsWith('..'+sep))}
const flags={modelValidation:'UNVALIDATED',publicationGate:'BLOCKED',executionAuthorized:false,repairAuthorized:false,measurementFreshness:'UNKNOWN'}
export function createCollector(inboxDir,stateDir,trustPath,planPath,trustedPlanSha256){
 const inbox=root(inboxDir),state=root(stateDir),trust=resolve(trustPath),planFile=resolve(planPath)
 need(!within(inbox,state)&&!within(state,inbox),'Input and state must be separate')
 for(const file of [trust,planFile])need(!within(inbox,file)&&!within(state,file)&&realpathSync(file)===file,'Trusted records must be separate')
 need(trust!==planFile&&hex(trustedPlanSha256),'Invalid trusted plan input')
 const raw=readBounded(planFile,65536)
 need(sha(raw)===trustedPlanSha256,'Collection plan fingerprint mismatch')
 const plan=JSON.parse(raw.toString('utf8'))
 need(keys(plan,['kind','schemaVersion','trustSha256','approvedDigests'])&&plan.kind==='APPROVED_COLLECTION_PLAN'&&plan.schemaVersion===1&&hex(plan.trustSha256)&&Array.isArray(plan.approvedDigests)&&plan.approvedDigests.length>=1&&plan.approvedDigests.length<=100&&plan.approvedDigests.every(hex)&&new Set(plan.approvedDigests).size===plan.approvedDigests.length,'Invalid collection plan')
 // Recheck separate trusted records every cycle. No new digest is learned from inbox contents.
 const allowed=new Set(plan.approvedDigests),seen=new Set()
 let running=false,expectedState=undefined
 const result=(status,extra={})=>({kind:'CONTROLLED_COLLECTION_RECEIPT',status,...extra,...flags})
 function tick({now=new Date().toISOString()}={}){
  need(!running,'Collector cycle already active')
  running=true
  try{
   if(!readBounded(planFile,65536).equals(raw)||sha(readBounded(trust,65536))!==plan.trustSha256)return result('TRUSTED_CONFIGURATION_CHANGED')
   let current
   try{
    current=readStatus(state,{now})
    if(current.authentication.mode==='SIGNATURES_REVERIFIED_AT_ACCEPTANCE'&&current.authentication.trustSha256!==plan.trustSha256)return result('STATE_INTEGRITY_STOP')
    if(expectedState!==undefined&&current.stateSha256!==expectedState)return result('STATE_INTEGRITY_STOP')
    expectedState=current.stateSha256
   }catch{return result('STATE_INTEGRITY_STOP')}
   let approval
   try{approval=sha(readBounded(join(inbox,'approval.json'),65536))}
   catch(e){return result(e.code==='ENOENT'?'WAITING_FOR_APPROVAL':'INPUT_UNAVAILABLE')}
   if(!allowed.has(approval))return result('WAITING_FOR_EXPLICIT_APPROVAL')
   if(seen.has(approval))return result('ALREADY_PROCESSED',{approvalSha256:approval})
   try{
    const receipt=signedSynchronise(inbox,state,trust,plan.trustSha256,approval,{now,expectedPreviousStateSha256:expectedState})
    expectedState=receipt.stateSha256
    seen.add(approval)
    return result(receipt.status,{sequence:receipt.sequence,approvalSha256:approval,stateSha256:receipt.stateSha256})
   }catch{return result('SIGNED_BATCH_REJECTED',{approvalSha256:approval})}
  }catch{return result('TRUSTED_CONFIGURATION_UNAVAILABLE')}
  finally{running=false}
 }
 return Object.freeze({tick})
}
export async function collect(collector,{intervalMs=15000,maxCycles=20,signal,onReceipt=()=>{}}={}){
 need(Number.isSafeInteger(intervalMs)&&intervalMs>=1000&&intervalMs<=60000&&Number.isSafeInteger(maxCycles)&&maxCycles>=1&&maxCycles<=240&&intervalMs*maxCycles<=3600000,'Invalid polling bounds')
 let cycles=0,reason='CYCLE_LIMIT'
 for(;cycles<maxCycles;){
  if(signal?.aborted){reason='STOP_REQUESTED';break}
  const receipt=collector.tick();cycles++
  onReceipt(receipt)
  if(['TRUSTED_CONFIGURATION_CHANGED','TRUSTED_CONFIGURATION_UNAVAILABLE'].includes(receipt.status)){reason='TRUSTED_CONFIGURATION_STOP';break}
  if(receipt.status==='STATE_INTEGRITY_STOP'){reason='STATE_INTEGRITY_STOP';break}
  if(signal?.aborted){reason='STOP_REQUESTED';break}
  if(cycles<maxCycles){
   try{await delay(intervalMs,undefined,{signal})}
   catch(e){if(e.name!=='AbortError')throw e;reason='STOP_REQUESTED';break}
  }
 }
 return {kind:'CONTROLLED_COLLECTION_STOP',cycles,reason,...flags}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{
  const args=process.argv.slice(2)
  if(args.length!==5&&args.length!==7)throw Error('Usage: collector.mjs <inbox> <state-dir> <trust-file> <plan-file> <trusted-plan-sha256> [interval-ms max-cycles]')
  const collector=createCollector(...args.slice(0,5)),controller=new AbortController()
  const stop=()=>controller.abort()
  process.once('SIGINT',stop);process.once('SIGTERM',stop)
  try{
   const r=await collect(collector,{intervalMs:args[5]===undefined?15000:Number(args[5]),maxCycles:args[6]===undefined?20:Number(args[6]),signal:controller.signal,onReceipt:r=>console.log(JSON.stringify(r))})
   console.log(JSON.stringify(r))
   if(['TRUSTED_CONFIGURATION_STOP','STATE_INTEGRITY_STOP'].includes(r.reason))process.exitCode=1
  }finally{process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop)}
 }catch(e){console.error(e.message);process.exitCode=1}
}
