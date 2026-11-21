'use strict';
const assert=require('node:assert/strict');
const S=require('../pro-sources.js');
const now=Date.parse('2026-11-12T21:30:00.000Z');
const base={research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED',generated_at_utc:new Date(now-360000).toISOString()};
const f={...base,upcoming_fixtures:[
 {home:'City',away:'Forest',kickoff_utc:new Date(now+3600000).toISOString(),has_experimental_model_forecast:true},
 {home:'City',away:'Forest',kickoff_utc:new Date(now+3600000).toISOString(),has_experimental_model_forecast:true},
 {home:'Past',away:'Fixture',kickoff_utc:new Date(now-3600000).toISOString()},
 {home:'Bad',away:'Date',kickoff_utc:'nonsense'}
]};
const other={...base,sports:{tennis:{events:[{id:'t-1',name:'A vs B',competition:'Synthetic ATP',source:'https://site.api.espn.com/apis/site/v2/sports/tennis/atp/scoreboard',startUTC:new Date(now+600000).toISOString(),forecast:{outcomes:[{id:'A',probability:.5}]}}]},nfl:{events:[{id:'n-1',name:'C vs D',competition:'Synthetic NFL',source:'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard',startUTC:new Date(now+7200000).toISOString()}]}}};
const racing={...base,races:[{race_id:'r-1',racecourse:'Ascot',startUTC:new Date(now+1800000).toISOString(),forecast_eligible:false,prediction:null}]};
const rugby={...base,upcoming_fixtures:[{event_id:'ru-1',home:'France',away:'Argentina',kickoff_utc:new Date(now+5400000).toISOString()}]};
const timed={id:'dart-1',start_utc:new Date(now+2700000).toISOString(),status:'SCHEDULED',
 player_a:{name:'Alice',id:'a'},player_b:{name:'Bob',id:'b'}};
const darts={...base,schema_version:1,source_verification:'PROVIDER_OBSERVED_UNCORROBORATED',
 fixtures:[timed,{...timed,id:'dart-2',status:'DATE_ONLY_UNCONFIRMED'}],
 tentative_fixtures:[{id:'dart-3',date_utc:'2026-11-13'}]};
const dartsFeed=S.inspect('darts',darts,now);
assert.equal(dartsFeed.records.length,1,'Only timed Darts fixtures enter the upcoming list');
assert.equal(S.inspect('darts',{...darts,source_verification:'NOT_CONFIGURED'},now).fresh,false);
const history={...base,entries:[],metrics_status:'INSUFFICIENT_SAMPLE'};
const football=S.inspect('football',f,now);
assert.equal(football.state,'PARTIAL_RECORDS');
assert.equal(football.records.length,2,'duplicate and invalid fixture must not be shown');
assert.equal(football.records[0].hasModel,true);
const tennisNFL=S.inspect('other',other,now),horse=S.inspect('racing',racing,now);
assert.equal(tennisNFL.state,'OBSERVED');assert.equal(horse.state,'OBSERVED');
const rugbyFeed=S.inspect('rugby',rugby,now);
assert.equal(rugbyFeed.state,'OBSERVED');assert.equal(rugbyFeed.records[0].hasModel,false);
const summary=S.summarize([football,tennisNFL,horse,dartsFeed,rugbyFeed],now);
assert.equal(summary.upcoming.length,6);
assert.deepEqual(summary.counts,{football:1,racing:1,tennis:1,nfl:1,darts:1,rugby:1});
assert.equal(summary.allSportsAvailable,true);

const mixed=[
 {sport:'racing',name:'Race A',startMs:1},
 {sport:'racing',name:'Race B',startMs:2},
 {sport:'racing',name:'Race C',startMs:3},
 {sport:'racing',name:'Race D',startMs:4},
 {sport:'football',name:'Fixture A',startMs:5},
 {sport:'tennis',name:'Match A',startMs:6},
 {sport:'nfl',name:'NFL A',startMs:7},
 {sport:'darts',name:'Darts A',startMs:8},
 {sport:'rugby',name:'Rugby A',startMs:8}
];
const featured=S.featuredOrder(mixed);
assert.deepEqual(featured.map(x=>x.sport),['football','racing','tennis','nfl','darts','rugby','racing','racing','racing']);
assert.equal(featured.length,mixed.length,'No sourced event may be lost');
assert.deepEqual(S.featuredOrder([]),[]);

const stale=S.inspect('football',{...f,generated_at_utc:new Date(now-25*3600000).toISOString()},now);
assert.equal(stale.state,'STALE_OR_UNDATED');assert.equal(stale.records.length,0);
const partial=S.summarize([stale,horse,tennisNFL],now);
assert.equal(partial.counts.football,null);
assert.equal(partial.allSportsAvailable,false);
assert.equal(partial.upcoming.length,3);
const future=S.inspect('other',{...other,generated_at_utc:new Date(now+8*60000).toISOString()},now);
assert.equal(future.fresh,false,'future timestamps beyond tolerance must fail closed');
const gates=S.inspect('football',{...f,publication_gate:'OPEN'},now);
assert.equal(gates.fresh,false);assert.equal(gates.data,null);
assert.equal(tennisNFL.records.find(event=>event.sport==='tennis').hasModel,false,'incomplete model cannot qualify');
const isolated=S.inspect('other',{...other,sports:{...other.sports,tennis:{
 ...other.sports.tennis,generated_at_utc:new Date(now-25*3600000).toISOString()}}},now);
assert.equal(S.summarize([isolated],now).counts.tennis,null);
assert.equal(S.summarize([isolated],now).counts.nfl,1);
const wrongSport=S.inspect('other',{...other,sports:{...other.sports,tennis:{events:other.sports.nfl.events}}},now);
assert.equal(wrongSport.state,'PARTIAL_RECORDS');
assert.equal(wrongSport.records.some(row=>row.sport==='tennis'),false);
const missing=S.inspect('other',{...other,sports:{tennis:{events:[]}}},now);
assert.equal(missing.state,'PARTIAL_RECORDS');
assert.equal(S.summarize([missing],now).counts.tennis,0);
assert.equal(S.summarize([missing],now).counts.nfl,null);
const sameId={...f.upcoming_fixtures[0],fixture_id:'stable-id'};
const changedTime={...sameId,kickoff_utc:new Date(now+7200000).toISOString()};
for(const upcoming_fixtures of [[sameId,changedTime,sameId],[changedTime,sameId]]){
 const conflict=S.inspect('football',{...f,upcoming_fixtures},now);
 assert.equal(conflict.state,'PARTIAL_RECORDS');
 assert.deepEqual(conflict.records,[]);
}
const absent=S.inspect('racing',{...racing,races:null},now);
assert.equal(absent.records.length,0);
assert.equal(S.inspect('history',history,now).state,'OBSERVED');
const sourceTime=S.stamp('2026-11-12T21:30:00Z');
assert.equal(sourceTime,now);assert.equal(S.stamp('bad'),null);
(async()=>{
 const fake=async()=>({ok:true,json:async()=>f});
 const loaded=await S.load('football','../',fake,now);
 assert.equal(loaded.state,'PARTIAL_RECORDS');
 const fail=await S.load('football','../',async()=>{throw Error('offline')},now);
 assert.equal(fail.state,'UNAVAILABLE');assert.deepEqual(fail.records,[]);
 console.log('PASS: shared source read-only gates, strict ages, valid six-sport counts, schema, deduplication and partial availability');
})().catch(e=>{console.error(e);process.exitCode=1});

const matchEvidence=require('../football-match/core.js');
const eligible={...base,schema_version:1,upcoming_fixtures:[f.upcoming_fixtures[0]]};
const keyed=S.inspect('football',eligible,now,matchEvidence).records[0];
assert.equal(keyed.fixtureKey,JSON.stringify(['PL','City','Forest',keyed.startUTC]));
assert.equal(matchEvidence.fixtureIndex([eligible],now).byExact.get(keyed.fixtureKey).identity[1],'City');
assert.equal(S.inspect('football',f,now,matchEvidence).records[0].fixtureKey,undefined);
assert.equal(matchEvidence.fixtureKey({...f.upcoming_fixtures[0],home:'Forest'}),null);

const raceRow={...racing.races[0],race_id:'12345',name:'Handicap',schedule_cross_checked:true,capture_phase:'PRE_EVENT',race_stage:'DORMANT',runner_observed_at_utc:base.generated_at_utc,
 runner_source:'https://www.sportinglife.com/racing/racecard/12345/handicap',runner_source_sha256:'a'.repeat(64)};
const receipt={...racing,races:[raceRow]};
const loadedRace=S.inspect('racing',receipt,now);
const raceKey=S.detailKey(loadedRace.records[0]);
assert.equal(S.findDetail(loadedRace,raceKey,now).detail.id,'12345');
assert.equal(S.findDetail(loadedRace,raceKey,now+1800000),null,'started race must not resolve');
assert.equal(S.findDetail(S.inspect('racing',{...receipt,generated_at_utc:'2026-11-10T00:00:00Z'},now),raceKey,now),null);
assert.equal(S.findDetail(S.inspect('racing',{...receipt,races:[{...raceRow,runner_source_sha256:'missing'}]},now),raceKey,now),null);
assert.equal(S.findDetail(S.inspect('racing',{...receipt,races:[raceRow,{...raceRow,racecourse:'York'}]},now),raceKey,now),null);
assert.equal(S.findDetail(S.inspect('racing',{...receipt,races:[{...raceRow,startUTC:new Date(now+1900000).toISOString()}]},now),raceKey,now),null);
for (const [sport,id] of [['tennis','atp-1'],['nfl','nfl-1']]) {
 const event={...other.sports[sport].events[0],id,name:'A vs B',participants:[{id:'10',name:'A'},{id:'20',name:'B'}]};
 const fixture=events=>S.inspect('other',{...other,sports:{...other.sports,[sport]:{events}}},now);
 const current=fixture([event]);
 const key=S.detailKey(current.records.find(row=>row.sport===sport));
 assert.equal(S.findDetail(current,key,now).detail.id,id);
 const reversed={...event,participants:[...event.participants].reverse()};
 assert.equal(S.findDetail(fixture([reversed]),key,now),null);
 assert.equal(S.findDetail(fixture([event,reversed]),key,now),null);
}
assert.equal(S.detailKey(dartsFeed.records[0]),null);
assert.equal(S.detailKey(rugbyFeed.records[0]),null);
assert.equal(S.findDetail(S.inspect('racing',{...receipt,races:[{
 ...raceRow,runner_observed_at_utc:new Date(now-31*60000).toISOString()
}]},now),raceKey,now),null,'racecard receipt TTL is stricter than the overview feed TTL');

// An exact current active field is required to join a separate racing vector.
{
 const field=[{horse_id:'1',name:'First',active_runner:true},{horse_id:'2',name:'Second',active_runner:true}];
 const vector=field.map(({horse_id,name})=>({horse_id,name,model_probability:.5}));
 const form={...base,model:'FORM_PERCENTILE_SOFTMAX_RESEARCH_V1',race_id:raceRow.race_id,racecourse:raceRow.racecourse,
  race_name:raceRow.name,startUTC:raceRow.startUTC,source:raceRow.runner_source,runner_observed_at_utc:base.generated_at_utc,
  runner_source_sha256:raceRow.runner_source_sha256,reference_only:false,schedule_cross_checked:true,
  odds:null,expected_value:null,active_runner_count:2,runners:vector};
 const card={...raceRow,runners:field,active_runner_count:2};
 const joined=(rows,race=card)=>{
  const cards=S.inspect('racing',{...base,races:[race]},now);
  return S.racingEvidence(cards.records,cards,{...base,form_forecasts:rows},now);
 };
 assert.equal(joined([form]).get('12345').outcomes.length,2);
 assert.equal(joined([form],{...card,runner_count_changed_since_discovery:true}).size,0);
 assert.equal(joined([form],{...card,runners:[...field,{runner_status:'DOUBTFUL'}]}).size,0);
 assert.equal(joined([form,form]).size,0);
 assert.equal(joined([{...form,runners:[null,vector[1]]}]).size,0);
 assert.equal(joined([{...form,runners:[{...vector[0],model_probability:1},vector[1]]}]).size,0);
}
