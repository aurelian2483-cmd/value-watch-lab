/* Cardano research-only experiment ledger v1. No network or betting actions. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.CardanoExperimentLedger=factory()})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const SPORTS=new Set(['football','racing','tennis','nfl']);
const LANES=new Set(['applied','experimental','frontier']);
const STATUSES=new Set(['PROPOSED','RUNNING','COMPLETED','FAILED','REJECTED']);
const SHA=/^[a-f0-9]{64}$/i;
const utc=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,19)===s.slice(0,19);
const name=s=>typeof s==='string'&&s.trim().length>0&&s.length<=200;
const hash=s=>typeof s==='string'&&SHA.test(s);
const safeUrl=s=>{try{const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password}catch{return false}};
function validate(record){
 const errors=[];
 if(!record||typeof record!=='object'||Array.isArray(record))return {valid:false,errors:['record must be an object']};
 if(record.schema_version!==1)errors.push('schema_version must be 1');
 if(!name(record.id)||!/^[a-zA-Z0-9_-]{1,100}$/.test(record.id||''))errors.push('invalid id');
 if(!name(record.hypothesis))errors.push('hypothesis required');
 if(!SPORTS.has(record.sport))errors.push('invalid sport');
 if(!LANES.has(record.lane))errors.push('invalid research lane');
 if(!STATUSES.has(record.status))errors.push('invalid status');
 if(!utc(record.created_at_utc))errors.push('invalid created timestamp');
 if(!utc(record.updated_at_utc)||utc(record.created_at_utc)&&utc(record.updated_at_utc)&&Date.parse(record.updated_at_utc)<Date.parse(record.created_at_utc))errors.push('invalid updated timestamp');
 if(!hash(record.dataset_sha256))errors.push('dataset hash required');
 if(!name(record.method_version))errors.push('method version required');
 if(!Number.isSafeInteger(record.seed)||record.seed<0)errors.push('nonnegative integer seed required');
 if(!Array.isArray(record.sources)||!record.sources.length||record.sources.some(s=>!safeUrl(s?.url)||!utc(s?.observed_at_utc)))errors.push('timestamped HTTPS source required');
 if(record.model_validation!=='UNVALIDATED'||record.publication_gate!=='BLOCKED'||record.research_only!==true)errors.push('research safety gates required');
 if(['COMPLETED','FAILED','REJECTED'].includes(record.status)&&(!name(record.result_summary)||!hash(record.result_sha256)))errors.push('terminal results require summary and result hash');
 if(['PROPOSED','RUNNING'].includes(record.status)&&(record.result_summary!=null||record.result_sha256!=null))errors.push('nonterminal records cannot claim results');
 return {valid:errors.length===0,errors};
}
function append(history,record){
 if(!Array.isArray(history))throw new TypeError('history must be an array');
 const check=validate(record);if(!check.valid)throw new Error(check.errors.join('; '));
 if(history.some(r=>r.id===record.id))throw new Error('duplicate experiment id; append a new version with a distinct id');
 const copy=JSON.parse(JSON.stringify(record));
 return [...history.map(r=>JSON.parse(JSON.stringify(r))),copy];
}
return Object.freeze({validate,append,SCHEMA_VERSION:1});
});
