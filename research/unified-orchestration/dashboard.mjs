// Read-only orchestration dashboard. No execution, mutation endpoints or remote binding.
import {createServer} from 'node:http'
import {resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
import {inspect} from './registry.mjs'
import {inspectQueue} from './producer-queue.mjs'
const escape=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const labels={'catalogue-review':'Mathematical Knowledge Library','data-review':'Central Data Intelligence','reference-review':'Scientific Reference Library','laboratory-review':'Mathematical Testing Laboratory','compute-review':'Scientific CPU/GPU Engine','supervisor-review':'Research Supervisor','readiness-review':'Final readiness review'}
const statusLabels={REVIEW_RECORDED:'Metadata review recorded',READY_FOR_METADATA_REVIEW:'Dependencies satisfied',WAITING_FOR_DEPENDENCIES:'Waiting for dependencies'}
const lifecycleLabels={NOT_INITIALIZED:'Review not initialized',REVIEW_PENDING:'Metadata review pending',METADATA_REVIEW_COMPLETE_EXECUTION_BLOCKED:'Metadata review complete — execution remains blocked'}
const css='*{box-sizing:border-box}body{margin:0;background:#101722;color:#f0f4fb;font:16px/1.5 system-ui,sans-serif}main{width:100%;max-width:1100px;min-width:0;margin:auto;padding:24px;overflow-wrap:anywhere}h1{font-size:clamp(1.5rem,4vw,2.3rem);margin:0}h2{font-size:1.2rem}p{margin:8px 0}.muted{color:#bdc8d8}.panel,.task{background:#1c2635;border:1px solid #40516a;border-radius:12px;padding:16px;min-width:0}.gates{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0}.gate{min-width:0;max-width:100%;overflow-wrap:anywhere;border:1px solid #d69e53;color:#ffd89f;border-radius:6px;padding:4px 10px;font-weight:700}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,250px),1fr));gap:12px;min-width:0}.task h3{margin:0 0 8px;font-size:1rem}.recorded{border-left:4px solid #78d4a3}.ready{border-left:4px solid #8dbaff}.waiting{border-left:4px solid #aab4c2}.progress{height:12px;border:1px solid #52657e;background:#101722;border-radius:8px;overflow:hidden}.bar{height:100%;background:#78d4a3}code{overflow-wrap:anywhere;font-size:.82rem}dl{margin:0}dt{font-weight:700;margin-top:10px}dd{margin:0;overflow-wrap:anywhere}footer{margin-top:20px}@media(max-width:420px){main{padding:12px}.panel,.task{padding:12px}}'
const queueLabels={PENDING_CONTRACT_REVIEW:'Pending contract review',CONTRACT_REVIEWED_EXECUTION_BLOCKED:'Reviewed — dispatch blocked',CANCELLED:'Cancelled'}
function renderQueue(q){
 if(q.status!=='AVAILABLE')return '<h2>Producer task queue</h2><section class="panel" data-queue="'+escape(q.status)+'"><p>'+escape(q.status==='NOT_CONFIGURED'?'Queue not configured':'Queue unavailable or changed — dispatch blocked')+'</p></section>'
 const v=q.view
 const cards=v.requests.map(r=>'<article class="task" data-producer="'+escape(r.producerId)+'"><h3>'+escape(labels[({catalogue:'catalogue-review',data:'data-review',lab:'laboratory-review',compute:'compute-review',supervisor:'supervisor-review',references:'reference-review'})[r.producerId]])+'</h3><p>'+escape(queueLabels[r.status])+'</p><p class="muted">Declared: 1 CPU slot · 64 MiB · 5 seconds · no GPU or network</p></article>').join('')
 return '<h2>Producer task queue</h2><section class="panel" data-queue="AVAILABLE"><p data-queue-counts="'+v.pending+':'+v.reviewed+':'+v.cancelled+'">'+v.pending+' pending · '+v.reviewed+' reviewed · '+v.cancelled+' cancelled</p><p><strong>Dispatch blocked</strong> — contract review only. No resource allocation or producer connectivity.</p><p>Queue anchor: '+(q.anchored?'Matched external fingerprint':'Not supplied — rollback cannot be ruled out')+'</p><p>Queue fingerprint: <code>'+escape(v.queueSha256??'Not initialized')+'</code></p></section><section class="grid">'+cards+'</section>'
}
export function renderDashboard(s,{anchored=false,queue={status:'NOT_CONFIGURED'}}={}){
 const next=s.control.status==='REVIEW_HOLD'?null:s.tasks.find(t=>t.status!=='REVIEW_RECORDED')
 const rows=s.tasks.map(t=>{
  const cls=t.status==='REVIEW_RECORDED'?'recorded':t.status==='READY_FOR_METADATA_REVIEW'?'ready':'waiting'
  const deps=t.requires.length?t.requires.map(x=>labels[x]).join(', '):'None'
  return '<article class="task '+cls+'" data-task="'+escape(t.id)+'"><h3>'+escape(labels[t.id])+'</h3><p>'+escape(statusLabels[t.status])+'</p><p class="muted">Requires: '+escape(deps)+'</p>'+(t.id===next?.id?'<p><strong>Next explicit review</strong></p>':'')+'</article>'
 }).join('')
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="15"><title>Research Orchestration — Phase 3</title><style>'+css+'</style></head><body><main><header><h1>Research Orchestration</h1><p class="muted">Phase 3 · Read-only metadata review</p></header><div class="gates"><span class="gate">UNVALIDATED</span><span class="gate">PUBLICATION BLOCKED</span><span class="gate">EXECUTION BLOCKED</span></div><section class="panel"><h2>Review lifecycle</h2><p><strong data-reviewed="'+s.reviewed+'">'+s.reviewed+' / '+s.total+' metadata reviews recorded</strong></p><div class="progress" role="progressbar" aria-label="Metadata reviews" aria-valuemin="0" aria-valuemax="'+s.total+'" aria-valuenow="'+s.reviewed+'"><div class="bar" style="width:'+Math.round(100*s.reviewed/s.total)+'%"></div></div><p class="lifecycle-status" data-lifecycle="'+escape(s.status)+'">'+escape(lifecycleLabels[s.status]??s.status)+'</p><p>Measurement freshness: UNKNOWN. Receipt freshness: '+escape(s.receiptFreshness)+'</p><p>Evidence mode: '+escape(s.mode)+'</p><p>Registry anchor: '+(anchored?'Matched external fingerprint':'Not supplied — rollback cannot be ruled out')+'</p></section><h2>Operational controls</h2><section class="panel"><p data-control="'+escape(s.control.status)+'"><strong>'+escape(s.control.status==='REVIEW_HOLD'?'Metadata review on hold':s.control.capacityRemaining===0?'Control capacity exhausted — manual review required':'Metadata review available')+'</strong></p><p>Control events: '+s.control.events+' / 64 · Recorded incidents: '+s.control.incidents+'</p><p>Latest event: '+escape(s.control.lastEvent?.type??'None recorded')+' · Stage: '+escape(s.control.lastEvent?.stage??'Not applicable')+'</p><p>Automatic repair disabled. Explicit operator control only.</p></section><h2>Research dependencies</h2><section class="grid">'+rows+'</section>'+renderQueue(queue)+'<h2>Evidence fingerprints</h2><section class="panel"><dl><dt>Phase 2 state</dt><dd><code>'+escape(s.evidenceStateSha256)+'</code></dd><dt>Orchestration plan</dt><dd><code>'+escape(s.planSha256)+'</code></dd><dt>Registry</dt><dd><code>'+escape(s.registrySha256??'Not initialized')+'</code></dd><dt>Control ledger</dt><dd><code>'+escape(s.control.controlSha256??'Not initialized')+'</code></dd></dl></section><footer class="muted">Metadata reviews do not constitute scientific experiments, producer health, or qualification. No producer access or execution. Refreshes every 15 seconds.</footer></main></body></html>'
}
export async function startDashboard(phase2Dir,registryDir,planPath,planSha256,{port=8767,trustedRegistrySha256=undefined,trustedControlSha256=undefined,queueConfig=null}={}){
 if(!Number.isSafeInteger(port)||port<0||port>65535)throw Error('Invalid port')
 const read=()=>inspect(phase2Dir,registryDir,planPath,planSha256,{trustedRegistrySha256,trustedControlSha256})
 read()
 if(queueConfig!==null&&(!queueConfig||Object.keys(queueConfig).some(k=>!['directory','planPath','planSha256','trustedQueueSha256'].includes(k))||!['directory','planPath','planSha256'].every(k=>typeof queueConfig[k]==='string'&&queueConfig[k].length>0)))throw Error('Invalid queue configuration')
 const config=queueConfig===null?null:{...queueConfig}
 const readQueue=s=>{
  if(config===null)return {status:'NOT_CONFIGURED'}
  try{
   const view=inspectQueue(phase2Dir,registryDir,planPath,planSha256,config.directory,config.planPath,config.planSha256,{trustedQueueSha256:config.trustedQueueSha256})
   if(view.registrySha256!==s.registrySha256||view.controlSha256!==s.control.controlSha256||view.evidenceStateSha256!==s.evidenceStateSha256)throw Error('Queue context changed')
   return {status:'AVAILABLE',anchored:config.trustedQueueSha256!==undefined,view}
  }catch{return {status:'UNAVAILABLE'}}
 }
 const server=createServer({maxHeaderSize:8192},(req,res)=>{
  const headers={'Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer'}
  const send=(code,type,body,extra={})=>{res.writeHead(code,{...headers,'Content-Type':type,'Content-Length':Buffer.byteLength(body),...extra});res.end(req.method==='HEAD'?undefined:body)}
  const host='127.0.0.1:'+server.address().port
  if(req.headers.host!==host||req.socket.remoteAddress!=='127.0.0.1'||(req.headers.origin&&req.headers.origin!=='http://'+host)||(req.headers['sec-fetch-site']&&!['none','same-origin'].includes(req.headers['sec-fetch-site'])))return send(403,'text/plain; charset=utf-8','Forbidden')
  if(!['GET','HEAD'].includes(req.method))return send(405,'text/plain; charset=utf-8','Read-only dashboard',{Allow:'GET, HEAD'})
  if(!['/','/status'].includes(req.url))return send(404,'text/plain; charset=utf-8','Not found')
  try{
   const s=read(),queue=readQueue(s)
   return req.url==='/status'?send(200,'application/json; charset=utf-8',JSON.stringify({...s,externalRegistryAnchorMatched:trustedRegistrySha256!==undefined,externalControlAnchorMatched:trustedControlSha256!==undefined,queue},null,2)):send(200,'text/html; charset=utf-8',renderDashboard(s,{anchored:trustedRegistrySha256!==undefined,queue}))
  }catch{return send(503,'text/plain; charset=utf-8','Orchestration evidence unavailable or changed. UNVALIDATED. PUBLICATION BLOCKED. EXECUTION BLOCKED.')}
 })
 server.requestTimeout=10000;server.headersTimeout=5000;server.keepAliveTimeout=2000;server.maxConnections=16
 await new Promise((ok,fail)=>{server.once('error',fail);server.listen(port,'127.0.0.1',ok)})
 return server
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{
  const args=process.argv.slice(2)
  if(![4,5,6,7,10,11].includes(args.length))throw Error('Usage: dashboard.mjs <phase2-state-dir> <registry-dir> <plan> <trusted-plan-sha256> [port [trusted-registry-sha256 [trusted-control-sha256 [queue-dir queue-plan queue-plan-sha [trusted-queue-sha]]]]]')
  const server=await startDashboard(...args.slice(0,4),{port:args[4]===undefined?8767:Number(args[4]),trustedRegistrySha256:args[5]==='NEW'?undefined:args[5],trustedControlSha256:args[6]==='NEW'?undefined:args[6],queueConfig:args.length>=10?{directory:args[7],planPath:args[8],planSha256:args[9],trustedQueueSha256:args[10]}:null})
  console.log('Read-only orchestration dashboard: http://127.0.0.1:'+server.address().port)
  for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>server.close())
 }catch(e){console.error(e.message);process.exitCode=1}
}
