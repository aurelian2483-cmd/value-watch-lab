/* Cardano evidence register: explicit research provenance, never outcome verification. */
'use strict';
const SHA=/^[a-f0-9]{64}$/i;
function register(experiment,captures,audits){
 if(!experiment||typeof experiment.id!=='string'||!experiment.id.trim())throw Error('Experiment id required');
 if(!Array.isArray(captures)||!Array.isArray(audits))throw Error('Capture and audit arrays required');
 const seen=new Set(),entries=[];
 if(captures.length!==audits.length)throw Error('Every capture requires an audit');
 for(let i=0;i<captures.length;i++){
  const capture=captures[i],audit=audits[i],receipt=capture?.receipt;
  if(!receipt||!Buffer.isBuffer(capture.bytes)||!audit||typeof audit!=='object')throw Error('Invalid capture or audit');
  const key=receipt.source_url+'|'+receipt.source_sha256;
  if(seen.has(key))throw Error('Duplicate evidence capture');
  seen.add(key);
  if(typeof receipt.source_url!=='string'||!SHA.test(receipt.source_sha256||''))throw Error('Invalid evidence identity');
  if(audit.computed_sha256!==receipt.source_sha256.toLowerCase())throw Error('Audit hash does not match capture');
  const consistent=audit.consistent===true&&Array.isArray(audit.errors)&&audit.errors.length===0&&audit.eligible_for_scoring===false&&audit.source_authenticated===false&&audit.outcome_verified===false;
  entries.push(Object.freeze({source_url:receipt.source_url,sha256:receipt.source_sha256.toLowerCase(),captured_at_utc:receipt.captured_at_utc,byte_length:receipt.byte_length,integrity_status:consistent?'CONSISTENT_UNVERIFIED':'REJECTED',reasons:consistent?['PUBLISHER_NOT_AUTHENTICATED','OUTCOME_NOT_VERIFIED']:['INTEGRITY_AUDIT_FAILED',...(Array.isArray(audit.errors)?audit.errors:[])],eligible_for_scoring:false}));
 }
 return Object.freeze({experiment_id:experiment.id,evidence:entries,accepted_integrity_count:entries.filter(e=>e.integrity_status==='CONSISTENT_UNVERIFIED').length,rejected_count:entries.filter(e=>e.integrity_status==='REJECTED').length,externally_verified:false,eligible_for_real_world_scoring:false,research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED'});
}
module.exports=Object.freeze({register});
