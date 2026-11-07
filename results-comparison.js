/* Research-only matched forecast/result explorer. Never counts official challenge picks. */
(function(){
'use strict';
const host=document.getElementById('sports-results-summary');if(!host)return;
const section=document.createElement('section');section.className='results-explainer';section.setAttribute('aria-label','Experimental football forecast comparison');
const heading=document.createElement('h2');heading.textContent='Experimental football model vs final scores';section.append(heading);
const status=document.createElement('p');status.setAttribute('role','status');status.textContent='Loading matched research records…';section.append(status);
const stats=document.createElement('div');stats.className='results-explainer-grid';section.append(stats);
const details=document.createElement('details');const sum=document.createElement('summary');sum.textContent='See matched matches and scoring rules';details.append(sum);const rows=document.createElement('div');details.append(rows);section.append(details);
host.parentNode.insertBefore(section,host);
function add(parent,tag,text){const e=document.createElement(tag);e.textContent=text;parent.append(e);return e;}
function stat(label,value,desc){const a=add(stats,'article','');add(a,'strong',label+' · '+value);add(a,'span',desc);}
async function refresh(){
try{
const res=await fetch('./football-expanded-data.json?result_view='+Date.now(),{cache:'no-store'});if(!res.ok)throw Error('Unavailable');const data=await res.json();
const p=data.performance||{},seen=new Set(),entries=[];
for(const r of Array.isArray(p.entries)?p.entries:[]){
 const key=[r.league,r.home,r.away,r.kickoff_utc].join('|');
 if(seen.has(key)||!r.record_sha256||r.verification!=='TWO_SOURCE_REGULATION_TIME_FINAL'||!Number.isInteger(r.score_home)||!Number.isInteger(r.score_away)||!Number.isFinite(r.multiclass_brier_score))continue;
 seen.add(key);entries.push(r);
}
stats.replaceChildren();rows.replaceChildren();
stat('Matched final scores',String(entries.length),'Research forecasts matched to two-source final results; original probability timestamps are not independently attested.');
stat('Officially validated predictions','0','These matched research records do not qualify for the official prediction challenge.');
stat('Awaiting final results',String(Array.isArray(p.pending)?p.pending.length:0),'Archived fixtures still waiting for a recorded final score.');
const baseline=entries.length?entries.reduce((sum,r)=>sum+r.multiclass_brier_score,0)/entries.length:null;
stat('Model probability error',baseline===null?'Unavailable':baseline.toFixed(3),'Exploratory multiclass Brier score. Lower is better; this is not a win rate.');
status.textContent='Research snapshot '+(Number.isFinite(Date.parse(data.generated_at_utc))?new Date(data.generated_at_utc).toLocaleString('en-GB',{timeZone:'Europe/London'}):'unknown')+' UK · Models UNVALIDATED · No verified betting odds or profit.';
const explanation=add(rows,'p','These are paired model/score research observations, not certified correct/incorrect betting picks. A valid hit rate requires an independently timestamped, unchanged pre-match prediction. Brier scores measure probability error; they are not percentages of winners.');
explanation.style.margin='12px 0';
for(const r of entries.slice().sort((a,b)=>Date.parse(b.kickoff_utc)-Date.parse(a.kickoff_utc)).slice(0,12)){
 const line=add(rows,'div','');line.style.cssText='border-top:1px solid #d7e2f0;padding:9px 0';
 add(line,'strong',r.home+' '+r.score_home+'–'+r.score_away+' '+r.away);
 add(line,'div','Model error '+r.multiclass_brier_score.toFixed(3)+' · '+(r.league||'Football')+' · source-backed result, model unvalidated');
 const audit=add(line,'details','');audit.style.cssText='margin-top:7px;font-size:.88rem;color:#334c69';
 add(audit,'summary','How was this result checked?').style.cursor='pointer';
 const hasSelection=typeof r.selected_forecast_generated_at_utc==='string'&&Number.isFinite(Date.parse(r.selected_forecast_generated_at_utc));
 add(audit,'p',hasSelection?'Selected model prediction recorded '+new Date(r.selected_forecast_generated_at_utc).toLocaleString('en-GB',{timeZone:'Europe/London'})+' UK.':'The published record does not yet include the selected prediction timestamp.');
 add(audit,'p',r.selection_reason==='LATEST_FROZEN_PREMATCH_REVISION_AT_FIRST_SETTLEMENT'?'Selection rule: most recent archived pre-match forecast at first settlement.':'Selection reason not available in this published snapshot.');
 add(audit,'p','Final score checked against '+(Array.isArray(r.source_receipts)?r.source_receipts.length:0)+' recorded source receipts. These checks do not independently certify the original prediction timestamp.');
 add(audit,'p','Archive fingerprint: '+(typeof r.record_sha256==='string'?r.record_sha256.slice(0,12)+'…':'Unavailable')+'. Experimental research only; not a verified betting selection.');
}
if(!entries.length)add(rows,'p','No suitable paired research records in the latest snapshot.');
}catch(e){stats.replaceChildren();rows.replaceChildren();status.textContent='Matched research comparison unavailable. No scores have been guessed.';}
}
refresh();document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
})();
