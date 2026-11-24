// Metadata review only. A recorded claim never grants access or confirms authenticity.
import {readFileSync,realpathSync,lstatSync} from 'node:fs'
import {resolve} from 'node:path'
import {sourcePaths} from './source-audit.mjs'
const registerPath='research/central-data-intelligence/source-review-register.json'
const sha=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x)
const id=x=>typeof x==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(x)
const utc=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(x)&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x
const scopes=['metadata-inspection','storage','research-analysis','redistribution']
function validClaim(c){
 return c&&sourcePaths.includes(c.path)&&sha(c.sourceSha256)&&id(c.providerNamespace)&&
  sha(c.originEvidenceSha256)&&sha(c.rightsEvidenceSha256)&&
  (c.independenceEvidenceSha256===null||sha(c.independenceEvidenceSha256))&&
  utc(c.recordedAt)&&utc(c.expiresAt)&&c.recordedAt<c.expiresAt&&
  Array.isArray(c.claimedScopes)&&c.claimedScopes.length>0&&
  c.claimedScopes.every(s=>scopes.includes(s))&&new Set(c.claimedScopes).size===c.claimedScopes.length
}
export function evaluateRegister(rows,register,{inspectionConsistent,asOf,registerStatus='AVAILABLE'}={}){
 if(!utc(asOf)||!Array.isArray(rows)||rows.length!==sourcePaths.length||
   !sourcePaths.every(p=>rows.filter(r=>r?.path===p).length===1))throw Error('Invalid source inventory or review time')
 const valid=registerStatus==='AVAILABLE'&&register?.schemaVersion===1&&
   register.kind==='SOURCE_REVIEW_CLAIMS'&&Array.isArray(register.claims)&&
   register.claims.length<=1000&&register.claims.every(validClaim)
 const counts=Object.create(null)
 const sources=sourcePaths.map(path=>{
  const row=rows.find(r=>r.path===path),claims=valid?register.claims.filter(c=>c.path===path):[]
  const c=claims.length===1?claims[0]:null
  const status=inspectionConsistent!==true?'INSPECTION_INCONSISTENT':
   row.status!=='PRESENT'||!sha(row.sha256)?'SOURCE_UNAVAILABLE':
   !valid?'REGISTER_UNAVAILABLE_OR_INVALID':
   claims.length>1?'AMBIGUOUS_CLAIMS':
   !c?'NO_RECORDED_CLAIM':
   c.sourceSha256!==row.sha256?'CONTENT_CHANGED_REVIEW_REQUIRED':
   c.recordedAt>asOf?'CLAIM_NOT_YET_EFFECTIVE':
   c.expiresAt<=asOf?'CLAIM_EXPIRED':'CLAIM_REQUIRES_INDEPENDENT_REVIEW'
  counts[status]=(counts[status]??0)+1
  return {path,status,claimCount:valid?claims.length:null,
   claimedScopes:status==='CLAIM_REQUIRES_INDEPENDENT_REVIEW'?[...c.claimedScopes]:[],
   provenanceVerified:false,rightsVerified:false,independenceVerified:false,accessAuthorized:false}
 })
 return {kind:'SOURCE_PROVENANCE_AND_RIGHTS_REVIEW',schemaVersion:1,asOf,
  registerStatus:valid?'AVAILABLE':registerStatus==='AVAILABLE'?'INVALID':registerStatus,
  status:'REVIEW_REQUIRED',sources,counts,researchOnly:true,publicationGate:'BLOCKED',
  executionAuthorized:false,validationAuthorized:false,sourceMutationAuthorized:false,
  accessAuthorized:false,limitations:[
   'Evidence digests and scope declarations are unverified metadata claims, not evidence of legal permission.',
   'No evidence documents are opened and no provider independence is certified.',
   'Claims must be reviewed externally, including licence terms, permitted use, retention and redistribution.',
   'Missing, ambiguous, expired or changed claims cannot authorize access. Even a current claim remains unverified.'
  ]}
}
export function reviewSources(root,rows,inspectionConsistent,asOf=new Date().toISOString()){
 let register=null,registerStatus='AVAILABLE'
 try{
  const base=realpathSync(root),file=resolve(base,registerPath)
  if(realpathSync(file)!==file||!lstatSync(file).isFile())registerStatus='UNSAFE_PATH'
  else register=JSON.parse(readFileSync(file,'utf8'))
 }catch(e){registerStatus=e?.code==='ENOENT'?'MISSING':'UNREADABLE_OR_INVALID'}
 return evaluateRegister(rows,register,{inspectionConsistent,asOf,registerStatus})
}
