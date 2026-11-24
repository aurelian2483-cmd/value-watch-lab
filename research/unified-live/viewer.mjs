// Opt-in loopback viewer. GET/HEAD only; no producer, credentials, or mutation routes.
import {createServer} from 'node:http'
import {resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
import {status} from './sync.mjs'
import {render} from '../unified-control-centre/website.mjs'
const esc=x=>String(x??'Unknown').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const incident=s=>'<div class="overview" aria-label="Latest rejected update"><h3>Latest rejected update</h3><p>Incident status: '+esc(s.lastRejection.status)+' · Stage: '+esc(s.lastRejection.stage)+' · Observed: '+esc(s.lastRejection.observedAt)+'</p><p>Previous sequence: '+esc(s.lastRejection.previousSequence)+' · No automatic repair. Manual review only.</p></div>'
const banner=s=>'<aside class="overview"><h2>Controlled report synchronisation</h2><p>Receipt status: '+esc(s.syncStatus)+' · Last accepted: '+esc(s.acceptedAt)+' · Sequence: '+esc(s.sequence)+'</p><p>Authentication: '+esc(s.authentication.mode)+' · External trust anchor: '+esc(s.authentication.independentTrustRechecked?'matched':'not supplied')+' · External state anchor: '+esc(s.authentication.independentStateRechecked?'matched':'not supplied')+'.</p><p>Measurement freshness: UNKNOWN. Not live producer health.</p><ul>'+s.sources.map(x=>'<li>'+esc(x.id)+': '+esc(x.receiptStatus)+'; first received '+esc(x.firstSeen)+'</li>').join('')+'</ul><p>Refreshes every 15 seconds while this viewer is open. No execution or publication authorised.</p>'+incident(s)+'</aside>'
export function page(s){
 const head='<meta http-equiv="refresh" content="15">'
 if(s.snapshot)return render(s.snapshot).replace('</head>',head+'</head>').replace('<main>','<main>'+banner(s))
 return '<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+head+'<title>Research Control Centre</title></head><body><main><h1>Research Control Centre</h1><p>UNVALIDATED · PUBLICATION BLOCKED · NO EXECUTION AUTHORISED</p>'+banner(s)+'</main></body></html>'
}
export async function startViewer(stateDir,{port=8766,maxAgeSeconds=3600,trustedTrustSha256=null,trustedStateSha256=null}={}){
 if(!Number.isInteger(port)||port<0||port>65535)throw Error('Invalid port')
 // Validate configured directory and any initial persisted state before listening.
 status(stateDir,{maxAgeSeconds,trustedTrustSha256,trustedStateSha256})
 const server=createServer({maxHeaderSize:8192},(req,res)=>{
  const headers={'Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer'}
  const send=(code,type,body,extra={})=>{res.writeHead(code,{...headers,'Content-Type':type,'Content-Length':Buffer.byteLength(body),...extra});res.end(req.method==='HEAD'?undefined:body)}
  if(req.headers.host!=='127.0.0.1:'+server.address().port||!['127.0.0.1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress))return send(403,'text/plain; charset=utf-8','Forbidden')
  if(req.headers.origin&&req.headers.origin!=='http://127.0.0.1:'+server.address().port)return send(403,'text/plain; charset=utf-8','Forbidden')
  if(req.headers['sec-fetch-site']&&!['none','same-origin'].includes(req.headers['sec-fetch-site']))return send(403,'text/plain; charset=utf-8','Forbidden')
  if(!['GET','HEAD'].includes(req.method))return send(405,'text/plain; charset=utf-8','Read-only viewer',{Allow:'GET, HEAD'})
  if(!['/','/status'].includes(req.url))return send(404,'text/plain; charset=utf-8','Not found')
  try{
   const s=status(stateDir,{maxAgeSeconds,trustedTrustSha256,trustedStateSha256})
   return req.url==='/status'?send(200,'application/json; charset=utf-8',JSON.stringify(s,null,2)):send(200,'text/html; charset=utf-8',page(s))
  }catch{return send(503,'text/plain; charset=utf-8','Evidence unavailable or invalid. UNVALIDATED. PUBLICATION BLOCKED.')}
 })
 server.requestTimeout=10000;server.headersTimeout=5000;server.keepAliveTimeout=2000;server.maxConnections=16
 await new Promise((ok,fail)=>{server.once('error',fail);server.listen(port,'127.0.0.1',ok)})
 return server
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{
  if(process.argv.length<3||process.argv.length>6)throw Error('Usage: viewer.mjs <state-dir> [port [trusted-trust-sha256 [trusted-state-sha256]]]')
  const server=await startViewer(process.argv[2],{port:process.argv[3]===undefined?8766:Number(process.argv[3]),trustedTrustSha256:process.argv[4]??null,trustedStateSha256:process.argv[5]??null})
  console.log('Read-only loopback viewer: http://127.0.0.1:'+server.address().port)
  for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>server.close())
 }catch(e){console.error(e.message);process.exitCode=1}
}
