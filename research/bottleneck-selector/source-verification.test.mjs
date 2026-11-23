import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSourceVerificationDossier} from './source-verification.mjs';

const H='a'.repeat(64),K='b'.repeat(64),L='c'.repeat(64);
const pkt=(id='t-1')=>({
  prediction_id:id,event_id:id,sport:'tennis',model_version:'FIXED_ELO_K24_V1',
  market:'MATCH_WINNER',result_claim:'player1',
  scheduled_start_utc:'2026-11-21T12:00:00Z',
  forecast_recorded_at_utc:'2026-11-21T08:00:00Z',
  snapshot_sha256:H,source_label:'Player 1 versus Player 2',
  source_description:'Final singles result',receipt_kind:'Tournament PDF receipt',
  primary:{url:'https://site.api.espn.com/apis/site/v2/sports/tennis/wta/scoreboard',
    observed:'2026-11-21T14:00:00Z',hash:K},
  secondary:{url:'https://wtafiles.wtatennis.com/archive.pdf',
    observed:'2026-11-21T15:00:00Z',hash:L},
  review_state:'REVIEW_PACKET_READY_UNATTESTED',
  external_authenticity_established:false,independent_outcome_verified:false,
  linked_dropdown_engine:null,scoring_authorised:false,betting_eligible:false
});
const doc=()=>({
  schema_version:1,kind:'BOTTLENECK_RESULT_REVIEW_WORKLIST_V1',
  research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED',
  selected_method:null,selection_eligible:false,engine_mapping_status:'NONE_AUTHENTICATED',
  snapshot_time_replay:true,live_freshness_not_established:true,
  generated_from_snapshot_utc:'2026-11-23T16:00:00Z',
  ready_claims:1,review_packets:1,withheld_ready_claims:0,
  verified_outcome_archive_rows:0,
  packets:[pkt()]
});
const clone=x=>structuredClone(x);
const build=x=>buildSourceVerificationDossier(x||doc());

test('builds source-identity dossier without approving or selecting an engine',()=>{
  const out=build();
  assert.equal(out.kind,'BOTTLENECK_SOURCE_VERIFICATION_DOSSIER_V1');
  assert.equal(out.inspectable_packets,1);
  assert.equal(out.source_independence_certified,0);
  assert.equal(out.certified_outcomes_added,0);
  assert.equal(out.selected_method,null);
  assert.equal(out.automatic_scoring_authorised,false);
  assert.equal(out.status,'REVIEW_READY_NOT_INDEPENDENTLY_VERIFIED');
});
test('source host distinction is a hint, never independent verification',()=>{
  const out=build();
  const row=out.packets[0];
  assert.equal(row.source_hosts_distinct,true);
  assert.equal(row.upstream_source_independence,'NOT_ESTABLISHED');
  assert.equal(row.original_raw_response_authenticity,'NOT_ESTABLISHED');
  assert.equal(row.external_human_review,'NOT_PERFORMED');
  assert.equal(row.independently_verified_outcome,false);
  assert.equal(row.scoring_authorised,false);
  assert.equal(row.verified_dropdown_engine,null);
});
test('source hashes and exact forecast receipt retained as integrity pointers',()=>{
  const out=build();
  const row=out.packets[0];
  assert.equal(row.forecast_receipt,H);
  assert.equal(row.first_source.digest_sha256,K);
  assert.equal(row.second_source.digest_sha256,L);
  assert.match(row.receipt_pair_fingerprint,/^[a-f0-9]{64}$/);
});
test('fails closed on invalid worklist or forged release state',()=>{
  for(const change of [
    x=>x.publication_gate='OPEN',x=>x.selected_method='current',
    x=>x.selection_eligible=true,x=>x.model_validation='VALIDATED',
    x=>x.engine_mapping_status='VERIFIED',x=>x.live_freshness_not_established=false
  ]) {const x=doc();change(x);assert.throws(()=>build(x),/Unsafe or untraceable/);}
});
test('refuses false review or betting certification inside packet',()=>{
  for(const change of [
    x=>x.independent_outcome_verified=true,
    x=>x.scoring_authorised=true,
    x=>x.betting_eligible=true,
    x=>x.external_authenticity_established=true,
    x=>x.linked_dropdown_engine='current'
  ]){const x=doc();change(x.packets[0]);assert.throws(()=>build(x),/Unsafe result packet/);}
});
test('same-host sources and invalid URL are rejected',()=>{
  const x=doc();x.packets[0].secondary.url='https://site.api.espn.com/results';
  assert.throws(()=>build(x),/hosts must differ/);
  const y=doc();y.packets[0].primary.url='http://site.api.espn.com/';
  assert.throws(()=>build(y),/Invalid source URL/);
});
test('hashes must not be missing or identical',()=>{
  const x=doc();x.packets[0].primary.hash='bad';
  assert.throws(()=>build(x),/Missing or duplicated result digests/);
  const y=doc();y.packets[0].secondary.hash=K;
  assert.throws(()=>build(y),/Missing or duplicated result digests/);
});
test('timestamps and five-minute pre-event buffer enforced',()=>{
  const x=doc();x.packets[0].primary.observed='2026-11-21T11:00:00Z';
  assert.throws(()=>build(x),/timestamps contradict/);
  const y=doc();y.packets[0].forecast_recorded_at_utc='2026-11-21T11:59:00Z';
  assert.throws(()=>build(y),/timestamps contradict/);
  const z=doc();z.packets[0].secondary.observed='2026-11-24T01:00:00Z';
  assert.throws(()=>build(z),/timestamps contradict/);
});
test('refuses contradictory counts and duplicate IDs or same event',()=>{
  const x=doc();x.review_packets=2;assert.throws(()=>build(x),/Contradictory worklist counts/);
  const y=doc();y.packets.push(clone(y.packets[0]));
  y.review_packets=2;y.ready_claims=2;
  assert.throws(()=>build(y),/Duplicate forecast identity/);
  const z=doc();const p=clone(z.packets[0]);p.prediction_id='different';z.packets.push(p);
  z.review_packets=2;z.ready_claims=2;
  assert.throws(()=>build(z),/Ambiguous same-event/);
});
test('unsupported market and unsupported source document types fail closed',()=>{
  const x=doc();x.packets[0].market='GAME_RESULT_INCLUDING_OVERTIME';
  assert.throws(()=>build(x),/Unsupported sport-market/);
  const y=doc();y.packets[0].receipt_kind='Fake independent approval';
  assert.throws(()=>build(y),/Unclassified secondary source/);
});
test('zero review packets still yields zero certified results',()=>{
  const x=doc();x.packets=[];x.review_packets=0;x.ready_claims=1;x.withheld_ready_claims=1;
  const out=build(x);
  assert.equal(out.inspectable_packets,0);
  assert.equal(out.certified_outcomes_added,0);
  assert.equal(out.withheld_packets,1);
});
test('multiple sports create audit counts without mixing markets',()=>{
  const x=doc();
  const other=pkt('nfl-1');other.event_id='nfl-1';other.sport='nfl';
  other.market='GAME_RESULT_INCLUDING_OVERTIME';other.receipt_kind='Schedule CSV receipt';
  other.secondary.url='https://github.com/nflverse/games.csv';
  x.packets.push(other);x.ready_claims=2;x.review_packets=2;
  const out=build(x);
  assert.deepEqual(out.by_sport,{nfl:1,tennis:1});
  assert.equal(Object.keys(out.by_source_host_pair).length,2);
});
test('pure and deterministic, no modification of source worklist',()=>{
  const x=doc(),before=JSON.stringify(x);
  assert.deepEqual(build(x),build(x));
  assert.equal(JSON.stringify(x),before);
});
