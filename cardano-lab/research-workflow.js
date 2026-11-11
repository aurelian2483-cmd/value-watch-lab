/* Cardano experiment workflow: diagnostics only; never grants scoring permission. */
'use strict';
const Ledger=require('./experiment-ledger.js');
const Register=require('./evidence-register.js');
const Readiness=require('./evaluation-readiness.js');
function inspect(experiment,captures,audits){
 const check=Ledger.validate(experiment);
 if(!check.valid)throw Error('Invalid experiment: '+check.errors.join('; '));
 const evidence=Register.register(experiment,captures,audits);
 const readiness=Readiness.assess(evidence,experiment.id);
 const issues=[...readiness.reasons];
 if(experiment.status!=='COMPLETED')issues.push('EXPERIMENT_NOT_COMPLETED');
 return Object.freeze({
  experiment_id:experiment.id,
  sport:experiment.sport,
  lane:experiment.lane,
  experiment_status:experiment.status,
  evidence,
  readiness,
  issues:Object.freeze([...new Set(issues)]),
  evaluation_performed:false,
  eligible_for_real_world_scoring:false,
  model_validation:'UNVALIDATED',
  publication_gate:'BLOCKED',
  research_only:true
 });
}
module.exports=Object.freeze({inspect});
