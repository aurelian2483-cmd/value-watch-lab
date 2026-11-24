// Explicitly structured claim comparisons. No natural-language inference or truth selection.
import {readFileSync,lstatSync,realpathSync} from 'node:fs'
import {fileURLToPath,pathToFileURL} from 'node:url'
import {resolve} from 'node:path'
import {load,validate} from './library.mjs'
import {digest,reviewBinding,assessReviews,loadLedger} from './review-history.mjs'
const flags={researchOnly:true,publicationGate:'BLOCKED',executionAuthorized:false,validationAuthorized:false}
const exact=(o,keys)=>o&&Object.getPrototypeOf(o)===Object.prototype&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k))
const sha=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x)
const id=x=>typeof x==='string'&&/^[a-z0-9][a-z0-9-]{0,79}$/.test(x)
const text=x=>typeof x==='string'&&x.trim()===x&&x.length>0&&x.length<=500&&!/[\x00-\x1f\x7f]/.test(x)
const validValue=v=>exact(v,['type','value'])&&v.type==='boolean'&&typeof v.value==='boolean'||
 exact(v,['type','lower','upper','unit'])&&v.type==='closed-interval'&&Number.isFinite(v.lower)&&Number.isFinite(v.upper)&&v.lower<=v.upper&&text(v.unit)
export function validateAnnotations(registry){
 if(!exact(registry,['kind','schemaVersion','annotations',...Object.keys(flags)])||
 registry.kind!=='SCIENTIFIC_COMPARISON_ANNOTATIONS'||registry.schemaVersion!==1||!Object.entries(flags).every(([k,v])=>registry[k]===v)||
 !Array.isArray(registry.annotations)||registry.annotations.length>500)throw Error('Invalid annotation register')
 const ids=new Set()
 for(const a of registry.annotations){
  if(!exact(a,['claimId','sourceId','sourceMetadataSha256','claimMetadataSha256','concept','conditions','value','interpretationNote','independentlyReviewed'])||
   !id(a.claimId)||!id(a.sourceId)||ids.has(a.claimId)||!sha(a.sourceMetadataSha256)||!sha(a.claimMetadataSha256)||
   !id(a.concept)||!text(a.conditions)||!validValue(a.value)||!text(a.interpretationNote)||a.independentlyReviewed!==false)throw Error('Invalid comparison annotation')
  ids.add(a.claimId)
 }
 return true
}
export function compareValues(a,b){
 if(a.concept!==b.concept)return 'DIFFERENT_CONCEPT'
 if(a.conditions!==b.conditions)return 'CONDITIONS_DIFFER'
 if(a.value.type!==b.value.type)return 'VALUE_TYPES_DIFFER'
 if(a.value.type==='boolean')return a.value.value===b.value.value?'AGREEMENT_RECORDED':'POTENTIAL_CONFLICT'
 if(a.value.unit!==b.value.unit)return 'UNITS_DIFFER'
 return a.value.upper<b.value.lower||b.value.upper<a.value.lower?'POTENTIAL_CONFLICT':'INTERVALS_OVERLAP'
}
export function compareClaims(register,ledger,annotations,asOf){
 validate(register);validateAnnotations(annotations)
 const review=assessReviews(register,ledger,asOf)
 const byId=new Map(register.claims.map(c=>[c.id,c]))
 const rows=annotations.annotations.map(a=>{
  const c=byId.get(a.claimId),s=c&&register.sources.find(x=>x.id===c.sourceId)
  const binding=s&&reviewBinding(s,c)
  const state=!binding||a.sourceId!==s.id?'ORPHAN_ANNOTATION':
   a.sourceMetadataSha256!==binding.sourceMetadataSha256||a.claimMetadataSha256!==binding.claimMetadataSha256?'STALE_ANNOTATION':
   review.rows.find(r=>r.claimId===c.id)?.state!=='CURRENT_RECORDED_LOCATOR_REVIEW'?'LOCATOR_REVIEW_REQUIRED':'ELIGIBLE_FOR_STRUCTURED_COMPARISON'
  return {claimId:a.claimId,state}
 })
 const eligible=annotations.annotations.filter(a=>rows.some(r=>r.claimId===a.claimId&&r.state==='ELIGIBLE_FOR_STRUCTURED_COMPARISON'))
 const pairs=[]
 for(let i=0;i<eligible.length;i++)for(let j=i+1;j<eligible.length;j++){
  const a=eligible[i],b=eligible[j]
  if(a.concept!==b.concept)continue
  const status=compareValues(a,b)
  const claimIds=[a.claimId,b.claimId].sort()
  pairs.push({claimIds,comparisonId:digest(claimIds),status,sameSource:a.sourceId===b.sourceId,independenceVerified:false,truthDetermined:false})
 }
 pairs.sort((a,b)=>a.comparisonId.localeCompare(b.comparisonId))
 const annotated=new Set(rows.map(r=>r.claimId))
 const payload={kind:'SCIENTIFIC_CLAIM_COMPARISON_REPORT',schemaVersion:1,asOf,registerSha256:digest(register),ledgerSha256:digest(ledger),annotationsSha256:digest(annotations),
  counts:{registeredClaims:register.claims.length,unannotatedClaims:register.claims.filter(c=>!annotated.has(c.id)).length,eligibleAnnotations:eligible.length,comparablePairs:pairs.filter(p=>['POTENTIAL_CONFLICT','AGREEMENT_RECORDED','INTERVALS_OVERLAP'].includes(p.status)).length,potentialConflicts:pairs.filter(p=>p.status==='POTENTIAL_CONFLICT').length,confirmedContradictions:0},
  rows,pairs,...flags,limitations:['Only manually structured, version-bound annotations with recorded locator review are compared.',
   'Exact condition labels and units must agree; no unit conversion, uncertainty inference, semantic matching or truth determination.',
   'Overlapping intervals do not prove equivalence. Disjoint intervals and differing booleans are potential conflicts, not confirmed contradictions.',
   'No comparison coverage means unknown, not agreement. No independent review or empirical validation.']}
 return {...payload,reportSha256:digest(payload)}
}
export function loadAnnotations(){
 const p=fileURLToPath(new URL('./comparison-annotations.json',import.meta.url)),s=lstatSync(p)
 if(realpathSync(p)!==p||!s.isFile()||s.size>1024*1024)throw Error('Unsafe annotation register')
 const a=JSON.parse(readFileSync(p,'utf8'));validateAnnotations(a);return a
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{if(process.argv.length!==3)throw Error('Usage: node compare-claims.mjs <YYYY-MM-DD>');console.log(JSON.stringify(compareClaims(load(),loadLedger(),loadAnnotations(),process.argv[2]),null,2))}
 catch(e){console.error(e.message);process.exitCode=1}
}
