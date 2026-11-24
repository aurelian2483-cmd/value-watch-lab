// One immutable reference snapshot; no network, source retrieval, execution or scientific qualification.
import {pathToFileURL} from 'node:url'
import {resolve} from 'node:path'
import {load} from './library.mjs'
import {assessReviews,loadLedger,digest} from './review-history.mjs'
import {compareClaims,loadAnnotations} from './compare-claims.mjs'
import {exportReferences} from './citation-export.mjs'
const flags={researchOnly:true,publicationGate:'BLOCKED',executionAuthorized:false,validationAuthorized:false}
export function dashboard(register,ledger,annotations,asOf){
 const review=assessReviews(register,ledger,asOf)
 const comparison=compareClaims(register,ledger,annotations,asOf)
 const references=exportReferences(register,ledger,asOf)
 if(comparison.registerSha256!==review.registerSha256||references.registerSha256!==review.registerSha256||
  comparison.ledgerSha256!==review.ledgerSha256||references.ledgerSha256!==review.ledgerSha256||
  references.reviewStatusSha256!==review.statusSha256)throw Error('Inconsistent reference snapshots')
 const payload={kind:'SCIENTIFIC_REFERENCE_DASHBOARD',schemaVersion:1,asOf,
  status:'REVIEW_REQUIRED',counts:{sources:references.counts.sources,claims:references.counts.claims,
   recordedLocatorReviews:review.counts.CURRENT_RECORDED_LOCATOR_REVIEW??0,
   recordedMetadataReviews:review.counts.CURRENT_RECORDED_METADATA_REVIEW??0,
   changedMetadata:review.counts.METADATA_CHANGED_REVIEW_REQUIRED??0,
   noReviewRecorded:review.counts.NO_REVIEW_RECORDED??0,
   unannotatedClaims:comparison.counts.unannotatedClaims,comparablePairs:comparison.counts.comparablePairs,
   potentialConflicts:comparison.counts.potentialConflicts,independentlyReviewed:0,rightsVerified:0,empiricallyQualified:0},
  sources:references.entries,comparisonCoverage:comparison.counts.comparablePairs===0?'NO_COMPARABLE_PAIRS':'STRUCTURED_PAIRS_AVAILABLE',
  comparisons:comparison.pairs,annotationStates:comparison.rows,
  evidence:{registerSha256:review.registerSha256,ledgerSha256:review.ledgerSha256,reviewStatusSha256:review.statusSha256,
   comparisonSha256:comparison.reportSha256,exportSha256:references.exportSha256},
  ...flags,limitations:['Recorded review means metadata-bound observation, not authenticated independent verification.',
   'Zero potential conflicts with no comparable pairs means unassessed, not scientific agreement.',
   'No source content archived, rights verified, empirical qualification or publication permission.',
   'Static local preview; no live publisher monitoring or production integration.']}
 return {...payload,dashboardSha256:digest(payload)}
}
const esc=x=>String(x??'Not recorded').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
export function renderDashboard(report){
 const {dashboardSha256,...payload}=report
 if(report.kind!=='SCIENTIFIC_REFERENCE_DASHBOARD'||digest(payload)!==dashboardSha256||
  !Object.entries(flags).every(([k,v])=>report[k]===v))throw Error('Invalid dashboard snapshot')
 const metrics=[['Sources',report.counts.sources],['Claims',report.counts.claims],['Recorded locator reviews',report.counts.recordedLocatorReviews],
  ['Recorded metadata reviews',report.counts.recordedMetadataReviews],['Changed metadata',report.counts.changedMetadata],['No review recorded',report.counts.noReviewRecorded],
  ['Unannotated claims',report.counts.unannotatedClaims],['Comparable pairs',report.counts.comparablePairs],
  ['Potential conflicts',report.comparisonCoverage==='NO_COMPARABLE_PAIRS'?'Unassessed':report.counts.potentialConflicts],
  ['Independent reviews',report.counts.independentlyReviewed],['Rights verified',report.counts.rightsVerified],['Empirically qualified',report.counts.empiricallyQualified]]
 const sources=report.sources.map(s=>'<section><h3>'+esc(s.title)+'</h3><p>'+esc(s.publisher)+'</p><dl><dt>Source</dt><dd>'+esc(s.url)+'</dd><dt>DOI</dt><dd>'+esc(s.doi)+'</dd><dt>Version</dt><dd>'+esc(s.version)+'</dd><dt>Rights</dt><dd>'+esc(s.rightsStatus)+'</dd></dl>'+s.claims.map(c=>'<article><h4>'+esc(c.claimId)+'</h4><p>'+esc(c.statement)+'</p><p>Locator: '+esc(c.locator)+'</p><p>Scope: '+esc(c.scope)+'</p><p>Review: '+esc(c.reviewState)+'</p></article>').join('')+'</section>').join('')
 const pairs=report.comparisons.map(p=>'<li>'+esc(p.claimIds.join(' / '))+' — '+esc(p.status)+'</li>').join('')
 return '<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src &apos;none&apos;; style-src &apos;unsafe-inline&apos;; base-uri &apos;none&apos;; form-action &apos;none&apos;"><title>Scientific Reference Library</title><style>*{box-sizing:border-box}body{margin:0;background:#101827;color:#edf3fc;font:16px/1.5 system-ui,sans-serif}main{width:100%;max-width:1100px;min-width:0;margin:auto;padding:24px 16px;overflow-wrap:anywhere}h1,h2,h3,h4,code,dd{overflow-wrap:anywhere;word-break:break-word;max-width:100%}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(200px,100%),1fr));gap:12px}.metric,section{min-width:0;padding:16px;background:#19273b;border:1px solid #394b62;border-radius:10px}.metric strong{display:block;font-size:1.4rem}section{margin:12px 0}article{border-top:1px solid #394b62}dt{color:#bfccdc}dd{margin:0 0 12px}</style></head><body><main><p>RESEARCH CONTROL CENTRE / SCIENTIFIC REFERENCES</p><h1>Scientific Reference Library</h1><p>PUBLICATION BLOCKED · NO EXECUTION AUTHORISED</p><p>As of: '+esc(report.asOf)+'</p><h2>'+esc(report.status)+'</h2><div class="grid">'+metrics.map(([k,v])=>'<div class="metric">'+esc(k)+'<strong>'+esc(v)+'</strong></div>').join('')+'</div><h2>Comparison coverage</h2><p>'+esc(report.comparisonCoverage)+'</p>'+(pairs?'<ul>'+pairs+'</ul>':'<p>No comparable pairs; scientific agreement has not been assessed.</p>')+'<h2>Registered sources</h2>'+sources+'<h2>Limitations</h2><ul>'+report.limitations.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul><p>Snapshot fingerprint: <code>'+esc(dashboardSha256)+'</code></p></main></body></html>\n'
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{if(process.argv.length!==4||!['json','html'].includes(process.argv[3]))throw Error('Usage: node dashboard.mjs <YYYY-MM-DD> json|html')
 const r=dashboard(load(),loadLedger(),loadAnnotations(),process.argv[2])
 process.stdout.write(process.argv[3]==='json'?JSON.stringify(r,null,2)+'\n':renderDashboard(r))
 }catch(e){console.error(e.message);process.exitCode=1}
}
