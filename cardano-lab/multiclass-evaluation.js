/* Cardano multiclass probability evaluation, research-only, no betting decisions. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.CardanoMulticlassEvaluation=factory()})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const instant=x=>typeof x==='string'&&/T.*(?:Z|[+-]\d\d:\d\d)$/.test(x)?Date.parse(x):NaN;
function check(rows){
 if(!Array.isArray(rows)||rows.length===0)throw Error('Nonempty holdout records required');
 const seen=new Set();
 return rows.map((r,i)=>{
  if(!r||typeof r!=='object'||Array.isArray(r))throw Error('Invalid record '+i);
  if(typeof r.id!=='string'||!r.id.trim()||seen.has(r.id))throw Error('Missing or duplicate id');
  seen.add(r.id);
  if(r.dataset_split!=='HOLDOUT')throw Error('Explicit HOLDOUT required');
  const issue=instant(r.issued_at_utc),event=instant(r.event_at_utc),resolved=instant(r.resolved_at_utc);
  if(!Number.isFinite(issue)||!Number.isFinite(event)||!Number.isFinite(resolved)||issue>=event||event>resolved)throw Error('Invalid event chronology');
  const outcomes=r.outcomes;
  if(!Array.isArray(outcomes)||outcomes.length!==3||new Set(outcomes).size!==3||outcomes.some(o=>typeof o!=='string'||!o.trim()))throw Error('Exactly three distinct outcomes required');
  if(!outcomes.includes(r.actual_outcome))throw Error('Actual outcome must be among outcomes');
  for(const field of ['probabilities','baseline_probabilities']){
   const vector=r[field];
   if(!Array.isArray(vector)||vector.length!==3||vector.some(p=>!finite(p)||p<=0||p>=1)||Math.abs(vector.reduce((a,b)=>a+b,0)-1)>1e-8)throw Error('Invalid probability vector: '+field);
  }
  return r;
 });
}
function evaluate(rows){
 const data=check(rows),n=data.length;
 const metrics=field=>{
  let brier=0,log=0;
  for(const r of data){
   const actual=r.outcomes.indexOf(r.actual_outcome),p=r[field];
   for(let k=0;k<3;k++)brier+=(p[k]-(k===actual?1:0))**2;
   log-=Math.log(p[actual]);
  }
  return {brier:brier/n,log_loss:log/n};
 };
 const model=metrics('probabilities'),baseline=metrics('baseline_probabilities');
 return {sample_size:n,outcome_count:3,model,baseline,delta_brier:model.brier-baseline.brier,delta_log_loss:model.log_loss-baseline.log_loss,improved_brier:model.brier<baseline.brier,improved_log_loss:model.log_loss<baseline.log_loss,research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED',notes:'Descriptive scores on supplied labelled records; no proof of real holdout, calibration, significance, EV, or profitability.'};
}
return Object.freeze({check,evaluate});
});
