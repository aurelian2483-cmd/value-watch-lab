// Read-only orchestration dashboard. No execution, mutation endpoints or remote binding.
import {createServer} from 'node:http'
import {resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
import {inspect} from './registry.mjs'
const escape=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const labels={'catalogue-review':'Mathematical Knowledge Library','data-review':'Central Data Intelligence','reference-review':'Scientific Reference Library','laboratory-review':'Mathematical Testing Laboratory','compute-review':'Scientific CPU/GPU Engine','supervisor-review':'Research Supervisor','readiness-review':'Final readiness review'}
const statusLabels={REVIEW_RECORDED:'Metadata review recorded',READY_FOR_METADATA_REVIEW:'Dependencies satisfied',WAITING_FOR_DEPENDENCIES:'Waiting for dependencies'}
const lifecycleLabels={NOT_INITIALIZED:'Review not initialized',REVIEW_PENDING:'Metadata review pending',METADATA_REVIEW_COMPLETE_EXECUTION_BLOCKED:'Metadata review complete — execution remains blocked'}
const css='*{box-sizing:border-box}body{margin:0;background:#101722;color:#f0f4fb;font:16px/1.5 system-ui,sans-serif}main{width:100%;max-width:1100px;min-width:0;margin:auto;padding:24px;overflow-wrap:anywhere}h1{font-size:clamp(1.5rem,4vw,2.3rem);margin:0}h2{font-size:1.2rem}p{margin:8px 0}.muted{color:#bdc8d8}.panel,.task{background:#1c2635;border:1px solid #40516a;border-radius:12px;padding:16px;min-width:0}.gates{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0}.gate{min-width:0;max-width:100%;overflow-wrap:anywhere;border:1px solid #d69e53;color:#ffd89f;border-radius:6px;padding:4px 10px;font-weight:700}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,250px),1fr));gap:12px;min-width:0}.task h3{margin:0 0 8px;font-size:1rem}.recorded{border-left:4px solid #78d4a3}.ready{border-left:4px solid #8dbaff}.waiting{border-left:4px solid #aab4c2}.progress{height:12px;border:1px solid #52657e;background:#101722;border-radius:8px;overflow:hidden}.bar{height:100%;background:#78d4a3}code{overflow-wrap:anywhere;font-size:.82rem}dl{margin:0}dt{font-weight:700;margin-top:10px}dd{margin:0;overflow-wrap:anywhere}footer{margin-top:20px}@media(max-width:420px){main{padding:12px}.panel,.task{padding:12px}}'
export function renderDashboard(s,{anchored=false}={}){
 const next=s.tasks.find(t=>t.status!=='REVIEW_RECORDED')
 const rows=s.tasks.map(t=>{
  const cls=t.status==='REVIEW_RECORDED'?'recorded':t.status==='READY_FOR_METADATA_REVIEW'?'ready':'waiting'
  const deps=t.requires.length?t.requires.map(x=>labels[x]).join(', '):'None'
  return '<article class="task '+cls+'" data-task="'+escape(t.id)+'"><h3>'+escape(labels[t.id])+'</h3><p>'+escape(statusLabels[t.status])+'</p><p class="muted">Requires: '+escape(deps)+'</p>'+(t.id===next?.id?'<p><strong>Next explicit review</strong></p>':'')+'</article>'
 }).join('')
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="15"><title>Research Orchestration — Phase 3</title><style>'+css+'</style></head><body><main><header><h1>Research Orchestration</h1><p class="muted">Phase 3 · Read-only metadata review</p></header><div class="gates"><span class="gate">UNVALIDATED</span><span class="gate">PUBLICATION BLOCKED</span><span class="gate">EXECUTION BLOCKED</span></div><section class="panel"><h2>Review lifecycle</h2><p><strong data-reviewed="'+s.reviewed+'">'+s.reviewed+' / '+s.total+' metadata reviews recorded</strong></p><div class="progress" role="progressbar" aria-label="Metadata reviews" aria-valuemin="0" aria-valuemax="'+s.total+'" aria-valuenow="'+s.reviewed+'"><div class="bar" style="width:'+Math.round(100*s.reviewed/s.total)+'%"></div></div><p class="lifecycle-status" data-lifecycle="'+escape(s.status)+'">'+escape(lifecycleLabels[s.status]??s.status)+'</p><p>Measurement freshness: UNKNOWN. Receipt freshness: '+escape(s.receiptFreshness)+'</p><p>Evidence mode: '+escape(s.mode)+'</p><p>Registry anchor: '+(anchored?'Matched external fingerprint':'Not supplied — rollback cannot be ruled out')+'</p></section><h2>Research dependencies</h2><section class="grid">'+rows+'</section><h2>Evidence fingerprints</h2><section class="panel"><dl><dt>Phase 2 state</dt><dd><code>'+escape(s.evidenceStateSha256)+'</code></dd><dt>Orchestration plan</dt><dd><code>'+escape(s.planSha256)+'</code></dd><dt>Registry</dt><dd><code>'+escape(s.registrySha256??'Not initialized')+'</code></dd></dl></section><footer class="muted">Metadata reviews do not constitute scientific experiments, producer health, or qualification. No producer access or execution. Refreshes every 15 seconds.</footer></main></body></html>'
}
export async function startDashboard(phase2Dir,registryDir,planPath,planSha256,{port=8767,trustedRegistrySha256=undefined}={}){
 if(!Number.isSafeInteger(port)||port<0||port>65535)throw Error('Invalid port')
 const read=()=>inspect(phase2Dir,registryDir,planPath,planSha256,{trustedRegistrySha256})
 read()
 const server=createServer({maxHeaderSize:8192},(req,res)=>{
  const headers={'Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer'}
  const send=(code,type,body,extra={})=>{res.writeHead(code,{...headers,'Content-Type':type,'Content-Length':Buffer.byteLength(body),...extra});res.end(req.method==='HEAD'?undefined:body)}
  const host='127.0.0.1:'+server.address().port
  if(req.headers.host!==host||req.socket.remoteAddress!=='127.0.0.1'||(req.headers.origin&&req.headers.origin!=='http://'+host)||(req.headers['sec-fetch-site']&&!['none','same-origin'].includes(req.headers['sec-fetch-site'])))return send(403,'text/plain; charset=utf-8','Forbidden')
  if(!['GET','HEAD'].includes(req.method))return send(405,'text/plain; charset=utf-8','Read-only dashboard',{Allow:'GET, HEAD'})
  if(!['/','/status'].includes(req.url))return send(404,'text/plain; charset=utf-8','Not found')
  try{
   const s=read()
   return req.url==='/status'?send(200,'application/json; charset=utf-8',JSON.stringify({...s,externalRegistryAnchorMatched:trustedRegistrySha256!==undefined},null,2)):send(200,'text/html; charset=utf-8',renderDashboard(s,{anchored:trustedRegistrySha256!==undefined}))
  }catch{return send(503,'text/plain; charset=utf-8','Orchestration evidence unavailable or changed. UNVALIDATED. PUBLICATION BLOCKED. EXECUTION BLOCKED.')}
 })
 server.requestTimeout=10000;server.headersTimeout=5000;server.keepAliveTimeout=2000;server.maxConnections=16
 await new Promise((ok,fail)=>{server.once('error',fail);server.listen(port,'127.0.0.1',ok)})
 return server
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{
  const args=process.argv.slice(2)
  if(args.length<4||args.length>6)throw Error('Usage: dashboard.mjs <phase2-state-dir> <registry-dir> <plan> <trusted-plan-sha256> [port [trusted-registry-sha256]]')
  const server=await startDashboard(...args.slice(0,4),{port:args[4]===undefined?8767:Number(args[4]),trustedRegistrySha256:args[5]})
  console.log('Read-only orchestration dashboard: http://127.0.0.1:'+server.address().port)
  for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>server.close())
 }catch(e){console.error(e.message);process.exitCode=1}
}
