/* Cardano outcome reconciliation: fail-closed, externally supplied receipts only. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.CardanoOutcomeReconciliation=factory()})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const sha=s=>typeof s==='string'&&/^[a-f0-9]{64}$/i.test(s);
const id=s=>typeof s==='string'&&/^[a-zA-Z0-9_-]{1,120}$/.test(s);
const utc=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,19)===s.slice(0,19);
const https=s=>{try{const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password}catch{return false}};
function reconcile(predictions,receipts){
 if(!Array.isArray(predictions)||!Array.isArray(receipts))throw Error('Prediction and receipt arrays required');
 const pids=new Set(),rids=new Set(),byEvent=new Map(),issues=[];
 for(const p of predictions){
  if(!p||!id(p.prediction_id)||pids.has(p.prediction_id)||!id(p.event_id)||!utc(p.issued_at_utc)||!utc(p.event_at_utc)||Date.parse(p.issued_at_utc)>=Date.parse(p.event_at_utc)||!Array.isArray(p.outcomes)||p.outcomes.length<2||new Set(p.outcomes).size!==p.outcomes.length||p.outcomes.some(x=>!id(x))||!sha(p.prediction_sha256))throw Error('Invalid or duplicate prediction');
  pids.add(p.prediction_id);
  if(byEvent.has(p.event_id))throw Error('Multiple predictions for one event require explicit separate-market protocol');
  byEvent.set(p.event_id,p);
 }
 const matches=[];
 for(const r of receipts){
  if(!r||!id(r.receipt_id)||rids.has(r.receipt_id)||!id(r.event_id)||!utc(r.observed_at_utc)||!https(r.source_url)||!sha(r.source_sha256)||!id(r.outcome))throw Error('Invalid or duplicate outcome receipt');
  rids.add(r.receipt_id);
  const p=byEvent.get(r.event_id);
  if(!p){issues.push({receipt_id:r.receipt_id,event_id:r.event_id,reason:'UNMATCHED_RECEIPT'});continue}
  if(!p.outcomes.includes(r.outcome)){issues.push({receipt_id:r.receipt_id,event_id:r.event_id,reason:'UNKNOWN_OUTCOME'});continue}
  if(Date.parse(r.observed_at_utc)<Date.parse(p.event_at_utc)){issues.push({receipt_id:r.receipt_id,event_id:r.event_id,reason:'PRE_EVENT_RESULT'});continue}
  matches.push({prediction_id:p.prediction_id,event_id:p.event_id,receipt_id:r.receipt_id,outcome:r.outcome,prediction_sha256:p.prediction_sha256,source_sha256:r.source_sha256});
 }
 const counts=new Map();
 for(const m of matches)counts.set(m.event_id,(counts.get(m.event_id)||0)+1);
 const conflicts=[...counts].filter(([,n])=>n>1).map(([event_id])=>event_id);
 const conflicted=new Set(conflicts);
 const confirmed=matches.filter(m=>!conflicted.has(m.event_id));
 const confirmedEvents=new Set(confirmed.map(m=>m.event_id));
 const missing=predictions.filter(p=>!confirmedEvents.has(p.event_id)).map(p=>p.event_id);
 return {matched:confirmed,missing_event_ids:missing,conflicting_event_ids:conflicts,issues,complete:missing.length===0&&conflicts.length===0&&issues.length===0,research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED',notes:'Structural reconciliation only. SHA-256 values and HTTPS URLs are unverified assertions; no source fetch, independent outcome confirmation, or integrity proof is performed.'};
}
return Object.freeze({reconcile});
});
