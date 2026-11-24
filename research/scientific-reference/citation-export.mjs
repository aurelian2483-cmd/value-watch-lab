// Read-only reference metadata export; not a publication-ready bibliography.
import {pathToFileURL} from 'node:url'
import {resolve} from 'node:path'
import {load,validate} from './library.mjs'
import {assessReviews,loadLedger,digest} from './review-history.mjs'
const flags={researchOnly:true,publicationGate:'BLOCKED',executionAuthorized:false,validationAuthorized:false}
export function exportReferences(register,ledger,asOf){
 validate(register)
 const review=assessReviews(register,ledger,asOf)
 const entries=register.sources.map(s=>({
  sourceId:s.id,title:s.title,publisher:s.publisher,kind:s.kind,url:s.url,doi:s.doi,
  version:s.version,accessedOn:s.accessedOn,authors:null,publicationDate:null,
  sourceMetadataSha256:digest(s),rightsStatus:s.rightsStatus,contentSha256:s.contentSha256,
  claims:register.claims.filter(c=>c.sourceId===s.id).map(c=>{
   const r=review.rows.find(x=>x.claimId===c.id)
   return {claimId:c.id,locator:c.locator,statement:c.statement,scope:c.scope,
    claimMetadataSha256:r.claimMetadataSha256,reviewState:r.state,reviewEventSha256:r.latestReviewSha256,
    observedOn:r.observedOn,observedVersion:r.observedVersion,
    independentReview:false,empiricalEvidence:false,contentVerified:false,rightsVerified:false}
  })
 }))
 const payload={kind:'SCIENTIFIC_REFERENCE_EXPORT',schemaVersion:1,asOf,
  registerSha256:review.registerSha256,ledgerSha256:review.ledgerSha256,reviewStatusSha256:review.statusSha256,
  counts:{sources:entries.length,claims:entries.reduce((n,s)=>n+s.claims.length,0),...review.counts},
  entries,...flags,
  limitations:['Metadata-only citation records, not a prescribed citation style or publication approval.',
   'Author and publication date fields are not represented by the source schema and are left unknown.',
   'Access date and review date are not publication dates. Publisher is not assumed to be author.',
   'Recorded locator or metadata review does not certify external source contents, independence or rights.']}
 return {...payload,exportSha256:digest(payload)}
}
// Escape Markdown metacharacters and HTML delimiters; no active links or executable markup.
const esc=x=>String(x??'Not recorded').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])).replace(/[\\`*_{}\[\]()#!|~]/g,c=>'\\'+c)
export function renderReferenceNotes(report){
 const {exportSha256,...payload}=report
 if(report.kind!=='SCIENTIFIC_REFERENCE_EXPORT'||digest(payload)!==exportSha256||
    !Object.entries(flags).every(([k,v])=>report[k]===v))throw Error('Invalid export report')
 const lines=['# Scientific reference notes','','RESEARCH ONLY — PUBLICATION BLOCKED','',
  'As of: '+esc(report.asOf),'Export fingerprint: '+esc(exportSha256),'']
 for(const s of report.entries){
  lines.push('## '+esc(s.title),'','Source ID: '+esc(s.sourceId),'Publisher: '+esc(s.publisher),
   'Authors: '+esc(s.authors),'Publication date: '+esc(s.publicationDate),
   'Version: '+esc(s.version),'Recorded access date: '+esc(s.accessedOn),
   'URL: '+esc(s.url),'DOI: '+esc(s.doi),'Rights: '+esc(s.rightsStatus),'')
  for(const c of s.claims)lines.push('### '+esc(c.claimId),'','Locator: '+esc(c.locator),
   'Claim: '+esc(c.statement),'Scope: '+esc(c.scope),'Recorded review: '+esc(c.reviewState),
   'Review observed on: '+esc(c.observedOn),'Review version: '+esc(c.observedVersion),
   'Independent review: No; empirical evidence: No; content verified: No; rights verified: No.','')
 }
 lines.push('## Limitations','',...report.limitations.map(x=>'- '+esc(x)),'')
 return lines.join('\n')
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{
  if(process.argv.length!==4||!['json','markdown'].includes(process.argv[3]))throw Error('Usage: node citation-export.mjs <YYYY-MM-DD> json|markdown')
  const report=exportReferences(load(),loadLedger(),process.argv[2])
  process.stdout.write(process.argv[3]==='json'?JSON.stringify(report,null,2)+'\n':renderReferenceNotes(report))
 }catch(e){console.error(e.message);process.exitCode=1}
}
