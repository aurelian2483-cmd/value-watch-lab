/* Cardano preregistered hypothesis-family audit. Research-only. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.CardanoExperimentFamily=factory()})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const id=s=>typeof s==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(s);
const iso=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,19)===s.slice(0,19);
const sha=s=>typeof s==='string'&&/^[a-f0-9]{64}$/i.test(s);
function register(manifest){
 if(!manifest||typeof manifest!=='object'||Array.isArray(manifest))throw Error('Manifest object required');
 if(manifest.schema_version!==1||!id(manifest.family_id)||!iso(manifest.registered_at_utc)||!sha(manifest.dataset_sha256)||!sha(manifest.protocol_sha256))throw Error('Invalid family metadata');
 if(!Array.isArray(manifest.hypotheses)||!manifest.hypotheses.length||manifest.hypotheses.length>10000)throw Error('Nonempty hypothesis family required');
 const ids=new Set();
 for(const h of manifest.hypotheses){
  if(!h||!id(h.id)||ids.has(h.id)||typeof h.statement!=='string'||!h.statement.trim()||h.statement.length>500||!id(h.method_version))throw Error('Invalid or duplicate registered hypothesis');
  ids.add(h.id);
 }
 if(manifest.research_only!==true||manifest.model_validation!=='UNVALIDATED'||manifest.publication_gate!=='BLOCKED')throw Error('Research safeguards required');
 return JSON.parse(JSON.stringify(manifest));
}
function audit(manifest,results){
 const family=register(manifest);
 if(!Array.isArray(results))throw Error('Results array required');
 const expected=new Set(family.hypotheses.map(h=>h.id)),seen=new Set(),unexpected=[],late=[],invalid=[];
 for(const r of results){
  if(!r||!id(r.id)||seen.has(r.id)){invalid.push(r?.id??null);continue}
  seen.add(r.id);
  if(!expected.has(r.id)){unexpected.push(r.id);continue}
  if(!iso(r.tested_at_utc)||Date.parse(r.tested_at_utc)<Date.parse(family.registered_at_utc)||r.protocol_sha256!==family.protocol_sha256||r.dataset_sha256!==family.dataset_sha256||!['COMPLETED','FAILED','REJECTED'].includes(r.status))late.push(r.id);
 }
 const missing=family.hypotheses.map(h=>h.id).filter(x=>!seen.has(x));
 const complete=missing.length===0&&unexpected.length===0&&late.length===0&&invalid.length===0;
 return {family_id:family.family_id,registered_count:expected.size,reported_count:results.length,missing,unexpected,nonconforming:late,invalid,complete,confirmatory_eligible:complete,model_validation:'UNVALIDATED',publication_gate:'BLOCKED',research_only:true,notes:'Internal consistency audit only. A supplied timestamp/hash is not independent proof of preregistration or data provenance. Results must be independently checked.'};
}
return Object.freeze({register,audit});
});
