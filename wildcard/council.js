(()=>{'use strict';
const C=window.WildcardCouncil,$=id=>document.getElementById(id);
const make=(tag,parent,txt,cls)=>{const e=document.createElement(tag);if(txt!==undefined)e.textContent=String(txt);if(cls)e.className=cls;parent.append(e);return e};
const fmtTime=v=>new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(v));
const name=s=>s==='football'?'Football':s==='racing'?'Horse racing':s==='tennis'?'Tennis':'NFL';
const emoji={walters:'◈',bloom:'▥',benter:'♞'};
let report=null,active=null,requestSequence=0;
async function source(s,now){
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),13000);
 try{
  const res=await fetch('../'+s.file,{cache:'no-store',signal:ctrl.signal});
  if(!res.ok)throw Error('HTTP '+res.status);
  return C.inspect(s.id,await res.json(),now);
 }catch(e){return {id:s.id,state:'UNAVAILABLE',data:null,error:String(e?.message||e).slice(0,100)}}
 finally{clearTimeout(timer)}
}
const state=(id,message)=>{const target=$(id);if(target)target.firstChild?target.firstChild.textContent=message:target.prepend(document.createTextNode(message))};
function updateState(id,message){const target=$(id);if(!target)return;const text=[...target.childNodes].find(n=>n.nodeType===Node.TEXT_NODE);if(text)text.textContent=message+' · ';else target.prepend(document.createTextNode(message+' · '))}
function showOutcome(card,now){
 const summary=C.screeningSummary(card),box=$('council-outcome'),reasons=$('outcome-reasons');reasons.replaceChildren();
 box.dataset.state=summary.status;
 $('outcome-title').textContent=summary.status==='SOURCE_UNAVAILABLE'?'Research incomplete — sources unavailable':'PASS — No qualifying candidates established';
 $('outcome-subtitle').textContent=summary.status==='SOURCE_UNAVAILABLE'?'No reliable screening could be completed because all published source feeds are unavailable or stale. No claim of zero qualifying events is made.': '0 of '+summary.examined+' preliminary source-gated research leads cleared every betting gate. This is not a count of every event in the '+summary.windowDays+'-day window. Research is incomplete, so no comprehensive market screening result is claimed.';
 for(const reason of summary.reasons){
   const line=make('div',reasons,undefined,'outcome-reason');
   make('span',line,reason.label);make('strong',line,String(reason.count));
 }
 for(const unavailable of summary.sourceUnavailable){
   const line=make('div',reasons,undefined,'outcome-reason missing');
   make('span',line,'Source '+unavailable.id+' unavailable ('+unavailable.state+')');make('strong',line,'INCOMPLETE');
 }
 make('p',reasons,'Rejection reasons overlap; the displayed counts must not be added together. Feed failures and unverified market coverage prohibit a complete screening claim.','outcome-caveat');
 $('outcome-meta').textContent='Last checked '+fmtTime(now)+' UK · '+summary.windowDays+'-day research horizon · '+(summary.status==='SOURCE_UNAVAILABLE'?'screening unavailable':summary.examined+' preliminary leads · 0 betting-qualified');
}
function showMargin(){
 const output=$('margin-result');if(!output)return;
 const raw=$('assumed-margin').value;
 const m=raw.trim()===''?NaN:Number(raw);
 const count=active?.legs.length||0;
 if(!count){output.textContent='No displayed legs. A combined-margin illustration is unavailable.';return}
 const estimate=C.assumedMargin(count,m);
 output.textContent=estimate?'Assuming '+estimate.assumedPerLegMarginPercent.toFixed(1)+'% proportional margin per independent leg across '+count+' leg(s): '+estimate.impliedProbabilityInflationPercent.toFixed(1)+'% implied-probability inflation and '+estimate.illustrativeFairPayoutReductionPercent.toFixed(1)+'% reduction versus combined fair decimal payout. Not actual market overround or ticket EV.':'Enter an assumed margin between 0% and 20%; no actual bookmaker margin is available.';
}
function showCard(card,choice){
 const scenario=C.scenarios(card).find(x=>x.id===choice)||C.scenarios(card)[0];
 active=scenario;
 const legs=$('ticket-legs');legs.replaceChildren();
 if(!scenario.legs.length)make('p',legs,'No current future events have passed the preliminary research-screening rules. The Council will not invent selections.','muted');
 for(let i=0;i<scenario.legs.length;i++){
  const x=scenario.legs[i],row=make('div',legs,undefined,'ticket-leg');
  make('span',row,String(i+1).padStart(2,'0'),'ticket-index');
  const content=make('div',row);
  make('strong',content,x.name);
  make('div',content,'Research selection: '+x.outcome,'ticket-outcome');
  make('small',content,fmtTime(x.startUTC)+' UK · '+x.model);
  const evidence=C.explainCandidate(x);
  if(evidence){
    make('div',content,'Raw model estimate: '+(100*evidence.modelProbability).toFixed(1)+'% · NOT independently calibrated','ticket-probability');
    const details=make('details',content,undefined,'ticket-evidence');
    make('summary',details,'Why this event? Evidence and blockers');
    const factList=make('ul',details);
    for(const fact of evidence.facts)make('li',factList,'✓ '+fact,'evidence-fact');
    for(const limitation of evidence.limitations)make('li',factList,'! '+limitation,'evidence-limit');
  }
  make('span',row,name(x.meta.sport),'ticket-sport');
 }
 $('lead-count').textContent=String(card.availableCount);
 $('window-label').textContent=card.windowDays+'-day research horizon · '+scenario.legs.length+' displayed candidate(s)';
 const comparison=C.compareScenario(card,scenario.legs);
 $('ticket-selection-note').textContent='Why these '+comparison.displayed+' of '+comparison.screened+' leads? '+comparison.reason+' '+comparison.unshown+' lead(s) not shown in this scenario. '+comparison.overlapWarning;
 const alternatives=$('ticket-alternatives');alternatives.replaceChildren();
 const others=card.all.filter(x=>!scenario.legs.some(y=>y.id===x.id));
 if(others.length===0)make('p',alternatives,'No additional source-gated future events are available. The Council will not fabricate alternatives.','muted');
 $('alternative-summary').textContent='Review '+others.length+' additional screened research leads (not rejected bets)';
 for(const x of others.slice(0,8)){
   const row=make('div',alternatives,undefined,'ticket-alternative');
   make('strong',row,x.name+' · '+x.outcome);
   make('span',row,name(x.meta.sport)+' · '+fmtTime(x.startUTC)+' UK · passes preliminary source gates only');
   make('small',row,'Not displayed: '+(scenario.legs.some(y=>y.meta.sport===x.meta.sport)?
      'another earlier event from this sport is already in the card':'the Council displays fewer legs than the research pool')+'. No verified price or EV.');
 }
 if(others.length>8)make('p',alternatives,(others.length-8)+' additional screened records are not shown in this compact view.','muted');
 $('ticket-racing-note').textContent=card.horse.eligible?
  '♞ Racing has '+card.horse.eligible+' preliminary candidate(s), but the Benter model and price checks are not certified.':
  '♞ Benter racing decision: WITHHOLD. '+card.horse.currentForecasts+' current forecast(s); '+card.horse.historical+' archived forecast(s) are not live runners.';
 showCouncil(card,scenario.legs);
 showRadar(card);
 renderPriceInputs(scenario);
 showMargin();
}
function showRadar(card){
 const target=$('ticket-research-radar');target.replaceChildren();
 const horseSource=card.sources.horse==='OBSERVED',footballSource=card.sources.football==='OBSERVED';
 const racing=make('div',target,undefined,'radar-sport');
 make('strong',racing,'♞ Horse-racing research radar · NOT COUNCIL PICKS');
 if(!horseSource)make('p',racing,'Horse forecast feed missing or stale. Current runner forecasts cannot be confirmed.','muted');
 else if(!card.horse.researchLeads.length)make('p',racing,'No current race-level runner probability records passed the visibility checks.','muted');
 else{
  make('p',racing,card.horse.researchLeads.length+' future race-level experimental model observations (not approved for betting).','muted');
  for(const x of card.horse.researchLeads.slice(0,4)){
   const line=make('p',racing);
   make('strong',line,x.racecourse+' · '+fmtTime(x.startUTC)+' UK · ');
   make('span',line,x.topRunner+' · raw uncalibrated '+(x.rawProbability*100).toFixed(1)+'% · BLOCKED');
  }
 }
 const football=make('div',target,undefined,'radar-sport');
 make('strong',football,'⚽ Football source audit · NOT COUNCIL PICKS');
 if(!footballSource)make('p',football,'Football research feed missing or stale.','muted');
 else if(!card.footballReview.blockedCurrentSeason)make('p',football,'No model forecasts excluded for missing current-season evidence in the active window.','muted');
 else{
  make('p',football,card.footballReview.blockedCurrentSeason+' fixture forecast(s) excluded because verified current-season model evidence is missing.','muted');
  for(const x of card.footballReview.blockedExamples.slice(0,3)){
   const line=make('p',football);
   make('strong',line,x.name+' · '+fmtTime(x.startUTC)+' UK · ');
   make('span',line,'BLOCKED: no verified current-season model');
  }
 }
}
function showCouncil(card,selected){
 const box=$('three-lenses');box.replaceChildren();
 for(const item of C.council(card,selected)){
  const e=make('article',box,undefined,'lens');
  const top=make('div',e,undefined,'lens-top');make('span',top,emoji[item.id],'lens-icon');
  make('span',top,'AUTOMATED LENS','lens-status');
  make('div',e,item.role,'lens-role');
  const h=make('h3',e,item.name+' method');
  const state=make('span',e,item.status,'lens-status');
  const compact=$('ticket-'+item.id);if(compact)compact.textContent=item.status;
  make('p',e,item.explanation);
  make('p',e,'Evidence sample: '+item.sample+' '+item.sampleUnit+'. Outcome: '+item.status+'.','lens-evidence-sample');
  make('p',e,'Automated methodology only, inspired by public approaches associated with Billy Walters, Tony Bloom and Bill Benter. No personal endorsement or independent expert approval.','lens-caveat');
 }
}
function showRacing(card){
 const h=card.horse;
 const horseFresh=card.sources.horse==='OBSERVED';
 $('races-observed').textContent=horseFresh?h.observed:'—';
 $('horse-forecasts').textContent=horseFresh?h.currentForecasts:'—';
 $('horse-archive').textContent=horseFresh?h.historical:'—';
 $('horse-eligible').textContent=horseFresh?h.eligible:'—';
 $('horse-state').textContent=h.eligible?'PRELIMINARY ONLY':'NO CURRENT RACING SELECTION';
 const scores=h.modelScore;
 $('horse-scored').textContent=scores?String(scores.scored):'Unavailable';
 $('horse-brier').textContent=scores?scores.modelBrier.toFixed(4):'Unavailable';
 $('horse-baseline').textContent=scores?scores.baselineBrier.toFixed(4):'Unavailable';
 $('horse-delta').textContent=scores?(scores.delta>=0?'+':'')+scores.delta.toFixed(4):'Unavailable';
 $('horse-ci').textContent=scores?'['+scores.interval.map(x=>x.toFixed(4)).join(', ')+']':'Unavailable';
 $('horse-proof').textContent=scores?
 'Comparison uses '+scores.scored+' provisional historical scores with '+scores.independent+' independently verified result(s). '+(scores.interval[0]<=0&&scores.interval[1]>=0?'The exploratory interval includes zero, so improvement over the baseline is not established.':'The exploratory interval does not include zero, but this is not independent validation or evidence of betting profitability.') :
 'No current, source-gated comparable model evaluation is available. Historical scoring does not establish a live betting edge.';
 $('racing-explanation').textContent=!horseFresh?'The current horse source is missing, stale or invalid. We cannot verify any active race candidate from it.':h.eligible?
   'Model-backed racing candidates remain uncalibrated. Public price and runner verification still needed.':
   'The file contains '+h.observed+' observed racecards, '+h.skipped+' skipped current forecasts and '+h.historical+' historical forecasts; none establish a valid future horse pick. The Council is withholding racing selections rather than recycling old results.';
}
function showCoverage(card){
 const parent=$('sport-coverage');parent.replaceChildren();
 const max=Math.max(1,...Object.values(card.counts));
 for(const sport of ['football','racing','tennis','nfl']){
  const row=make('div',parent,undefined,'coverage-row');
  make('span',row,name(sport));
  const track=make('div',row,undefined,'coverage-meter'),fill=make('div',track);
  fill.style.width=(card.counts[sport]/max*100).toFixed(1)+'%';
  make('strong',row,String(card.counts[sport]));
 }
 for(const item of card.coverageOnly){
  const row=make('div',parent,undefined,'coverage-row');
  const link=make('a',row,item.sport==='darts'?'Darts':'Rugby Union & League');
  link.href='../'+item.sport+'/#official-snapshot';
  make('span',row,(item.fixtures===null?'Feed unavailable':item.fixtures+' timed fixture(s) in window')+' · '+item.detail);
  make('strong',row,'PASS');
 }
}
function showAudit(card){
 const out=$('audit-detail');out.replaceChildren();
 make('p',out,'Publication: BLOCKED · Model validation: UNVALIDATED · No independent bookmaker pricing, calibration, correlation or settlement verification.');
 for(const src of C.SOURCES){
  make('p',out,src.id.toUpperCase()+': '+card.sources[src.id]+' · max source age '+src.maxHours+' hours');
 }
 make('p',out,'A leading model outcome is displayed only as a research hypothesis. It is not evidence of positive expected value.');
 make('p',out,'Football current-season models rejected: '+card.exclusions.footballCurrentSeason+' · schedule checks failed: '+card.exclusions.footballSchedule+'. Historical 2025/26 forecasts cannot be treated as current 2026/27 form.');
 make('p',out,'Horse status: '+card.horse.status+' · rejected pre-race candidate records: '+card.horse.rejected+' · additional runners excluded from the same race: '+card.exclusions.racingDuplicateRace+' · archived predictions never promoted into future selections.');
}
function renderPriceInputs(scenario){
 const box=$('manual-prices');box.replaceChildren();
 for(let i=0;i<scenario.legs.length;i++){
  const x=scenario.legs[i],lab=make('label',box,'Leg '+(i+1)+' · '+x.outcome);
  const input=make('input',lab);input.type='text';input.inputMode='decimal';input.maxLength=9;
  input.placeholder='Unverified decimal price';input.dataset.price='true';input.setAttribute('aria-label','Hypothetical decimal price for '+x.outcome);
  input.addEventListener('input',calculate);
 }
 calculate();
}
function calculate(){
 const values=[...document.querySelectorAll('[data-price="true"]')].map(e=>e.value.trim());
 const stake=$('stake').value.trim();
 const ok=x=>/^\d{1,4}(?:\.\d{1,3})?$/.test(x);
 const count=active?.legs?.length||0;
 if(!count){$('sim-result').textContent='No featured legs. Hypothetical return unavailable.';return}
 if(values.some(x=>!ok(x))||!ok(stake)){
  $('sim-result').textContent='Payout unavailable until a valid hypothetical price is entered for every leg and a stake is entered.';return
 }
 const result=C.hypotheticalReturn(values.map(Number),Number(stake));
 $('sim-result').textContent=result?
  'IF ALL LEGS WIN: £'+result.gross.toFixed(2)+' gross (£'+result.net.toFixed(2)+' net) at ×'+result.multiplier.toFixed(3)+'. This is arithmetic only, not a verified bookmaker offer, probability or positive EV. If any leg loses, £'+Number(stake).toFixed(2)+' is lost.':
  'Values outside supported simulation limits; no return displayed.';
}
function showModelChallenge(horseData,footballData,now){
 const Cx=window.ValueWatchModelChallenge;
 const summary=$('model-challenge-summary'),fields=$('horse-field-diagnostics');
 summary.replaceChildren();fields.replaceChildren();
 if(!Cx){make('p',summary,'Independent model comparison script unavailable. No conclusions reported.');return}
 const result=Cx.review(horseData,footballData,now);
 for(const [key,label] of [['benter','Benter · Horse racing'],['walters','Walters · Football'],['bloom','Bloom · Model control'],['robson','Robson · Goals markets']]){
  const item=result[key],tile=make('article',summary,undefined,'challenge-tile');
  make('h3',tile,label);
  make('strong',tile,item.status,'challenge-state');
  make('p',tile,item.note);
 }
 const horse=result.horse;
 make('h3',fields,'Full-field racing model diagnostics · '+horse.status);
 if(!horse.races.length){
  make('p',fields,'No valid, fresh full-field model observations. Missing sources or invalid probabilities are never converted into selections.');
 }else{
  make('p',fields,horse.races.length+' future races have mathematical diagnostics. Order is event time, not probability of profit.');
  for(const x of horse.races.slice(0,7)){
   const item=make('div',fields,undefined,'challenge-race');
   make('strong',item,x.course+' · '+x.raceName+' · '+fmtTime(x.scheduled)+' UK');
   make('p',item,x.fieldSize+' runners · highest raw model estimate: '+x.topRunner+' '+(x.topProbability*100).toFixed(1)+'% · equal-chance benchmark '+(x.uniformBaseline*100).toFixed(1)+'%');
   make('small',item,'Top-vs-second margin '+(x.topGap*100).toFixed(1)+' percentage points · normalised field entropy '+x.normalizedEntropy.toFixed(3)+' · market and EV unavailable');
  }
 }
 const f=result.football;
 make('p',fields,'Football source challenge: '+f.eligible+' preliminary current-season model records; '+f.excluded+' excluded. No independently verified bookmaker price or betting edge.');
}
async function refresh(){
 const seq=++requestSequence;
 const now=Date.now(),days=Number($('horizon').value),button=$('refresh');
 button.disabled=true;
 $('time-stamp').textContent='Loading research sources · '+fmtTime(now)+' UK';
 $('council-outcome').dataset.state='loading';
 $('outcome-title').textContent='Checking source coverage and betting gates…';
 $('outcome-subtitle').textContent='Source loading has a timeout. No qualifying outcome will be invented.';
 $('outcome-reasons').replaceChildren();
 $('outcome-meta').textContent='Check started '+fmtTime(now)+' UK · '+days+'-day research horizon';
 $('window-label').textContent=days+'-day research horizon · loading';
 for(const id of ['lenses-health','racing-health','challenge-health','coverage-health'])updateState(id,'Loading source snapshots');
 try{
  const results=await Promise.all(C.SOURCES.map(x=>source(x,now)));
  if(seq!==requestSequence)return;
  report=C.collect(results,now,days);
  showOutcome(report,now);
  $('time-stamp').textContent='Source check complete · '+fmtTime(now)+' UK';
  showCard(report,$('scenario').value);showRacing(report);showCoverage(report);showAudit(report);
  showModelChallenge(results.find(x=>x.id==='horse'&&x.state==='OBSERVED')?.data,results.find(x=>x.id==='football'&&x.state==='OBSERVED')?.data,now);
  const failed=results.filter(x=>x.state!=='OBSERVED');
  const msg=failed.length?'Partial data · '+failed.length+' source(s) missing or stale':'Loaded source snapshots · no independently verified bookmaker prices';
  updateState('lenses-health',msg+' · automated method review complete · Last checked '+fmtTime(now)+' UK');
  updateState('racing-health',(report.sources.horse==='OBSERVED'?'Loaded · racing evidence is research-only':'Unavailable · verified current racing evidence missing')+' · Last checked '+fmtTime(now)+' UK');
  updateState('challenge-health','Loaded · model challenge diagnostics are experimental · Last checked '+fmtTime(now)+' UK');
  updateState('coverage-health',msg+' · Last checked '+fmtTime(now)+' UK');
 }catch(e){
  if(seq!==requestSequence)return;
  report=null;active=null;
  $('council-outcome').dataset.state='failed';
  $('outcome-title').textContent='Research check failed — no result claimed';
  $('outcome-subtitle').textContent='The screening did not complete: '+String(e?.message||e).slice(0,130)+'. Use Retry check to reload.';
  $('outcome-meta').textContent='Failed check at '+fmtTime(now)+' UK · '+days+'-day requested window';
  $('time-stamp').textContent='Check failed · '+fmtTime(now)+' UK';
  $('ticket-legs').replaceChildren();
  make('p',$('ticket-legs'),'Research temporarily unavailable. No candidates or payouts were produced.','muted');
  $('lead-count').textContent='—';$('ticket-selection-note').textContent='Failed source processing; all candidate and model verdicts withheld.';
  for(const id of ['lenses-health','racing-health','challenge-health','coverage-health'])updateState(id,'Failed · last attempted '+fmtTime(now)+' UK · retry available');
  $('three-lenses').replaceChildren();make('p',$('three-lenses'),'Not run · research check failed.','muted');
  $('model-challenge-summary').replaceChildren();make('p',$('model-challenge-summary'),'Not run · source processing failed.','muted');
  $('horse-field-diagnostics').replaceChildren();make('p',$('horse-field-diagnostics'),'Not run · source processing failed.','muted');
  $('sport-coverage').replaceChildren();make('p',$('sport-coverage'),'Unavailable · source processing failed.','muted');
  $('manual-prices').replaceChildren();
  $('sim-result').textContent='Payout unavailable: research check failed.';
  showMargin();
 }finally{if(seq===requestSequence)button.disabled=false}
}
$('refresh').addEventListener('click',refresh);
for(const b of document.querySelectorAll('[data-retry]'))b.addEventListener('click',refresh);
$('horizon').addEventListener('change',refresh);
$('scenario').addEventListener('change',()=>{if(report)showCard(report,$('scenario').value)});
$('stake').addEventListener('input',calculate);
$('assumed-margin').addEventListener('input',showMargin);
refresh();
})();