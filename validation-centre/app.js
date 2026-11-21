(()=>{'use strict';
const C=window.ValueWatchIndependentValidation,$=id=>document.getElementById(id),SOURCES=['research-dashboard-data.json','horse-research-status.json','other-sports-data.json','darts/feed.json','rugby-research-data.json','research-history.json','prediction-ledger.json','results-feed.json','research/result-review-status.json','research/performance-report-latest.json','research/provider-result-observations.json','research/secondary-result-evidence.json'];
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
function showReview(feed,ledger,primary,secondary){
 const forecastCount=ledger?.records?.length;
 const box=$('result-review-summary');box.replaceChildren();
 const status=$('result-review-state'),meta=$('result-review-meta'),priority=$('result-review-matches');
 priority.replaceChildren();
 if(!feed||feed.schema_version!==1||feed.research_only!==true||feed.publication_gate!=='BLOCKED'||feed.independently_verified_results_added!==0||!Array.isArray(feed.items)||!feed.status_counts||typeof feed.status_counts!=='object'){
  status.textContent='Review report unavailable or unsafe; no result-verification claims can be made.';
  meta.textContent='Predictions remain experimental. Missing or stale review reports do not alter independent scoring.';
  return;
 }
 const valid=['AWAITING_EVENT','AWAITING_PRIMARY_FINAL','AWAITING_INDEPENDENT_SOURCE','SECONDARY_CONFLICT','SECONDARY_INVALID','READY_FOR_HUMAN_REVIEW','IDENTITY_CONFLICT','ARCHIVE_INVALID'];
 const counts=feed.status_counts;
 const actual=Object.create(null), seen=new Set();
 const rowsValid=feed.items.length===forecastCount && feed.total_predictions_checked===forecastCount && feed.items.every(row=>{
  if(!row || row.auto_certified!==false || row.betting_eligible!==false ||
     typeof row.prediction_id!=='string' || seen.has(row.prediction_id) || !valid.includes(row.review_state))return false;
  seen.add(row.prediction_id);
  actual[row.review_state]=(actual[row.review_state]||0)+1;
  return true;
 });
 if(!rowsValid||Object.entries(counts).some(([k,n])=>!valid.includes(k)||!Number.isInteger(n)||n<0)||valid.some(k=>(counts[k]??0)!==(actual[k]??0))){
  status.textContent='Review report inconsistent with current frozen forecast ledger; withheld.';
  meta.textContent='Retry when the next complete capture/report snapshot is published.';
  return;
 }
 status.textContent=feed.total_predictions_checked+' frozen forecast(s) tracked · 0 automatically certified outcomes';
 const labels={AWAITING_EVENT:'Events not yet complete',AWAITING_PRIMARY_FINAL:'Awaiting first provider final',AWAITING_INDEPENDENT_SOURCE:'Awaiting independent source',SECONDARY_CONFLICT:'Sources disagree',SECONDARY_INVALID:'Secondary evidence invalid',READY_FOR_HUMAN_REVIEW:'Reported for human review',IDENTITY_CONFLICT:'Identity or duplicate conflict',ARCHIVE_INVALID:'Archive contract failure'};
 for(const key of valid){if(!counts[key])continue;const tile=add(box,'div');add(tile,'span',labels[key]);add(tile,'strong',counts[key]);}
 const receipts=C.reviewReceipts(feed,ledger,primary,secondary);
 if(receipts.reason)add(priority,'p',receipts.reason);
 if(receipts.withheld)add(priority,'p',receipts.withheld+' reported candidate(s) withheld from the receipt view.');
 if(receipts.stale)add(priority,'p','The queue or a receipt archive is older than 72 hours. Historical receipt view only.');
 for(const [sport,name] of [['nfl','NFL'],['tennis','tennis']]){
  const matches=receipts.matches.filter(match=>match.sport===sport);
  if(!matches.length)continue;
  const details=add(priority,'details',undefined,'review-match-details');
  add(details,'summary','Inspect '+name+' source evidence ('+matches.length+')');
  const list=add(details,'ul');
  for(const match of matches){
   const item=add(list,'li');
   add(item,'strong',match.label);
   add(item,'p',match.description);
   add(item,'p',match.eventId+' · frozen fixture '+when(match.kickoff)+' · awaiting human verification');
   for(const [label,receipt] of [['ESPN result source',match.primary],[match.receiptKind,match.secondary]]){
    const line=add(item,'p');
    add(line,'a',label).href=receipt.url;
    add(line,'span',' · observed '+when(receipt.observed)+' · SHA-256 ');
    add(line,'code',receipt.hash);
   }
  }
 }
 meta.textContent='Last review snapshot: '+(feed.generated_at_utc&&Number.isFinite(Date.parse(feed.generated_at_utc))?when(feed.generated_at_utc):'undated')+' · No approved outcomes or betting performance claimed.';
}
function showPerformance(ledger,outcomes,review,weekly){
 const core=window.ValueWatchPerformanceIntelligence;
 const body=$('performance-rows'),bars=$('calibration-bars');body.replaceChildren();bars.replaceChildren();
 const f=x=>typeof x==='number'&&Number.isFinite(x)?x.toFixed(3):'—';
 if(!core){write('performance-state','Performance module unavailable; no independent claims.');return;}
 const summary=core.build(ledger,outcomes,review,Date.now());
 write('performance-state',summary.status==='INVALID_ARCHIVE'?'INVALID SCORED ARCHIVE — METRICS BLOCKED':summary.totalScored+' contract-matched prospective result(s) · no model certified');
 for(const sport of core.SPORTS){
   const m=summary.metrics[sport.id],row=add(body,'tr');
   add(row,'td',sport.name);add(row,'td',m.n);
   const ci=m.hitInterval;
   add(row,'td',m.accuracy===null?'—':(100*m.accuracy).toFixed(1)+'% ('+(100*ci.lower).toFixed(0)+'–'+(100*ci.upper).toFixed(0)+'%)');
   add(row,'td',f(m.brier));add(row,'td',f(m.uniformBrier));add(row,'td',f(m.logLoss));add(row,'td',m.status,'blocked');
 }
 const comparisons=core.compareModels(ledger,outcomes),comparisonBox=$('model-comparison');comparisonBox.replaceChildren();
 if(!comparisons.length)add(comparisonBox,'p','No same-event pairs of distinct frozen model versions are available. No winner claimed.');
 else {
  const t=add(comparisonBox,'table'),h=add(add(t,'thead'),'tr');['Sport','Model A','Model B','Paired events','Mean Brier A','Mean Brier B','Status'].forEach(x=>add(h,'th',x));const tbody=add(t,'tbody');
  for(const m of comparisons.slice(0,30)){const row=add(tbody,'tr');for(const x of [m.sport,m.modelA,m.modelB,m.pairedEvents,f(m.meanBrierA),f(m.meanBrierB),m.status])add(row,'td',x);}
 }
 const active=core.SPORTS.filter(s=>summary.metrics[s.id].n>0);
 if(active.length){
   const s=active.reduce((best,next)=>summary.metrics[next.id].n>summary.metrics[best.id].n?next:best,active[0]);
   const m=summary.metrics[s.id];write('calibration-note',s.name+' · '+m.n+' independently contract-matched forecast(s). Reliability bins are descriptive and may be unstable.');
   bars.setAttribute('aria-label',s.name+' reliability: observed top-pick accuracy by forecast-confidence bin');
   for(const bin of m.calibration.bins){
    if(!bin.count)continue;
    const cell=add(bars,'div',undefined,'calibration-row');
    add(cell,'span',Math.round(bin.lower*100)+'–'+Math.round(bin.upper*100)+'% confidence');
    const track=add(cell,'div',undefined,'calibration-track');
    const fill=add(track,'div',undefined,'calibration-fill');fill.style.width=Math.max(0,Math.min(100,100*bin.observed))+'%';
    add(cell,'strong',(bin.observed*100).toFixed(1)+'% · n='+bin.count);
   }
 }else write('calibration-note','Not enough independently paired prospective outcomes; no calibration curve can be calculated.');
 const weeklyValid=weekly?.schema_version===1&&weekly?.research_only===true&&weekly?.publication_gate==='BLOCKED'&&weekly?.verified_betting_value===false&&weekly?.verified_roi===false;
 write('performance-report-meta',weeklyValid?'Latest rolling weekly report: '+weekly.week_start_utc+' · '+weekly.contract_matched_pairs+' descriptive pair(s) · '+weekly.verdict:'Weekly research report unavailable or awaiting its first scheduled generation.');
 const cover=$('coverage-report');cover.replaceChildren();
 if(weeklyValid&&Array.isArray(weekly.source_health)&&weekly.source_health.length===7){
   const table=add(cover,'table'),head=add(add(table,'thead'),'tr');
   ['Sport','Observed source','Source age','Forecast capture','Secondary outcome'].forEach(t=>add(head,'th',t));
   const b=add(table,'tbody');
   for(const item of weekly.source_health){const tr=add(b,'tr');for(const x of [item.sport,item.source,item.sourceStatus,item.captureSupport,item.secondaryResultSupport])add(tr,'td',x??'Unavailable');}
 }else add(cover,'p','Coverage report unavailable; no claim of seven fully operational model pipelines.');
}
function showProviderReadiness(registry){
 const target=$('provider-readiness');target.replaceChildren();
 const fail=()=>write('provider-readiness-status','Provider registry unavailable or invalid.');
 const sportIds=new Set(['football','racing','nfl','tennis','rugby','darts','basketball','cricket','golf']);
 if(!C.guarded(registry)||registry.schema_version!==1||!/^\d{4}-\d{2}-\d{2}$/.test(registry.reviewed_on??'')||
    !Array.isArray(registry.sports)||registry.sports.length!==sportIds.size||!Array.isArray(registry.providers))return fail();
 const providers=new Map(registry.providers.map(row=>[row?.id,row?.name]));
 if(providers.size!==registry.providers.length||[...providers.values()].some(name=>typeof name!=='string'||!name.trim()))return fail();
 const gates={access_authorized:'NEEDS ACCESS APPROVAL',rights_approved:'NEEDS RIGHTS REVIEW',
              independent_source_reviewed:'NEEDS INDEPENDENT SOURCE'};
 const rows=[];
 for(const row of registry.sports){
  if(!sportIds.delete(row?.id)||typeof row.name!=='string'||typeof row.next_action!=='string'||
     !Array.isArray(row.providers)||!row.providers.length||row.providers.some(id=>!providers.has(id))||
     Object.keys(gates).some(key=>typeof row[key]!=='boolean'))return fail();
  const states=Object.keys(gates).filter(key=>!row[key]).map(key=>gates[key]);
  rows.push([row.name,row.providers.map(id=>providers.get(id)).join(', '),
    states.join(' · ')||'CHECK CREDENTIALS OFFLINE',row.next_action]);
 }
 const table=add(target,'table'),head=add(add(table,'thead'),'tr');
 ['Sport','Candidate providers','External gates','Next action'].forEach(label=>add(head,'th',label).scope='col');
 const body=add(table,'tbody');
 for(const [sport,...cells] of rows){
  const row=add(body,'tr');
  add(row,'th',sport).scope='row';
  cells.forEach(value=>add(row,'td',value));
 }
 write('provider-readiness-status','Reviewed '+registry.reviewed_on+' · UNVALIDATED / BLOCKED');
}
async function refresh(){
 const token=++generation,button=$('retry'),started=Date.now();
 button.disabled=true;$('result-heading').textContent='Checking source archives…';
 write('result-reason','Verifying source metadata and prospective forecast/outcome contracts.');
 write('last-checked','Check started: '+when(started));$('sports-body').replaceChildren();
 const [responses,providerRegistry]=await Promise.all([
  Promise.allSettled(SOURCES.map(s=>get(s))),get('research/provider-readiness.json').catch(()=>null)
 ]);
 if(token!==generation)return;
 const feeds={};const failed=[];
 responses.forEach((r,i)=>{if(r.status==='fulfilled')feeds[SOURCES[i]]=r.value;else failed.push(SOURCES[i])});
 const score=C.evaluate(feeds['prediction-ledger.json'],feeds['results-feed.json']);
 const health=C.sourceHealth(feeds,Date.now()),legacy=C.descriptiveHistory(feeds['research-history.json']);
 draw(score,health,legacy);
 showProviderReadiness(providerRegistry);
 showReview(feeds['research/result-review-status.json'],feeds['prediction-ledger.json'],feeds['research/provider-result-observations.json'],feeds['research/secondary-result-evidence.json']);
 showPerformance(feeds['prediction-ledger.json'],feeds['results-feed.json'],feeds['research/result-review-status.json'],feeds['research/performance-report-latest.json']);
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