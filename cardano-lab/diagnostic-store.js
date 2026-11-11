/* Local diagnostic memory; separate from experiment ledger and never an outcome authority. */
'use strict';
const KEY='cardano.diagnostics.v1';
function validate(r){
 if(!r||typeof r!=='object'||Array.isArray(r)||typeof r.experiment_id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(r.experiment_id))throw Error('Invalid diagnostic identity');
 if(r.research_only!==true||r.publication_gate!=='BLOCKED'||r.model_validation!=='UNVALIDATED'||r.eligible_for_real_world_scoring!==false||r.evaluation_performed!==false)throw Error('Unsafe diagnostic flags');
 if(!r.evidence||r.evidence.experiment_id!==r.experiment_id||r.evidence.research_only!==true||r.evidence.eligible_for_real_world_scoring!==false||!Array.isArray(r.evidence.evidence))throw Error('Invalid evidence snapshot');
 if(!r.readiness||r.readiness.eligible_for_real_world_scoring!==false||!Array.isArray(r.issues))throw Error('Invalid readiness snapshot');
 return true;
}
function parse(raw){
 if(raw===null)return [];
 let x;try{x=JSON.parse(raw)}catch{throw Error('Corrupt diagnostic archive; original preserved')}
 if(!x||x.schema_version!==1||!Array.isArray(x.records))throw Error('Unsupported diagnostic archive; original preserved');
 const ids=new Set();
 for(const r of x.records){validate(r);if(ids.has(r.experiment_id))throw Error('Duplicate diagnostic id');ids.add(r.experiment_id)}
 return x.records;
}
function store(storage,key=KEY){
 if(!storage||typeof storage.getItem!=='function'||typeof storage.setItem!=='function')throw TypeError('Storage adapter required');
 if(!/^cardano\.[a-z0-9.-]{1,100}$/.test(key))throw Error('Invalid archive key');
 const load=()=>structuredClone(parse(storage.getItem(key)));
 return Object.freeze({
  load,
  append(diagnostic,experimentArchive){
   validate(diagnostic);
   if(!experimentArchive||typeof experimentArchive.load!=='function')throw Error('Experiment archive required');
   const experiments=experimentArchive.load();
   if(!experiments.some(e=>e.id===diagnostic.experiment_id&&e.status===diagnostic.experiment_status&&e.sport===diagnostic.sport&&e.lane===diagnostic.lane))throw Error('No matching experiment in ledger');
   const before=storage.getItem(key),records=parse(before);
   if(records.some(r=>r.experiment_id===diagnostic.experiment_id))throw Error('Duplicate diagnostic; preserve previous result');
   const next=[...records,structuredClone(diagnostic)];
   if(storage.getItem(key)!==before)throw Error('Diagnostic archive changed during append');
   storage.setItem(key,JSON.stringify({schema_version:1,records:next}));
   return next.length;
  },
  exportJSON(){return JSON.stringify({schema_version:1,records:load()},null,2)}
 });
}
module.exports=Object.freeze({store,parse,validate,KEY});
