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
  if(!object(o)||!text(o.event_id)||!SPORTS.some(s=>s.id===o.sport)||!text(o.market)||!text(o.actual_outcome)||!iso(o.observed_at_utc)||o.independently_verified!==true||!Array.isArray(o.source_receipts)||o.source_receipts.length<2)return 'OUTCOME_UNVERIFIED';
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
   const reason=validateOutcome(o),key=o?.sport+'|'+o?.event_id+'|'+o?.market;
   if(reason){audit.invalidOutcomes++;errors.push('Outcome withheld: '+reason);continue}
   if(resultByKey.has(key)){badKeys.add(key);audit.duplicateOutcomes++;continue}
   resultByKey.set(key,o);
  }
  for(const p of ledger.records){
   const reason=validatePrediction(p);
   if(reason){audit.invalidPredictions++;errors.push('Forecast withheld: '+reason);continue}
   if(seenIds.has(p.prediction_id)){audit.duplicatePredictions++;continue}seenIds.add(p.prediction_id);
   const key=p.sport+'|'+p.event_id+'|'+p.market,outcome=resultByKey.get(key);
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
 const NFLVERSE='https://github.com/nflverse/nflverse-data/releases/download/schedules/games.csv';
 const REVIEW_MARKETS={tennis:'MATCH_WINNER',nfl:'GAME_RESULT_INCLUDING_OVERTIME'};

 function uniqueRecords(rows){
  const index=new Map();
  for(const row of rows){
   if(!text(row?.prediction_id))continue;
   index.set(row.prediction_id,index.has(row.prediction_id)?null:row);
  }
  return index;
 }
 function reviewSource(value){
  try{
   const url=new URL(value);
   return url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&!url.hash?url:null;
  }catch{return null;}
 }
 function reviewReceipts(feed,ledger,primary,secondary,now=Date.now()){
  const ready=Array.isArray(feed?.items)?feed.items.filter(row=>row?.review_state==='READY_FOR_HUMAN_REVIEW'):[];
  const fail=reason=>({matches:[],withheld:ready.length,reason,stale:false});
  if(!guarded(feed)||feed.schema_version!==1||feed.independently_verified_results_added!==0||
     ageStatus(feed.generated_at_utc,now,72)==='UNDATED'||Date.parse(feed.generated_at_utc)>now||
     ledger?.schemaVersion!==1||ledger.kind!=='PROSPECTIVE_PREDICTION_LEDGER'||ledger.modelValidated!==false||
     !Array.isArray(ledger.records))return fail('The review queue or frozen forecast ledger is unavailable or invalid.');
  const reportTime=Date.parse(feed.generated_at_utc);
  if(![primary,secondary].every(doc=>guarded(doc)&&doc.schema_version===1&&Array.isArray(doc.observations)&&
     iso(doc.generated_at_utc)&&Date.parse(doc.generated_at_utc)<=reportTime)){
   return fail('A source receipt archive is missing, invalid, or newer than the review queue. Recheck after the next complete snapshot.');
  }
  const forecasts=uniqueRecords(ledger.records),firsts=uniqueRecords(primary.observations),
        seconds=uniqueRecords(secondary.observations),queue=uniqueRecords(feed.items);
  const matches=[];
  for(const row of ready){
   const id=row.prediction_id,p=forecasts.get(id),a=firsts.get(id),b=seconds.get(id);
   if(queue.get(id)!==row||row.auto_certified!==false||row.betting_eligible!==false||!p||!a||!b||
      !Object.hasOwn(REVIEW_MARKETS,row.sport)||validatePrediction(p)||p.research_only!==true||p.model_validated!==false||
      p.sport!==row.sport||p.event_id!==row.event_id||p.market!==REVIEW_MARKETS[row.sport]||
      !iso(row.event_start_utc)||Date.parse(p.event_start_utc)!==Date.parse(row.event_start_utc)||
      !Object.hasOwn(p.probabilities,row.observed_result))continue;
   const kickoff=Date.parse(p.event_start_utc);
   const receipts=[[a,primary,'SINGLE_PROVIDER_FINAL_UNVERIFIED','source_observed_at_utc','provider_response_sha256'],
                   [b,secondary,'SECONDARY_UNVERIFIED','observed_at_utc','response_sha256']];
   if(!receipts.every(([r,doc,status,time,hash])=>r.status===status&&r.independently_verified===false&&
      r.betting_eligible===false&&r.sport===p.sport&&r.event_id===p.event_id&&r.market===p.market&&
      r.actual_outcome===row.observed_result&&iso(r[time])&&Date.parse(r[time])>kickoff&&
      Date.parse(r[time])<=Date.parse(doc.generated_at_utc)&&typeof r[hash]==='string'&&SHA.test(r[hash])))continue;
   if(!Array.isArray(p.participant_ids)||!Array.isArray(b.participant_ids)||p.participant_ids.length!==2||
      b.participant_ids.length!==2||new Set(b.participant_ids).size!==2||
      !p.participant_ids.every(text)||new Set(p.participant_ids).size!==2||
      !b.participant_ids.every(participant=>p.participant_ids.includes(participant)))continue;
   const first=reviewSource(a.source_url),second=reviewSource(b.source_url);
   const primaryPath=row.sport==='nfl'?/^\/apis\/site\/v2\/sports\/football\/nfl\/scoreboard$/:
      /^\/apis\/site\/v2\/sports\/tennis\/(atp|wta)\/scoreboard$/;
   if(!first||!second||first.hostname!=='site.api.espn.com'||!primaryPath.test(first.pathname)||
      a.source_url!==p.source_url||a.provider_response_sha256.toLowerCase()===b.response_sha256.toLowerCase())continue;
   let label,description,receiptKind;
   if(row.sport==='nfl'){
    const game=/^\d{4}_\d{2}_([A-Z]{2,3})_([A-Z]{2,3})$/.exec(b.source_event_id||'');
    const score=b.final_score;
    if(second.href!==NFLVERSE||!game||game[1]===game[2]||b.source_match_status!=='SCHEDULE_SCORED'||
       ![score?.home,score?.away].every(n=>Number.isInteger(n)&&n>=0&&n<=999)||
       (score.home===score.away)!==(row.observed_result==='tie')||
       row.source_game_id!==b.source_event_id||row.observed_score?.home!==score.home||row.observed_score?.away!==score.away)continue;
    label=game[1]+' '+score.away+'–'+score.home+' '+game[2];
    description='nflverse game '+b.source_event_id+' · game result including overtime';
    receiptKind='Schedule CSV receipt';
   }else{
    const players=b.source_match_players;
    const pdf=first.pathname.endsWith('/wta/scoreboard')&&second.hostname==='wtafiles.wtatennis.com'&&second.pathname.endsWith('.pdf')&&b.receipt_kind==='PROVIDER_PDF';
    const reviewed=first.pathname.endsWith('/atp/scoreboard')&&second.hostname==='www.nittoatpfinals.com'&&b.receipt_kind==='REVIEWED_SOURCE_FACTS';
    if((!pdf&&!reviewed)||b.source_match_status!=='COMPLETED_SINGLES_RESULT'||
       !Array.isArray(players)||players.length!==2||!players.every(text)||players[0]===players[1]||
       !players.includes(b.source_match_winner))continue;
    label=players.join(' vs ');
    description='Observed winner: '+b.source_match_winner+' · completed singles';
    receiptKind=pdf?'Tournament PDF receipt':'Reviewed facts fingerprint';
   }
   matches.push({sport:row.sport,eventId:p.event_id,kickoff:p.event_start_utc,label,description,receiptKind,
      primary:{url:first.href,observed:a.source_observed_at_utc,hash:a.provider_response_sha256},
      secondary:{url:second.href,observed:b.observed_at_utc,hash:b.response_sha256}});
  }
  const counts=new Map();
  for(const match of matches){
   const key=JSON.stringify([match.sport,match.eventId,match.kickoff]);
   counts.set(key,(counts.get(key)||0)+1);
  }
  const unique=matches.filter(match=>counts.get(JSON.stringify([match.sport,match.eventId,match.kickoff]))===1);
  return {matches:unique,withheld:ready.length-unique.length,reason:null,
   stale:[feed,primary,secondary].some(doc=>ageStatus(doc.generated_at_utc,now,72)==='STALE')};
 }
 function descriptiveHistory(history){
  if(!guarded(history)||!Array.isArray(history.entries))return {status:'UNAVAILABLE',count:0};
  return {status:'LEGACY_DESCRIPTIVE_NOT_PROSPECTIVE',count:history.entries.length,
   note:'Legacy historical scoring is excluded from independent prospective validation, irrespective of its reported Brier/log-loss values.'};
 }
 return Object.freeze({SPORTS,guarded,ageStatus,sourceHealth,evaluate,reviewReceipts,descriptiveHistory,validatePrediction,validateOutcome});
});
