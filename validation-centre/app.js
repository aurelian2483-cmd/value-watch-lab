(()=>{'use strict';
const C=window.ValueWatchIndependentValidation,$=id=>document.getElementById(id),SOURCES=['research-dashboard-data.json','horse-research-status.json','other-sports-data.json','darts/feed.json','rugby-research-data.json','research-history.json','prediction-ledger.json','results-feed.json'];
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