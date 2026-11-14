'use strict';
// Value Watch research-only coverage and event lifecycle checks.
// Pure functions: no fetch, storage, odds, publication or betting actions.
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.ValueWatchCoverageLifecycle=api;
})(typeof window!=='undefined'?window:this,function(){
 const STATES=Object.freeze(['SCHEDULED','START_TIME_PASSED_UNCONFIRMED','STARTED','COMPLETED_UNVERIFIED','RESULT_VERIFIED','POSTPONED','CANCELLED','ABANDONED','UNKNOWN']);
 function timestamp(value){if(typeof value!=='string'||!value.trim())return null;const n=Date.parse(value);return Number.isFinite(n)?n:null}
 function lifecycle(event,now=Date.now()){
  if(!event||typeof event!=='object')return 'UNKNOWN';
  const raw=String(event.status||event.event_status||'').trim().toLowerCase().replace(/[ _-]+/g,'');
  if(['postponed','postpone'].includes(raw))return 'POSTPONED';
  if(['cancelled','canceled'].includes(raw))return 'CANCELLED';
  if(['abandoned'].includes(raw))return 'ABANDONED';
  if(event.result_verified===true && ['completed','finished','final','resultverified'].includes(raw))return 'RESULT_VERIFIED';
  if(['completed','finished','final','resultverified'].includes(raw))return 'COMPLETED_UNVERIFIED';
  if(['started','live','inprogress','halftime'].includes(raw))return 'STARTED';
  const start=timestamp(event.startUTC||event.kickoff_utc||event.start_utc);
  if(start===null)return 'UNKNOWN';
  if(start<=now)return 'START_TIME_PASSED_UNCONFIRMED';
  return 'SCHEDULED';
 }
 function coverage({sport,observed,expected,sourceStatus='OBSERVED',reference=null}){
  const actual=Number.isSafeInteger(observed)&&observed>=0?observed:null;
  const anticipated=Number.isSafeInteger(expected)&&expected>=0?expected:null;
  if(sourceStatus!=='OBSERVED'||actual===null)return {sport,state:'SOURCE_UNVERIFIED',observed:actual,expected:anticipated,missing:null,reference};
  if(anticipated===null)return {sport,state:'COVERAGE_UNVERIFIED',observed:actual,expected:null,missing:null,reference};
  if(actual<anticipated)return {sport,state:'POSSIBLE_MISSING_COVERAGE',observed:actual,expected:anticipated,missing:anticipated-actual,reference};
  if(actual>anticipated)return {sport,state:'COUNT_DISCREPANCY',observed:actual,expected:anticipated,missing:0,reference};
  return {sport,state:'COUNTS_MATCH_NOT_CERTIFIED',observed:actual,expected:anticipated,missing:0,reference};
 }
 function eligibleForFutureResearch(event,now=Date.now()){
  return lifecycle(event,now)==='SCHEDULED' && event?.research_only===true &&
   event?.model_validation==='UNVALIDATED' && event?.publication_gate==='BLOCKED';
 }
 function reconcile(events,now=Date.now()){
  if(!Array.isArray(events))return {state:'SCHEMA_UNVERIFIED',counts:null,eligible:[]};
  const counts=Object.fromEntries(STATES.map(s=>[s,0])),eligible=[];
  for(const event of events){const state=lifecycle(event,now);counts[state]++;if(eligibleForFutureResearch(event,now))eligible.push(event)}
  return {state:'OBSERVED_NOT_COVERAGE_CERTIFIED',counts,eligible};
 }
 return Object.freeze({STATES,timestamp,lifecycle,coverage,eligibleForFutureResearch,reconcile});
});
