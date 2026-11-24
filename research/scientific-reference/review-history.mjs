// Version-bound review observations, not authenticated review or source-content archives.
import {digest} from './digest.mjs'
export {digest} from './digest.mjs'
import {readFileSync,lstatSync,realpathSync} from 'node:fs'
import {fileURLToPath,pathToFileURL} from 'node:url'
import {resolve} from 'node:path'
import {validate,load} from './library.mjs'
const sha=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x)
const day=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString().slice(0,10)===x
const id=x=>typeof x==='string'&&/^[a-z0-9][a-z0-9-]{0,79}$/.test(x)
const text=x=>typeof x==='string'&&x.length>0&&x.length<=1000&&x.trim()===x&&!/[\x00-\x1f\x7f]/.test(x)
const flags={researchOnly:true,publicationGate:'BLOCKED',executionAuthorized:false,validationAuthorized:false}
const exact=(o,keys)=>o&&Object.getPrototypeOf(o)===Object.prototype&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k))
export function reviewBinding(source,claim){
 if(!source||!claim||source.id!==claim.sourceId)throw Error('Wrong source for claim')
 return {sourceMetadataSha256:digest(source),claimMetadataSha256:digest(claim)}
}
export function validateLedger(ledger){
 if(!exact(ledger,['kind','schemaVersion','events',...Object.keys(flags)])||ledger.kind!=='SCIENTIFIC_REFERENCE_REVIEW_LEDGER'||ledger.schemaVersion!==1||
 !Object.entries(flags).every(([k,v])=>ledger[k]===v)||!Array.isArray(ledger.events)||ledger.events.length>10000)throw Error('Invalid ledger contract')
 let previous=null,lastDate=''
 for(const [index,e] of ledger.events.entries()){
  if(!exact(e,['sequence','previous','sourceId','claimId','sourceMetadataSha256','claimMetadataSha256','observedOn','reviewType','observedVersion','note','independentReview','sourceContentSha256','eventSha256'])||
  e.sequence!==index+1||e.previous!==previous||!id(e.sourceId)||!id(e.claimId)||!sha(e.sourceMetadataSha256)||!sha(e.claimMetadataSha256)||
  !day(e.observedOn)||e.observedOn<lastDate||!['LOCATOR_INSPECTED','METADATA_INSPECTED'].includes(e.reviewType)||!text(e.observedVersion)||!text(e.note)||
  e.independentReview!==false||e.sourceContentSha256!==null||!sha(e.eventSha256))throw Error('Invalid review event')
  const {eventSha256,...payload}=e
  if(digest(payload)!==eventSha256)throw Error('Review event fingerprint mismatch')
  previous=eventSha256;lastDate=e.observedOn
 }
 return true
}
export function assessReviews(register,ledger,asOf){
 validate(register);validateLedger(ledger)
 if(!day(asOf))throw Error('Explicit review date required')
 const rows=register.claims.map(c=>{
  const s=register.sources.find(s=>s.id===c.sourceId),binding=reviewBinding(s,c)
  const latest=ledger.events.filter(e=>e.claimId===c.id&&e.sourceId===s.id&&e.observedOn<=asOf).at(-1)
  const matched=latest&&latest.sourceMetadataSha256===binding.sourceMetadataSha256&&latest.claimMetadataSha256===binding.claimMetadataSha256&&latest.observedOn>=s.accessedOn&&latest.reviewType===c.reviewStatus
  const state=!latest?'NO_REVIEW_RECORDED':!matched?'METADATA_CHANGED_REVIEW_REQUIRED':latest.reviewType==='LOCATOR_INSPECTED'?'CURRENT_RECORDED_LOCATOR_REVIEW':'CURRENT_RECORDED_METADATA_REVIEW'
  return {claimId:c.id,sourceId:s.id,...binding,state,latestReviewSha256:latest?.eventSha256??null,observedOn:latest?.observedOn??null,observedVersion:latest?.observedVersion??null,independentReview:false,contentVerified:false,rightsVerified:false}
 })
 const counts={}
 for(const r of rows)counts[r.state]=(counts[r.state]??0)+1
 const payload={kind:'SCIENTIFIC_REFERENCE_REVIEW_STATUS',schemaVersion:1,asOf,registerSha256:digest(register),ledgerSha256:digest(ledger),counts,rows,
 retainedEvents:ledger.events.length,orphanEvents:ledger.events.filter(e=>!register.claims.some(c=>c.id===e.claimId&&c.sourceId===e.sourceId)).length,
 futureEvents:ledger.events.filter(e=>e.observedOn>asOf).length,...flags,
 limitations:['Current means matching registered metadata, not confirmation that live publisher content is unchanged.','Recorded observations are not independent review or signatures; no publisher bytes archived.','Changes require new observations; historical events remain retained.']}
 return {...payload,statusSha256:digest(payload)}
}
export function loadLedger(){
 const p=fileURLToPath(new URL('./review-ledger.json',import.meta.url)),s=lstatSync(p)
 if(realpathSync(p)!==p||!s.isFile()||s.size>4*1024*1024)throw Error('Unsafe review ledger')
 const l=JSON.parse(readFileSync(p,'utf8'));validateLedger(l);return l
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{if(process.argv.length!==3)throw Error('Usage: node review-history.mjs <YYYY-MM-DD>');console.log(JSON.stringify(assessReviews(load(),loadLedger(),process.argv[2]),null,2))}
 catch(e){console.error(e.message);process.exitCode=1}
}
