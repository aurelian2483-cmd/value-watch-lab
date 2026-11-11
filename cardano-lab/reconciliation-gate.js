/* Structural join of reconciliation and verified byte receipts. Not publisher authentication. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./outcome-reconciliation.js'));else root.CardanoReconciliationGate=factory(root.CardanoOutcomeReconciliation)})(typeof globalThis!=='undefined'?globalThis:this,function(Reconciliation){
'use strict';
function assess(predictions,receipts,integrityReports){
 if(!Array.isArray(integrityReports))throw Error('Integrity reports array required');
 const result=Reconciliation.reconcile(predictions,receipts);
 const byReceipt=new Map(),duplicates=[];
 for(const report of integrityReports){
  if(!report||typeof report.receipt_id!=='string'||!report.receipt_id.trim()||byReceipt.has(report.receipt_id)){duplicates.push(report?.receipt_id??null);continue}
  byReceipt.set(report.receipt_id,report);
 }
 const receiptMap=new Map(receipts.map(r=>[r.receipt_id,r]));
 const accepted=[],blocked=[];
 for(const m of result.matched){
  const report=byReceipt.get(m.receipt_id),receipt=receiptMap.get(m.receipt_id);
  if(!report||report.hash_matches!==true||report.verification_level!=='BYTES_MATCH_DECLARED_HASH'||report.declared_sha256!==receipt.source_sha256.toLowerCase()||report.source_url!==receipt.source_url||report.publisher_authenticated!==false||report.source_fetched!==false){
   blocked.push({event_id:m.event_id,receipt_id:m.receipt_id,reason:'EVIDENCE_BYTES_NOT_VERIFIED'});
   continue;
  }
  accepted.push(m);
 }
 const unknownReports=[...byReceipt.keys()].filter(id=>!receiptMap.has(id));
 return {structural_result:result,byte_matched:accepted,blocked,duplicate_integrity_reports:duplicates,unknown_integrity_reports:unknownReports,complete_for_offline_integrity:result.complete&&blocked.length===0&&duplicates.length===0&&unknownReports.length===0,externally_verified:false,eligible_for_real_world_scoring:false,research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED',notes:'Offline hash matching is not independent source authentication or result verification. No betting decisions.'};
}
return Object.freeze({assess});
});
