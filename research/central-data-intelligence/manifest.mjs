// General data-quality infrastructure. No network access, modelling or financial operations.
import {readFileSync,realpathSync,lstatSync} from 'node:fs'
import {resolve,relative,isAbsolute,sep} from 'node:path'
import {createHash} from 'node:crypto'
import {pathToFileURL} from 'node:url'
import {inventoryHistorical} from '../mathematical-library/experiment-registry-historical-evidence.mjs'
import {inventoryProspective} from '../mathematical-library/experiment-registry-prospective-evidence.mjs'
const hash=b=>createHash('sha256').update(b).digest('hex')
const revisionValid=r=>typeof r==='string'&&/^[0-9a-f]{40}$/.test(r)
const shaValid=r=>typeof r==='string'&&/^[0-9a-f]{64}$/.test(r)
const paths=Object.freeze(['historical-reliability-data.json','prediction-ledger.json','results-feed.json','research/result-review-status.json'])
const safeCount=n=>Number.isSafeInteger(n)&&n>=0
function canonical(x){
 if(Array.isArray(x))return x.map(canonical)
 if(x!==null&&typeof x==='object')return Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])]))
 return x
}
const digest=x=>hash(JSON.stringify(canonical(x)))
function capture(root){
 return paths.map(path=>{
  try{
   const filename=resolve(root,path)
   const actual=realpathSync(filename),rel=relative(root,actual)
   if(rel==='..'||rel.startsWith('..'+sep)||isAbsolute(rel)||actual!==filename||!lstatSync(filename).isFile())
     return {path,status:'UNSAFE_PATH',sha256:null,bytes:null}
   const bytes=readFileSync(filename)
   return {path,status:'PRESENT',sha256:hash(bytes),bytes:bytes.length}
  }catch(e){return {path,status:e?.code==='ENOENT'?'MISSING':'UNREADABLE',sha256:null,bytes:null}}
 })
}
function sameReceipt(receipt,sha){return receipt?.status==='PRESENT'&&receipt.sha256===sha}
function reconcileHistorical(h){
 const c=h.counts
 if(!['input','accepted','duplicates','conflicting','rejected'].every(k=>safeCount(c[k]))||
    c.input!==c.accepted+c.duplicates+c.conflicting+c.rejected)throw Error('Historical reconciliation failed')
 return {status:'STRUCTURALLY_RECONCILED',counts:c,evidenceTier:h.evidenceTier,timePrecision:h.timePrecision}
}
function reconcileProspective(p){
 const c=p.counts
 if(!['predictionInput','structurallyAccepted','rejected','duplicateOrConflict','reviewInput','matchedReview','unmatchedAccepted','outcomeFeedInput'].every(k=>safeCount(c[k]))||
    c.predictionInput!==c.structurallyAccepted+c.rejected+c.duplicateOrConflict||
    c.structurallyAccepted!==c.matchedReview+c.unmatchedAccepted||
    c.matchedReview>c.reviewInput||
    !Object.values(p.reviewStatusCounts).every(safeCount)||
    Object.values(p.reviewStatusCounts).reduce((a,b)=>a+b,0)!==c.matchedReview)throw Error('Prospective reconciliation failed')
 return {status:'STRUCTURALLY_RECONCILED',counts:c,reviewStatusCounts:p.reviewStatusCounts}
}
export function buildManifest(root,sourceRevision){
 if(!revisionValid(sourceRevision))throw new TypeError('A full declared source revision is required')
 root=realpathSync(root)
 const before=capture(root),byPath=new Map(before.map(r=>[r.path,r]))
 const unavailable=reason=>({status:reason,counts:null})
 let historical=unavailable('SOURCE_UNAVAILABLE'),prospective=unavailable('SOURCE_UNAVAILABLE')
 if(byPath.get(paths[0]).status==='PRESENT'){
  try{const h=inventoryHistorical(root)
   if(!sameReceipt(byPath.get(paths[0]),h.sourceSha256))throw Error('Receipt mismatch')
   historical=reconcileHistorical(h)
  }catch{historical=unavailable('INVALID_OR_CHANGED_SOURCE')}
 }
 if(paths.slice(1).every(p=>byPath.get(p).status==='PRESENT')){
  try{const p=inventoryProspective(root)
   if(p.sources.length!==3||!p.sources.every(s=>paths.slice(1).includes(s.path)&&sameReceipt(byPath.get(s.path),s.sha256))||
     new Set(p.sources.map(s=>s.path)).size!==3)throw Error('Receipt mismatch')
   prospective=reconcileProspective(p)
  }catch{prospective=unavailable('INVALID_OR_CHANGED_SOURCE')}
 }
 const stable=digest(before)===digest(capture(root))
 if(!stable){historical=unavailable('SOURCE_CHANGED_DURING_INSPECTION');prospective=unavailable('SOURCE_CHANGED_DURING_INSPECTION')}
 const gaps=['SOURCE_RIGHTS_NOT_ESTABLISHED','INDEPENDENT_PROVIDER_AUTHENTICITY_NOT_ESTABLISHED','PROTECTED_SPLIT_NOT_AUTHORIZED']
 if(!stable)gaps.push('SOURCE_CHANGED_DURING_INSPECTION')
 if(!historical.counts)gaps.push('HISTORICAL_INVENTORY_UNAVAILABLE')
 else{
  gaps.push('HISTORICAL_DATE_ONLY_SINGLE_SOURCE')
  if(historical.counts.conflicting>0||historical.counts.rejected>0)gaps.push('HISTORICAL_ROWS_REQUIRE_REVIEW')
 }
 if(!prospective.counts)gaps.push('PROSPECTIVE_INVENTORY_UNAVAILABLE')
 else{
  if(prospective.counts.unmatchedAccepted>0)gaps.push('MISSING_MATCHED_REVIEW')
  if(prospective.counts.rejected>0||prospective.counts.duplicateOrConflict>0)gaps.push('PREDICTION_ROWS_REQUIRE_REVIEW')
  if(prospective.counts.outcomeFeedInput===0)gaps.push('NO_STORED_OUTCOME_FEED_ROWS')
  gaps.push('OUTCOME_FEED_NOT_INDEPENDENTLY_CERTIFIED_HERE')
 }
 const payload={schemaVersion:1,kind:'CENTRAL_DATA_INTEGRITY_MANIFEST',declaredSourceRevision:sourceRevision,
  sourceRevisionAuthenticated:false,sourceStableDuringInspection:stable,
  sources:before,historical,prospective,gaps,
  status:stable&&historical.counts&&prospective.counts?'INVENTORIES_RECONCILED':'INCOMPLETE',
  researchOnly:true,publicationGate:'BLOCKED',executionAuthorized:false,validationAuthorized:false,sourceMutationAuthorized:false,
  limitations:['Declared revision is a caller-supplied label; hashes do not prove repository membership or provider authenticity.',
   'Before/after checks are not an atomic filesystem snapshot; use a pinned read-only checkout.',
   'Counts describe overlapping source inventories, not unique cross-source events.',
   'No individual records, prices, probability vectors or protected partitions are emitted.']}
 return {...payload,manifestSha256:digest(payload)}
}
export function verifyManifest(manifest){
 if(!manifest||typeof manifest!=='object'||!shaValid(manifest.manifestSha256))return false
 const {manifestSha256,...payload}=manifest
 return payload.kind==='CENTRAL_DATA_INTEGRITY_MANIFEST'&&payload.schemaVersion===1&&
  payload.researchOnly===true&&payload.executionAuthorized===false&&payload.validationAuthorized===false&&
  payload.sourceMutationAuthorized===false&&payload.publicationGate==='BLOCKED'&&digest(payload)===manifestSha256
}
export function compareManifests(previous,current){
 if(!verifyManifest(previous)||!verifyManifest(current))throw Error('Invalid manifest fingerprint')
 if(!Array.isArray(previous.sources)||!Array.isArray(current.sources)||
  [previous,current].some(m=>m.sources.length!==paths.length||!paths.every(p=>m.sources.filter(r=>r.path===p).length===1)))throw Error('Invalid source set')
 const changes=paths.map(path=>{
  const a=previous.sources.find(r=>r.path===path),b=current.sources.find(r=>r.path===path)
  return {path,status:a.status!=='PRESENT'||b.status!=='PRESENT'?'UNAVAILABLE_FOR_COMPARISON':a.sha256===b.sha256?'UNCHANGED':'CONTENT_CHANGED'}
 })
 return {kind:'SOURCE_CONTENT_COMPARISON',changes,validationAuthorized:false,executionAuthorized:false,
  note:'Content changes are not evidence of statistical drift, correctness or updated rights.'}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(process.argv.length!==4){console.error('Usage: node manifest.mjs <source-root> <declared-revision>');process.exitCode=2}
 else{try{console.log(JSON.stringify(buildManifest(process.argv[2],process.argv[3]),null,2))}catch(e){console.error(e.message);process.exitCode=1}}
}
