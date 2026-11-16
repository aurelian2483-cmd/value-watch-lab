(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ValueWatchPerformanceIntelligence=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const Validator=typeof module==='object'&&module.exports?require('./core.js'):root.ValueWatchIndependentValidation;
const SPORTS=Validator.SPORTS;
const VALID_REVIEW=['AWAITING_EVENT','AWAITING_PRIMARY_FINAL','AWAITING_INDEPENDENT_SOURCE','SECONDARY_CONFLICT','SECONDARY_INVALID','READY_FOR_HUMAN_REVIEW','IDENTITY_CONFLICT','ARCHIVE_INVALID'];
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const timestamp=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))&&/T/.test(x)&&/(Z|[+-]\d\d:\d\d)$/.test(x);
function wilson(wins,n,z=1.96){
 if(!Number.isInteger(n)||n<=0||!Number.isInteger(wins)||wins<0||wins>n)return null;
 const p=wins/n,z2=z*z,den=1+z2/n,centre=(p+z2/(2*n))/den,half=z*Math.sqrt(p*(1-p)/n+z2/(4*n*n))/den;
 return {lower:Math.max(0,centre-half),upper:Math.min(1,centre+half)};
}
function reviewHealth(ledger,review,now=Date.now()){
 const expected=ledger?.records?.length;
 const guarded=review?.schema_version===1&&review.research_only===true&&review.model_validation==='UNVALIDATED'&&review.publication_gate==='BLOCKED'&&review.independently_verified_results_added===0&&Array.isArray(review.items)&&review.status_counts&&typeof review.status_counts==='object';
 if(!guarded||!Number.isInteger(expected))return {status:'REVIEW_UNAVAILABLE',count:0,counts:{}};
 if(!timestamp(review.generated_at_utc)||Date.parse(review.generated_at_utc)>now+5*60000||now-Date.parse(review.generated_at_utc)>3*3600000)return {status:'REVIEW_STALE',count:0,counts:{}};
 const counts=review.status_counts,total=Object.values(counts).reduce((a,n)=>a+(Number.isInteger(n)&&n>=0?n:0),0);
 if(total!==expected||review.items.length!==expected||Object.keys(counts).some(k=>!VALID_REVIEW.includes(k))||review.items.some(x=>x.auto_certified!==false||x.betting_eligible!==false))return {status:'REVIEW_INCONSISTENT',count:0,counts:{}};
 return {status:'REVIEW_CURRENT',count:total,counts};
}
function build(ledger,outcomes,review,now=Date.now()){
 const base=Validator.evaluate(ledger,outcomes);
 const health=reviewHealth(ledger,review,now);
 const rows=Object.fromEntries(SPORTS.map(s=>[s.id,{sport:s.id,name:s.name,n:0,accuracy:null,hitInterval:null,brier:null,uniformBrier:null,brierImprovement:null,logLoss:null,uniformLogLoss:null,logLossImprovement:null,calibration:null,status:'NOT_ESTABLISHED',baseline:'UNIFORM_REFERENCE_ONLY'}]));
 const evidence={...base.audit};
 // The validator evaluates fields but this module derives its own paired event set.
 // Avoid optimistic scoring if original archive is invalid, duplicate or contradictory.
 if(base.state==='INVALID_ARCHIVE')return {status:'INVALID_ARCHIVE',metrics:rows,evidence,review:health,verifiedValue:false,verifiedROI:false};
 const byResult=new Map(),conflicted=new Set();
 for(const o of outcomes.records){
   if(Validator.validateOutcome(o))continue;
   const key=[o.sport,o.event_id,o.market].join('|');
   if(byResult.has(key))conflicted.add(key);else byResult.set(key,o);
 }
 const bySport=Object.fromEntries(SPORTS.map(s=>[s.id,[]])),seenIds=new Set();
 for(const p of ledger.records){
   if(Validator.validatePrediction(p))continue;
   if(seenIds.has(p.prediction_id))continue;seenIds.add(p.prediction_id);
   const key=[p.sport,p.event_id,p.market].join('|'),o=byResult.get(key);
   if(!o||conflicted.has(key)||Date.parse(o.observed_at_utc)<=Date.parse(p.event_start_utc)||!Object.hasOwn(p.probabilities,o.actual_outcome))continue;
   const probabilities=Object.values(p.probabilities),keys=Object.keys(p.probabilities),uniform=1/keys.length;
   const brier=keys.reduce((s,k)=>s+(p.probabilities[k]-(k===o.actual_outcome?1:0))**2,0);
   const ubrier=keys.reduce((s,k)=>s+(uniform-(k===o.actual_outcome?1:0))**2,0);
   const correct=keys.reduce((best,k)=>p.probabilities[k]>p.probabilities[best]?k:best,keys[0])===o.actual_outcome;
   const max=Math.max(...probabilities);
   bySport[p.sport].push({brier,ubrier,loss:-Math.log(p.probabilities[o.actual_outcome]),uloss:Math.log(keys.length),correct,max});
 }
 let total=0;
 for(const s of SPORTS){
   const a=bySport[s.id],n=a.length,x=rows[s.id];
   if(!n)continue;
   const sum=k=>a.reduce((v,r)=>v+r[k],0);
   const brier=sum('brier')/n, ubrier=sum('ubrier')/n,loss=sum('loss')/n,uloss=sum('uloss')/n,hits=a.filter(r=>r.correct).length;
   const bins=Array.from({length:5},(_,i)=>({lower:i/5,upper:(i+1)/5,count:0,predicted:null,observed:null}));
   let ece=0;
   for(let i=0;i<5;i++){
     const grouped=a.filter(r=>Math.min(4,Math.floor(r.max*5))===i);if(!grouped.length)continue;
     bins[i].count=grouped.length;bins[i].predicted=grouped.reduce((v,r)=>v+r.max,0)/grouped.length;
     bins[i].observed=grouped.filter(r=>r.correct).length/grouped.length;
     ece+=grouped.length/n*Math.abs(bins[i].predicted-bins[i].observed);
   }
   Object.assign(x,{n,accuracy:hits/n,hitInterval:wilson(hits,n),brier,uniformBrier:ubrier,brierImprovement:ubrier-brier,logLoss:loss,uniformLogLoss:uloss,logLossImprovement:uloss-loss,
    calibration:{bins,ece,description:'Descriptive top-outcome reliability; sparse bins are unstable'},
    status:n<30?'TOO_FEW_PAIRED_RESULTS':n<100?'EXPLORATORY_SAMPLE_ONLY':'DESCRIPTIVE_NOT_CALIBRATED'});
   total+=n;
 }
 return {status:total?'DESCRIPTIVE_RESULTS_ONLY':'NO_PAIRED_RESULTS',totalScored:total,metrics:rows,evidence,review:health,verifiedValue:false,verifiedROI:false,
   note:'Scores use only contract-matched outcomes. Uniform baselines are weak references, not bookmaker or trained model comparators. Wilson intervals are for top-pick hit rates, not Brier/log loss. No sample size alone certifies calibration or betting value.'};
}
return Object.freeze({SPORTS,wilson,reviewHealth,build});
});
