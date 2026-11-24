// Reviewer handoff for general data provenance and legal-use documentation.
// Does not authenticate reviewers, certify records, or authorize research use.
import {createHash} from 'node:crypto'
import {pathToFileURL} from 'node:url'
import {qualityReport} from './quality-report.mjs'
import {sourcePaths} from './source-audit.mjs'
const sha=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x)
const rev=x=>typeof x==='string'&&/^[a-f0-9]{40}$/.test(x)
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex')
const checklist=Object.freeze([
 'Identify original publisher, operator and any upstream supplier.',
 'Obtain documentary terms governing storage, analysis, retention and redistribution.',
 'Verify evidence documents against independently obtained originals.',
 'Confirm relevant source relationships; a different URL alone does not prove independence.',
 'Record unresolved restrictions and conflicts; do not certify missing evidence.'
])
export function makeReviewPacket(report){
 if(report?.kind!=='CENTRAL_DATA_QUALITY_REPORT'||report.publicationGate!=='BLOCKED'||
    report.executionAuthorized!==false||report.validationAuthorized!==false||
    !rev(report.declaredSourceRevision)||!sha(report.manifestSha256))throw Error('Invalid quality report')
 const rows=report.sources,reviews=report.provenanceReview?.sources
 if(!Array.isArray(rows)||!Array.isArray(reviews)||rows.length!==sourcePaths.length||
    reviews.length!==sourcePaths.length||!sourcePaths.every(p=>
    rows.filter(x=>x?.path===p).length===1&&reviews.filter(x=>x?.path===p).length===1))throw Error('Invalid source inventory')
 const tasks=sourcePaths.map(path=>{
  const row=rows.find(x=>x.path===path),review=reviews.find(x=>x.path===path)
  const present=report.inspectionConsistent===true&&row.status==='PRESENT'&&sha(row.sha256)
  const sourceSha256=present?row.sha256:null
  const binding={path,sourceSha256,declaredRevision:report.declaredSourceRevision,manifestSha256:report.manifestSha256}
  return {...binding,taskId:digest(binding),status:present?'DOCUMENTARY_REVIEW_REQUIRED':'SOURCE_UNAVAILABLE',
   recordedReviewState:review.status,checklist:[...checklist],
   independentReviewRecorded:false,accessAuthorized:false}
 })
 const payload={kind:'SOURCE_DOCUMENTARY_REVIEW_PACKET',schemaVersion:1,
  declaredSourceRevision:report.declaredSourceRevision,manifestSha256:report.manifestSha256,
  inspectionConsistent:report.inspectionConsistent===true,
  tasks,counts:{total:tasks.length,documentaryReviewRequired:tasks.filter(t=>t.status==='DOCUMENTARY_REVIEW_REQUIRED').length,
   sourceUnavailable:tasks.filter(t=>t.status==='SOURCE_UNAVAILABLE').length,independentlyVerified:0},
  researchOnly:true,publicationGate:'BLOCKED',executionAuthorized:false,validationAuthorized:false,accessAuthorized:false,
  limitations:['Task IDs bind the declared revision and receipt; they are not signatures or reviewer authentication.',
   'No documents or individual source records are included. No licence or permission is inferred.',
   'Recreate the packet after any source change and independently review actual documentation.']}
 return {...payload,packetSha256:digest(payload)}
}
export function verifyPacket(packet){
 if(!packet||!sha(packet.packetSha256))return false
 const {packetSha256,...payload}=packet
 return payload.kind==='SOURCE_DOCUMENTARY_REVIEW_PACKET'&&payload.schemaVersion===1&&
  payload.publicationGate==='BLOCKED'&&payload.accessAuthorized===false&&
  payload.executionAuthorized===false&&payload.validationAuthorized===false&&digest(payload)===packetSha256
}
export function reviewPacket(root,revision){return makeReviewPacket(qualityReport(root,revision))}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(process.argv.length!==4){console.error('Usage: node review-packet.mjs <root> <declared-revision>');process.exitCode=2}
 else{try{console.log(JSON.stringify(reviewPacket(process.argv[2],process.argv[3]),null,2))}catch(e){console.error(e.message);process.exitCode=1}}
}
