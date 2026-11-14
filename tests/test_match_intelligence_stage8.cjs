'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {buildPlayerImpactPreflight}=require('../research/match-intelligence/player-impact-preflight');
const archive={club:'Chelsea FC',tmId:631,season:'2024',scrapedAt:'2026-03-27T22:06:40Z',
 competitions:[{code:'GB1',players:Array.from({length:11},(_,i)=>({name:'P'+i,tmId:i+1,matches:[{round:'1',status:'starting'}]}))}]};
const fixture={fixture_id:'2024-che-ars',home:'Chelsea FC',away:'Arsenal FC',kickoff_utc:'2024-11-10T16:30:00Z',season:'2024',competition:'GB1'};
const map={fixture_id:fixture.fixture_id,round:1,verifier_type:'LEAGUE',verifier_url:'https://example.org/fixture'};
const ev=(change={})=>({record_id:'availability1',fixture_id:fixture.fixture_id,player_id:1,status:'AVAILABLE',
 first_known_at_utc:'2024-11-09T12:00:00Z',observed_at_utc:'2024-11-09T12:00:00Z',
 forecast_cutoff_utc:'2024-11-10T12:00:00Z',source_url:'https://example.org/club',...change});
test('unmapped rounds do not become player-impact training examples',()=>{
 const r=buildPlayerImpactPreflight({archive,fixtures:[],fixtureMapping:[]});
 assert.ok(r.matches[0].issues.includes('MISSING_VERIFIED_FIXTURE_MAPPING'));
 assert.equal(r.model_training_executed,false);
 assert.equal(r.player_impact_coefficients,null);
});
test('mapped past XI with no archived prematch report remains not ready',()=>{
 const r=buildPlayerImpactPreflight({archive,fixtures:[fixture],fixtureMapping:[map]});
 assert.equal(r.matches[0].fixture_id,fixture.fixture_id);
 assert.ok(r.matches[0].issues.includes('NO_ARCHIVED_PREMATCH_AVAILABILITY'));
 assert.equal(r.matches[0].training_eligible,false);
});
test('cutoff-valid player record is counted but not promoted to a fitted effect',()=>{
 const r=buildPlayerImpactPreflight({archive,fixtures:[fixture],fixtureMapping:[map],availabilityEvidence:[ev()]});
 assert.equal(r.matches[0].verified_cutoff_evidence_records,1);
 assert.equal(r.matches[0].training_eligible,false);
 assert.equal(r.probability_adjustment,null);
});
test('information published after the frozen forecast is flagged',()=>{
 const r=buildPlayerImpactPreflight({archive,fixtures:[fixture],fixtureMapping:[map],
 availabilityEvidence:[ev({first_known_at_utc:'2024-11-10T15:00:00Z'})]});
 assert.ok(r.matches[0].issues.includes('POST_CUTOFF_PLAYER_EVIDENCE'));
 assert.equal(r.matches[0].verified_cutoff_evidence_records,0);
});
test('invalid mapping, invalid cutoff and duplicate IDs fail closed',()=>{
 assert.throws(()=>buildPlayerImpactPreflight({archive,fixtures:[fixture],fixtureMapping:[{...map,verifier_url:'http://example.com'}]}));
 assert.throws(()=>buildPlayerImpactPreflight({archive,fixtures:[fixture,fixture],fixtureMapping:[]}));
 assert.throws(()=>buildPlayerImpactPreflight({archive,fixtures:[fixture],fixtureMapping:[map],availabilityEvidence:[ev({forecast_cutoff_utc:fixture.kickoff_utc})]}));
});
test('fixture club/season constraints and unavailable evidence sources are rejected',()=>{
 assert.throws(()=>buildPlayerImpactPreflight({archive,fixtures:[{...fixture,home:'Leeds United'}],fixtureMapping:[map]}));
 assert.throws(()=>buildPlayerImpactPreflight({archive,fixtures:[fixture],fixtureMapping:[map],availabilityEvidence:[ev({source_url:null})]}));
});
