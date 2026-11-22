'use strict';
// Value Watch Pro display-only source normalizer. No bets, odds, model grades or source writes.
// Shared by Betting Hub and Analyst Terminal to prevent conflicting event counts.
(function(root,factory){
 const api=factory(typeof module==="object" && module.exports ? require("./research-audit-core.js") : root.ResearchAudit);
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.ValueWatchProSources=api;
})(typeof window!=='undefined'?window:this,function(Audit){
 const SOURCES=[
  {id:'football',filename:'research-dashboard-data.json',maxAgeHours:24},
  {id:'racing',filename:'racing-research-data.json',maxAgeHours:6},
  {id:'other',filename:'other-sports-data.json',maxAgeHours:24},
  {id:'darts',filename:'darts/feed.json',maxAgeHours:48},
  {id:'rugby',filename:'rugby-research-data.json',maxAgeHours:48},
  {id:'history',filename:'research-history.json',maxAgeHours:168}
 ];
 const sports=['football','racing','tennis','nfl','darts','rugby'];
 function unavailable(row){return /cancel|postpon|suspend|final|finish|running|withdraw|abandon|retir|walkover|in.progress|complete/i.test([row.status,row.event_status,row.result?.status].join(' '))}
 function stamp(s){if(typeof s!=='string'||!/(?:Z|[+-]\d{2}:\d{2})$/.test(s))return null;const n=Date.parse(s);return Number.isFinite(n)?n:null}
 function safeName(v){return typeof v==='string'&&v.trim()?v.trim().slice(0,220):null}
 function gate(d){return !!(d&&typeof d==='object'&&!Array.isArray(d)&&d.research_only===true&&d.model_validation==='UNVALIDATED'&&d.publication_gate==='BLOCKED')}
 function raceIdentity(row, generatedAt, now){
  const seen=stamp(row?.runner_observed_at_utc);
  if(row?.schedule_cross_checked!==true||row.capture_phase!=='PRE_EVENT'||
     !['DORMANT','ATTHEPOST'].includes(row.race_stage)||seen===null||
     seen>generatedAt||seen>now||now-seen>30*60000||seen>=stamp(row.startUTC)||
     !/^\d{1,20}$/.test(row.race_id)||!safeName(row.racecourse)||!safeName(row.name)||
     !/^[a-f0-9]{64}$/i.test(row.runner_source_sha256||'')||!URL.canParse(row.runner_source))return null;
  const url=new URL(row.runner_source);
  if(url.origin!=='https://www.sportinglife.com'||url.username||url.password||
     !url.pathname.includes('/racecard/'+row.race_id+'/'))return null;
  return {id:row.race_id,competition:row.racecourse,source:url.href,name:row.name,observedAt:seen};
 }
 function otherIdentity(row,sport){
  if(/complete|retir|walkover|withdraw|abandon|in.progress/i.test(row.status||row.event_status||''))return null;
  const parts=row.participants;
  const url=new URL(row.source);
  if(url.origin!=='https://site.api.espn.com')return null;
  const prefix=sport==='nfl'?'nfl':url.pathname.split('/').at(-2);
  if(!new RegExp('^'+prefix+'-\\d{1,20}$').test(row.id)||
     !Array.isArray(parts)||parts.length!==2||
     parts.some(p=>!/^\d{1,20}$/.test(p?.id)||!safeName(p.name))||parts[0].id===parts[1].id||
     parts[0].name.trim().toLowerCase()===parts[1].name.trim().toLowerCase()||
     row.name!==parts.map(p=>p.name).join(' vs '))return null;
  return {id:row.id,competition:row.competition,name:row.name,participants:parts.map(p=>[p.id,p.name]),source:url.origin+url.pathname};
 }
 function withObservation(detail,observedAt){ return detail?{...detail,observedAt}:null; }
 function detailKey(record){
  if(!record.detail)return null;
  const {id,competition,participants,source,name}=record.detail;
  const key=JSON.stringify([record.sport,id,competition,name,record.startUTC,participants||[],source]);
  return key.length<=1800?key:null;
 }
 function findDetail(result,key,now=Date.now()){
  if(!result?.fresh||typeof key!=='string'||key.length>1800)return null;
  const matches=result.records.filter(row=>row.startMs>now&&detailKey(row)===key);
  return matches.length===1?matches[0]:null;
 }
 function inspect(id,data,now=Date.now(),footballEvidence=globalThis.FootballMatchEvidence){
  const def=SOURCES.find(x=>x.id===id);
  if(!def)throw Error('Unknown source');
  if(!gate(data))return {id,state:'GATE_UNVERIFIED',fresh:false,generatedAt:null,records:[],data:null};
  const ts=stamp(data.generated_at_utc),age=ts===null?null:now-ts;
  const fresh=age!==null&&age>=-300000&&age<=def.maxAgeHours*3600000;
  if(!fresh)return {id,state:'STALE_OR_UNDATED',fresh:false,generatedAt:ts,records:[],data};
  if(id==='history')return {id,state:'OBSERVED',fresh:true,generatedAt:ts,records:[],data};
  const seen=new Map(),conflicts=new Set(),invalid=[];
  const result=()=>[...seen].filter(([id])=>!conflicts.has(id)).map(([,record])=>record);
  function add(sport,name,time,key,hasModel,fixtureKey,detail,forecast,reason){
   const n=safeName(name),t=stamp(time);
   // Reject unknown time, malformed identity, and duplicates; never make a synthetic event.
   if(!n||t===null||!Number.isFinite(t)||!safeName(key)){invalid.push('INVALID_RECORD');return}
   const identity=sport+'|'+String(key);
   const record={sport,name:n,startUTC:new Date(t).toISOString(),startMs:t,hasModel:hasModel===true,source:id};
   if(fixtureKey)record.fixtureKey=fixtureKey;
   if(detail)record.detail=detail;
   if(forecast)record.forecast=forecast;
   if(reason)record.reason=reason;
   const previous=seen.get(identity);
   if(previous){
    if(previous.name!==record.name||previous.startMs!==record.startMs||previous.hasModel!==record.hasModel||previous.fixtureKey!==record.fixtureKey||detailKey(previous)!==detailKey(record)||JSON.stringify(previous.forecast)!==JSON.stringify(record.forecast)){
     conflicts.add(identity);
     invalid.push('CONFLICTING_RECORD');
    }else invalid.push('DUPLICATE_RECORD');
    return;
   }
   seen.set(identity,record);
  }
  if(id==='football'){
   if(!Array.isArray(data.upcoming_fixtures))return {id,state:'SCHEMA_UNVERIFIED',fresh:false,generatedAt:ts,records:[],data};
   for(const e of data.upcoming_fixtures.slice(0,300)){
    if(!e||!safeName(e.home)||!safeName(e.away)||unavailable(e))continue;
    const name=e.home+' vs '+e.away,key=e.fixture_id||String(e.home)+'|'+String(e.away)+'|'+String(e.kickoff_utc);
    add('football',name,e.kickoff_utc,key,e.has_experimental_model_forecast===true,
      data.schema_version===1 && footballEvidence?.fixtureKey(e));
   }
  }else if(id==='racing'){
   if(!Array.isArray(data.races))return {id,state:'SCHEMA_UNVERIFIED',fresh:false,generatedAt:ts,records:[],data};
   for(const e of data.races.slice(0,300)){
    if(!e||!safeName(e.racecourse)||!safeName(e.race_id))continue;
    add('racing',e.racecourse+' · '+(safeName(e.name)||'Race '+e.race_id),e.startUTC,String(e.race_id),e.forecast_eligible===true&&e.prediction!=null,null,ts<=now&&ts<stamp(e.startUTC)?raceIdentity(e,ts,now):null,null,
      'No eligible runner probability vector in the racecard snapshot'+(safeName(e.forecast_status)?' ('+e.forecast_status+')':'')+'.');
   }
  }else if(id==='other'){
   if(!data.sports||!['tennis','nfl'].some(k=>Array.isArray(data.sports[k]?.events)))return {id,state:'SCHEMA_UNVERIFIED',fresh:false,generatedAt:ts,records:[],data};
   const usableSports=[];
   for(const sport of ['tennis','nfl']){
    const part=data.sports[sport];
    if(!Array.isArray(part?.events)){invalid.push('MISSING_SPORT');continue;}
    const seenAt=part.generated_at_utc??data.generated_at_utc;
    if(!Audit.freshness(seenAt,def.maxAgeHours*3600000,now).fresh||stamp(seenAt)>ts){
     invalid.push('STALE_SPORT');continue;
    }
    usableSports.push(sport);
    for(const e of part.events.slice(0,300)){
     const observed=stamp(e?.source_collected_at_utc??seenAt);
     if(!Audit.validateOtherIdentity(e,sport)||(e.sport!=null&&e.sport!==sport)||
        observed===null||observed>stamp(seenAt)||now-observed>def.maxAgeHours*3600000||
        unavailable(e)){
      invalid.push('INVALID_OR_UNAVAILABLE_EVENT');continue;
     }
     const identity=observed<=now&&observed<stamp(e.startUTC)?withObservation(otherIdentity(e,sport),observed):null;
     const valid=Audit.validateOtherForecast(e,sport,seenAt,now);
     const forecast=valid&&identity?{
      name:e.forecast.model,market:e.forecast.market,observed:e.forecast.generated_at_utc||seenAt,
      training:e.forecast.training_latest_start_utc,hash:e.forecast.training_sha256,
      sample:e.forecast.training_matches,outcomes:e.forecast.outcomes.map(({id,name,probability})=>({id,name,probability}))
     }:null;
     add(sport,e.name,e.startUTC,e.id,valid,null,identity,forecast,
      e.forecast?'Published model did not pass identity, chronology or forecast checks.':'No model forecast was published for this event.');
    }
   }
   return {id,state:invalid.length?'PARTIAL_RECORDS':'OBSERVED',fresh:usableSports.length>0,
    generatedAt:ts,records:result(),data,usableSports,invalidCount:invalid.length};
  }else if(id==='darts'){
   if(data.schema_version!==1||data.source_verification!=='PROVIDER_OBSERVED_UNCORROBORATED'||!Array.isArray(data.fixtures))
    return {id,state:'SCHEMA_UNVERIFIED',fresh:false,generatedAt:ts,records:[],data};
   for(const e of data.fixtures.slice(0,12)){
    if(e?.status!=='SCHEDULED'||!safeName(e.player_a?.name)||!safeName(e.player_b?.name)||
       !safeName(e.player_a?.id)||!safeName(e.player_b?.id)||e.player_a.id===e.player_b.id)continue;
    add('darts',e.player_a.name+' vs '+e.player_b.name,e.start_utc,e.id,false);
   }
  }else if(id==='rugby'){
   if(!Array.isArray(data.upcoming_fixtures))return {id,state:'SCHEMA_UNVERIFIED',fresh:false,generatedAt:ts,records:[],data};
   for(const e of data.upcoming_fixtures.slice(0,300)){
    if(!e||!safeName(e.home)||!safeName(e.away)||!safeName(e.event_id))continue;
    add('rugby',e.home+' vs '+e.away,e.kickoff_utc,e.event_id,false);
   }
  }
  return {id,state:invalid.length?'PARTIAL_RECORDS':'OBSERVED',fresh:true,generatedAt:ts,records:result(),data,invalidCount:invalid.length};
 }
 function summarize(results,now=Date.now()){
  const events=[],available=new Set(),counts=Object.fromEntries(sports.map(s=>[s,null]));
  for(const r of results){
   if(!r||r.fresh!==true||!Array.isArray(r.records))continue;
   for(const sport of r.id==='other'?r.usableSports:[r.id]){
    if(!sports.includes(sport))continue;
    available.add(sport);
    const subset=r.records.filter(x=>x.sport===sport);
    counts[sport]=subset.filter(x=>x.startMs>=now).length;
    events.push(...subset);
   }
  }
  const upcoming=events.filter(x=>x.startMs>=now).sort((a,b)=>a.startMs-b.startMs||a.sport.localeCompare(b.sport)||a.name.localeCompare(b.name));
  return {events,upcoming,counts,available:[...available],totalAvailable:upcoming.length,allSportsAvailable:available.size===sports.length};
 }
 function featuredOrder(upcoming){
  if(!Array.isArray(upcoming))return [];
  const buckets=new Map(sports.map(s=>[s,[]]));
  for(const e of upcoming){if(buckets.has(e.sport))buckets.get(e.sport).push(e)}
  const out=[];const index=Object.fromEntries(sports.map(s=>[s,0]));
  while(sports.some(s=>index[s]<buckets.get(s).length)){
   for(const s of sports){const bucket=buckets.get(s);if(index[s]<bucket.length)out.push(bucket[index[s]++])}
  }
  return out;
 }
 const footballKeys={PL:'soccer_epl',E1:'soccer_efl_champ',UCL:'soccer_uefa_champs_league',
  UEL:'soccer_uefa_europa_league',SP1:'soccer_spain_la_liga',I1:'soccer_italy_serie_a',
  D1:'soccer_germany_bundesliga',F1:'soccer_france_ligue_one'};
 const tennisKeys={'ATP · Nitto ATP Finals':'tennis_atp_finals','WTA · WTA Finals':'tennis_wta_finals'};
 const oddsSources=new Set([...Object.values(footballKeys),...Object.values(tennisKeys),'americanfootball_nfl']);
 const oddsOrigin='https://api.the-odds-api.com/v4/sports/';
 const oddsOptions='/odds?bookmakers=skybet&markets=h2h&oddsFormat=decimal&dateFormat=iso';
 const normalizeName=name=>safeName(name)?.normalize('NFC').replace(/\s+/g,' ').toLowerCase();
 function oddsIdentity(sport,home,away,start){
  const a=normalizeName(home),b=normalizeName(away);
  return oddsSources.has(sport)&&a&&b&&a!==b&&Number.isFinite(start)?JSON.stringify([sport,a,b,start]):null;
 }
 function currentOdds(document,now){
  const index=new Map(),seen=new Set(),duplicates=new Set();
  const generated=stamp(document?.generated_at_utc);
  if(!gate(document)||document.schema_version!==1||document.provider!=='THE_ODDS_API'||
     generated===null||generated>now||now-generated>30*60000||!Array.isArray(document.records)||document.records.length>1100)
   return index;
  for(const record of document.records){
   if(record&&typeof record.event_id==='string'){
    if(seen.has(record.event_id))duplicates.add(record.event_id);
    seen.add(record.event_id);
   }
   const start=stamp(record?.start_utc),observed=stamp(record?.observed_at_utc),checked=stamp(record?.checked_at_utc);
   const key=record&&oddsIdentity(record.sport_key,record.home,record.away,start);
   if(!key||!(start>now)||observed===null||checked===null||observed>checked||checked>generated||now-observed>30*60000||
      record.market!=='h2h'||record.bookmaker!=='skybet'||!/^[a-z0-9]{16,64}$/.test(record.event_id||'')||
      !/^[a-f0-9]{64}$/i.test(record.receipt_sha256||'')||record.source_url!==oddsOrigin+record.sport_key+oddsOptions)continue;
   const sides=record.sport_key.startsWith('soccer_')?['home','draw','away']:['home','away'];
   if(Object.keys(record.prices??{}).length!==sides.length||
      !sides.every(side=>Number.isFinite(record.prices[side])&&record.prices[side]>1&&record.prices[side]<=10000))continue;
   const prices=Object.fromEntries(sides.map(side=>[side,record.prices[side]]));
   const implied=Object.fromEntries(sides.map(side=>[side,1/prices[side]]));
   const total=Object.values(implied).reduce((n,p)=>n+p,0);
   const proportionalNoVig=Object.fromEntries(sides.map(side=>[side,implied[side]/total]));
   if(!index.has(key))index.set(key,[]);
   index.get(key).push({
    name:'Sky Bet via The Odds API',sourceId:'THE_ODDS_API_SKY_BET',id:record.event_id,observed,captured:checked,
    hash:record.receipt_sha256,sourceEndpoint:record.source_url,url:new URL('https://the-odds-api.com/'),
    prices,metrics:{implied,proportionalNoVig},marketLabel:sides.length===3?'Soccer 1X2 (h2h)':'Two-outcome head-to-head',
    comparisons:[],comparisonReason:record.sport_key==='americanfootball_nfl'
     ?'EV unavailable: two-outcome moneyline cannot be compared with the model’s three-outcome NFL market.'
     :'EV unavailable: this feed does not attest the exact bookmaker settlement rules required for model comparison.'
   });
  }
  for(const [key,quotes] of index)if(quotes.length!==1||duplicates.has(quotes[0].id))index.delete(key);
  return index;
 }
 function presentationKey(record,football,now){
  if(!(record.startMs>now))return null;
  if(record.sport==='football'){
   const fixture=football?.events.get(record.fixtureKey);
   if(!fixture||unavailable(fixture.row)||fixture.row.result!=null||fixture.marketCutoff<=now)return null;
   return 'football:'+record.fixtureKey;
  }
  return ['tennis','nfl'].includes(record.sport)&&record.detail?.participants?detailKey(record):null;
 }
 function providerFixtureKey(record,football,now){
  if(!presentationKey(record,football,now))return null;
  if(record.sport==='football'){
   const [league,home,away]=football.events.get(record.fixtureKey).identity;
   return oddsIdentity(footballKeys[league],home,away,record.startMs);
  }
  const [home,away]=record.detail.participants;
  return oddsIdentity(record.sport==='nfl'?'americanfootball_nfl':tennisKeys[record.detail.competition],home[1],away[1],record.startMs);
 }
 function providerPrices(index,records,football,now){
  const matches=new Map(),candidates=new Map();
  for(const record of records){
   const key=providerFixtureKey(record,football,now);
   if(!index.has(key))continue;
   if(!candidates.has(key))candidates.set(key,[]);
   candidates.get(key).push(record);
  }
  for(const [key,records] of candidates)if(records.length===1)matches.set(records[0],index.get(key));
  return matches;
 }
 function racingEvidence(records,cardFeed,modelFeed,now){
  const forecasts=new Map();
  if(!gate(modelFeed)||!Array.isArray(modelFeed.form_forecasts)||!cardFeed?.fresh)return forecasts;
  const published=stamp(modelFeed.generated_at_utc);
  if(published===null||published>now)return forecasts;
  const cards=new Map(cardFeed.data.races.filter(card=>card&&typeof card==='object').map(card=>[card.race_id,card]));
  for(const record of records.filter(row=>row.sport==='racing'&&row.detail&&row.startMs>now)){
   const card=cards.get(record.detail.id);
   if(!card||card.runner_count_changed_since_discovery||card.conditions_changed_since_discovery?.length)continue;
   const field=(Array.isArray(card.runners)?card.runners:[]).filter(runner=>runner?.active_runner===true);
   if(!field||field.length<2||field.length!==card.active_runner_count||
      card.runners.some(runner=>runner?.runner_status==='DOUBTFUL'))continue;
   const matching=modelFeed.form_forecasts.filter(row=>row.race_id===record.detail.id&&stamp(row.startUTC)===record.startMs);
   if(matching.length!==1)continue;
   const row=matching[0],observed=stamp(row.generated_at_utc),receipt=stamp(row.runner_observed_at_utc);
   const vector=row.runners;
   if(!gate(row)||row.model!=='FORM_PERCENTILE_SOFTMAX_RESEARCH_V1'||row.reference_only!==false||
      row.odds!==null||row.expected_value!==null||row.schedule_cross_checked!==true||
      row.source!==record.detail.source||row.racecourse!==record.detail.competition||row.race_name!==record.detail.name||
      receipt===null||observed===null||receipt>observed||observed-receipt>30*60000||
      observed>published||observed>=record.startMs-5*60000||record.detail.observedAt<receipt||
      !/^[a-f0-9]{64}$/i.test(row.runner_source_sha256||'')||
      !Array.isArray(vector)||vector.length!==field.length||row.active_runner_count!==field.length||
      new Set(vector.map(runner=>runner?.horse_id)).size!==field.length||
      !vector.every(runner=>runner&&field.some(active=>active.horse_id===runner.horse_id&&active.name===runner.name)&&
       Number.isFinite(runner.model_probability)&&runner.model_probability>0&&runner.model_probability<1)||
      Math.abs(vector.reduce((sum,runner)=>sum+runner.model_probability,0)-1)>1e-8)continue;
   forecasts.set(record.detail.id,{name:row.model,market:'Race winner',observed:row.generated_at_utc,
    training:'Form history before race-day capture',hash:row.runner_source_sha256,hashLabel:'Runner receipt SHA-256',
    limitation:row.limitation,outcomes:vector.map(runner=>({id:runner.horse_id,name:runner.name,probability:runner.model_probability}))});
  }
  return forecasts;
 }
 function footballEvidence(feeds,market,core,now){
  const index=core.fixtureIndex(feeds.filter(feed=>{
   if(!gate(feed))return false;
   const observed=stamp(feed.generated_at_utc);
   return observed!==null&&observed<=now&&now-observed<=24*3600000;
  }),now);
  const quotes=new Map(core.verifyMarkets(market,index,now).matches.map(match=>[match.fixture.exact,match.sources]));
  return {events:index.byExact,quotes};
 }
 function cardEvidence(record,football,core,now,racing){
  const empty={models:[],unverified:[],quotes:[],reason:record.reason||'No accepted fixture-level model is available.',priceReason:'No matched source-backed price is available.'};
  if(!(record.startMs>now))return {...empty,reason:'The event has started.'};
  if(record.sport!=='football'){
   const forecast=record.forecast||(record.sport==='racing'&&record.detail&&racing?.get(record.detail.id));
   return {...empty,models:forecast?[forecast]:[],
    reason:record.sport==='racing'&&record.detail?'No race model matches the fresh exact runner field.':empty.reason,
    priceReason:'No verified bookmaker receipt matches this event and market.'};
  }
  const fixture=football?.events.get(record.fixtureKey);
  if(!fixture||unavailable(fixture.row)||fixture.row.result!=null||fixture.marketCutoff<=now)
   return {...empty,reason:'Exact upcoming fixture identity could not be confirmed.'};
  const sides=['home','draw','away'];
  const models=[],unverified=[];
  for(const entry of fixture.models){
   const row=entry.row;
   if(!safeName(row.model)||!core.probabilities(sides.map(side=>row['prob_'+side])))continue;
   const model={name:row.model,market:'Regulation-time 1X2',observed:new Date(entry.observed).toISOString(),training:row.cutoff_utc,
    hash:row.training_sha256,sample:row.training_matches,outcomes:sides.map(id=>({id,name:id,probability:row['prob_'+id]}))};
   if(entry.cutoffReason!==null)unverified.push({...model,reason:entry.cutoffReason});
   else models.push(model);
  }
  const recorded=football.quotes.get(record.fixtureKey)||[];
  const counts=new Map();
  for(const model of models)counts.set(model.name,(counts.get(model.name)||0)+1);
  const accepted=models.filter(model=>counts.get(model.name)===1);
  for(const model of models.filter(model=>counts.get(model.name)>1))
   unverified.push({...model,reason:'Multiple accepted records for the same model version. Comparison withheld.'});
  const quotes=recorded.filter(q=>now-q.observed<=30*60000).sort((a,b)=>
    (a.sourceId!=='SKY_BET')-(b.sourceId!=='SKY_BET')).map(quote=>({...quote,
     comparisons:accepted.map(model=>({model:model.name,values:Object.fromEntries(model.outcomes.map(outcome=>
      [outcome.id,outcome.probability*quote.prices[outcome.id]-1]))}))}));
  return {models:accepted,unverified,quotes,reason:unverified.length?'The exact estimate lacks verified training evidence.':'No valid probability vector was published for this fixture.',
   priceReason:recorded.length?'Recorded prices are older than 30 minutes. See Market evidence for the archive.':'No verified regulation-time 1X2 receipt matches this fixture.'};
 }
 async function load(id,base='',fetcher=fetch,now=Date.now()){
  const source=SOURCES.find(x=>x.id===id);if(!source)throw Error('Unknown source');
  try{
   const response=await fetcher(base+source.filename,{cache:'no-store',signal:AbortSignal.timeout(12000)});
   if(!response.ok)throw Error('HTTP '+response.status);
   return inspect(id,await response.json(),now);
  }catch(err){return {id,state:'UNAVAILABLE',fresh:false,generatedAt:null,records:[],data:null,error:String(err?.message||err).slice(0,120)}}
 }
 return Object.freeze({SOURCES,sports,stamp,gate,inspect,summarize,featuredOrder,load,detailKey,findDetail,footballEvidence,racingEvidence,cardEvidence,currentOdds,providerPrices,presentationKey,providerFixtureKey});
});
