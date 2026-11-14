'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {auditMatchEvidence,FACTORS}=require('../research/match-intelligence/match-evidence.js');
const fixture={home:'Chelsea',away:'Arsenal',kickoff_utc:'2026-12-01T20:00:00Z'};
const base={fixture,snapshot_at_utc:'2026-11-30T12:00:00Z',baseline:{home:0.3,draw:0.3,away:0.4}};
test('unknown factors are missing and there is no betting output',()=>{
 const x=auditMatchEvidence({...base,evidence:[]});
 assert.equal(x.evidence_factors_missing.length,FACTORS.length);
 assert.equal(x.publication_gate,'BLOCKED');
 assert.equal(x.probability_adjustment,null);
 assert.equal(x.expected_value,null);
 assert.deepEqual(x.baseline_probabilities,{home:0.3,draw:0.3,away:0.4});
});
test('verified prematch evidence passes with source and timestamps',()=>{
 const x=auditMatchEvidence({...base,evidence:[{factor:'lineup_availability',status:'VERIFIED',description:'Official prematch team update (illustrative)',source_url:'https://example.org/official',observed_at_utc:'2026-11-30T08:00:00Z',known_at_utc:'2026-11-30T08:00:00Z'}]});
 assert.equal(x.evidence_factors_with_verified_items,1);
 assert.equal(x.evidence_audit.find(y=>y.factor==='lineup_availability').verified_items,1);
});
test('post-cutoff knowledge is downgraded, never used as verified evidence',()=>{
 const x=auditMatchEvidence({...base,evidence:[{factor:'lineup_availability',status:'VERIFIED',description:'Future team announcement',source_url:'https://example.org/update',observed_at_utc:'2026-11-30T15:00:00Z',known_at_utc:'2026-11-30T15:00:00Z'}]});
 assert.equal(x.evidence_factors_with_verified_items,0);
 assert.equal(x.rejected_or_downgraded.length,1);
});
test('invalid probabilities and post-kickoff snapshots rejected',()=>{
 assert.throws(()=>auditMatchEvidence({...base,baseline:{home:0.4,draw:0.4,away:0.4}}));
 assert.throws(()=>auditMatchEvidence({...base,snapshot_at_utc:'2026-12-01T20:00:00Z'}));
});
test('verified data without a source is rejected',()=>{
 assert.throws(()=>auditMatchEvidence({...base,evidence:[{factor:'expected_goals',status:'VERIFIED',description:'xG number',known_at_utc:'2026-11-30T00:00:00Z',observed_at_utc:'2026-11-30T00:00:00Z'}]}));
});
