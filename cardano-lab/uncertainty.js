/* Deterministic paired bootstrap of holdout Brier difference; research-only. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./evaluation.js'));else root.CardanoUncertainty=factory(root.CardanoEvaluation)})(typeof globalThis!=='undefined'?globalThis:this,function(Evaluation){
'use strict';
function estimate(rows,options={}){
 const data=Evaluation.validate(rows);
 const iterations=options.iterations===undefined?2000:options.iterations;
 const seed=options.seed===undefined?12345:options.seed;
 const confidence=options.confidence===undefined?.95:options.confidence;
 if(!Number.isInteger(iterations)||iterations<200||iterations>20000)throw Error('iterations must be 200..20000');
 if(!Number.isSafeInteger(seed)||seed<1||seed>4294967295)throw Error('seed must be a positive 32-bit integer');
 if(typeof confidence!=='number'||!Number.isFinite(confidence)||confidence<.8||confidence>.99)throw Error('confidence must be 0.8..0.99');
 const n=data.length;
 const diffs=data.map(r=>(r.probability-r.outcome)**2-(r.baseline_probability-r.outcome)**2);
 const observed=diffs.reduce((a,b)=>a+b,0)/n;
 let state=seed>>>0;
 const rand=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)/4294967296};
 const samples=[];
 for(let k=0;k<iterations;k++){let sum=0;for(let j=0;j<n;j++)sum+=diffs[Math.floor(rand()*n)];samples.push(sum/n)}
 samples.sort((a,b)=>a-b);
 const quantile=p=>{const x=(samples.length-1)*p,lo=Math.floor(x),hi=Math.ceil(x);return samples[lo]+(samples[hi]-samples[lo])*(x-lo)};
 const lower=quantile((1-confidence)/2),upper=quantile(1-(1-confidence)/2);
 return {sample_size:n,iterations,seed,confidence,observed_delta_brier:observed,interval_lower:lower,interval_upper:upper,interval_excludes_zero:lower>0||upper<0,method:'IID_PAIRED_PERCENTILE_BOOTSTRAP',research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED',notes:'Exploratory IID resampling only; correlated fixtures, temporal drift, multiple testing and non-independent predictions invalidate naive uncertainty interpretation. Not a betting signal.'};
}
return Object.freeze({estimate});
});
