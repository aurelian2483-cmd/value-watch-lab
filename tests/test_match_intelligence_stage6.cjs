'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {buildAvailabilitySnapshot}=require('../research/match-intelligence/availability-snapshot.js');
const fixture={home:'Chelsea',away:'Leeds United',kickoff_utc:'2026-11-21T15:00:00Z'},as_of_utc='2026-11-14T18:00:00Z';
const source={id:'x1',team:'Chelsea',player:'Test Player',status:'OUT_FOR_PRIOR_FIXTURE',scope:'PRIOR_MATCH',published_date:'2026-11-06',source_title:'Club update',source_url:'https://example.org/a',content_note:'Club report concerning earlier match'};
test('historical absence cannot become confirmed target absence',()=>{
 const x=buildAvailabilitySnapshot({fixture,as_of_utc,claims:[source]});
 assert.equal(x.retained_claims[0].target_match_readiness,'HISTORICAL_CONTEXT_ONLY');
 assert.equal(x.teams[0].confirmed_target_absences.length,0);
 assert.equal(x.teams[0].injury_impact,null);
 assert.equal(x.publication_gate,'BLOCKED');
});
test('later dated sources excluded',()=>{
 const x=buildAvailabilitySnapshot({fixture,as_of_utc,claims:[{...source,published_date:'2026-11-15'}]});
 assert.equal(x.retained_claims.length,0);
 assert.equal(x.excluded_claims[0].reason,'PUBLICATION_DATE_AFTER_SNAPSHOT');
});
test('after snapshot exact publication timestamp excluded',()=>{
 const x=buildAvailabilitySnapshot({fixture,as_of_utc,claims:[{...source,published_at_utc:'2026-11-14T19:00:00Z'}]});
 assert.equal(x.excluded_claims[0].reason,'PUBLICATION_TIME_AFTER_SNAPSHOT');
});
test('invalid fixture and scope fail closed',()=>{
 assert.throws(()=>buildAvailabilitySnapshot({fixture,as_of_utc:'2026-11-21T15:00:00Z'}));
 assert.throws(()=>buildAvailabilitySnapshot({fixture,as_of_utc,claims:[{...source,status:'OUT_FOR_TARGET'}]}));
 assert.throws(()=>buildAvailabilitySnapshot({fixture,as_of_utc,claims:[{...source,team:'Arsenal'}]}));
});
test('source catalog remains provenance-only',()=>{
 const data=require('../research/match-intelligence/chelsea-leeds-2026-11-21-snapshot.json');
 const x=buildAvailabilitySnapshot(data);
 assert.equal(x.retained_claims.length,9);
 assert.equal(x.teams.find(t=>t.team==='Chelsea').historical_context_count,5);
 assert.equal(x.teams.find(t=>t.team==='Leeds United').historical_context_count,4);
 assert.ok(x.teams.every(t=>t.confirmed_target_absences.length===0));
});
