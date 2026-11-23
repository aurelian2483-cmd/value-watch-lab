import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync,mkdirSync,writeFileSync,symlinkSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {auditRawSourceEvidence} from './raw-source-evidence.mjs';
import {loadLocalOriginalEvidence} from './raw-source-evidence-cli.mjs';

const bytesA=Buffer.from('Original source response A with match result','utf8');
const bytesB=Buffer.from('Original independent claim B','utf8');
const sha=b=>createHash('sha256').update(b).digest('hex');
const H=sha(Buffer.from('frozen-forecast'));
const source=(url,observed_at_utc,digest_sha256)=>({url,observed_at_utc,digest_sha256});
function dossier(){
  return {
    schema_version:1,kind:'BOTTLENECK_SOURCE_VERIFICATION_DOSSIER_V1',
    research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED',
    selected_method:null,automatic_scoring_authorised:false,betting_eligible:false,
    certified_outcomes_added:0,source_independence_certified:0,
    snapshot_time_replay:true,live_freshness_not_established:true,
    generated_from_snapshot_utc:'2026-11-23T16:00:00Z',
    total_ready_claims:1,inspectable_packets:1,withheld_packets:0,
    packets:[{
      prediction_id:'synthetic-tennis:1',sport:'tennis',event_id:'test:1',
      status:'MANUAL_SOURCE_AND_SETTLEMENT_VERIFICATION_REQUIRED',
      independently_verified_outcome:false,verified_dropdown_engine:null,
      scoring_authorised:false,betting_eligible:false,forecast_receipt:H,
      upstream_source_independence:'NOT_ESTABLISHED',
      original_raw_response_authenticity:'NOT_ESTABLISHED',
      external_human_review:'NOT_PERFORMED',
      first_source:source('https://site.api.espn.com/a','2026-11-21T14:00:00Z',sha(bytesA)),
      second_source:source('https://example.org/b','2026-11-21T15:00:00Z',sha(bytesB))
    }]
  };
}
const a=()=>({prediction_id:'synthetic-tennis:1',side:'first_source',
  source_url:'https://site.api.espn.com/a',observed_at_utc:'2026-11-21T14:00:00Z',bytes:bytesA});
const b=()=>({prediction_id:'synthetic-tennis:1',side:'second_source',
  source_url:'https://example.org/b',observed_at_utc:'2026-11-21T15:00:00Z',bytes:bytesB});
const work=(e=[])=>auditRawSourceEvidence(dossier(),e);

test('without original response bytes every source remains missing',()=>{
 const r=work();
 assert.equal(r.inspected_review_packets,1);
 assert.equal(r.source_receipts_expected,2);
 assert.equal(r.raw_sources_missing,2);
 assert.equal(r.hash_consistent_raw_sources,0);
 assert.equal(r.independently_verified_results_added,0);
 assert.equal(r.selected_method,null);
});
test('one preserved source matches hash but remains unauthenticated',()=>{
 const r=work([a()]);
 assert.equal(r.hash_consistent_raw_sources,1);
 assert.equal(r.raw_sources_missing,1);
 assert.equal(r.by_packet[0].first_source.digest_matches_receipt,true);
 assert.equal(r.by_packet[0].first_source.independently_authenticated,false);
 assert.equal(r.by_packet[0].pair_byte_consistency,'INCOMPLETE_OR_CONFLICTING');
});
test('both source hashes matching does not assert independent result',()=>{
 const r=work([a(),b()]);
 assert.equal(r.hash_consistent_raw_sources,2);
 assert.equal(r.raw_sources_missing,0);
 assert.equal(r.by_packet[0].pair_byte_consistency,'BOTH_RESPONSE_HASHES_MATCH_UNATTESTED');
 assert.equal(r.by_packet[0].verified_outcome,false);
 assert.equal(r.by_packet[0].source_independence,'NOT_ATTESTED');
 assert.equal(r.by_packet[0].reviewer_decision,'NOT_RECORDED');
 assert.equal(r.scoring_authorised,false);
 assert.equal(r.betting_eligible,false);
});
test('tampered original bytes are explicitly marked as mismatches',()=>{
 const x=a();x.bytes=Buffer.from('tampered response');
 const r=work([x,b()]);
 assert.equal(r.hash_mismatched_raw_sources,1);
 assert.equal(r.by_packet[0].first_source.status,'ORIGINAL_BYTES_HASH_MISMATCH');
 assert.equal(r.by_packet[0].pair_byte_consistency,'INCOMPLETE_OR_CONFLICTING');
});
test('wrong metadata cannot inherit valid hash authority',()=>{
 const x=a();x.source_url='https://different.example.org/a';
 const y=b();y.observed_at_utc='2026-11-22T15:00:00Z';
 const r=work([x,y]);
 assert.equal(r.source_metadata_conflicts,2);
 assert.equal(r.hash_consistent_raw_sources,0);
 assert.equal(r.by_packet[0].pair_byte_consistency,'INCOMPLETE_OR_CONFLICTING');
});
test('duplicate and unexpected source evidence identities are rejected',()=>{
 assert.throws(()=>work([a(),a()]),/Duplicate source evidence identity/);
 const x=a();x.prediction_id='other';
 assert.throws(()=>work([x]),/Unexpected source evidence identity/);
 const y=a();y.side='unrecognized';
 assert.throws(()=>work([y]),/Invalid source evidence identity/);
});
test('empty, oversized and non-binary source evidence refused',()=>{
 for(const bytes of [new Uint8Array(),Buffer.alloc(3_000_001),'raw text']){
  const x=a();x.bytes=bytes;
  assert.throws(()=>work([x]),/Unsafe or oversized/);
 }
});
test('invalid source snapshot / attempted promotion refused',()=>{
 const mods=[
  x=>x.publication_gate='OPEN',
  x=>x.selected_method='current',
  x=>x.model_validation='VALIDATED',
  x=>x.certified_outcomes_added=1,
  x=>x.automatic_scoring_authorised=true
 ];
 for(const mod of mods){const x=dossier();mod(x);
  assert.throws(()=>auditRawSourceEvidence(x),/Unsafe Bottleneck source dossier/);}
});
test('untrusted source packet or repeated source identity refused',()=>{
 const x=dossier();x.packets[0].independently_verified_outcome=true;
 assert.throws(()=>auditRawSourceEvidence(x),/Untrusted source review packet/);
 const y=dossier();y.packets.push(structuredClone(y.packets[0]));
 y.inspectable_packets=2;y.total_ready_claims=2;
 assert.throws(()=>auditRawSourceEvidence(y),/Duplicate source dossier prediction/);
});
test('source bytes never appear in JSON report, and input remains unchanged',()=>{
 const d=dossier(),data=[a(),b()],original=JSON.stringify(d);
 const r=auditRawSourceEvidence(d,data);
 assert.equal(JSON.stringify(d),original);
 assert(!JSON.stringify(r).includes('Original source response'));
 assert(!JSON.stringify(r).includes('Original independent claim'));
});
test('report is deterministic for identical saved input',()=>{
 assert.deepEqual(work([a(),b()]),work([a(),b()]));
});
test('optional private manifest reads regular local files but does not emit them',()=>{
 const dir=mkdtempSync(join(tmpdir(),'bottleneck-raw-test-'));
 try{
  mkdirSync(join(dir,'raw'));writeFileSync(join(dir,'raw','primary.bin'),bytesA);
  const manifest=join(dir,'private-manifest.json');
  writeFileSync(manifest,JSON.stringify({schema_version:1,kind:'PRIVATE_RESULT_SOURCE_BYTES_V1',
   records:[{prediction_id:'synthetic-tennis:1',side:'first_source',
    source_url:'https://site.api.espn.com/a',observed_at_utc:'2026-11-21T14:00:00Z',
    relative_path:'raw/primary.bin'}]}));
  const items=loadLocalOriginalEvidence(manifest);
  assert.equal(items.length,1);assert.deepEqual(items[0].bytes,bytesA);
  assert.equal(auditRawSourceEvidence(dossier(),items).hash_consistent_raw_sources,1);
 }finally{rmSync(dir,{recursive:true,force:true})}
});
test('private loader rejects path traversal and symlinks',()=>{
 const dir=mkdtempSync(join(tmpdir(),'bottleneck-raw-bad-'));
 try{
  writeFileSync(join(dir,'raw.bin'),bytesA);
  symlinkSync(join(dir,'raw.bin'),join(dir,'linked.bin'));
  const manifest=join(dir,'manifest.json');
  const record=relative_path=>({schema_version:1,kind:'PRIVATE_RESULT_SOURCE_BYTES_V1',
   records:[{prediction_id:'synthetic-tennis:1',side:'first_source',
    source_url:'https://site.api.espn.com/a',
    observed_at_utc:'2026-11-21T14:00:00Z',relative_path}]});
  for(const name of ['../outside.bin','/tmp/test.bin','linked.bin']){
   writeFileSync(manifest,JSON.stringify(record(name)));
   assert.throws(()=>loadLocalOriginalEvidence(manifest),/Unsafe evidence path|Invalid relative evidence filename|Symlink/);
  }
 }finally{rmSync(dir,{recursive:true,force:true})}
});
test('private loader rejects oversized and empty response files',()=>{
 const dir=mkdtempSync(join(tmpdir(),'bottleneck-raw-size-'));
 try{
  const file=join(dir,'response.bin'),manifest=join(dir,'manifest.json');
  const rec={schema_version:1,kind:'PRIVATE_RESULT_SOURCE_BYTES_V1',
    records:[{prediction_id:'synthetic-tennis:1',side:'first_source',
    source_url:'https://site.api.espn.com/a',
    observed_at_utc:'2026-11-21T14:00:00Z',relative_path:'response.bin'}]};
  writeFileSync(manifest,JSON.stringify(rec));
  for(const bytes of [Buffer.alloc(0),Buffer.alloc(3_000_001)]){
   writeFileSync(file,bytes);
   assert.throws(()=>loadLocalOriginalEvidence(manifest),/Invalid or oversized/);
  }
 }finally{rmSync(dir,{recursive:true,force:true})}
});
