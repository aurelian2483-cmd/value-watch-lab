(function(root,factory){if(typeof module==="object"&&module.exports)module.exports=factory();else root.V3LiveCompare=factory()})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const params=Object.freeze({maxAgeDays:730,maxRuns:6,minRuns:3,halfLife:90,neutralRuns:5,inverseTemperature:2,distanceWindow:.2,contextWeight:.15});
function yards(s){if(typeof s!=="string")return null;const parts=[...s.toLowerCase().matchAll(/(\d+(?:\.\d+)?)\s*([mfy])/g)];if(!parts.length)return null;const v=parts.reduce((t,m)=>t+Number(m[1])*({m:1760,f:220,y:1}[m[2]]),0);return v>0?v:null}
function validDate(d){return typeof d==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d+"T00:00:00Z"))}
function form(h,day,target){
 const past=[],seen=new Set();
 for(const x of [...(Array.isArray(h.previous_results)?h.previous_results:[])].sort((a,b)=>String(b.date).localeCompare(String(a.date)))){
  if(!validDate(x.date)||!x.race_id||x.run_type!=="FLAT"||!Number.isInteger(x.position)||!Number.isInteger(x.runner_count)||x.runner_count<2||x.position<1||x.position>x.runner_count)continue;
  const age=Math.round((Date.parse(day+"T00:00:00Z")-Date.parse(x.date+"T00:00:00Z"))/86400000),id=String(x.race_id);
  if(age<=0||age>params.maxAgeDays||seen.has(id))continue;seen.add(id);
  const v=(x.runner_count-x.position)/(x.runner_count-1),w=2**(-age/params.halfLife);
  past.push({v,w,p:x});if(past.length>=params.maxRuns)break;
 }
 if(past.length<params.minRuns)return null;
 const sum=past.reduce((s,x)=>s+x.w,0);
 const form=.5+past.reduce((s,x)=>s+x.w*(x.v-.5),0)/(params.neutralRuns+sum);
 const context=(rows)=>rows.length?rows.reduce((s,x)=>s+x.w*(x.v-.5),0)/(params.neutralRuns+rows.reduce((s,x)=>s+x.w,0)):0;
 return {form,distance:context(past.filter(x=>{const d=yards(x.p.distance);return d!==null&&Math.abs(d/target-1)<=params.distanceWindow})),surface:context(past.filter(x=>String(x.p.going||"").toLowerCase().startsWith("standard"))),usable:past.length}
}
function computeV3(race,now){
 const n=Date.parse(race.startUTC),day=(()=>{const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/London",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date(n));const d=Object.fromEntries(parts.map(x=>[x.type,x.value]));return d.year+"-"+d.month+"-"+d.day})(),distance=yards(race.distance);
 if(!Number.isFinite(n)||!validDate(day)||n<=now+300000||distance===null||race.surface!=="ALLWEATHER")return {available:false,reason:"Not eligible for the fixed all-weather flat V3 pilot"};
 if(race.runner_data_status!=="SINGLE_SOURCE_RUNNERS_OBSERVED"||!Number.isFinite(Date.parse(race.runner_observed_at_utc))||now-Date.parse(race.runner_observed_at_utc)>1800000||Date.parse(race.runner_observed_at_utc)>now+300000)return {available:false,reason:"Current runner observation absent or stale"};
 const candidates=race.runners||[],active=candidates.filter(x=>x.active_runner===true&&x.runner_status==="RUNNER");
 if(candidates.some(x=>!["RUNNER","NONRUNNER","WITHDRAWN"].includes(x.runner_status)||x.active_runner!==(x.runner_status==="RUNNER"))||active.length<2||active.length!==race.active_runner_count||new Set(active.map(x=>String(x.horse_id))).size!==active.length)return {available:false,reason:"Runner field unresolved"};
 const entries=[];
 for(const h of active){const f=form(h,day,distance);if(!f)return {available:false,reason:"At least one runner lacks three eligible previous Flat finishes"};entries.push({horse_id:String(h.horse_id),name:String(h.name),f})}
 const z=entries.map(x=>params.inverseTemperature*(x.f.form+params.contextWeight*x.f.distance+params.contextWeight*x.f.surface)),mx=Math.max(...z),exp=z.map(v=>Math.exp(v-mx)),sum=exp.reduce((a,b)=>a+b,0);
 return {available:true,model:"V3_FIXED_DISTANCE_SURFACE_RESEARCH",rows:entries.map((x,i)=>({...x,weight:exp[i]/sum})),limitation:"Experimental ranking weights, not calibrated probabilities"}
}
function snapshotV1(race,feed,now){
 if(!feed||feed.research_only!==true||feed.publication_gate!=="BLOCKED"||feed.model_validation!=="UNVALIDATED")return null;
 const active=(race.runners||[]).filter(h=>h.active_runner===true&&h.runner_status==="RUNNER").map(h=>String(h.horse_id)).sort();
 const rows=(feed.form_forecasts||[]).filter(f=>f.model==="FORM_PERCENTILE_SOFTMAX_RESEARCH_V1"&&String(f.race_id)===String(race.race_id)&&Date.parse(f.startUTC)===Date.parse(race.startUTC)&&f.publication_gate==="BLOCKED"&&f.model_validation==="UNVALIDATED"&&f.research_only===true&&Date.parse(f.generated_at_utc)<Date.parse(f.startUTC)-300000&&Array.isArray(f.runners));
 for(const f of rows.sort((a,b)=>Date.parse(b.generated_at_utc)-Date.parse(a.generated_at_utc))){const ids=f.runners.map(r=>String(r.horse_id)).sort();if(JSON.stringify(active)!==JSON.stringify(ids)||Math.abs(f.runners.reduce((s,r)=>s+r.model_probability,0)-1)>1e-8||f.runners.some(r=>typeof r.model_probability!=="number"||!Number.isFinite(r.model_probability)||r.model_probability<=0)||now>=Date.parse(race.startUTC)-300000)continue;return f}
 return null
}
function observedOdds(race,now){
 const m=race.market_observation,active=(race.runners||[]).filter(x=>x.active_runner===true&&x.runner_status==="RUNNER").map(h=>String(h.horse_id)).sort();
 if(!m||m.status!=="COMPLETE_SOURCE_OBSERVATION"||m.bookmaker!=="Sky Bet"||m.executable_verified!==false||m.verification!=="SOURCE_OBSERVED_UNVERIFIED"||m.source_sha256!==race.runner_source_sha256||m.source!==race.runner_source||!m.bookmaker_market_id||!Array.isArray(m.quotes))return null;
 const t=Date.parse(m.observed_at_utc);if(!Number.isFinite(t)||t>now+300000||now-t>1800000||now>=Date.parse(race.startUTC)||JSON.stringify(active)!==JSON.stringify(m.quotes.map(x=>String(x.horse_id)).sort())||new Set(active).size!==active.length||m.quotes.some(q=>typeof q.decimal!=="number"||!Number.isFinite(q.decimal)||q.decimal<=1))return null;
 return {bookmaker:m.bookmaker,observed_at_utc:m.observed_at_utc,quotes:m.quotes}
}
function compare(race,feed,now=Date.now()){
 const v3=computeV3(race,now),v1=snapshotV1(race,feed,now),odds=observedOdds(race,now);
 const active=(race.runners||[]).filter(x=>x.active_runner===true&&x.runner_status==="RUNNER");
 const v1rows=new Map((v1?.runners||[]).map(x=>[String(x.horse_id),x.model_probability]));
 const v3rows=new Map((v3.available?v3.rows:[]).map(x=>[x.horse_id,x.weight]));
 const market=new Map((odds?.quotes||[]).map(x=>[String(x.horse_id),x.decimal]));
 const rank=(m)=>new Map([...m].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).map(([id],i)=>[id,i+1]));
 const r1=rank(v1rows),r3=rank(v3rows);
 return {race_id:String(race.race_id),racecourse:race.racecourse,startUTC:race.startUTC,v1Available:!!v1,v3Available:v3.available,v3Reason:v3.reason||null,oddsAvailable:!!odds,observedAt:odds?.observed_at_utc||null,rows:active.map(x=>({horse_id:String(x.horse_id),name:String(x.name),v1Rank:r1.get(String(x.horse_id))||null,v3Rank:r3.get(String(x.horse_id))||null,v1Weight:v1rows.get(String(x.horse_id))??null,v3Weight:v3rows.get(String(x.horse_id))??null,sourceObservedOdds:market.get(String(x.horse_id))??null})),research_only:true,publication_gate:"BLOCKED",bet_recommendation:null,expected_value:null}
}
return {params,yards,form,computeV3,snapshotV1,observedOdds,compare}
});
