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
// Input is chronological; interleave sports without changing each sport's order.
function balanced(rows){
 const buckets=['football','racecard','tennis','nfl'].map(kind=>rows.filter(r=>r.kind===kind));
 const output=[];
 for(let i=0;buckets.some(b=>i<b.length);i++)for(const bucket of buckets)if(bucket[i])output.push(bucket[i]);
 return output;
}
return {market,matchingModel,balanced};
});

