'use strict';
/**
 * Research-only horse-specific evidence reliability. No outcome data, no tuning,
 * no market prices, and no implicit use of current-race class, course, field size,
 * or target-race outcome. Comparability of historical distance/surface signals
 * requires target distance/going as a matching *query*, not an added race factor.
 *
 * This library does NOT predict winners or amend the live V1/V3 systems.
 */
const MS_DAY=86400000;
const DEFAULTS=Object.freeze({maxAgeDays:730,maxRuns:6,halfLifeDays:90,priorRuns:5,distanceWindow:0.2,maxWeight:0.15});
function reject(message){throw new Error(message)}
function finitePositive(n){return typeof n==='number' && Number.isFinite(n)&&n>0}
function historySignals({targetDate,targetDistanceYards,targetGoing,previousResults,settings={}}){
 const c={...DEFAULTS,...settings};
 if(!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)||!Number.isFinite(Date.parse(targetDate+'T00:00:00Z')))reject('Target date invalid');
 if(!finitePositive(targetDistanceYards))reject('Target distance must be positive yards');
 if(typeof targetGoing!=='string')reject('Target going missing');
 if(!Array.isArray(previousResults))reject('Missing prior-run records');
 const target=Date.parse(targetDate+'T00:00:00Z'),seen=new Set(),eligible=[];
 for(const h of [...previousResults].sort((a,b)=>String(b.date).localeCompare(String(a.date)))){
  if(!h||!/^\d{4}-\d{2}-\d{2}$/.test(h.date||''))continue;
  const time=Date.parse(h.date+'T00:00:00Z');
  if(!Number.isFinite(time))continue;
  const age=Math.round((target-time)/MS_DAY),id=String(h.race_id||'');
  if(!id||seen.has(id)||age<=0||age>c.maxAgeDays||h.run_type!=='FLAT')continue;
  if(!Number.isInteger(h.position)||!Number.isInteger(h.runner_count)||h.runner_count<2||h.position<1||h.position>h.runner_count)continue;
  seen.add(id);
  const weight=2**(-age/c.halfLifeDays);
  const finish=(h.runner_count-h.position)/(h.runner_count-1);
  eligible.push({id,age,weight,finish,distanceYards:h.distance_yards,going:h.going});
  if(eligible.length>=c.maxRuns)break;
 }
 if(eligible.length<3)return {eligible:false,reason:'INSUFFICIENT_PREVIOUS_RUNS',runs:eligible.length};
 const priorScore=(records)=>{
  const W=records.reduce((s,x)=>s+x.weight,0);
  const signal=records.reduce((s,x)=>s+x.weight*(x.finish-0.5),0)/(c.priorRuns+W);
  // Full-history effective sample size using un-normalised recency weights.
  const neff=W>0 ? W*W/records.reduce((s,x)=>s+x.weight*x.weight,0):0;
  const reliability=neff/(neff+c.priorRuns);
  return {signal,neff,reliability,count:records.length};
 };
 const dist=eligible.filter(x=>finitePositive(x.distanceYards)&&Math.abs(x.distanceYards/targetDistanceYards-1)<=c.distanceWindow);
 const surface=eligible.filter(x=>typeof x.going==='string'&&x.going.trim().toLowerCase().startsWith('standard')&&targetGoing.trim().toLowerCase().startsWith('standard'));
 const D=priorScore(dist),G=priorScore(surface),F=priorScore(eligible);
 return {eligible:true,runs:eligible.length,formStrength:0.5+F.signal,
  distance:{...D,adaptiveWeight:c.maxWeight*D.reliability},
  surface:{...G,adaptiveWeight:c.maxWeight*G.reliability},
  deltaLogit:2*c.maxWeight*(D.reliability*D.signal+G.reliability*G.signal),
  limitations:['Historical inputs must be proved pre-event before prospective validation','Not calibrated win probabilities']};
}
module.exports={historySignals};
