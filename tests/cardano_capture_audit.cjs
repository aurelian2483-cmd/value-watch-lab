'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto'),A=require('../cardano-lab/capture-audit.js');
const bytes=Buffer.from('synthetic response'),now=Date.parse('2026-11-11T18:00:00Z');
const base=()=>({bytes,receipt:{source_url:'https://example.org/results',source_sha256:crypto.createHash('sha256').update(bytes).digest('hex'),captured_at_utc:'2026-11-11T17:59:00Z',byte_length:bytes.length,http_status:200,verification_level:'HTTPS_RESPONSE_CAPTURED',publisher_authenticated:false,outcome_verified:false,research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED'}});
assert.equal(A.audit(base(),{now}).consistent,true);
assert.equal(A.audit(base(),{now}).eligible_for_scoring,false);
for(const [field,value,expected] of [['source_sha256','a'.repeat(64),'HASH_MISMATCH'],['byte_length',999,'BYTE_LENGTH_MISMATCH'],['http_status',302,'HTTP_STATUS_NOT_OK'],['captured_at_utc','2026-11-10T17:00:00Z','STALE_CAPTURE'],['publication_gate','OPEN','SAFETY_GATE_MISMATCH'],['outcome_verified',true,'UNSUPPORTED_TRUST_CLAIM'],['source_url','http://example.org','INSECURE_SOURCE']]){
 const x=base();x.receipt[field]=value;assert.ok(A.audit(x,{now}).errors.includes(expected),field);
}
assert.throws(()=>A.audit(null),/required/);
assert.throws(()=>A.audit(base(),{now,maxAgeMs:-1}),/Invalid audit/);
console.log('PASS Cardano capture receipt audit and negative cases');
