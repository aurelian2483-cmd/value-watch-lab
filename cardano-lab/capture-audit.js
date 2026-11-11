/* Cardano capture receipt consistency checks. Not publisher authentication. */
'use strict';
const crypto=require('node:crypto');
const SHA=/^[a-f0-9]{64}$/i;
function audit(capture,options={}){
 if(!capture||typeof capture!=='object'||!Buffer.isBuffer(capture.bytes)||!capture.receipt)throw Error('Captured bytes and receipt required');
 const r=capture.receipt,bytes=capture.bytes;
 const maxAgeMs=options.maxAgeMs===undefined?86400000:options.maxAgeMs;
 const now=options.now===undefined?Date.now():options.now;
 if(!Number.isFinite(now)||!Number.isSafeInteger(maxAgeMs)||maxAgeMs<0)throw Error('Invalid audit clock or freshness window');
 const errors=[];
 let url;
 try{url=new URL(r.source_url)}catch{errors.push('INVALID_URL')}
 if(!url||url.protocol!=='https:'||url.username||url.password)errors.push('INSECURE_SOURCE');
 if(r.http_status!==200)errors.push('HTTP_STATUS_NOT_OK');
 if(r.verification_level!=='HTTPS_RESPONSE_CAPTURED')errors.push('CAPTURE_LEVEL_UNSUPPORTED');
 if(r.byte_length!==bytes.length||bytes.length===0||bytes.length>2*1024*1024)errors.push('BYTE_LENGTH_MISMATCH');
 const digest=crypto.createHash('sha256').update(bytes).digest('hex');
 if(!SHA.test(r.source_sha256||'')||r.source_sha256.toLowerCase()!==digest)errors.push('HASH_MISMATCH');
 const timestamp=typeof r.captured_at_utc==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(r.captured_at_utc)?Date.parse(r.captured_at_utc):NaN;
 if(!Number.isFinite(timestamp)||timestamp>now+300000)errors.push('INVALID_CAPTURE_TIME');
 else if(now-timestamp>maxAgeMs)errors.push('STALE_CAPTURE');
 if(r.research_only!==true||r.model_validation!=='UNVALIDATED'||r.publication_gate!=='BLOCKED')errors.push('SAFETY_GATE_MISMATCH');
 if(r.publisher_authenticated!==false||r.outcome_verified!==false)errors.push('UNSUPPORTED_TRUST_CLAIM');
 return {consistent:errors.length===0,errors,computed_sha256:digest,source_authenticated:false,outcome_verified:false,eligible_for_scoring:false,research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED'};
}
module.exports=Object.freeze({audit});
