(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.WildcardCouncil=api;
})(typeof window!=='undefined'?window:this,function(){
 'use strict';
 const SPORTS=['football','racing','tennis','nfl'];
 const SOURCES=[
  {id:'football',file:'research-dashboard-data.json',maxHours:24},
  {id:'other',file:'other-sports-data.json',maxHours:24},
  {id:'racing',file:'racing-research-data.json',maxHours:6},
  {id:'horse',file:'horse-predictions-data.json',maxHours:6},
  {id:'horse-model',file:'horse-model-data.json',maxHours:6}
 ];
 const date=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
 const gate=d=>!!(d&&d.research_only===true&&d.model_validation==='UNVALIDATED'&&d.publication_gate==='BLOCKED');
 const string=(v,max=140)=>typeof v==='string'&&v.trim()?v.trim().slice(0,max):null;
 const reasonable=p=>typeof p==='number'&&Number.isFinite(p)&&p>0&&p<1;
 function inspect(id,data,now=Date.now()){
  const src=SOURCES.find(s=>s.id===id);
  if(!src)throw Error('Unknown council data source');
  if(!gate(data))return {id,state:'GATE_REJECTED',data:null};
  const timestamp=date(data.generated_at_utc),age=timestamp===null?NaN:now-timestamp;
  if(!Number.isFinite(age)||age< -300000||age>src.maxHours*3600000)
   return {id,state:'STALE_OR_UNDATED',data:null,generated:timestamp};
  return {id,state:'OBSERVED',data,generated:timestamp};
 }
 function candidate(id,name,start,market,outcome,p,model,sources,meta={}){
  const t=date(start);
  if(!string(id)||!string(name)||t===null||!string(outcome)||!reasonable(p)||!string(model))return null;
  return {id,name,startUTC:new Date(t).toISOString(),startMs:t,market,outcome,
   probability:p,model,sources,meta,odds:null,ev:null,verified:false,
   status:'EXPERIMENTAL_RESEARCH_ONLY'};
 }
 function collect(results,now=Date.now(),days=14){
  if(![7,14,21].includes(days))throw Error('Unsupported review window');
  const rows=[],seen=new Set(),seenRaces=new Set(),end=now+days*86400000;
  const exclusions={footballCurrentSeason:0,footballSchedule:0,racingPreEvent:0,racingDuplicateRace:0};
  const footballLeads=[];
  const available=Object.fromEntries(SOURCES.map(s=>[s.id,results.find(r=>r.id===s.id)?.state||'UNAVAILABLE']));
  const find=id=>results.find(r=>r.id===id&&r.state==='OBSERVED')?.data;
  const inside=t=>t>now+300000&&t<=end;
  function include(c){
   if(!c||!inside(c.startMs)||seen.has(c.id))return;
   // Accumulators cannot contain two mutually exclusive winners of the same race.
   if(c.meta.sport==='racing'){
    const raceKey=String(c.meta.raceId||'');
    if(!raceKey)return;
    if(seenRaces.has(raceKey)){exclusions.racingDuplicateRace++;return}
    seenRaces.add(raceKey);
   }
   seen.add(c.id);rows.push(c);
  }
  const football=find('football');
  if(football){
   const forecasts=Array.isArray(football.experimental_model_forecasts)?football.experimental_model_forecasts:[];
   for(const x of forecasts){
    if(!x?.home||!x?.away||!inside(date(x.kickoff_utc)))continue;
    const fixtures=Array.isArray(football.upcoming_fixtures)?football.upcoming_fixtures:[];
    const match=fixtures.find(f=>f.home===x.home&&f.away===x.away&&f.kickoff_utc===x.kickoff_utc);
    if(!match||match.has_experimental_model_forecast!==true||match.verification!=='SCHEDULE_CROSS_CHECK'){exclusions.footballSchedule++;continue}
    // A prior-season Poisson model is not evidence of current-season football form.
    const start=new Date(x.kickoff_utc),year=start.getUTCFullYear(),startYear=start.getUTCMonth()>=7?year:year-1;
    const season=startYear+'_'+String((startYear+1)%100).padStart(2,'0');
    const training=x.training_basis;
    const seasonEvidence=typeof training==='string'?training.includes(season):
      (training&&typeof training==='object'&&training.season===season&&training.verified===true);
    if(!string(x.model)||!x.model.includes(season)||!seasonEvidence){
      exclusions.footballCurrentSeason++;
      if(footballLeads.length<8)footballLeads.push({name:x.home+' vs '+x.away,startUTC:x.kickoff_utc,reason:'No verified '+season+' model training; previous-season forecast cannot qualify'});
      continue;
    }
    const odds=[['home',x.prob_home,x.home],['draw',x.prob_draw,'Draw'],['away',x.prob_away,x.away]]
      .filter(y=>reasonable(y[1])).sort((a,b)=>b[1]-a[1]);
    if(odds.length!==3||Math.abs(odds.reduce((s,a)=>s+a[1],0)-1)>.02)continue;
    const best=odds[0];
    include(candidate('football:'+x.home+':'+x.away+':'+x.kickoff_utc,
      x.home+' vs '+x.away,x.kickoff_utc,'FULL_TIME_1X2',best[2],best[1],x.model,
      ['Published fixture','Experimental football model'],{sport:'football',season:x.model?.includes('2025_26')?'2025/26 model label':'Unverified season',warning:'Lineups and 2026/27 form not independently confirmed'}));
   }
  }
  const other=find('other');
  for(const sport of ['tennis','nfl']){
   const events=other?.sports?.[sport]?.events;
   for(const x of Array.isArray(events)?events:[]){
    if(!string(x?.id)||!string(x?.name)||!inside(date(x.startUTC)))continue;
    const outcomes=x.forecast?.outcomes;
    if(!Array.isArray(outcomes)||!outcomes.length||x.forecast.calibrated!==false||!string(x.source))continue;
    const possible=outcomes.filter(o=>reasonable(o.probability)&&string(o.name));
    const top=[...possible].sort((a,b)=>b.probability-a.probability)[0];
    if(!top)continue;
    const minimum=sport==='tennis'?8:8;
    const prior=Number(top.prior_matches);
    if(!Number.isInteger(prior)||prior<minimum)continue;
    include(candidate(sport+':'+x.id,x.name,x.startUTC,x.forecast.market,top.name,
      top.probability,x.forecast.model,['Published event','Uncalibrated Elo model'],
      {sport,prior,warning:'Pricing, injuries, lineup and market identity not independently verified'}));
   }
  }
  const horse=find('horse'),racing=find('racing'),horseModel=find('horse-model');
  const perf=horseModel?.performance;
  const evaluation=perf?.provisional_evaluation?.models?.FORM_PERCENTILE_SOFTMAX_RESEARCH_V1;
  const modelScore=(perf?.metrics_status==='DESCRIPTIVE_ONLY_NOT_MODEL_VALIDATION'&&
     evaluation?.status==='DESCRIPTIVE_ONLY_NOT_MODEL_VALIDATION'&&
     Number.isInteger(perf.scored_forecasts)&&perf.scored_forecasts>=0&&
     Number.isFinite(perf.metrics?.mean_multiclass_brier_score)&&
     Number.isFinite(perf.metrics?.mean_equal_chance_brier_score)&&
     Number.isFinite(evaluation.mean_brier_delta_vs_equal_chance)&&
     Number.isFinite(evaluation.brier_delta_bootstrap_95_interval?.lower)&&
     Number.isFinite(evaluation.brier_delta_bootstrap_95_interval?.upper))?{
       scored:perf.scored_forecasts,independent:perf.independently_verified_results||0,
       modelBrier:perf.metrics.mean_multiclass_brier_score,
       baselineBrier:perf.metrics.mean_equal_chance_brier_score,
       delta:evaluation.mean_brier_delta_vs_equal_chance,
       interval:[evaluation.brier_delta_bootstrap_95_interval.lower,evaluation.brier_delta_bootstrap_95_interval.upper],
       classification:'DESCRIPTIVE_ONLY_NOT_MODEL_VALIDATION'
     }:null;
  let horseObserved=Number(horse?.coverage?.observed_races)||0,
      skipped=Number(horse?.coverage?.skipped_count)||0,
      historical=Number(horse?.coverage?.archived_forecast_count)||0;
  const forecasts=Array.isArray(horse?.forecasts)?horse.forecasts:[];
  // Current producer schema is one forecast per race with nested runners[].model_probability.
  // These are visible as blocked research leads, never as eligible wagers or Council legs.
  const horseResearch=[];
  for(const f of forecasts){
   if(!Array.isArray(f?.runners)||!inside(date(f.startUTC)))continue;
   const ranked=f.runners.filter(x=>string(x?.name)&&reasonable(x.model_probability))
     .sort((a,b)=>b.model_probability-a.model_probability);
   if(!ranked.length)continue;
   const verified=f.challenge_eligible===1&&f.independent_timestamp_attested===true&&f.historical_first_availability_verified===true;
   if(horseResearch.length<12)horseResearch.push({raceId:String(f.race_id||''),racecourse:string(f.racecourse)||'Unknown course',raceName:string(f.race_name)||'Race',startUTC:f.startUTC,topRunner:ranked[0].name,rawProbability:ranked[0].model_probability,model:string(f.model)||'Unlabelled research',status:verified?'PRE_EVENT_VERIFICATION_STILL_REQUIRED':'RESEARCH_ONLY_NOT_CHALLENGE_ELIGIBLE'});
  }
  const races=Array.isArray(racing?.races)?racing.races:[];
  let horseRejected=0;
  let nestedForecasts=0;
  for(const f of forecasts){
   // Nested race-level forecasts are visible in researchLeads but lack the flat
   // pre-event contract required to form a Council ticket.
   if(Array.isArray(f?.runners)){nestedForecasts++;continue}
   const id=String(f?.race_id||''),race=races.find(r=>String(r.race_id)===id);
   const runner=f?.runner_name||f?.horse_name;
   const p=f?.win_probability,at=race?.startUTC;
   // Exact current race identity, confirmed runner, pre-event status and timestamp required.
   if(!race||!inside(date(at))||race.forecast_eligible!==true||
      !['PRE_EVENT_CONFIRMED','PRE_RACE_VERIFIED'].includes(race.forecast_status)||
      !string(runner)||!reasonable(p)||!string(f?.model)||
      !race.runners?.some(x=>x.name===runner&&x.active_runner===true)){horseRejected++;exclusions.racingPreEvent++;continue}
   include(candidate('racing:'+id+':'+String(f?.horse_id||runner),race.racecourse+' · '+race.name,
     at,'HORSE_WIN',runner,p,f.model,['Pre-event racecard','Confirmed runner','Experimental horse model'],
     {sport:'racing',raceId:id,runner,warning:'Market-implied probability and fair odds not independently validated'}));
  }
  // Per-sport model probabilities are incomparable and cannot be used as a cross-sport value ranking.
  // Prioritise distinct sports and independent source coverage; chronological tie-break only.
  const ordered=[];
  for(const sport of SPORTS){const c=rows.filter(x=>x.meta.sport===sport).sort((a,b)=>a.startMs-b.startMs);if(c.length)ordered.push(c[0])}
  for(const r of rows.sort((a,b)=>a.startMs-b.startMs))if(!ordered.some(x=>x.id===r.id))ordered.push(r);
  return {windowDays:days,now:new Date(now).toISOString(),sources:available,
    all:ordered,featured:ordered.slice(0,3),availableCount:ordered.length,
    footballReview:{blockedExamples:footballLeads,blockedCurrentSeason:exclusions.footballCurrentSeason},
    counts:Object.fromEntries(SPORTS.map(s=>[s,ordered.filter(x=>x.meta.sport===s).length])),
    exclusions,
    horse:{observed:horseObserved,historical,skipped,currentForecasts:forecasts.length,nestedForecasts,modelScore,researchLeads:horseResearch,
      rejected:horseRejected,eligible:ordered.filter(x=>x.meta.sport==='racing').length,
      status:!horse?'SOURCE_UNAVAILABLE':forecasts.length===0?'NO_CURRENT_PRE_RACE_FORECASTS':nestedForecasts===forecasts.length?'RACE_LEVEL_RESEARCH_ONLY':horseRejected?'PRE_RACE_GATES_REJECTED':'RESEARCH_ONLY',
      audit:racing?.coverage_verified===true?'COVERAGE_FLAG_PRESENT_NOT_CERTIFIED':'COVERAGE_NOT_CERTIFIED'},
    selectionPolicy:'First source-gated future event per sport, ordered by start time within each sport; remaining events by start time. This is NOT an EV, confidence or win-probability ranking.',
    disclaimer:'Preliminary research, not approved selections. No verified Sky Bet odds, model calibration, joint probability or positive EV.'};
 }
 function council(card,selected){
  const featured=Array.isArray(selected)?selected:(card.featured||[]),horse=card.horse;
  const uniqueSports=new Set(featured.map(c=>c.meta.sport));
  return [
   {id:'walters',name:'Walters',role:'Market discipline',status:'PRICE CHECK REQUIRED',
    decision:'HOLD',explanation:'No independently verified executable Sky Bet price or market movement; no defensible monetary edge can be calculated.'},
   {id:'bloom',name:'Bloom',role:'Risk and portfolio',status:featured.length>=2?'DEPENDENCE UNKNOWN':'INSUFFICIENT LEGS',
    decision:'REVIEW',explanation:featured.length>=2?'Different sports reduce some shared exposures, but independence, market correlations and settlement conventions remain untested.':'Insufficient model-backed selections for a cross-sport combination.'},
   {id:'benter',name:'Benter',role:'Horse-racing model',status:horse.eligible?'RACING MODEL UNVALIDATED':'HORSE RACING NOT READY',
    decision:'HOLD',explanation:horse.eligible?'Pre-race experimental horse evidence exists but fair-price and calibration checks are missing.':'No verified current pre-race horse candidate; '+horse.observed+' observed races and '+horse.historical+' historical forecasts cannot be promoted into live picks.'}
  ].map(x=>({...x,signoff:'AUTOMATED_METHOD_LENS_ONLY',cardSports:uniqueSports.size}));
 }
 function explainCandidate(c){
  if(!c||!c.meta||!SPORTS.includes(c.meta.sport))return null;
  const sport=c.meta.sport;
  const sample=Number(c.meta.prior);
  const facts=[
   'Future event recorded by a source that passed research-only and timestamp gates',
   'Forecast has an explicit model and a finite, uncalibrated outcome probability',
   'Unique event identity within this research horizon'
  ];
  if(sport==='football')facts.push('Current-season training evidence and schedule cross-check required');
  if((sport==='tennis'||sport==='nfl')&&Number.isInteger(sample))facts.push('Model input reports '+sample+' prior matches (not an independent backtest)');
  if(sport==='racing')facts.push('Matching future race, confirmed pre-race runner and forecast required');
  return {facts,limitations:[
   'No independently verified Sky Bet price or measured expected value',
   'No independent probability calibration or prospective model approval',
   sport==='football'?'Team news, tactical changes, transfers and lineups require fresh review':
   sport==='racing'?'Going, jockey, declarations and field conditions must be rechecked':
   sport==='tennis'?'Surface, player health and tournament conditions must be checked':
   'Injuries, quarterback status and matchup conditions must be checked'
  ],modelProbability:c.probability,status:'HYPOTHESIS_ONLY'};
 }
 function compareScenario(card,selected){
  const picked=Array.isArray(selected)?selected:[];
  const uniq=new Set(picked.map(x=>x.meta.sport));
  return {displayed:picked.length,screened:card.availableCount,
    unshown:Math.max(0,card.availableCount-picked.length),
    differentSports:uniq.size,
    overlapWarning:picked.length>uniq.size?'Multiple legs use the same sport; event independence is not established.':'Different sports do not prove independent outcomes.',
    reason:card.selectionPolicy};
 }
 function scenarios(card){
  const names=[{id:'flagship',title:'Council Flagship',n:Math.min(2,card.availableCount)},
    {id:'challenger',title:'Speculative Challenger',n:Math.min(3,card.availableCount)}];
  return names.map(x=>({...x,legs:card.all.slice(0,x.n),kind:'PAPER_SCENARIO',
    publishable:false,impliedProbability:null,verifiedPrice:null,expectedValue:null,
    rationale:x.id==='flagship'?'Minimum distinct model-backed events with maximum source traceability.':'An additional independent fixture adds possible return but increases the chance of total loss.'}));
 }
 function hypotheticalReturn(odds,stake){
  if(!Array.isArray(odds)||odds.length<1||odds.length>5||
     !odds.every(x=>typeof x==='number'&&Number.isFinite(x)&&x>1&&x<=1000)||
     typeof stake!=='number'||!Number.isFinite(stake)||stake<=0||stake>10)return null;
  const mult=odds.reduce((v,x)=>v*x,1),gross=mult*stake;
  if(!Number.isFinite(gross)||gross>10000000)return null;
  return {multiplier:mult,gross,net:gross-stake,winningProbability:null,expectedValue:null,
    label:'Hypothetical arithmetic only, not executable betting prices'};
 }
 return Object.freeze({SOURCES,inspect,collect,council,scenarios,explainCandidate,compareScenario,hypotheticalReturn});
});
