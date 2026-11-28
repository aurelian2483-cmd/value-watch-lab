// Read-only consolidated research status; no model execution or financial decisions.
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import {createHash} from 'node:crypto'
import {pathToFileURL} from 'node:url'
import {alphaReadiness} from './experiment-registry-alpha-readiness.mjs'
const natural=n=>Number.isSafeInteger(n)&&n>=0
const fingerprint=x=>createHash('sha256').update(x).digest('hex')
function bottleneckInventory(root){
 try {
  const path='research/bottleneck/inventory.json'
  const bytes=readFileSync(join(root,path)),d=JSON.parse(bytes)
  if(typeof d.input_revision!=='string'||!/^[a-f0-9]{40}$/.test(d.input_revision)||
     !d.datasets||typeof d.datasets!=='object'||Array.isArray(d.datasets)||
     !Object.keys(d.datasets).length||typeof d.scope!=='string')
    throw new Error('Invalid inventory contract')
  return {available:true,sourcePath:path,sourceSha256:fingerprint(bytes),inputRevision:d.input_revision,
   datasetEntries:Object.keys(d.datasets).length,status:'PINNED_HISTORICAL_INVENTORY_ONLY'}
 }catch(e){return {available:false,sourcePath:'research/bottleneck/inventory.json',datasetEntries:null,status:e.code==='ENOENT'?'SOURCE_MISSING':'SOURCE_INVALID'}}
}
export function controlCentre(root,directory){
 const a=alphaReadiness(root,directory)
 const bottleneck=bottleneckInventory(root)
 const historical=a.evidence.historical?.counts??null
 const prospective=a.evidence.prospective?.counts??null
 const operations=a.evidence.operations
 const catalogue=a.catalogue
 const blockers=[]
 if(!catalogue||!natural(catalogue.registered)||catalogue.sizeGateMet!==true)blockers.push('CATALOGUE_READINESS_NOT_MET')
 blockers.push('INDEPENDENT_REVIEW_REQUIRED')
 if(!operations?.available)blockers.push('LOCAL_REGISTRY_UNAVAILABLE')
 else if(operations.status!=='NO_DETECTED_INCIDENTS')blockers.push('LOCAL_REGISTRY_REQUIRES_REVIEW')
 if(!historical)blockers.push('HISTORICAL_INVENTORY_UNAVAILABLE')
 if(!prospective)blockers.push('PROSPECTIVE_INVENTORY_UNAVAILABLE')
 if(!bottleneck.available)blockers.push('BOTTLENECK_INVENTORY_UNAVAILABLE')
 return {schemaVersion:1,kind:'RESEARCH_CONTROL_CENTRE',generatedAt:a.generatedAt,researchOnly:true,
  modelValidation:'UNVALIDATED',publicationGate:'BLOCKED',executionAuthorized:false,
  validationAuthorized:false,sourceMutationAuthorized:false,capitalAllocationAuthorized:false,
  status:'RESEARCH_NOT_READY',catalogue,operations,
  systems:[
   {id:'value-watch',name:'Value Watch',status:historical&&prospective?'EVIDENCE_INVENTORIES_AVAILABLE':'EVIDENCE_INCOMPLETE',historical,prospective},
   {id:'bottleneck-lab',name:'Bottleneck Lab',status:bottleneck.status,inventory:bottleneck},
   {id:'alpha-hunt',name:'Alpha Hunt v5',status:a.status,stages:a.stages,decisionBlockers:a.decision.blockers}
  ],blockers,
  limitations:['Shared evidence tiers overlap; do not sum them as unique events.',
   'Pinned Bottleneck inventory is historical, not a live health check.',
   'Operational test results do not establish statistical model validity.',
   'Local registry availability is not proof of an active execution service.']}
}
const esc=x=>String(x??'Unavailable').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const count=n=>natural(n)?String(n):'Unavailable'
export function renderControlCentre(root,directory){
 const r=controlCentre(root,directory)
 const [v,b,a]=r.systems
 const metric=(label,value)=>'<div class="metric"><span>'+esc(label)+'</span><strong>'+esc(value)+'</strong></div>'
 const metrics=[['Registered catalogue entries',count(r.catalogue?.registered)],['Catalogue target',count(r.catalogue?.readinessTarget)],['Historical source rows',count(v.historical?.input)],['Frozen prediction source rows',count(v.prospective?.predictionInput)],['Pinned Bottleneck dataset entries',count(b.inventory.datasetEntries)],['Local registry',r.operations?.available?'Available':'Unavailable']]
 return '<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src &apos;none&apos;; style-src &apos;unsafe-inline&apos;; base-uri &apos;none&apos;; form-action &apos;none&apos;"><title>Research Control Centre</title><style>*{box-sizing:border-box}body{margin:0;background:#091323;color:#edf4ff;font:16px/1.6 system-ui,sans-serif}main{max-width:1100px;margin:auto;padding:28px 18px}h1,h2,h3{line-height:1.2}p,span{color:#bdcce1}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr));gap:12px}.metric,article{padding:16px;background:#13243a;border:1px solid #36516c;border-radius:10px;overflow-wrap:anywhere}.metric span,.metric strong{display:block}.metric strong{font-size:1.45rem}article{margin:12px 0}.warning{color:#ffdc9a}li{overflow-wrap:anywhere}</style></head><body><main><header><p>VALUE WATCH / BOTTLENECK LAB / ALPHA HUNT</p><h1>Research Control Centre</h1><p class="warning">UNVALIDATED · PUBLICATION BLOCKED · NO EXECUTION AUTHORISED</p><p>Static research preview generated '+esc(r.generatedAt)+'. Not an active research service.</p></header><section><h2>Shared infrastructure</h2><div class="grid">'+metrics.map(([k,v])=>metric(k,v)).join('')+'</div></section><section><h2>Independent systems</h2>'+r.systems.map(s=>'<article><h3>'+esc(s.name)+'</h3><p>'+esc(s.status)+'</p></article>').join('')+'<h3>Alpha Hunt stages</h3><ol>'+a.stages.map(s=>'<li>'+esc(s.name)+' — '+esc(s.status)+'</li>').join('')+'</ol></section><section><h2>Outstanding readiness requirements</h2><ul>'+[...new Set([...r.blockers,...a.decisionBlockers])].map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul><h2>Limitations</h2><ul>'+r.limitations.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></section></main></body></html>\n'
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(process.argv.length!==5||!['json','html'].includes(process.argv[4])){console.error('Usage: node experiment-registry-control-centre.mjs <source-root> <registry-directory> <json|html>');process.exitCode=2}
 else{try{process.stdout.write(process.argv[4]==='html'?renderControlCentre(process.argv[2],process.argv[3]):JSON.stringify(controlCentre(process.argv[2],process.argv[3]),null,2)+'\n')}catch(e){console.error(e.message);process.exitCode=1}}
}
