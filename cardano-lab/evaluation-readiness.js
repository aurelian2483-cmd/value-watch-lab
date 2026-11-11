/* Evidence readiness is diagnostic, not permission to score real-world outcomes. */
'use strict';
function assess(register,experimentId){
 if(typeof experimentId!=='string'||!experimentId.trim())throw Error('Experiment id required');
 if(!register||register.experiment_id!==experimentId||!Array.isArray(register.evidence))throw Error('Matching evidence register required');
 const reasons=[];
 if(register.evidence.length===0)reasons.push('NO_EVIDENCE');
 const rejected=register.evidence.filter(e=>e?.integrity_status==='REJECTED');
 const consistent=register.evidence.filter(e=>e?.integrity_status==='CONSISTENT_UNVERIFIED');
 if(rejected.length)reasons.push('REJECTED_EVIDENCE_PRESENT');
 if(register.evidence.some(e=>!e||!['REJECTED','CONSISTENT_UNVERIFIED'].includes(e.integrity_status)||e.eligible_for_scoring!==false))reasons.push('INVALID_EVIDENCE_STATUS');
 if(consistent.length)reasons.push('PUBLISHER_AUTHENTICATION_MISSING','OUTCOME_VERIFICATION_MISSING');
 if(register.externally_verified!==false||register.eligible_for_real_world_scoring!==false||register.research_only!==true||register.model_validation!=='UNVALIDATED'||register.publication_gate!=='BLOCKED')reasons.push('REGISTER_SAFETY_GATE_MISMATCH');
 if(register.accepted_integrity_count!==consistent.length||register.rejected_count!==rejected.length)reasons.push('REGISTER_COUNT_MISMATCH');
 return Object.freeze({experiment_id:experimentId,integrity_consistent_count:consistent.length,rejected_count:rejected.length,reasons:[...new Set(reasons)],offline_integrity_complete:register.evidence.length>0&&rejected.length===0&&consistent.length===register.evidence.length&&!reasons.some(r=>!['PUBLISHER_AUTHENTICATION_MISSING','OUTCOME_VERIFICATION_MISSING'].includes(r)),eligible_for_real_world_scoring:false,externally_verified:false,model_validation:'UNVALIDATED',publication_gate:'BLOCKED',research_only:true});
}
module.exports=Object.freeze({assess});
