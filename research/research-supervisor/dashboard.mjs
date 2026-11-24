// Read-only dashboard from one fresh inspection pair. No workloads or repairs.
import {inspectRegistry} from './supervisor.mjs'
import {inspectReports} from './report-monitor.mjs'
import {planRecovery} from './recovery-plan.mjs'
import {createHash} from 'node:crypto'
import {pathToFileURL} from 'node:url'
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex')
const flags={researchOnly:true,publicationGate:'BLOCKED',executionAuthorized:false,validationAuthorized:false,repairAuthorized:false}
export function dashboard(registryDirectory,artifactDirectory,revision,options={}){
 const registry=inspectRegistry(registryDirectory,options)
 const reports=inspectReports(artifactDirectory,revision)
 const plan=planRecovery(registry,reports,revision)
 const payload={kind:'RESEARCH_SUPERVISOR_DASHBOARD',schemaVersion:1,declaredRevision:revision,observedAt:registry.asOf,
  status:plan.status,registryStatus:registry.status,registryStable:registry.inspectionStable,
  registryCounts:registry.counts,systems:reports.systems,reportInspectionStable:reports.inspectionStable,
  incidentCounts:plan.counts,recommendations:plan.steps,evidence:plan.evidence,recoveryPlanSha256:plan.planSha256,
  monitoringService:'NOT_STARTED_BY_DASHBOARD',...flags,
  limitations:['Read-only point-in-time inspection; does not display live process ownership or launch background monitoring.',
   'Report summaries and fingerprints are not independent scientific validation or authenticated hardware evidence.',
   'Missing evidence remains unknown; recommendations require separate approval. No automatic repair or execution.']}
 return {...payload,dashboardSha256:digest(payload)}
}
const esc=x=>String(x??'Unavailable').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
export function renderDashboard(r){
 const metrics=[['Blocking incidents',r.incidentCounts.blocking],['Review incidents',r.incidentCounts.review],['Completed registry entries',r.registryCounts?.COMPLETED],['Failed registry entries',r.registryCounts?.FAILED]]
 const panels=r.systems.map(s=>'<section><h3>'+esc(s.id)+'</h3><p>'+esc(s.status)+'</p></section>').join('')
 const incidents=r.recommendations.map(s=>'<article><h3>'+esc(s.code)+'</h3><p>'+esc(s.priority)+' · '+esc(s.subject??s.source)+'</p><p>'+esc(s.recommendation)+'</p><p><strong>Required evidence:</strong> '+esc(s.acceptanceEvidence)+'</p><p>Manual approval required</p><small>'+esc(s.incidentId)+'</small></article>').join('')
 return '<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src &apos;none&apos;; style-src &apos;unsafe-inline&apos;; base-uri &apos;none&apos;; form-action &apos;none&apos;"><title>Research Supervisor</title><style>*{box-sizing:border-box}body{margin:0;background:#101827;color:#edf3fc;font:16px/1.5 system-ui,sans-serif}main{width:100%;max-width:1100px;min-width:0;margin:auto;padding:24px 16px;overflow-wrap:anywhere}h1,h2,h3,small,code{overflow-wrap:anywhere;word-break:break-word;max-width:100%}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr));gap:12px}section,article,.metric{min-width:0;padding:16px;background:#19273b;border:1px solid #394b62;border-radius:10px}article{margin-bottom:12px}.metric strong{display:block;font-size:1.5rem}small,dt{color:#bfccdc}</style></head><body><main><p>RESEARCH CONTROL CENTRE / SUPERVISOR</p><h1>Research Supervisor</h1><p>PUBLICATION BLOCKED · NO EXECUTION OR REPAIR AUTHORISED</p><p>Observed: '+esc(r.observedAt)+'</p><p>Revision: <code>'+esc(r.declaredRevision)+'</code></p><h2>'+esc(r.status)+'</h2><div class="grid">'+metrics.map(([k,v])=>'<div class="metric">'+esc(k)+'<strong>'+esc(v)+'</strong></div>').join('')+'</div><h2>Subsystems</h2><div class="grid">'+panels+'</div><p>Registry: '+esc(r.registryStatus)+'</p><p>Monitoring service: '+esc(r.monitoringService)+'</p><h2>Recovery recommendations</h2>'+(incidents||'<p>No incidents observed in this inspection; not a qualification.</p>')+'<h2>Limitations</h2><ul>'+r.limitations.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul><p>Dashboard fingerprint: <code>'+esc(r.dashboardSha256)+'</code></p></main></body></html>\n'
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(process.argv.length!==6||!['json','html'].includes(process.argv[5])){console.error('Usage: node dashboard.mjs <registry-directory> <artifact-directory> <revision> <json|html>');process.exitCode=2}
 else{try{const r=dashboard(...process.argv.slice(2,5));console.log(process.argv[5]==='html'?renderDashboard(r):JSON.stringify(r,null,2));if(r.status==='BLOCKED_PENDING_REVIEW')process.exitCode=1}catch(e){console.error(e.message);process.exitCode=1}}
}
