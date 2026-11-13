(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.ValueWatchModelChallenge=api;
})(typeof window!=='undefined'?window:this,function(){
 'use strict';
 const validProbability=p=>typeof p==='number'&&Number.isFinite(p)&&p>0&&p<1;
 const str=x=>typeof x==='string'&&x.trim().length>0;
 const gate=x=>x?.research_only===true&&x?.publication_gate==='BLOCKED'&&x?.model_validation==='UNVALIDATED';
 function inspectRace(f){
  if(!f||!Array.isArray(f.runners)||f.runners.length<2||!str(f.race_id)||!str(f.startUTC))return null;
  const ids=new Set(),runners=[];
  for(const x of f.runners){
   if(!str(x?.name)||!str(x?.horse_id)||ids.has(x.horse_id)||!validProbability(x.model_probability))return null;
   ids.add(x.horse_id);
   runners.push({name:x.name,id:x.horse_id,p:x.model_probability});
  }
  const sum=runners.reduce((a,x)=>a+x.p,0);
  if(Math.abs(1-sum)>0.01)return null;
  runners.sort((a,b)=>b.p-a.p);
  const n=runners.length,entropy=-runners.reduce((a,x)=>a+x.p*Math.log(x.p),0)/Math.log(n);
  const uniform=1/n;
  return {
   raceId:f.race_id,raceName:f.race_name||'Race',course:f.racecourse||'Unknown course',
   scheduled:f.startUTC,fieldSize:n,topRunner:runners[0].name,
   topProbability:runners[0].p,secondProbability:runners[1].p,
   topGap:runners[0].p-runners[1].p,uniformBaseline:uniform,
   concentrationVsUniform:runners[0].p-uniform,
   normalizedEntropy:entropy,
   model:f.model||'UNLABELLED',marketProbability:null,verifiedPrice:null,expectedValue:null,
   label:'UNCALIBRATED_FULL_FIELD_COMPARISON',eligible:false,
   missing:['INDEPENDENT_FIRST_AVAILABILITY','OUT_OF_SAMPLE_CALIBRATION','VERIFIED_MARKET_PRICE']
  };
 }
 function racing(feed,now=Date.now()){
  if(!gate(feed))return {status:'GATE_REJECTED',races:[],excluded:0};
  const when=Date.parse(feed.generated_at_utc);
  if(!Number.isFinite(when)||when>now+300000||now-when>6*3600000)
   return {status:'STALE_OR_UNDATED',races:[],excluded:0};
  const all=Array.isArray(feed.forecasts)?feed.forecasts:[];
  const races=[],ids=new Set();let excluded=0;
  for(const f of all){
   const at=Date.parse(f?.startUTC);
   if(!Number.isFinite(at)||at<=now+300000){excluded++;continue}
   const row=inspectRace(f);
   if(!row||ids.has(row.raceId)){excluded++;continue}
   ids.add(row.raceId);races.push(row);
  }
  return {status:'RESEARCH_ONLY',races,excluded,observed:feed.coverage?.observed_races??null,
   // This sorts by time for presentation, NOT by edge, profit or confidence.
   ordering:'EVENT_TIME_NOT_VALUE_RANKING'};
 }
 function football(feed,now=Date.now()){
  if(!gate(feed))return {status:'GATE_REJECTED',rows:[],eligible:0,excluded:0};
  const generated=Date.parse(feed.generated_at_utc);
  if(!Number.isFinite(generated)||generated>now+300000||now-generated>24*3600000)
   return {status:'STALE_OR_UNDATED',rows:[],eligible:0,excluded:0};
  let eligible=0,excluded=0;const rows=[];
  const fixtures=Array.isArray(feed.upcoming_fixtures)?feed.upcoming_fixtures:[];
  for(const f of Array.isArray(feed.experimental_model_forecasts)?feed.experimental_model_forecasts:[]){
   const at=Date.parse(f.kickoff_utc);
   if(!Number.isFinite(at)||at<=now+300000)continue;
   const matching=fixtures.some(x=>x.home===f.home&&x.away===f.away&&x.kickoff_utc===f.kickoff_utc&&x.verification==='SCHEDULE_CROSS_CHECK');
   const y=new Date(at).getUTCFullYear(),start=new Date(at).getUTCMonth()>=7?y:y-1;
   const season=start+'_'+String((start+1)%100).padStart(2,'0');
   const valid=matching&&str(f.model)&&f.model.includes(season)&&
    f.training_basis?.season===season&&f.training_basis?.verified===true&&
    [f.prob_home,f.prob_draw,f.prob_away].every(validProbability)&&
    Math.abs(f.prob_home+f.prob_draw+f.prob_away-1)<=0.02;
   if(valid)eligible++;else excluded++;
   if(rows.length<12)rows.push({name:String(f.home||'')+' vs '+String(f.away||''),startUTC:f.kickoff_utc,
    requiredSeason:season,model:f.model||null,
    status:valid?'RESEARCH_ELIGIBLE_UNCALIBRATED':'BLOCKED',
    reason:valid?'Model evidence passes preliminary season gate; no market or calibration approval':
     matching?'Current-season verified training and valid 1X2 probabilities required':'Fixture cross-check missing',
    marketProbability:null,verifiedPrice:null,expectedValue:null});
  }
  return {status:'RESEARCH_ONLY',rows,eligible,excluded};
 }
 function review(horseFeed,footballFeed,now=Date.now()){
  const h=racing(horseFeed,now),f=football(footballFeed,now);
  return {version:1,kind:'INDEPENDENT_MODEL_CHALLENGE',horse:h,football:f,
   benter:{status:h.races.length?'FULL_FIELD_DIAGNOSTICS_ONLY':'NO_CURRENT_FIELD',
    note:'Horse model top probability, runner separation and entropy are not fair odds, value or verified edge.'},
   walters:{status:f.eligible?'CURRENT_SEASON_SOURCE_GATE_ONLY':'CURRENT_SEASON_EVIDENCE_MISSING',
    note:'Football pricing discipline cannot establish a value bet without current-season testing and executable prices.'},
   bloom:{status:'NO_OUT_OF_SAMPLE_MARKET_ADVANTAGE_ESTABLISHED',
    note:'No independently calibrated edge, correlated-ticket likelihood or positive ROI has been established.'},
   robson:{status:'GOALS_MARKET_MODEL_NOT_VALIDATED',
    note:'Goals and bet-builder research requires settlement-matched odds and joint-event probabilities.'},
   publicationGate:'BLOCKED',verifiedPrice:null,expectedValue:null};
 }
 return Object.freeze({inspectRace,racing,football,review});
});
