(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.RacingAnalysis=factory()})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function numeric(x){if(x===null||x===undefined||String(x).trim()==='')return null;const n=Number(x);return Number.isFinite(n)?n:null}
 function decimal(x){const n=numeric(x);if(n===null||n<=1||n>10000)throw Error('Enter decimal odds greater than 1 (maximum 10,000).');return n}
 function priceAnalysis(odds,probability,lower){
  const o=decimal(odds),p=numeric(probability),lo=numeric(lower);
  if(p!==null&&(p<0||p>100))throw Error('Assessed probability must be between 0 and 100%.');
  if(String(probability??'').trim()!==''&&p===null)throw Error('Assessed probability is invalid.');
  if(String(lower??'').trim()!==''&&lo===null)throw Error('Lower probability is invalid.');
  if(lo!==null&&(p===null||lo<0||lo>p))throw Error('Lower probability must be between zero and the assessed probability.');
  return {odds:o,breakEven:1/o,ev:p===null?null:p/100*o-1,lowerEV:lo===null?null:lo/100*o-1};
 }
 function marketBaseline(rows){
  if(!Array.isArray(rows)||rows.length<2||new Set(rows.map(x=>x.id)).size!==rows.length)throw Error('A unique complete runner field is required.');
  const implied=rows.map(x=>1/decimal(x.odds)),total=implied.reduce((a,b)=>a+b,0);
  return {overround:total-1,probabilities:rows.map((x,i)=>({id:x.id,probability:implied[i]/total}))};
 }
 function fieldStatus(race,now=Date.now()){
  const start=Date.parse(race.startUTC),seen=Date.parse(race.runner_observed_at_utc),age=now-seen;
  const active=(race.runners||[]).filter(r=>r.active_runner===true&&r.runner_status==='RUNNER');
  if(!Number.isFinite(start)||!Number.isFinite(seen))return {current:false,label:'Timing unavailable',active};
  if(start<=now||!['DORMANT','GOINGDOWN','ATTHEPOST'].includes(race.race_stage))return {current:false,label:'Started / completed source observation',active};
  if(race.runner_data_status!=='SINGLE_SOURCE_RUNNERS_OBSERVED'||active.length!==race.active_runner_count||new Set(active.map(r=>r.horse_id)).size!==active.length||(race.runners||[]).some(r=>!['RUNNER','NONRUNNER','WITHDRAWN'].includes(r.runner_status)||r.active_runner!==(r.runner_status==='RUNNER')))return {current:false,label:'Field incomplete or inconsistent',active};
  if(age<0||age>1800000)return {current:false,label:'Stale field — refresh required',active};
  return {current:true,label:'Recent single-source field · not independently verified',active};
 }
 function safeURL(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null}catch{return null}}
 return {numeric,decimal,priceAnalysis,marketBaseline,fieldStatus,safeURL};
});
