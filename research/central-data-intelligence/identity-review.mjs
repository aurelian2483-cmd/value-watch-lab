// Synthetic contract tests for general cross-provider record identity.
// No production adapter, external fetch, settlement certification or model execution.
const id=x=>typeof x==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(x)
const sha=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x)
const utc=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(x)&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x
const key=r=>JSON.stringify([r.namespace,r.nativeId])
function valid(r){
 return r&&['namespace','nativeId','domain','collection','contract'].every(k=>id(r[k]))&&
  utc(r.scheduledAt)&&r.timePrecision==='EXACT_MILLISECOND'&&
  Array.isArray(r.participantIds)&&r.participantIds.length>=1&&r.participantIds.length<=128&&
  r.participantIds.every(id)&&new Set(r.participantIds).size===r.participantIds.length&&
  sha(r.receiptSha256)&&utc(r.observedAt)
}
function group(rows){
 const m=new Map()
 for(const r of rows){const k=key(r);if(!m.has(k))m.set(k,[]);m.get(k).push(r)}
 return m
}
export function reviewSyntheticIdentities({mode,left,right,crosswalk}={}){
 if(mode!=='SYNTHETIC_IDENTITY_TEST')throw Error('Only synthetic identity fixtures are supported')
 if(!Array.isArray(left)||!Array.isArray(right)||!Array.isArray(crosswalk)||
    [left,right,crosswalk].some(a=>a.length>1000)||!left.every(valid)||!right.every(valid))throw Error('Invalid synthetic input')
 if(crosswalk.some(c=>!c||!id(c.leftNamespace)||!id(c.leftId)||!id(c.rightNamespace)||!id(c.rightId)||
    c.leftNamespace===c.rightNamespace||!sha(c.mappingReceiptSha256)||!Array.isArray(c.participantMappings)||
    c.participantMappings.length<1||c.participantMappings.length>128||
    c.participantMappings.some(p=>!p||!id(p.left)||!id(p.right))||
    new Set(c.participantMappings.map(p=>p.left)).size!==c.participantMappings.length||
    new Set(c.participantMappings.map(p=>p.right)).size!==c.participantMappings.length))throw Error('Invalid explicit mapping')
 const a=group(left),b=group(right)
 const lk=c=>JSON.stringify([c.leftNamespace,c.leftId]),rk=c=>JSON.stringify([c.rightNamespace,c.rightId])
 const counts={mappingInput:crosswalk.length,structurallyConsistent:0,ambiguous:0,missingRecord:0,identityConflict:0,contractConflict:0,chronologyConflict:0}
 const matchedLeft=new Set(),matchedRight=new Set()
 const leftCounts=new Map(),rightCounts=new Map()
 for(const c of crosswalk){leftCounts.set(lk(c),(leftCounts.get(lk(c))??0)+1);rightCounts.set(rk(c),(rightCounts.get(rk(c))??0)+1)}
 for(const c of crosswalk){
  const l=a.get(lk(c))??[],r=b.get(rk(c))??[]
  if(leftCounts.get(lk(c))!==1||rightCounts.get(rk(c))!==1||l.length>1||r.length>1){counts.ambiguous++;continue}
  if(l.length!==1||r.length!==1){counts.missingRecord++;continue}
  const x=l[0],y=r[0],mapping=new Map(c.participantMappings.map(p=>[p.left,p.right]))
  if(x.domain!==y.domain||x.collection!==y.collection||x.participantIds.length!==y.participantIds.length||
    mapping.size!==x.participantIds.length||x.participantIds.some((v,i)=>mapping.get(v)!==y.participantIds[i])){
   counts.identityConflict++;continue
  }
  if(x.contract!==y.contract){counts.contractConflict++;continue}
  if(x.scheduledAt!==y.scheduledAt){counts.chronologyConflict++;continue}
  counts.structurallyConsistent++;matchedLeft.add(lk(c));matchedRight.add(rk(c))
 }
 return {kind:'SYNTHETIC_IDENTITY_REVIEW',counts,leftRows:left.length,rightRows:right.length,
  leftRowsNotLinked:left.length-matchedLeft.size,rightRowsNotLinked:right.length-matchedRight.size,
  status:'REVIEW_ONLY',researchOnly:true,publicationGate:'BLOCKED',validationAuthorized:false,
  executionAuthorized:false,sourceMutationAuthorized:false,
  limitations:['Mappings and receipts are synthetic caller-supplied claims, not authenticated approvals.',
   'Exact identity consistency does not establish source independence, observation availability or correctness.',
   'No fuzzy matching, actual record access, settlement inference or certification.']}
}
