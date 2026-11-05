const assert=require('node:assert/strict'),C=require('../racecards-core.js');
const now=Date.parse('2026-11-04T06:00:00Z'),r={race_id:'1',startUTC:'2026-11-04T14:00:00Z',race_stage:'DORMANT',runner_data_status:'SINGLE_SOURCE_RUNNERS_OBSERVED',runner_source_sha256:'a',runner_source:'https://example.org/card',active_runner_count:2,runners:[{horse_id:'a',name:'Alpha',active_runner:true,runner_status:'RUNNER'},{horse_id:'b',name:'Beta',active_runner:true,runner_status:'RUNNER'}],market_observation:{status:'COMPLETE_SOURCE_OBSERVATION',bookmaker:'Sky Bet',executable_verified:false,verification:'SOURCE_OBSERVED_UNVERIFIED',source_sha256:'a',source:'https://example.org/card',bookmaker_market_id:'m',observed_at_utc:'2026-11-04T05:55:00Z',quotes:[{horse_id:'a',decimal:2},{horse_id:'b',decimal:3}]}};
assert.equal(C.market(r,now).favourites[0].name,'Alpha');assert(C.market(r,now).fresh);assert.equal(C.market(r,now+3600000).fresh,false);assert.equal(C.market(r,now+3600000).favourites.length,0);
assert.equal(C.market({...r,runner_data_status:'RUNNER_FIELD_UNCONFIRMED'},now).valid,false);
assert.equal(C.market({...r,market_observation:{...r.market_observation,quotes:[{horse_id:'a',decimal:2}]}},now).valid,false);
const model={race_id:'1',startUTC:r.startUTC,generated_at_utc:'2026-11-04T05:30:00Z',runners:[{horse_id:'a',model_probability:.1},{horse_id:'b',model_probability:.9}]};assert.equal(C.matchingModel(r,[model]).runners[1].horse_id,'b');assert.equal(C.matchingModel({...r,runners:[r.runners[0]]},[model]),null);assert.equal(C.matchingModel(r,[{...model,generated_at_utc:r.startUTC}]),null);
console.log('Racecard favourite, stale observations and model-field matching checks passed');


const mixed=[...Array.from({length:12},(_,i)=>({kind:'tennis',id:'t'+i})),{kind:'football',id:'f1'},{kind:'football',id:'f2'},{kind:'racecard',id:'h1'},{kind:'racecard',id:'h2'},{kind:'nfl',id:'n1'},{kind:'nfl',id:'n2'}];
const balanced=C.balanced(mixed);
assert.deepEqual(balanced.slice(0,8).map(x=>x.kind),['football','racecard','tennis','nfl','football','racecard','tennis','nfl']);
assert.deepEqual(balanced.filter(x=>x.kind==='tennis').map(x=>x.id),mixed.filter(x=>x.kind==='tennis').map(x=>x.id));
assert.equal(balanced.length,mixed.length);
assert.equal(new Set(balanced.map(x=>x.id)).size,mixed.length);
assert.deepEqual(C.balanced([]),[]);
console.log('All sports preview includes every available sport and preserves within-sport order');

assert.equal(C.market(r,Date.parse(r.startUTC)).favourites.length,0);
assert.equal(C.market({...r,race_stage:'PARADING'},now).favourites.length,0);
const nr={...r,active_runner_count:2,runners:[{...r.runners[0],runner_status:'NONRUNNER',active_runner:false},r.runners[1],{horse_id:'c',name:'Gamma',runner_status:'RUNNER',active_runner:true}],market_observation:{...r.market_observation,quotes:[{horse_id:'b',decimal:3},{horse_id:'c',decimal:4}]}};
assert.equal(C.market(nr,now).favourites[0].name,'Beta');
assert.equal(C.market({...nr,market_observation:r.market_observation},now).favourites.length,0,'obsolete quotes containing a non-runner fail closed');
