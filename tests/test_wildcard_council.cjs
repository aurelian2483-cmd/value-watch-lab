'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C=require('../wildcard/council-core.js');
const now=Date.parse('2026-11-12T23:00:00Z');
const future=new Date(now+4*86400000).toISOString(),gen=new Date(now-3600000).toISOString();
const gates={research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED',generated_at_utc:gen};
const football={...gates,upcoming_fixtures:[{home:'A',away:'B',kickoff_utc:future,verification:'SCHEDULE_CROSS_CHECK',has_experimental_model_forecast:true}],
 experimental_model_forecasts:[{home:'A',away:'B',kickoff_utc:future,prob_home:.58,prob_draw:.27,prob_away:.15,model:'EXPERIMENTAL_FOOTBALL_2026_27',training_basis:{season:'2026_27',verified:true}}]};
const other={...gates,sports:{tennis:{events:[{id:'t1',name:'C vs D',startUTC:future,source:'https://example.org/tennis',
 forecast:{calibrated:false,market:'MATCH_WINNER',model:'ELO',outcomes:[{name:'C',probability:.57,prior_matches:35},{name:'D',probability:.43,prior_matches:45}]}}]},
 nfl:{events:[{id:'n1',name:'E vs F',startUTC:future,source:'https://example.org/nfl',
 forecast:{calibrated:false,market:'NFL_GAME',model:'ELO',outcomes:[{name:'E',probability:.61,prior_matches:30},{name:'F',probability:.39,prior_matches:32}]}}]}}};
const race={race_id:'r1',racecourse:'Ascot',name:'Test Race',startUTC:future,forecast_eligible:true,
 forecast_status:'PRE_EVENT_CONFIRMED',runners:[{name:'Runner A',active_runner:true}]};
const horse={...gates,coverage:{observed_races:1,skipped_count:0,archived_forecast_count:85},
 forecasts:[{race_id:'r1',runner_name:'Runner A',win_probability:.27,model:'EXPERIMENTAL_HORSE'}]};
const racing={...gates,races:[race],coverage_verified:false};
function run(d=[football,other,racing,horse]){
 const ids=['football','other','racing','horse'],r=d.map((x,i)=>C.inspect(ids[i],x,now));
 return C.collect(r,now,14);
}
const card=run();
assert.equal(card.availableCount,4);
const modelMeta={...gates,performance:{metrics_status:'DESCRIPTIVE_ONLY_NOT_MODEL_VALIDATION',scored_forecasts:45,
 independently_verified_results:0,metrics:{mean_multiclass_brier_score:.8956,mean_equal_chance_brier_score:.9013},
 provisional_evaluation:{models:{FORM_PERCENTILE_SOFTMAX_RESEARCH_V1:{status:'DESCRIPTIVE_ONLY_NOT_MODEL_VALIDATION',
 mean_brier_delta_vs_equal_chance:-.0057,brier_delta_bootstrap_95_interval:{lower:-.0132,upper:.0017}}}}}};
const tested=C.collect([...['football','other','racing','horse'].map((id,i)=>C.inspect(id,[football,other,racing,horse][i],now)),
 C.inspect('horse-model',modelMeta,now)],now,14);
assert.equal(tested.horse.modelScore.scored,45);
assert.equal(tested.horse.modelScore.independent,0);
assert(tested.horse.modelScore.interval[0]<0&&tested.horse.modelScore.interval[1]>0);

assert.equal(card.horse.eligible,1);
// Two individually eligible runners in one race must never become two accumulator legs.
const duplicateRace=run([football,other,
 {...racing,races:[{...race,runners:[...race.runners,{name:'Runner B',active_runner:true}]}]},
 {...horse,forecasts:[...horse.forecasts,{race_id:'r1',runner_name:'Runner B',win_probability:.22,model:'EXPERIMENTAL_HORSE'}]}]);
assert.equal(duplicateRace.counts.racing,1,'One race permits at most one horse-win leg');
assert.equal(duplicateRace.exclusions.racingDuplicateRace,1,'Duplicate-race exclusion must be auditable');
assert.equal(new Set(duplicateRace.all.filter(x=>x.meta.sport==='racing').map(x=>x.meta.raceId)).size,1);

assert.equal(card.featured.length,3);
assert(card.featured.some(x=>x.meta.sport==='racing'),'Racing must receive a council lane when real pre-race evidence is available');
assert(card.featured.every(x=>x.odds===null&&x.ev===null&&x.verified===false));
const selection=C.scenarios(card)[0].legs;
const explanation=C.explainCandidate(selection[0]);
assert(explanation.facts.length>=3&&explanation.limitations.length>=3);
assert.equal(explanation.status,'HYPOTHESIS_ONLY');
assert.equal(explanation.modelProbability,selection[0].probability);
assert(!explanation.facts.some(t=>t.includes('verified Sky Bet')));
const compared=C.compareScenario(card,selection);
assert.equal(compared.screened,4);assert.equal(compared.displayed,2);
assert.equal(compared.unshown,2);
assert(compared.reason.includes('NOT an EV'));
const alternate=C.scenarios(card)[1].legs;
assert.equal(C.council(card,alternate)[1].cardSports,new Set(alternate.map(x=>x.meta.sport)).size);
assert.equal(C.council(card).length,3);
assert(C.council(card).every(x=>x.signoff==='AUTOMATED_METHOD_LENS_ONLY'));
assert.equal(C.scenarios(card).length,2,'One council card plus challenger; not four repackaged slips');
const staleHorse={...horse,generated_at_utc:new Date(now-7*3600000).toISOString()};
const noHorse=run([football,other,racing,staleHorse]);
assert.equal(noHorse.horse.eligible,0);
assert.equal(noHorse.horse.status,'SOURCE_UNAVAILABLE');
const historical=run([football,other,racing,{...horse,forecasts:[],coverage:{observed_races:21,archived_forecast_count:85,skipped_count:21}}]);
assert.equal(historical.horse.eligible,0);assert.equal(historical.horse.historical,85);
assert.equal(historical.horse.status,'NO_CURRENT_PRE_RACE_FORECASTS');
assert(!historical.featured.some(x=>x.meta.sport==='racing'),'Historic horse forecasts must never appear as live legs');
const nonrunner=run([football,other,{...racing,races:[{...race,runners:[{name:'Runner A',active_runner:false}]}]},horse]);
assert.equal(nonrunner.horse.eligible,0);
const postevent=run([football,other,{...racing,races:[{...race,forecast_status:'POST_EVENT_OR_NOT_CONFIRMED_PRE_EVENT'}]},horse]);
assert.equal(postevent.horse.eligible,0);
const lastSeason=run([{...football,experimental_model_forecasts:football.experimental_model_forecasts.map(x=>({...x,model:'POISSON_BASELINE_2025_26_V1',training_basis:null}))},other,racing,horse]);
assert.equal(lastSeason.counts.football,0,'Previous season is not a verified current-season forecast');
assert.equal(lastSeason.exclusions.footballCurrentSeason,1);
const unverified=run([{...football,publication_gate:'OPEN'},other,racing,horse]);
assert.equal(unverified.counts.football,0);
assert.equal(C.inspect('football',{...football,generated_at_utc:new Date(now+900000).toISOString()},now).state,'STALE_OR_UNDATED');
const slim=C.collect([C.inspect('football',football,now)],now,7);
assert.equal(slim.counts.racing,0);
assert.equal(C.hypotheticalReturn([2,3],1).gross,6);
assert.equal(C.hypotheticalReturn([2,3],1).winningProbability,null);
assert.equal(C.hypotheticalReturn([2,3],1).expectedValue,null);
for(const bad of [[],[1],[1,2],[2,Infinity],[2,1001]])assert.equal(C.hypotheticalReturn(bad,1),null);
assert.equal(C.hypotheticalReturn([2,3],11),null);
for(const p of ['wildcard/index.html','wildcard/council.js','wildcard/council.css']){
 const s=fs.readFileSync(p,'utf8');
 assert(!s.includes('ROI +11.6%')&&!s.includes('Napoli vs Lazio'));
}
new vm.Script(fs.readFileSync('wildcard/council.js','utf8'));
const home=fs.readFileSync('index.html','utf8');
assert(fs.readFileSync('wildcard/index.html','utf8').includes('ticket-selection-note'));
assert(fs.readFileSync('wildcard/index.html','utf8').includes('ticket-review-strip'));
assert(fs.readFileSync('wildcard/council.js','utf8').includes('make(\'strong\',content,x.name)'));
assert(home.includes('href="./wildcard/"')&&home.includes('wildcard-council-launch'));
assert(home.includes('paper-lab/engine.js')&&home.includes('paper-lab/store.js'));
assert.equal((home.match(/data-slot="\d+"/g)||[]).length,4);
console.log('PASS: three distinct methods, racing pre-event eligibility, historic/nonrunner rejection, speculative scenarios, source gates and no invented EV');
