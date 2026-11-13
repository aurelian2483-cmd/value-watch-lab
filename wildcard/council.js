(()=>{'use strict';
const C=window.WildcardCouncil,$=id=>document.getElementById(id);
const make=(tag,parent,txt,cls)=>{const e=document.createElement(tag);if(txt!==undefined)e.textContent=String(txt);if(cls)e.className=cls;parent.append(e);return e};
const fmtTime=v=>new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(v));
const name=s=>s==='football'?'Football':s==='racing'?'Horse racing':s==='tennis'?'Tennis':'NFL';
const emoji={walters:'◈',bloom:'▥',benter:'♞'};
let report=null,active=null;
async function source(s,now){
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),13000);
 try{
  const res=await fetch('../'+s.file,{cache:'no-store',signal:ctrl.signal});
  if(!res.ok)throw Error('HTTP '+res.status);
  return C.inspect(s.id,await res.json(),now);
 }catch(e){return {id:s.id,state:'UNAVAILABLE',data:null,error:String(e?.message||e).slice(0,100)}}
 finally{clearTimeout(timer)}
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
 renderPriceInputs(scenario);
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
  make('p',e,'Not a personal endorsement or independent expert approval.','lens-caveat');
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
async function refresh(){
 $('time-stamp').textContent='Checking source files…';
 const now=Date.now(),days=Number($('horizon').value),results=await Promise.all(C.SOURCES.map(x=>source(x,now)));
 report=C.collect(results,now,days);
 $('time-stamp').textContent='Source snapshot check · '+fmtTime(now)+' UK';
 showCard(report,$('scenario').value);showRacing(report);showCoverage(report);showAudit(report);
}
$('refresh').addEventListener('click',refresh);
$('horizon').addEventListener('change',refresh);
$('scenario').addEventListener('change',()=>{if(report)showCard(report,$('scenario').value)});
$('stake').addEventListener('input',calculate);
refresh().catch(e=>{$('time-stamp').textContent='Council data unavailable: '+String(e?.message||e).slice(0,80)});
})();