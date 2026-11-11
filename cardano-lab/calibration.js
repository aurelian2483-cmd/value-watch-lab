/* Research-only calibration diagnostics on supplied binary holdout observations. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./evaluation.js'));else root.CardanoCalibration=factory(root.CardanoEvaluation)})(typeof globalThis!=='undefined'?globalThis:this,function(Evaluation){
'use strict';
function evaluate(rows,options={}){
 const data=Evaluation.validate(rows);
 const bins=options.bins===undefined?10:options.bins;
 if(!Number.isInteger(bins)||bins<2||bins>20)throw Error('bins must be an integer from 2 to 20');
 const minimum=options.minimum_per_bin===undefined?30:options.minimum_per_bin;
 if(!Number.isInteger(minimum)||minimum<1||minimum>100000)throw Error('Invalid minimum_per_bin');
 const grouped=Array.from({length:bins},(_,i)=>({index:i,lower:i/bins,upper:(i+1)/bins,count:0,predicted_sum:0,outcome_sum:0}));
 for(const r of data){
  const index=Math.min(bins-1,Math.floor(r.probability*bins)),g=grouped[index];
  g.count++;g.predicted_sum+=r.probability;g.outcome_sum+=r.outcome;
 }
 const summary=grouped.map(g=>{
  const n=g.count;
  return {bin:g.index,lower:g.lower,upper:g.upper,count:n,mean_predicted:n?g.predicted_sum/n:null,observed_frequency:n?g.outcome_sum/n:null,absolute_gap:n?Math.abs(g.predicted_sum/n-g.outcome_sum/n):null,low_sample:n<minimum};
 });
 const ece=summary.reduce((sum,g)=>sum+(g.count/data.length)*(g.absolute_gap||0),0);
 return {sample_size:data.length,bins:summary,expected_calibration_error:ece,minimum_per_bin:minimum,insufficient_sample:summary.some(g=>g.count>0&&g.low_sample),research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED',notes:'Descriptive calibration on supplied holdout-labelled binary records. ECE is bin-dependent and does not establish statistical significance or actual out-of-sample provenance.'};
}
return Object.freeze({evaluate});
});
