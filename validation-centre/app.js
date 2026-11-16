(()=>{'use strict';
const C=window.ValueWatchIndependentValidation,$=id=>document.getElementById(id),SOURCES=['research-dashboard-data.json','horse-research-status.json','other-sports-data.json','darts/feed.json','rugby-research-data.json','research-history.json','prediction-ledger.json','results-feed.json','research/result-review-status.json'];
const write=(id,s)=>$(id).textContent=String(s);
const add=(p,tag,value,cls)=>{const e=document.createElement(tag);if(value!==undefined)e.textContent=String(value);if(cls)e.className=cls;p.append(e);return e};
const when=ts=>new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',dateStyle:'medium',timeStyle:'short'}).format(new Date(ts))+' UK';
let generation=0;
async function get(path){
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
 try{const r=await fetch('../'+path,{cache:'no-store',signal:controller.signal});if(!r.ok)throw Error('HTTP '+r.status);return await r.json()}
 finally{clearTimeout(timeout)}
}
function draw(evaluation,health,legacy){
 const body=$('sports-body');body.replaceChildren();
 const format=n=>typeof n==='number'&&Number.isFinite(n)?n.toFixed(4):'—';
 for(const h of health){
   const s=evaluation.bySport[h.id],row=add(body,'tr');
   add(row,'td',h.name);add(row,'td',h.sourceStatus);add(row,'td',s.scoreCount);
   add(row,'td',format(s.brier));add(row,'td',format(s.logLoss));
   add(row,'td','UNVALIDATED · '+s.status,'blocked');
 }
 write('paired',evaluation.audit.eligiblePairs);
 write('predictions',evaluation.audit.predictionRecords);
 write('outcomes',evaluation.audit.outcomeRecords);
 write('sports-state','7 divisions · results only when contract-qualified');
 const box=$('audit');box.replaceChildren();const grid=add(box,'div',undefined,'audit-grid');
 const metrics=[['Forecasts without matching outcomes','unmatchedPredictions'],['Invalid forecasts','invalidPredictions'],
 ['Unverified outcomes','invalidOutcomes'],['Duplicate forecast IDs','duplicatePredictions'],
 ['Duplicate outcomes','duplicateOutcomes'],['Chronology failures','chronologyFailures'],['Identity conflicts','identityFailures']];
 for(const [label,key] of metrics){const cell=add(grid,'div');add(cell,'span',label);add(cell,'strong',evaluation.audit[key])}
 if(evaluation.errors.length)for(const x of evaluation.errors.slice(0,8))add(box,'p',x,'issue');
 if(evaluation.state==='INVALID_ARCHIVE')add(box,'p','Archive contract invalid: do not use any scores.','issue');
 write('legacy',legacy.count+' legacy history entry/entries detected · '+legacy.status+'. '+(legacy.note||'No historical performance evidence imported.'));
}
function showReview(feed,forecastCount){
 const box=$('result-review-summary');box.replaceChildren();
 const status=$('result-review-state'),meta=$('result-review-meta');
 if(!feed||feed.schema_version!==1||feed.research_only!==true||feed.publication_gate!=='BLOCKED'||feed.independently_verified_results_added!==0||!Array.isArray(feed.items)||!feed.status_counts||typeof feed.status_counts!=='object'){
  status.textContent='Review report unavailable or unsafe; no result-verification claims can be made.';
  meta.textContent='Predictions remain experimental. Missing or stale review reports do not alter independent scoring.';
  return;
 }
 const valid=['AWAITING_EVENT','AWAITING_PRIMARY_FINAL','AWAITING_INDEPENDENT_SOURCE','SECONDARY_CONFLICT','SECONDARY_INVALID','READY_FOR_HUMAN_REVIEW','IDENTITY_CONFLICT','ARCHIVE_INVALID'];
 const counts=feed.status_counts;
 const n=Object.values(counts).reduce((a,b)=>a+(Number.isInteger(b)&&b>=0?b:0),0);
 if(n!==feed.items.length||feed.items.length!==forecastCount||Object.keys(counts).some(k=>!valid.includes(k))||feed.items.some(x=>x.auto_certified!==false||x.betting_eligible!==false)){
  status.textContent='Review report inconsistent with current frozen forecast ledger; withheld.';
  meta.textContent='Retry when the next complete capture/report snapshot is published.';
  return;
 }
 status.textContent=feed.total_predictions_checked+' frozen forecast(s) tracked · 0 automatically certified outcomes';
 const labels={AWAITING_EVENT:'Events not yet complete',AWAITING_PRIMARY_FINAL:'Awaiting first provider final',AWAITING_INDEPENDENT_SOURCE:'Awaiting independent source',SECONDARY_CONFLICT:'Sources disagree',SECONDARY_INVALID:'Secondary evidence invalid',READY_FOR_HUMAN_REVIEW:'Requires human verification',IDENTITY_CONFLICT:'Identity or duplicate conflict',ARCHIVE_INVALID:'Archive contract failure'};
 for(const key of valid){if(!counts[key])continue;const tile=add(box,'div');add(tile,'span',labels[key]);add(tile,'strong',counts[key]);}
 meta.textContent='Last review snapshot: '+(feed.generated_at_utc&&Number.isFinite(Date.parse(feed.generated_at_utc))?when(feed.generated_at_utc):'undated')+' · No approved outcomes or betting performance claimed.';
}
async function refresh(){
 const token=++generation,button=$('retry'),started=Date.now();
 button.disabled=true;$('result-heading').textContent='Checking source archives…';
 write('result-reason','Verifying source metadata and prospective forecast/outcome contracts.');
 write('last-checked','Check started: '+when(started));$('sports-body').replaceChildren();
 const responses=await Promise.allSettled(SOURCES.map(s=>get(s)));
 if(token!==generation)return;
 const feeds={};const failed=[];
 responses.forEach((r,i)=>{if(r.status==='fulfilled')feeds[SOURCES[i]]=r.value;else failed.push(SOURCES[i])});
 const score=C.evaluate(feeds['prediction-ledger.json'],feeds['results-feed.json']);
 const health=C.sourceHealth(feeds,Date.now()),legacy=C.descriptiveHistory(feeds['research-history.json']);
 draw(score,health,legacy);
 showReview(feeds['research/result-review-status.json'],score.audit.predictionRecords);
 const unavailable=health.filter(x=>x.sourceStatus!=='CURRENT');
 const incomplete=failed.length>0||unavailable.length>0||score.state==='INVALID_ARCHIVE';
 $('result-heading').textContent=incomplete?'EVIDENCE INCOMPLETE — NO MODEL APPROVAL':'NO MODEL APPROVAL — INDEPENDENT EVIDENCE INSUFFICIENT';
 $('result-heading').parentElement.parentElement.parentElement.dataset.state=incomplete?'error':'blocked';
 write('result-reason',score.audit.eligiblePairs+' descriptive contract-matched pair(s) across seven sport divisions. '+(failed.length?failed.length+' file(s) unavailable. ':'')+(unavailable.length?unavailable.length+' research feed(s) stale/invalid. ':'')+'No calibrated model, verified bookmaker edge, or certified ROI has been established. Scores require external validation of archive receipts.');
 write('last-checked','Last checked: '+when(Date.now()));
 button.disabled=false;
}
$('retry').addEventListener('click',()=>refresh().catch(e=>{write('result-heading','AUDIT ERROR — NO RESULT CLAIMED');write('result-reason',String(e?.message||e));write('last-checked','Failed at '+when(Date.now()));$('retry').disabled=false}));
refresh().catch(e=>{write('result-heading','AUDIT ERROR — NO RESULT CLAIMED');write('result-reason',String(e?.message||e));$('retry').disabled=false});
})();