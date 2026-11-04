(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.RaceCards=factory()})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const ids=rows=>rows.map(x=>String(x.horse_id)).sort(),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function market(r,now=Date.now()){
 const empty={valid:false,fresh:false,quotes:[],favourites:[],label:'Source prices unavailable'};const m=r.market_observation,active=(r.runners||[]).filter(h=>h.active_runner===true&&h.runner_status==='RUNNER');
 if(r.runner_data_status!=='SINGLE_SOURCE_RUNNERS_OBSERVED'||(r.runners||[]).some(h=>!['RUNNER','NONRUNNER','WITHDRAWN'].includes(h.runner_status)))return {...empty,label:'Runner field unconfirmed'};
 if(m?.status!=='COMPLETE_SOURCE_OBSERVATION'||m.bookmaker!=='Sky Bet'||m.executable_verified!==false||m.verification!=='SOURCE_OBSERVED_UNVERIFIED'||m.source_sha256!==r.runner_source_sha256||m.source!==r.runner_source||!m.bookmaker_market_id||!Array.isArray(m.quotes))return empty;
 const q=m.quotes,seen=Date.parse(m.observed_at_utc),start=Date.parse(r.startUTC);if(active.length<2||active.length!==r.active_runner_count||new Set(ids(q)).size!==q.length||!same(ids(q),ids(active))||q.some(x=>typeof x.decimal!=='number'||!Number.isFinite(x.decimal)||x.decimal<=1)||!Number.isFinite(seen)||seen>now+300000||seen>=start)return empty;
 const low=Math.min(...q.map(x=>x.decimal)),favourites=active.filter(h=>q.some(x=>String(x.horse_id)===String(h.horse_id)&&x.decimal===low));const fresh=now-seen<=1800000&&now<start&&['DORMANT','GOINGDOWN','ATTHEPOST'].includes(r.race_stage);
 return {valid:true,fresh,quotes:q,favourites,label:fresh?'Source-observed Sky Bet favourite':'Favourite at the earlier source observation',observed:m.observed_at_utc,source:m.source};
}
function matchingModel(r,models){
 if(r.runner_data_status!=='SINGLE_SOURCE_RUNNERS_OBSERVED')return null;const active=(r.runners||[]).filter(h=>h.active_runner===true&&h.runner_status==='RUNNER');
 const rows=(models||[]).filter(m=>String(m.race_id)===String(r.race_id)&&Date.parse(m.startUTC)===Date.parse(r.startUTC)&&Array.isArray(m.runners)&&same(ids(m.runners),ids(active))&&new Set(ids(m.runners)).size===m.runners.length&&m.runners.length>=2&&m.runners.every(h=>typeof h.model_probability==='number'&&Number.isFinite(h.model_probability)&&h.model_probability>0&&h.model_probability<1)&&Math.abs(m.runners.reduce((a,h)=>a+h.model_probability,0)-1)<1e-8&&Date.parse(m.generated_at_utc)<Date.parse(m.startUTC)-300000);
 return rows.sort((a,b)=>Date.parse(b.generated_at_utc)-Date.parse(a.generated_at_utc))[0]||null;
}
const contextReasons={
 CONTEXT_FEED_UNAVAILABLE:'Context-model snapshot is unavailable.',
 UNKNOWN_RACE_DISCIPLINE:'The source has not established whether this is flat, hurdle, chase or National Hunt flat racing.',
 DISCIPLINE_PROVENANCE_UNAVAILABLE:'The race type lacks usable source evidence.',
 CONFLICTING_DISCIPLINE_SOURCES:'The sources disagree about the race type; a forecast is withheld.',
 UNKNOWN_RACE_SURFACE:'The current surface is unknown.',
 RACE_DISTANCE_UNAVAILABLE:'The current race distance is missing or invalid.',
 CURRENT_GOING_UNAVAILABLE:'Current going is missing; conditions cannot be compared.',
 INSUFFICIENT_SAME_DISCIPLINE_HISTORY:'At least one runner has fewer than three usable dated races in the same discipline.',
 UNRESOLVED_HISTORY_OUTCOME:'A historical result cannot be interpreted safely; the full-field forecast is withheld.',
 OUTSIDE_SUPPORTED_RACE_TYPE:'Race type is outside this experimental model’s scope.',
 UNSUPPORTED_RACE_TYPE:'Race type is outside this experimental model’s scope.',
 RUNNER_DATA_UNAVAILABLE:'A confirmed full runner field is unavailable.',
 RUNNER_FIELD_UNCONFIRMED:'Runner status is uncertain; the model is withheld.',
 STALE_RUNNER_DATA:'Runner observations are too old for a current context forecast.',
 NOT_PRE_EVENT_WITH_BUFFER:'The race has started or is inside the five-minute capture buffer.',
 INSUFFICIENT_FORM_FOR_FULL_FIELD:'At least one runner lacks enough usable dated form; a full-field forecast is withheld.',
 INSUFFICIENT_COMPARABLE_FORM_FOR_FULL_FIELD:'At least one runner lacks enough comparable dated form for this race type.',
 INVALID_ACTIVE_FIELD:'The observed runner count or identities are inconsistent.',
 FIELD_CHANGED:'The current runner field differs from the frozen model field.',
 RACE_CONDITIONS_CHANGED:'Race conditions differ from the frozen model inputs.',
 CONTEXT_CHECK_OUTDATED:'The context forecast was checked against an earlier racecard; awaiting a fresh input check.',
 INVALID_CONTEXT_FORECAST:'The context forecast failed identity or model-data checks.'
};
function reasonLabel(code){return contextReasons[code]||String(code||'Context inputs are incomplete.').replaceAll('_',' ').toLowerCase()}
function contextForecast(r,feed,now=Date.now()){
 const unavailable=reason=>({valid:false,fresh:false,record:null,reason,label:reasonLabel(reason)});
 if(!feed||feed.research_only!==true||feed.model_validation!=='UNVALIDATED'||feed.publication_gate!=='BLOCKED'||!Number.isFinite(Date.parse(feed.generated_at_utc))||Date.parse(feed.generated_at_utc)>now+300000)return unavailable('CONTEXT_FEED_UNAVAILABLE');
 if(r.runner_data_status!=='SINGLE_SOURCE_RUNNERS_OBSERVED')return unavailable(r.runner_data_status==='RUNNER_FIELD_UNCONFIRMED'?'RUNNER_FIELD_UNCONFIRMED':'RUNNER_DATA_UNAVAILABLE');
 const observedRows=r.runners||[],observedActive=observedRows.filter(h=>h.active_runner===true&&h.runner_status==='RUNNER');
 if(observedRows.some(h=>!['RUNNER','NONRUNNER','WITHDRAWN'].includes(h.runner_status)||h.active_runner!==(h.runner_status==='RUNNER'))||new Set(ids(observedRows)).size!==observedRows.length||observedActive.length<2||observedActive.length!==r.active_runner_count)return unavailable('INVALID_ACTIVE_FIELD');
 const skip=(feed.skipped||[]).find(s=>String(s.race_id)===String(r.race_id));
 const possible=(feed.forecasts||[]).filter(m=>String(m.race_id)===String(r.race_id)&&Date.parse(m.startUTC)===Date.parse(r.startUTC));
 const record=matchingModel(r,possible);
 if(!record)return unavailable(possible.length?'FIELD_CHANGED':skip?.reason||'INSUFFICIENT_FORM_FOR_FULL_FIELD');
 if(record.model!=='CONTEXT_FORM_RESEARCH_V1'||record.research_only!==true||record.model_validation!=='UNVALIDATED'||record.publication_gate!=='BLOCKED'||record.odds!==null||record.expected_value!==null||record.challenge_eligible!==0||!/^[a-f0-9]{64}$/i.test(record.record_sha256||''))return unavailable('INVALID_CONTEXT_FORECAST');
 const check=feed.current_field_checks?.[record.record_sha256],active=(r.runners||[]).filter(h=>h.active_runner===true&&h.runner_status==='RUNNER');
 if(check?.status==='CONTEXT_CHANGED'||check?.status==='RACE_CONDITIONS_CHANGED')return unavailable('RACE_CONDITIONS_CHANGED');
 if(!check)return unavailable('CONTEXT_CHECK_OUTDATED');
 if(!/^[a-f0-9]{64}$/i.test(record.context_signature||'')||check?.context_signature!==record.context_signature)return unavailable('RACE_CONDITIONS_CHANGED');
 if(check?.runner_source_sha256!==r.runner_source_sha256)return unavailable('CONTEXT_CHECK_OUTDATED');
 const age=now-Date.parse(check?.runner_observed_at_utc),fieldAge=now-Date.parse(r.runner_observed_at_utc),checkMatch=check?.status==='FRESH_MATCHING_FIELD_AND_CONTEXT'&&same((check.active_runner_ids||[]).map(String).sort(),ids(active));
 const fresh=checkMatch&&Number.isFinite(age)&&age>=-300000&&age<=1800000&&Number.isFinite(fieldAge)&&fieldAge>=-300000&&fieldAge<=1800000&&Date.parse(r.startUTC)>now+300000&&['DORMANT','GOINGDOWN','ATTHEPOST'].includes(r.race_stage);
 return {valid:true,fresh,record,reason:fresh?null:'STALE_RUNNER_DATA',label:fresh?'Experimental context weights':'Frozen context weights · current field not confirmed'};
}
function priceMovement(r,horseId,now=Date.now()){
 const current=market(r,now),m=r.market_observation,p=m?.previous_observation;
 if(!current.valid||m.history_status!=='COMPARABLE_SOURCE_OBSERVATIONS'||!p||!/^[a-f0-9]{64}$/i.test(p.record_sha256||'')||p.bookmaker!=='Sky Bet'||p.publisher!=='Sporting Life'||p.source!==m.source||p.bookmaker_race_id!==m.bookmaker_race_id||p.bookmaker_market_id!==m.bookmaker_market_id||!Array.isArray(p.active_runner_ids)||!Array.isArray(p.quotes))return null;
 const previousTime=Date.parse(p.observed_at_utc),currentTime=Date.parse(m.observed_at_utc);if(!Number.isFinite(previousTime)||previousTime>=currentTime||previousTime>now||!same(p.active_runner_ids.map(String).sort(),ids(current.quotes))||!same(ids(p.quotes),ids(current.quotes))||new Set(ids(p.quotes)).size!==p.quotes.length||p.quotes.some(q=>typeof q.decimal!=='number'||!Number.isFinite(q.decimal)||q.decimal<=1))return null;
 const old=p.quotes.find(q=>String(q.horse_id)===String(horseId)),next=current.quotes.find(q=>String(q.horse_id)===String(horseId));if(!old||!next||typeof old.fractional!=='string'||typeof next.fractional!=='string')return null;
 return {previous:old,current:next,observedFrom:p.observed_at_utc,observedTo:m.observed_at_utc,direction:next.decimal<old.decimal?'SHORTENED':next.decimal>old.decimal?'DRIFTED':'UNCHANGED'};
}
// Input is chronological; interleave sports without changing each sport's order.
function balanced(rows){
 const buckets=['football','racecard','tennis','nfl'].map(kind=>rows.filter(r=>r.kind===kind));
 const output=[];
 for(let i=0;buckets.some(b=>i<b.length);i++)for(const bucket of buckets)if(bucket[i])output.push(bucket[i]);
 return output;
}
return {market,matchingModel,balanced,contextForecast,reasonLabel,priceMovement};
});

