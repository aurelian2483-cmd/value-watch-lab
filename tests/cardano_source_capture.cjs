'use strict';
const assert=require('node:assert/strict'),{EventEmitter}=require('node:events'),crypto=require('node:crypto'),C=require('../cardano-lab/source-capture.js');
const hosts=['example.org'];
assert.equal(C.validateTarget('https://example.org/results',hosts).hostname,'example.org');
for(const url of ['http://example.org','https://example.net','https://user@example.org','https://example.org:8443/a','https://example.org/#fragment'])assert.throws(()=>C.validateTarget(url,hosts));
assert.throws(()=>C.validateTarget('https://example.org',[]),/allowlist/);
function fakeTransport(status,parts){
 return {get(_url,_options,cb){
  const req=new EventEmitter();req.destroy=error=>{if(error)req.emit('error',error)};
  process.nextTick(()=>{const res=new EventEmitter();res.statusCode=status;res.resume=()=>{};cb(res);for(const p of parts)res.emit('data',Buffer.from(p));res.emit('end')});
  return req;
 }};
}
(async()=>{
 const captured=await C.capture('https://example.org/results',{allowedHosts:hosts,transport:fakeTransport(200,['home',' win'])});
 assert.equal(captured.bytes.toString(),'home win');
 assert.equal(captured.receipt.source_sha256,crypto.createHash('sha256').update('home win').digest('hex'));
 assert.equal(captured.receipt.publisher_authenticated,false);
 assert.equal(captured.receipt.outcome_verified,false);
 assert.equal(captured.receipt.publication_gate,'BLOCKED');
 await assert.rejects(()=>C.capture('https://example.org',{allowedHosts:hosts,transport:fakeTransport(302,[])}),/redirects/);
 await assert.rejects(()=>C.capture('https://example.org',{allowedHosts:hosts,transport:fakeTransport(200,[])}),/Empty/);
 await assert.rejects(()=>C.capture('https://example.org',{allowedHosts:hosts,transport:fakeTransport(200,[Buffer.alloc(C.MAX_BYTES+1)])}),/size limit/);
 assert.throws(()=>C.capture('https://example.org',{allowedHosts:hosts,timeoutMs:1}),/Invalid timeout/);
 const timeoutTransport={get(_url,_options,_cb){const req=new EventEmitter();req.destroy=error=>req.emit('error',error||new Error('Request destroyed'));process.nextTick(()=>req.emit('timeout'));return req;}};
 await assert.rejects(()=>C.capture('https://example.org',{allowedHosts:hosts,timeoutMs:1000,transport:timeoutTransport}),/timed out/);
 console.log('PASS Cardano HTTPS capture transport tests (mocked; no live network)');
})().catch(e=>{console.error(e);process.exitCode=1});
