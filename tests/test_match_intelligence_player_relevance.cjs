'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {auditPlayerRelevance}=require('../research/match-intelligence/player-relevance-gate.js');
const fixture={home:'Example Home',away:'Example Away',kickoff_utc:'2026-11-21T15:00:00Z'},cutoff_utc='2026-11-21T10:00:00Z';
function player(over={}){
 return {id:'p1',team:'Example Home',first_known_at_utc:'2026-11-20T08:00:00Z',
 observed_at_utc:'2026-11-20T08:00:00Z',source_url:'https://example.org/historical-capture',
 evidence_class:'ARCHIVED_PREMATCH',expected_minutes:60,baseline_reference_minutes:90,
 training_matches:50,effect_mean:.18,effect_interval:[.12,.25],
 form_multiplier:1,matchup_multiplier:1,...over};
}
const run=players=>auditPlayerRelevance({fixture,cutoff_utc,players});
test('adequately supported nonzero candidate remains research only',()=>{
 const r=run([player()]);
 assert.equal(r.candidates.length,1);
 assert.equal(r.excluded.length,0);
 assert.ok(r.candidates[0].signed_attack_example_shift<0);
 assert.equal(r.publication_gate,'BLOCKED');
 assert.equal(r.probability_adjustment,null);
 assert.equal(r.player_effects_fitted_here,false);
});
test('zero-crossing effect is NOT asserted relevant',()=>{
 const r=run([player({effect_mean:.03,effect_interval:[-.12,.14]})]);
 assert.equal(r.candidates.length,0);
 assert.ok(r.excluded[0].reasons.includes('EFFECT_INCLUDES_ZERO'));
});
test('weak sample and wide uncertainty both cause exclusion',()=>{
 const r=run([player({training_matches:3,effect_mean:.3,effect_interval:[.01,.9]})]);
 assert.equal(r.excluded.length,1);
 assert.ok(r.excluded[0].reasons.includes('INSUFFICIENT_MATCH_SAMPLE'));
 assert.ok(r.excluded[0].reasons.includes('EFFECT_UNCERTAINTY_TOO_WIDE'));
});
test('historical after-cutoff information is rejected',()=>{
 const r=run([player({first_known_at_utc:'2026-11-21T13:00:00Z'})]);
 assert.ok(r.excluded[0].reasons.includes('EVIDENCE_AFTER_CUTOFF'));
});
test('missing minutes are not silently replaced by zero',()=>{
 const r=run([player({expected_minutes:null})]);
 assert.equal(r.excluded[0].signed_attack_example_shift,null);
 assert.ok(r.excluded[0].reasons.includes('EXPECTED_MINUTES_UNKNOWN'));
});
test('hypothetical inputs are not treated as evidence of true effect',()=>{
 const r=run([player({evidence_class:'HYPOTHETICAL'})]);
 assert.ok(r.excluded[0].reasons.includes('NOT_EMPIRICAL_PREMATCH_EVIDENCE'));
});
test('negative effects and reverse minute differences preserve sign',()=>{
 const r=run([player({effect_mean:-.2,effect_interval:[-.3,-.1],expected_minutes:90,baseline_reference_minutes:0})]);
 assert.equal(r.candidates.length,1);
 assert.ok(r.candidates[0].signed_attack_example_shift<0);
});
test('duplicate IDs, wrong team, inconsistent intervals fail closed',()=>{
 assert.throws(()=>run([player(),player()]),/Repeated/);
 assert.throws(()=>run([player({team:'Another'})]),/does not match/);
 assert.throws(()=>run([player({effect_mean:.5,effect_interval:[.1,.2]})]),/must contain/);
 assert.throws(()=>run([player({effect_interval:[.5,.1]})]),/must contain/);
});
test('snapshot must precede kickoff and verified source metadata required',()=>{
 assert.throws(()=>auditPlayerRelevance({fixture,cutoff_utc:fixture.kickoff_utc,players:[]}));
 const r=run([player({source_url:'http://example.com'})]);
 assert.ok(r.excluded[0].reasons.includes('MISSING_HTTPS_PROVENANCE'));
});
