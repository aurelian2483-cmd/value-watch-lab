// Read-only operational diagnostics for a dedicated local experiment registry.
// No automatic repair, execution, data collection or research qualification.
import {lstatSync,readdirSync,readFileSync,realpathSync} from 'node:fs'
import {join,resolve} from 'node:path'
import {createHash} from 'node:crypto'
import {pathToFileURL} from 'node:url'
import {supervise} from '../mathematical-library/experiment-registry-supervisor.mjs'
import {history} from '../mathematical-library/experiment-registry-lifecycle.mjs'
const hash=b=>createHash('sha256').update(b).digest('hex')
const idPattern=/^[a-f0-9]{64}$/
const maxFile=4*1024*1024,maxEntries=5000,maxTotal=64*1024*1024
const actions={
 STORE_UNAVAILABLE:'Check the dedicated registry location.',
 UNSAFE_OR_OVERSIZED_STORE:'Inspect store paths and size bounds before retrying.',
 STORE_CHANGED_DURING_INSPECTION:'Retry against an inactive, stable registry.',
 UNREADABLE_OR_INVALID_HISTORY:'Preserve the original history; inspect the chain and backup.',
 RUNNING_OWNER_UNVERIFIED:'Confirm the current owner; do not take over automatically.',
 RUNNING_AGE_EXCEEDS_THRESHOLD:'Review the owner and last recorded activity; age alone is not proof of a stalled job.',
 NO_CHECKPOINT:'Review whether recovery evidence exists.',
 CHECKPOINT_UNAVAILABLE_OR_INVALID:'Inspect the checkpoint and its content fingerprint.',
 TERMINAL_EVIDENCE_MISSING_OR_INVALID:'Inspect the referenced terminal evidence without replacing it.',
 FAILED_EXPERIMENT:'Review the retained failure and its evidence before considering a new run.',
 INTERRUPTED_EXPERIMENT:'Review ownership and any recoverable checkpoint.',
 INVALID_EVENT_TIME:'Review event timestamps and clock consistency.',
 ORPHAN_LIFECYCLE:'Inspect the lifecycle folder without assuming it belongs to a registered experiment.',
 STORE_LOCK_PRESENT:'Wait for the owner or review the lock manually.'
}
function snapshot(root){
 const receipts=[],manifests=[],folders=[],artifactIdentities=new Map()
 let total=0
 const read=(path,relative)=>{
  const s=lstatSync(path)
  if(!s.isFile()||s.isSymbolicLink()||s.size>maxFile)throw Error('Unsafe file')
  total+=s.size
  if(total>maxTotal||receipts.length>=maxEntries)throw Error('Store exceeds inspection bounds')
  const b=readFileSync(path)
  if(b.length!==s.size)throw Error('File changed')
  receipts.push({path:relative,sha256:hash(b),bytes:b.length})
  if(relative.startsWith('artifacts/')){
   try{const a=JSON.parse(b);artifactIdentities.set(relative,{schemaVersion:a?.schemaVersion,experimentId:a?.experimentId,stateObject:!!a?.state&&Object.getPrototypeOf(a.state)===Object.prototype})}
   catch{artifactIdentities.set(relative,null)}
  }
 }
 const names=readdirSync(root).sort()
 if(names.length>maxEntries)throw Error('Too many entries')
 for(const name of names){
  const p=join(root,name),s=lstatSync(p)
  if(s.isSymbolicLink())throw Error('Unsafe path')
  if(/^[a-f0-9]{64}\.json$/.test(name)){
   read(p,name);manifests.push(name.slice(0,-5))
  }else if(idPattern.test(name)||name==='artifacts'){
   if(!s.isDirectory())throw Error('Unsafe directory')
   if(name!=='artifacts')folders.push(name)
   const children=readdirSync(p).sort()
   if(children.length>maxEntries)throw Error('Too many entries')
   for(const child of children){
    if(!(name==='artifacts'?/^[a-f0-9]{64}\.json$/:/^\d{8}\.json$/).test(child))throw Error('Unexpected nested entry')
    read(join(p,child),name+'/'+child)
   }
  }else if(['.synthetic-math-registry-v1','.synthetic-math-lock'].includes(name)){
   read(p,name)
  }else throw Error('Unexpected registry entry')
 }
 return {receipts,manifests,folders,artifactIdentities,fingerprint:hash(JSON.stringify({receipts,manifests,folders}))}
}
export function inspectRegistry(directory,{asOf=new Date().toISOString(),runningAgeSeconds=3600}={}){
 if(typeof asOf!=='string'||!Number.isFinite(Date.parse(asOf))||new Date(asOf).toISOString()!==asOf||
   !Number.isSafeInteger(runningAgeSeconds)||runningAgeSeconds<60||runningAgeSeconds>604800)throw Error('Invalid inspection policy')
 const incidents=[],seen=new Set()
 function add(code,severity,experimentId=null){
  const incidentId=hash(JSON.stringify([code,experimentId]))
  if(seen.has(incidentId))return
  seen.add(incidentId)
  incidents.push({incidentId,code,severity,experimentId,recommendedAction:actions[code]??'Review the original registry evidence; no automatic repair.'})
 }
 let counts=null,receipt=null,stable=false
 try{
  const root=resolve(directory)
  if(realpathSync(root)!==root||!lstatSync(root).isDirectory())throw Error('Unsafe registry root')
  const before=snapshot(root)
  if(before.receipts.some(r=>r.path==='.synthetic-math-lock')){
   add('STORE_LOCK_PRESENT','REVIEW')
  }else{
   const old=supervise(root)
   for(const i of old.incidents)add(i.code,i.severity,i.experimentId??null)
   for(const folder of before.folders)if(!before.manifests.includes(folder))add('ORPHAN_LIFECYCLE','BLOCK',folder)
   for(const row of old.snapshot.records){
    const h=history(root,row.experimentId),last=h.events.at(-1)
    let previous=-Infinity
    for(const event of h.events){
     const t=Date.parse(event.recordedAt)
     if(typeof event.recordedAt!=='string'||!Number.isFinite(t)||new Date(t).toISOString()!==event.recordedAt||t<previous||t>Date.parse(asOf)+60000)add('INVALID_EVENT_TIME','BLOCK',row.experimentId)
     previous=t
    }
    if(row.status==='RUNNING'&&last&&Date.parse(asOf)-Date.parse(last.recordedAt)>runningAgeSeconds*1000)
     add('RUNNING_AGE_EXCEEDS_THRESHOLD','REVIEW',row.experimentId)
    if(row.status==='FAILED')add('FAILED_EXPERIMENT','REVIEW',row.experimentId)
    if(row.status==='INTERRUPTED')add('INTERRUPTED_EXPERIMENT','REVIEW',row.experimentId)
    for(const event of h.events.filter(e=>['CHECKPOINTED','COMPLETED'].includes(e.status)||(e.status==='FAILED'&&e.details?.artifactHash!==undefined))){
     const digest=event.details?.artifactHash
     const evidence=typeof digest==='string'&&idPattern.test(digest)&&before.receipts.find(r=>r.path==='artifacts/'+digest+'.json')
     const identity=evidence&&before.artifactIdentities.get(evidence.path)
     if(!evidence||evidence.sha256!==digest||identity?.schemaVersion!==1||identity.experimentId!==row.experimentId||!identity.stateObject)add(event.status==='CHECKPOINTED'?'CHECKPOINT_UNAVAILABLE_OR_INVALID':'TERMINAL_EVIDENCE_MISSING_OR_INVALID','BLOCK',row.experimentId)
    }
   }
   const after=snapshot(root)
   stable=before.fingerprint===after.fingerprint
   if(stable){counts=old.snapshot.errors.length===0?old.snapshot.statuses:null;receipt=before.fingerprint}
   else add('STORE_CHANGED_DURING_INSPECTION','BLOCK')
  }
 }catch(e){add(e?.code==='ENOENT'?'STORE_UNAVAILABLE':'UNSAFE_OR_OVERSIZED_STORE','BLOCK')}
 incidents.sort((a,b)=>a.incidentId.localeCompare(b.incidentId))
 return {kind:'RESEARCH_SUPERVISOR_OPERATIONAL_REPORT',schemaVersion:1,asOf,runningAgeSeconds,
  status:incidents.some(i=>i.severity==='BLOCK')?'BLOCKED':incidents.length?'REVIEW_REQUIRED':'NO_DETECTED_INCIDENTS',
  counts,inspectionStable:stable,storeFingerprint:receipt,incidents,
  incidentCounts:{block:incidents.filter(i=>i.severity==='BLOCK').length,review:incidents.filter(i=>i.severity==='REVIEW').length},
  researchOnly:true,publicationGate:'BLOCKED',executionAuthorized:false,validationAuthorized:false,repairAuthorized:false,
  limitations:['Local dedicated registry only. Byte fingerprints do not certify mathematical results.',
   'Before/after inspection is not an atomic snapshot or hostile filesystem isolation.',
   'Age and lock signals do not prove process ownership or a stalled process. No automatic recovery or repair.']}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(process.argv.length!==3){console.error('Usage: node supervisor.mjs <dedicated-registry-directory>');process.exitCode=2}
 else{try{const r=inspectRegistry(process.argv[2]);console.log(JSON.stringify(r,null,2));if(r.status!=='NO_DETECTED_INCIDENTS')process.exitCode=1}catch(e){console.error(e.message);process.exitCode=1}}
}
