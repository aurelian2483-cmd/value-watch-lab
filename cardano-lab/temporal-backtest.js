/* Cardano research-only temporal audit of externally generated binary forecasts. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./evaluation.js'));else root.CardanoTemporalBacktest=factory(root.CardanoEvaluation)})(typeof globalThis!=='undefined'?globalThis:this,function(Evaluation){
'use strict';
const time=s=>Date.parse(s);
function evaluate(rows,options={}){
 const data=Evaluation.validate(rows);
 const minFold=options.min_fold_size===undefined?10:options.min_fold_size;
 if(!Number.isInteger(minFold)||minFold<1||minFold>100000)throw Error('Invalid min_fold_size');
 const sorted=[...data].sort((a,b)=>time(a.event_at_utc)-time(b.event_at_utc)||a.id.localeCompare(b.id));
 const seenEvents=new Set();
 for(const r of sorted){
  if(typeof r.training_cutoff_utc!=='string'||!Number.isFinite(time(r.training_cutoff_utc))||time(r.training_cutoff_utc)>=time(r.issued_at_utc))throw Error('Training cutoff must precede forecast issue: '+r.id);
  if(typeof r.fold_id!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(r.fold_id))throw Error('Valid fold_id required: '+r.id);
  if(typeof r.event_id!=='string'||!r.event_id.trim()||seenEvents.has(r.event_id))throw Error('Missing or repeated event_id');
  seenEvents.add(r.event_id);
 }
 const folds=new Map();
 for(const r of sorted){if(!folds.has(r.fold_id))folds.set(r.fold_id,[]);folds.get(r.fold_id).push(r)}
 let previousEnd=-Infinity;
 const results=[];
 for(const [id,group] of folds){
  const start=Math.min(...group.map(r=>time(r.event_at_utc)));
  const end=Math.max(...group.map(r=>time(r.resolved_at_utc)));
  if(start<=previousEnd)throw Error('Overlapping or nonchronological folds');
  const firstIssued=Math.min(...group.map(r=>time(r.issued_at_utc)));
  for(const r of group)if(time(r.training_cutoff_utc)>=firstIssued)throw Error('Fold training cutoff leaks into forecast period');
  const score=Evaluation.scores(group);
  results.push({fold_id:id,start_utc:new Date(start).toISOString(),end_utc:new Date(end).toISOString(),sample_size:group.length,delta_brier:score.delta_brier,delta_log_loss:score.delta_log_loss,low_sample:group.length<minFold});
  previousEnd=end;
 }
 const aggregate=Evaluation.scores(sorted);
 return {fold_count:results.length,folds:results,aggregate,insufficient_sample:results.some(f=>f.low_sample),research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED',notes:'Audits supplied forecast chronology only. Cannot verify training inputs, actual data cutoff, leakage through feature construction, or true walk-forward retraining.'};
}
return Object.freeze({evaluate});
});
