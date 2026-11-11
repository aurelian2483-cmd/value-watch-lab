/* Explicit synthetic-fixture evaluation, never real-world outcome verification. */
'use strict';
const crypto=require('node:crypto');
const Ledger=require('./experiment-ledger.js');
const Binary=require('./evaluation.js');
const Multi=require('./multiclass-evaluation.js');
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function run(experiment,fixtureBytes,kind){
 const check=Ledger.validate(experiment);
 if(!check.valid)throw Error('Invalid experiment: '+check.errors.join('; '));
 if(!Buffer.isBuffer(fixtureBytes)||!fixtureBytes.length)throw Error('Fixture bytes required');
 if(!['binary','multiclass'].includes(kind))throw Error('Unknown fixture evaluation type');
 if(sha(fixtureBytes)!==experiment.dataset_sha256.toLowerCase())throw Error('Fixture hash does not match experiment dataset');
 let rows;
 try{rows=JSON.parse(fixtureBytes.toString('utf8'))}catch{throw Error('Invalid fixture JSON')}
 if(!Array.isArray(rows)||!rows.length||rows.some(r=>r?.fixture_only!==true))throw Error('Explicit synthetic fixture rows required');
 const metrics=kind==='binary'?Binary.scores(rows):Multi.evaluate(rows);
 const result={schema_version:1,experiment_id:experiment.id,method_version:experiment.method_version,seed:experiment.seed,dataset_sha256:experiment.dataset_sha256.toLowerCase(),evaluation_kind:kind,fixture_only:true,metrics,eligible_for_real_world_scoring:false,evaluation_performed:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED',research_only:true};
 const result_sha256=sha(Buffer.from(JSON.stringify(result)));
 return Object.freeze({...result,result_sha256});
}
module.exports=Object.freeze({run});
