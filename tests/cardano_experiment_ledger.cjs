'use strict';
const assert=require('node:assert/strict');
const L=require('../cardano-lab/experiment-ledger.js');
const base=()=>({schema_version:1,id:'trial-001',hypothesis:'Baseline calibration test',sport:'football',lane:'applied',status:'PROPOSED',created_at_utc:'2026-11-11T12:00:00Z',updated_at_utc:'2026-11-11T12:00:00Z',dataset_sha256:'a'.repeat(64),method_version:'baseline-v1',seed:42,sources:[{url:'https://example.org/dataset',observed_at_utc:'2026-11-11T11:00:00Z'}],research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED'});
assert.equal(L.validate(base()).valid,true);
for(const [field,value] of [['sport','basketball'],['lane','unknown'],['publication_gate','OPEN'],['model_validation','VALIDATED'],['research_only',false],['dataset_sha256','bad'],['seed',-1],['created_at_utc','2026-02-30T12:00:00Z'],['sources',[{url:'http://example.org',observed_at_utc:'2026-11-11T11:00:00Z'}]]]){
 const record=base();record[field]=value;assert.equal(L.validate(record).valid,false,'reject '+field);
}
const completed={...base(),id:'trial-002',status:'COMPLETED',result_summary:'No improvement',result_sha256:'b'.repeat(64)};
assert.equal(L.validate(completed).valid,true);
assert.equal(L.validate({...base(),status:'COMPLETED'}).valid,false);
assert.equal(L.validate({...base(),result_summary:'claimed result'}).valid,false);
const history=L.append([],base());assert.equal(history.length,1);
assert.throws(()=>L.append(history,base()),/duplicate/);
const next=base();next.id='trial-003';const extended=L.append(history,next);next.hypothesis='tampered';assert.equal(extended[1].hypothesis,'Baseline calibration test');assert.equal(history.length,1);
console.log('PASS Cardano experiment ledger contract checks');
