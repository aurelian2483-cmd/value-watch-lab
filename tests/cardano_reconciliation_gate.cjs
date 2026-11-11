'use strict';
const assert=require('node:assert/strict'),G=require('../cardano-lab/reconciliation-gate.js');
const p={prediction_id:'p1',event_id:'e1',issued_at_utc:'2026-01-01T10:00:00Z',event_at_utc:'2026-01-02T10:00:00Z',outcomes:['HOME','AWAY'],prediction_sha256:'a'.repeat(64)};
const r={receipt_id:'r1',event_id:'e1',observed_at_utc:'2026-01-02T12:00:00Z',source_url:'https://example.org/results',source_sha256:'b'.repeat(64),outcome:'HOME'};
const verified={receipt_id:'r1',source_url:r.source_url,declared_sha256:r.source_sha256,hash_matches:true,verification_level:'BYTES_MATCH_DECLARED_HASH',publisher_authenticated:false,source_fetched:false};
const ok=G.assess([p],[r],[verified]);
assert.equal(ok.complete_for_offline_integrity,true);assert.equal(ok.byte_matched.length,1);
assert.equal(ok.externally_verified,false);assert.equal(ok.eligible_for_real_world_scoring,false);
assert.equal(ok.publication_gate,'BLOCKED');
for(const report of [{...verified,hash_matches:false},{...verified,declared_sha256:'c'.repeat(64)},{...verified,source_url:'https://wrong.example.org'},{...verified,verification_level:'UNVERIFIED'}]){
 const bad=G.assess([p],[r],[report]);assert.equal(bad.byte_matched.length,0);assert.equal(bad.blocked.length,1);
}
assert.equal(G.assess([p],[r],[]).complete_for_offline_integrity,false);
assert.equal(G.assess([p],[r],[verified,verified]).complete_for_offline_integrity,false);
assert.equal(G.assess([p],[r],[{...verified,receipt_id:'unknown'}]).unknown_integrity_reports.length,1);
assert.throws(()=>G.assess([p],[r],null),/array/);
console.log('PASS Cardano reconciliation offline integrity gate and negative cases');
