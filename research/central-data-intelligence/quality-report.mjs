// Read-only aggregate quality report. No model execution or source certification.
import {buildManifest} from './manifest.mjs'
import {auditSources} from './source-audit.mjs'
import {pathToFileURL} from 'node:url'
const esc=x=>String(x??'Unavailable').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const num=x=>Number.isSafeInteger(x)&&x>=0?String(x):'Unavailable'
export function qualityReport(root,revision){
 const m=buildManifest(root,revision),a=auditSources(root)
 const sharedConsistent=m.sources.every(s=>{
  const row=a.rows.find(r=>r.path===s.path)
  return row&&row.status===s.status&&row.sha256===s.sha256&&row.bytes===s.bytes
 })
 const consistent=sharedConsistent&&m.sourceStableDuringInspection&&a.sourceStableDuringInspection
 const gaps=[...m.gaps]
 if(!consistent)gaps.push('INCONSISTENT_INSPECTION')
 if(a.archive.status!=='INDEX_AVAILABLE')gaps.push('ARCHIVE_INDEX_UNAVAILABLE')
 if(a.rows.some(r=>r.status!=='PRESENT'))gaps.push('ALLOWLISTED_SOURCE_UNAVAILABLE')
 if(a.rows.some(r=>r.comparison==='ARCHIVE_RECEIPT_INVALID'))gaps.push('ARCHIVE_RECEIPT_INVALID')
 return {kind:'CENTRAL_DATA_QUALITY_REPORT',schemaVersion:1,declaredSourceRevision:revision,
  status:consistent&&m.status==='INVENTORIES_RECONCILED'&&a.status==='INVENTORY_AVAILABLE'?'INVENTORY_REVIEW_REQUIRED':'INCOMPLETE',
  inspectionConsistent:consistent,manifestSha256:m.manifestSha256,
  historical:consistent?m.historical:{status:'INCONSISTENT_INSPECTION',counts:null},
  prospective:consistent?m.prospective:{status:'INCONSISTENT_INSPECTION',counts:null},
  archive:a.archive,sources:a.rows,gaps:[...new Set(gaps)],
  researchOnly:true,publicationGate:'BLOCKED',executionAuthorized:false,validationAuthorized:false,sourceMutationAuthorized:false,
  limitations:['Static inspection of local files, not a live feed or a certification service.',
   'Shared source counts overlap; do not sum them as unique records.',
   'Archive byte changes may represent ordinary updates.',
   'Source rights and independent verification remain unestablished.',
   'Inspection consistency is not a transactional snapshot or an access-control boundary.']}
}
export function renderQualityReport(root,revision){
 const r=qualityReport(root,revision),h=r.historical.counts,p=r.prospective.counts
 const metrics=[['Allowlisted source files',r.sources.length],['Files present',r.inspectionConsistent?r.sources.filter(s=>s.status==='PRESENT').length:null],
 ['Archive index entries',r.inspectionConsistent?r.archive.declaredEntries:null],['Historical input rows',h?.input],['Structurally consistent historical rows',h?.accepted],
 ['Historical conflicting rows',h?.conflicting],['Historical rejected rows',h?.rejected],['Historical duplicate rows',h?.duplicates],
 ['Frozen ledger rows',p?.predictionInput],['Structurally accepted ledger rows',p?.structurallyAccepted],
 ['Ledger duplicate or conflicting rows',p?.duplicateOrConflict],['Ledger rejected rows',p?.rejected],
 ['Matched review records',p?.matchedReview],['Unmatched accepted rows',p?.unmatchedAccepted],['Stored outcome-feed rows (not certified here)',p?.outcomeFeedInput]]
 const cards=metrics.map(([label,value])=>'<div class="metric"><span>'+esc(label)+'</span><strong>'+esc(num(value))+'</strong></div>').join('')
 const rows=r.sources.map(s=>'<tr><td>'+esc(s.path)+'</td><td>'+esc(s.status)+'</td><td>'+esc(s.comparison)+'</td><td>'+esc(num(s.bytes))+'</td></tr>').join('')
 const review=Object.entries(r.prospective.reviewStatusCounts??{}).sort(([a],[b])=>a.localeCompare(b))
 return '<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src &apos;none&apos;; style-src &apos;unsafe-inline&apos;; base-uri &apos;none&apos;; form-action &apos;none&apos;"><title>Central Data Intelligence — Quality Report</title><style>*{box-sizing:border-box}body{margin:0;background:#101827;color:#edf3fc;font:16px/1.5 system-ui,sans-serif}main{max-width:1200px;margin:auto;padding:24px 16px}h1,h2{line-height:1.2}p,span{color:#bfccdc}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr));gap:12px}.metric{background:#19273b;border:1px solid #394b62;border-radius:10px;padding:16px}.metric strong{display:block;font-size:1.5rem}.warning{color:#ffdc9a}.scroll{overflow:auto}table{border-collapse:collapse;width:100%;font-size:.9rem}td,th{text-align:left;vertical-align:top;padding:12px;border-bottom:1px solid #394b62}td:first-child{overflow-wrap:anywhere;min-width:140px}li,code{overflow-wrap:anywhere}</style></head><body><main><header><p>CENTRAL DATA INTELLIGENCE / STATIC QUALITY PREVIEW</p><h1>Data quality and provenance</h1><p class="warning">REVIEW REQUIRED · PUBLICATION BLOCKED · NO EXECUTION AUTHORISED</p><p>Declared revision: <code>'+esc(revision)+'</code></p><p>Inspection: '+esc(r.status)+'</p></header><section><h2>Separate evidence inventories</h2><div class="grid">'+cards+'</div><p>Counts are not additive across inventories.</p></section><section><h2>Source receipts</h2><p>Archive comparisons are byte comparisons only. Inspection consistency: '+esc(r.inspectionConsistent?'Consistent':'Not established')+'.</p><div class="scroll"><table><thead><tr><th scope="col">Source path</th><th scope="col">Availability</th><th scope="col">Archive comparison</th><th scope="col">Bytes</th></tr></thead><tbody>'+rows+'</tbody></table></div></section><section><h2>Stored review states</h2>'+(review.length?'<ul>'+review.map(([s,n])=>'<li>'+esc(s)+': '+esc(num(n))+'</li>').join('')+'</ul>':'<p>Review breakdown unavailable or empty.</p>')+'<p>Stored review states are not independent certification.</p></section><section><h2>Outstanding evidence requirements</h2><ul>'+r.gaps.map(g=>'<li>'+esc(g)+'</li>').join('')+'</ul><h2>Limitations</h2><ul>'+r.limitations.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></section></main></body></html>\n'
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(process.argv.length!==5||!['json','html'].includes(process.argv[4])){console.error('Usage: node quality-report.mjs <root> <declared-revision> <json|html>');process.exitCode=2}
 else{try{console.log(process.argv[4]==='html'?renderQualityReport(process.argv[2],process.argv[3]):JSON.stringify(qualityReport(process.argv[2],process.argv[3]),null,2))}catch(e){console.error(e.message);process.exitCode=1}}
}
