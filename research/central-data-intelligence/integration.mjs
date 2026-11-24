// Aggregate report integration only. No data collection, model execution or authorization.
import {qualityReport} from './quality-report.mjs'
import {controlCentre} from '../mathematical-library/experiment-registry-control-centre.mjs'
import {pathToFileURL} from 'node:url'
import {lstatSync,realpathSync} from 'node:fs'
import {join} from 'node:path'
import {sourcePaths} from './source-audit.mjs'
// Fixed dependency paths of the inherited control-centre readers at the audited revision.
// This is preflight defense for a stable local checkout, not an OS sandbox.
const inheritedPaths=Object.freeze([...new Set([...sourcePaths,
 'research/bottleneck/inventory.json','research/performance-report-latest.json',
 'paper-lab/hybrid-market-data.json','research-dashboard-data.json'])])
function guardInheritedInputs(root){
 const base=realpathSync(root)
 for(const path of inheritedPaths){
  let current=base
  const pieces=path.split('/')
  for(let i=0;i<pieces.length;i++){
   current=join(current,pieces[i])
   let s
   try{s=lstatSync(current)}catch(e){if(e.code==='ENOENT')break;throw e}
   if(s.isSymbolicLink()||(i===pieces.length-1?!s.isFile():!s.isDirectory()))
    throw Error('Unsafe inherited source path: '+path)
  }
 }
 return base
}

const natural=n=>Number.isSafeInteger(n)&&n>=0
const sameCounts=(a,b)=>!!a&&!!b&&Object.keys(a).length>0&&Object.keys(a).length===Object.keys(b).length&&
 Object.keys(a).every(k=>Object.hasOwn(b,k)&&natural(a[k])&&a[k]===b[k])
export function integrateReports(quality,control){
 if(quality?.kind!=='CENTRAL_DATA_QUALITY_REPORT'||control?.kind!=='RESEARCH_CONTROL_CENTRE'||
    quality.publicationGate!=='BLOCKED'||control.publicationGate!=='BLOCKED'||
    quality.executionAuthorized!==false||control.executionAuthorized!==false||
    quality.validationAuthorized!==false||control.validationAuthorized!==false)
   throw Error('Unsupported or unsafe report contract')
 const valueWatch=control.systems.find(s=>s.id==='value-watch')
 const historicalMatch=sameCounts(quality.historical?.counts,valueWatch?.historical)
 const prospectiveMatch=sameCounts(quality.prospective?.counts,valueWatch?.prospective)
 const consistent=quality.inspectionConsistent===true&&historicalMatch&&prospectiveMatch
 const sourceCount=Array.isArray(quality.sources)?quality.sources.length:null
 const pending=quality.provenanceReview?.sources
 const reviewCount=Array.isArray(pending)?pending.filter(s=>s.rightsVerified!==true||s.provenanceVerified!==true||s.independenceVerified!==true).length:null
 const blockers=[...new Set([...control.blockers,...quality.gaps,
  ...(!consistent?['SHARED_AGGREGATE_COUNTS_UNRECONCILED']:[]),
  'INDEPENDENT_SOURCE_REVIEW_REQUIRED'])]
 return {schemaVersion:1,kind:'INTEGRATED_RESEARCH_DATA_STATUS',status:'RESEARCH_NOT_READY',
  generatedAt:control.generatedAt,declaredSourceRevision:quality.declaredSourceRevision,
  catalogue:control.catalogue,
  systems:control.systems.map(s=>({id:s.id,name:s.name,status:s.status})),
  dataQuality:{status:quality.status,aggregateCountsAgree:consistent,historicalMatch,prospectiveMatch,
    sourceCount,filesPresent:quality.inspectionConsistent===true&&sourceCount!==null?quality.sources.filter(s=>s.status==='PRESENT').length:null,
    archiveIndexEntries:quality.inspectionConsistent===true?quality.archive.declaredEntries:null,
    sourcesRequiringReview:reviewCount,manifestSha256:quality.manifestSha256,
    historical:consistent?quality.historical.counts:null,prospective:consistent?quality.prospective.counts:null,
    reviewStatus:quality.provenanceReview?.status??'UNAVAILABLE'},
  blockers,researchOnly:true,modelValidation:'UNVALIDATED',publicationGate:'BLOCKED',
  executionAuthorized:false,validationAuthorized:false,sourceMutationAuthorized:false,accessAuthorized:false,
  limitations:['Matching aggregate counts do not prove matching record contents or source authenticity.',
   'The two reports are separate filesystem inspections, not an atomic snapshot.',
   'Catalogue counts reflect this checkout, not the current remote catalogue branch.',
   'No source review grants permission or certifies individual records. No live deployment.']}
}
export function integratedStatus(root,directory,revision){
 const safeRoot=guardInheritedInputs(root)
 const quality=qualityReport(safeRoot,revision)
 guardInheritedInputs(safeRoot)
 const control=controlCentre(safeRoot,directory)
 guardInheritedInputs(safeRoot)
 const after=qualityReport(safeRoot,revision)
 const stable=quality.manifestSha256===after.manifestSha256&&quality.inspectionConsistent===true&&after.inspectionConsistent===true&&
  JSON.stringify(quality.sources)===JSON.stringify(after.sources)&&JSON.stringify(quality.archive)===JSON.stringify(after.archive)
 return integrateReports(stable?quality:{...quality,inspectionConsistent:false,gaps:[...quality.gaps,'SOURCE_CHANGED_BETWEEN_REPORTS']},control)
}
const esc=x=>String(x??'Unavailable').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
export function renderIntegratedStatus(root,directory,revision){
 const r=integratedStatus(root,directory,revision),d=r.dataQuality
 const metrics=[['Catalogue entries in this checkout',r.catalogue?.registered],['Catalogue target',r.catalogue?.readinessTarget],
  ['Allowlisted files',d.sourceCount],['Files present',d.filesPresent],['Archived index entries',d.archiveIndexEntries],
  ['Sources requiring review',d.sourcesRequiringReview],['Historical input rows',d.historical?.input],
  ['Frozen ledger rows',d.prospective?.predictionInput]]
 return '<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src &apos;none&apos;; style-src &apos;unsafe-inline&apos;; base-uri &apos;none&apos;; form-action &apos;none&apos;"><title>Integrated Research Status</title><style>*{box-sizing:border-box}body{margin:0;background:#101827;color:#edf3fc;font:16px/1.5 system-ui,sans-serif}main{max-width:1100px;margin:auto;padding:24px 16px}h1,h2{line-height:1.2}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(200px,100%),1fr));gap:12px}.metric,article{padding:16px;background:#19273b;border:1px solid #394b62;border-radius:10px;overflow-wrap:anywhere}.metric strong{display:block;font-size:1.5rem}p,span{color:#bfccdc}article{margin:10px 0}.warning{color:#ffdc9a}li,code{overflow-wrap:anywhere}</style></head><body><main><header><p>RESEARCH CONTROL CENTRE / CENTRAL DATA INTELLIGENCE</p><h1>Integrated research status</h1><p class="warning">UNVALIDATED · PUBLICATION BLOCKED · NO EXECUTION AUTHORISED</p><p>Declared checkout revision: <code>'+esc(revision)+'</code></p><p>Shared aggregate counts: '+esc(d.aggregateCountsAgree?'Agree':'Unreconciled')+'. Not record-level verification.</p></header><section><h2>Shared infrastructure</h2><div class="grid">'+metrics.map(([k,v])=>'<div class="metric"><span>'+esc(k)+'</span><strong>'+esc(v)+'</strong></div>').join('')+'</div></section><section><h2>Independent systems</h2>'+r.systems.map(s=>'<article><strong>'+esc(s.name)+'</strong><p>'+esc(s.status)+'</p></article>').join('')+'</section><section><h2>Data quality</h2><p>'+esc(d.status)+'</p><p>Source review: '+esc(d.reviewStatus)+'</p><h2>Outstanding requirements</h2><ul>'+r.blockers.map(b=>'<li>'+esc(b)+'</li>').join('')+'</ul><h2>Limitations</h2><ul>'+r.limitations.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></section></main></body></html>\n'
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(process.argv.length!==6||!['json','html'].includes(process.argv[5])){console.error('Usage: node integration.mjs <root> <registry-directory> <revision> <json|html>');process.exitCode=2}
 else{try{process.stdout.write(process.argv[5]==='html'?renderIntegratedStatus(process.argv[2],process.argv[3],process.argv[4]):JSON.stringify(integratedStatus(process.argv[2],process.argv[3],process.argv[4]),null,2)+'\n')}catch(e){console.error(e.message);process.exitCode=1}}
}
