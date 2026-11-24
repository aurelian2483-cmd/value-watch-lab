// Internal bounded control ledger. All writes use the registry writer lock in registry.mjs.
import {randomUUID} from 'node:crypto'
import {openSync,writeFileSync,fsyncSync,closeSync,renameSync,rmSync} from 'node:fs'
import {join} from 'node:path'
import {readBounded} from '../unified-live/sync.mjs'
import {digest} from '../scientific-reference/digest.mjs'
const MAX=64
const need=(x,m)=>{if(!x)throw Error(m)}
const hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x)
const utc=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x
const stages=['REGISTRY_REVIEW','PREVIOUS_ANCHOR','CLOCK','DEPENDENCIES','EVIDENCE_RECHECK','PERSISTENCE']
const gates={executionAuthorized:false,repairAuthorized:false,modelValidation:'UNVALIDATED',publicationGate:'BLOCKED'}
function envelope(planSha256,events){
 const payload={kind:'ORCHESTRATION_CONTROL_LEDGER',schemaVersion:1,planSha256,events,...gates}
 return {...payload,controlSha256:digest(payload)}
}
function event(sequence,previousEventSha256,type,stage,observedAt,registrySha256){
 const payload={sequence,previousEventSha256,type,stage,observedAt,registrySha256}
 return {...payload,eventSha256:digest(payload)}
}
export function readControl(root,planSha256,now){
 need(hex(planSha256)&&utc(now),'Invalid control context')
 let bytes
 try{bytes=readBounded(join(root,'control.json'),65536)}catch(e){if(e.code==='ENOENT')return null;throw e}
 const raw=JSON.parse(bytes.toString('utf8'))
 need(Array.isArray(raw.events)&&raw.events.length>0&&raw.events.length<=MAX,'Invalid control ledger size')
 let hold=false,last=null
 const events=[]
 for(const e of raw.events){
  need(e&&utc(e.observedAt)&&Date.parse(e.observedAt)<=Date.parse(now)&&(!last||Date.parse(e.observedAt)>=Date.parse(last.observedAt))&&(e.registrySha256===null||hex(e.registrySha256)),'Invalid control chronology or registry binding')
  if(e.type==='REVIEW_REJECTED')need(!hold&&stages.includes(e.stage),'Invalid incident transition')
  else if(e.type==='PAUSE')need(!hold&&e.stage===null,'Invalid pause transition')
  else if(e.type==='RESUME')need(hold&&e.stage===null,'Invalid resume transition')
  else throw Error('Unknown control event')
  const v=event(events.length+1,last?.eventSha256??null,e.type,e.stage,e.observedAt,e.registrySha256)
  need(digest(e)===digest(v),'Invalid control event chain')
  events.push(v);last=v;hold=e.type!=='RESUME'
 }
 const verified=envelope(planSha256,events)
 need(digest(raw)===digest(verified),'Control ledger fingerprint or contract mismatch')
 return verified
}
export function controlView(ledger){
 const last=ledger?.events.at(-1)
 return {status:last&&last.type!=='RESUME'?'REVIEW_HOLD':'METADATA_REVIEW_AVAILABLE',controlSha256:ledger?.controlSha256??null,events:ledger?.events.length??0,incidents:ledger?.events.filter(e=>e.type==='REVIEW_REJECTED').length??0,lastEvent:last??null,capacityRemaining:MAX-(ledger?.events.length??0),...gates}
}
export function appendControl(root,planSha256,ledger,type,stage,now,registrySha256){
 const events=ledger?.events??[],view=controlView(ledger)
 need(events.length<MAX,'Control ledger capacity reached; manual review required')
 need(utc(now)&&(!events.length||Date.parse(now)>=Date.parse(events.at(-1).observedAt)),'Control clock moved backwards')
 need(registrySha256===null||hex(registrySha256),'Invalid registry binding')
 need((type==='RESUME'&&view.status==='REVIEW_HOLD'&&stage===null)||(view.status==='METADATA_REVIEW_AVAILABLE'&&((type==='PAUSE'&&stage===null)||(type==='REVIEW_REJECTED'&&stages.includes(stage)))),'Invalid control transition')
 const next=envelope(planSha256,[...events,event(events.length+1,events.at(-1)?.eventSha256??null,type,stage,now,registrySha256)])
 const temp=join(root,'.control-pending-'+randomUUID())
 try{
  const fd=openSync(temp,'wx',0o600)
  try{writeFileSync(fd,JSON.stringify(next,null,2)+'\n');fsyncSync(fd)}finally{closeSync(fd)}
  renameSync(temp,join(root,'control.json'))
 }finally{rmSync(temp,{force:true})}
 return next
}
