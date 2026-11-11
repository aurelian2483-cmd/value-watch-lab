'use strict';
const assert=require('node:assert/strict');
const {EventEmitter}=require('node:events');
const C=require('../cardano-lab/source-capture.js');
const A=require('../cardano-lab/capture-audit.js');
const resolver=async()=>[{address:'8.8.8.8',family:4}];
const transport={get(_url,opts,callback){
 assert.equal(opts.rejectUnauthorized,true);
 const req=new EventEmitter();
 req.destroy=error=>{if(error)req.emit('error',error)};
 process.nextTick(()=>{
  const res=new EventEmitter();
  res.statusCode=200;res.complete=true;
  res.headers={'content-length':'15','content-encoding':'identity'};
  res.rawHeaders=['Content-Length','15','Content-Encoding','identity'];
  callback(res);res.emit('data',Buffer.from('fixture '));res.emit('data',Buffer.from('outcome'));res.emit('end');
 });
 return req;
}};
(async()=>{
 const captured=await C.capture('https://example.org/result',{allowedHosts:['example.org'],resolver,transport});
 const now=Date.parse(captured.receipt.captured_at_utc);
 const good=A.audit(captured,{now});
 assert.equal(good.consistent,true);
 assert.equal(good.eligible_for_scoring,false);
 assert.equal(good.source_authenticated,false);
 assert.equal(good.outcome_verified,false);
 const tampered={bytes:Buffer.from(captured.bytes),receipt:{...captured.receipt}};
 tampered.bytes[0]^=1;
 assert.ok(A.audit(tampered,{now}).errors.includes('HASH_MISMATCH'));
 const forged={bytes:captured.bytes,receipt:{...captured.receipt,publisher_authenticated:true,outcome_verified:true}};
 assert.ok(A.audit(forged,{now}).errors.includes('UNSUPPORTED_TRUST_CLAIM'));
 const unsafe={bytes:captured.bytes,receipt:{...captured.receipt,publication_gate:'OPEN'}};
 assert.ok(A.audit(unsafe,{now}).errors.includes('SAFETY_GATE_MISMATCH'));
 const stale=A.audit(captured,{now:now+86400001});
 assert.ok(stale.errors.includes('STALE_CAPTURE'));
 console.log('PASS Cardano capture-to-audit chain, tampering, false trust and safety gates');
})().catch(e=>{console.error(e);process.exitCode=1});
