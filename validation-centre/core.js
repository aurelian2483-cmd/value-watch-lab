(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.ValueWatchIndependentValidation=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const SPORTS=Object.freeze([
  {id:'football',name:'Football',feed:'research-dashboard-data.json',freshHours:36},
  {id:'racing',name:'Horse racing',feed:'horse-research-status.json',freshHours:36},
  {id:'tennis',name:'Tennis',feed:'other-sports-data.json',freshHours:36},
  {id:'nfl',name:'NFL',feed:'other-sports-data.json',freshHours:36},
  {id:'darts',name:'Darts',feed:'darts/feed.json',freshHours:48},
  {id:'rugby_union',name:'Rugby Union',feed:'rugby-research-data.json',freshHours:48},
  {id:'rugby_league',name:'Rugby League',feed:'rugby-research-data.json',freshHours:48}
 ]);
 const SHA=/^[a-f0-9]{64}$/i;
 const iso=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)&&Number.isFinite(Date.parse(s))&&/(Z|[+-]\d{2}:\d{2})$/.test(s);
 const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
 const text=x=>typeof x==='string'&&x.length>0&&x.length<=180;
 const guarded=x=>object(x)&&x.research_only===true&&x.model_validation==='UNVALIDATED'&&x.publication_gate==='BLOCKED';
 const noKeys=x=>object(x)&&['odds','expected_value','verified_roi','betting_eligible'].every(k=>!(k in x));
 const ageStatus=(value,now,maxHours)=>!iso(value)?'UNDATED':Date.parse(value)>now+300000?'FUTURE_TIMESTAMP':now-Date.parse(value)>maxHours*3600000?'STALE':'CURRENT';
 function sourceHealth(feeds,now=Date.now()){
  return SPORTS.map(s=>{
   const raw=feeds?.[s.feed],ok=guarded(raw),time=raw?.generated_at_utc||raw?.report_generated_at_utc;
   const freshness=ok?ageStatus(time,now,s.freshHours):'UNAVAILABLE_OR_INVALID';
   let detail='Research source only; no approved betting model';
   if(s.id==='darts'&&ok)detail='Historical result sample '+(Array.isArray(raw.results)?raw.results.length:'unavailable')+' · confirmed-time fixtures '+(Array.isArray(raw.fixtures)?raw.fixtures.length:'unavailable');
   if(s.id==='rugby_union'||s.id==='rugby_league'){
    const health=raw?.source_health?.[s.id==='rugby_union'?'RU':'RL'];
    if(ok)detail=health?'Collector '+health.collection_status+' · '+health.days_succeeded+'/'+health.days_requested+' sampled days; not full schedule coverage':'Source audit unavailable';
   }
   if(s.id==='racing'&&ok)detail='Frozen V1 '+(raw.metrics?.v1_frozen_forecasts??'unavailable')+' · V3+ '+(raw.metrics?.v3_frozen_forecasts??'unavailable')+'; no independently approved market edge';
   return {id:s.id,name:s.name,feed:s.feed,sourceStatus:freshness,sourceTimestamp:iso(time)?time:null,
    researchOnly:true,modelValidation:'UNVALIDATED',publication:'BLOCKED',detail,
    note:'Source freshness is not forecast certification'};
  });
 }
 function validatePrediction(p){
  if(!object(p)||!text(p.prediction_id)||!text(p.event_id)||!text(p.model_version)||!text(p.market)||!SPORTS.some(s=>s.id===p.sport)||!iso(p.recorded_at_utc)||!iso(p.event_start_utc)||Date.parse(p.recorded_at_utc)>=Date.parse(p.event_start_utc)-300000||!SHA.test(p.snapshot_sha256||'')||!object(p.probabilities)||!noKeys(p))return 'INVALID_OR_NOT_PRE_EVENT';
  const ps=Object.entries(p.probabilities);
  if(ps.length<2||ps.length>32||ps.some(([k,v])=>!text(k)||typeof v!=='number'||!Number.isFinite(v)||v<=0||v>=1)||Math.abs(ps.reduce((a,[,v])=>a+v,0)-1)>1e-6)return 'INVALID_PROBABILITY_VECTOR';
  return null;
 }
 function validateOutcome(o){
  if(!object(o)||!text(o.event_id)||!text(o.market)||!text(o.actual_outcome)||!iso(o.observed_at_utc)||o.independently_verified!==true||!Array.isArray(o.source_receipts)||o.source_receipts.length<2)return 'OUTCOME_UNVERIFIED';
  const urls=new Set(),hashes=new Set();
  for(const r of o.source_receipts){
   if(!object(r)||!SHA.test(r.sha256||'')||!iso(r.observed_at_utc)||!text(r.url))return 'INVALID_RESULT_RECEIPTS';
   let url;try{url=new URL(r.url)}catch{return 'INVALID_RESULT_RECEIPTS'}
   if(url.protocol!=='https:'||url.username||url.password)return 'INVALID_RESULT_RECEIPTS';
   urls.add(url.hostname);hashes.add(r.sha256.toLowerCase());
  }
  if(urls.size<2||hashes.size<2)return 'SOURCES_NOT_INDEPENDENT';
  return null;
 }
 function evaluate(ledger,outcomes){
  const audit={predictionRecords:0,outcomeRecords:0,eligiblePairs:0,unmatchedPredictions:0,invalidPredictions:0,invalidOutcomes:0,
   duplicatePredictions:0,duplicateOutcomes:0,chronologyFailures:0,identityFailures:0};
  const errors=[],bySport=Object.fromEntries(SPORTS.map(s=>[s.id,{sport:s.id,scoreCount:0,brier:null,logLoss:null,status:'INSUFFICIENT_INDEPENDENT_EVIDENCE'}]));
  if(ledger?.schemaVersion!==1||ledger.kind!=='PROSPECTIVE_PREDICTION_LEDGER'||!Array.isArray(ledger.records)||
     outcomes?.schemaVersion!==1||outcomes.kind!=='VERIFIED_OUTCOME_FEED'||!Array.isArray(outcomes.records))
   return {state:'INVALID_ARCHIVE',bySport,audit,errors:['Prospective prediction or verified outcome contract invalid'],modelValidated:false,bettingEligible:false};
  if(ledger.records.length>50000||outcomes.records.length>50000)
   return {state:'INVALID_ARCHIVE',bySport,audit,errors:['Archive exceeds safe scoring limit'],modelValidated:false,bettingEligible:false};
  audit.predictionRecords=ledger.records.length;audit.outcomeRecords=outcomes.records.length;
  const resultByKey=new Map(),badKeys=new Set(),seenIds=new Set(),sums=Object.fromEntries(SPORTS.map(s=>[s.id,{n:0,brier:0,loss:0}]));
  for(const o of outcomes.records){
   const reason=validateOutcome(o),key=o?.event_id+'|'+o?.market;
   if(reason){audit.invalidOutcomes++;errors.push('Outcome withheld: '+reason);continue}
   if(resultByKey.has(key)){badKeys.add(key);audit.duplicateOutcomes++;continue}
   resultByKey.set(key,o);
  }
  for(const p of ledger.records){
   const reason=validatePrediction(p);
   if(reason){audit.invalidPredictions++;errors.push('Forecast withheld: '+reason);continue}
   if(seenIds.has(p.prediction_id)){audit.duplicatePredictions++;continue}seenIds.add(p.prediction_id);
   const key=p.event_id+'|'+p.market,outcome=resultByKey.get(key);
   if(badKeys.has(key)){audit.identityFailures++;continue}
   if(!outcome){audit.unmatchedPredictions++;continue}
   if(Date.parse(outcome.observed_at_utc)<=Date.parse(p.event_start_utc)){audit.chronologyFailures++;continue}
   if(!Object.prototype.hasOwnProperty.call(p.probabilities,outcome.actual_outcome)){audit.identityFailures++;continue}
   const probs=Object.entries(p.probabilities),brier=probs.reduce((v,[k,pr])=>v+(pr-(k===outcome.actual_outcome?1:0))**2,0);
   const loss=-Math.log(p.probabilities[outcome.actual_outcome]);
   const s=sums[p.sport];s.n++;s.brier+=brier;s.loss+=loss;audit.eligiblePairs++;
  }
  for(const s of SPORTS){const x=sums[s.id];if(x.n){
   bySport[s.id]={sport:s.id,scoreCount:x.n,brier:x.brier/x.n,logLoss:x.loss/x.n,status:'DESCRIPTIVE_PAIRED_EVIDENCE_ONLY'};
  }}
  return {state:audit.eligiblePairs?'DESCRIPTIVE_ONLY':'NO_INDEPENDENTLY_MATCHED_FORECASTS',bySport,audit,
   errors:errors.slice(0,12),modelValidated:false,bettingEligible:false,
   note:'Contract-qualified file pairs are only descriptive. GitHub file contents and receipt claims are not independent external verification. No calibration, confidence interval or profit advantage established.'};
 }
 function descriptiveHistory(history){
  if(!guarded(history)||!Array.isArray(history.entries))return {status:'UNAVAILABLE',count:0};
  return {status:'LEGACY_DESCRIPTIVE_NOT_PROSPECTIVE',count:history.entries.length,
   note:'Legacy historical scoring is excluded from independent prospective validation, irrespective of its reported Brier/log-loss values.'};
 }
 return Object.freeze({SPORTS,guarded,ageStatus,sourceHealth,evaluate,descriptiveHistory,validatePrediction,validateOutcome});
});
