/* Cardano deterministic binary prediction evaluation. Research only. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.CardanoEvaluation=factory()})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function instant(value){if(typeof value!=='string'||!/T.*(?:Z|[+-]\d\d:\d\d)$/.test(value))return NaN;return Date.parse(value)}
function validate(rows){
 if(!Array.isArray(rows)||!rows.length)throw new Error('Nonempty evaluation records required');
 const ids=new Set();
 return rows.map((r,i)=>{
  if(!r||typeof r!=='object'||Array.isArray(r))throw new Error('Invalid row '+i);
  if(typeof r.id!=='string'||!r.id.trim()||ids.has(r.id))throw new Error('Missing or duplicate prediction id');
  ids.add(r.id);
  const issued=instant(r.issued_at_utc),event=instant(r.event_at_utc),resolved=instant(r.resolved_at_utc);
  if(!Number.isFinite(issued)||!Number.isFinite(event)||!Number.isFinite(resolved)||issued>=event||event>resolved)throw new Error('Invalid prediction/event/outcome chronology for '+r.id);
  if(typeof r.probability!=='number'||!Number.isFinite(r.probability)||r.probability<=0||r.probability>=1)throw new Error('Invalid probability for '+r.id);
  if(r.outcome!==0&&r.outcome!==1)throw new Error('Binary observed outcome required for '+r.id);
  if(typeof r.baseline_probability!=='number'||!Number.isFinite(r.baseline_probability)||r.baseline_probability<=0||r.baseline_probability>=1)throw new Error('Valid baseline probability required for '+r.id);
  if(r.dataset_split!=='HOLDOUT')throw new Error('Only explicit HOLDOUT records accepted for '+r.id);
  return r;
 });
}
function scores(rows){
 const data=validate(rows);
 const n=data.length;
 const brier=field=>data.reduce((sum,r)=>sum+(r[field]-r.outcome)**2,0)/n;
 const logloss=field=>-data.reduce((sum,r)=>sum+r.outcome*Math.log(r[field])+(1-r.outcome)*Math.log1p(-r[field]),0)/n;
 const model={brier:brier('probability'),log_loss:logloss('probability')};
 const baseline={brier:brier('baseline_probability'),log_loss:logloss('baseline_probability')};
 return {sample_size:n,model,baseline,delta_brier:model.brier-baseline.brier,delta_log_loss:model.log_loss-baseline.log_loss,improved_brier:model.brier<baseline.brier,improved_log_loss:model.log_loss<baseline.log_loss,validation_status:'UNVALIDATED',publication_gate:'BLOCKED',research_only:true,notes:'Descriptive holdout scores only; not proof of calibration, significance, positive EV, or real-world profitability.'};
}
return Object.freeze({validate,scores});
});
