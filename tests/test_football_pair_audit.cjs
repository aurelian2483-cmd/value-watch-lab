'use strict';
const assert=require('node:assert/strict');
const {audit,indexKey}=require('../research/market-benchmark/football-pair-audit.cjs');
const header='kickoff_utc,home,away,result,void_reason,pin_close_home,pin_close_draw,pin_close_away\n';
const row='2026-11-07T15:00:00Z,Arsenal,Hull City,1,,1.60,4.0,6.0\n';
const record={kickoff_utc:'2026-11-07T15:00:00+00:00',home:' Arsenal ',away:'Hull City',actual_outcome:'H',
 timestamp_independently_attested:false,challenge_eligible:0,model:'POISSON'};
const a=audit({entries:[record]},header+row);
assert.equal(a.counts.possible_exact_fixture_matches,1);
assert.equal(a.counts.matched_usable_markets,1);
assert.equal(a.counts.unattested_forecast_timestamp,1);
assert.equal(a.counts.eligible_paired_scores,0);
assert.equal(a.publication_gate,'BLOCKED');
assert(!JSON.stringify(a).includes('Arsenal'));
assert.equal(indexKey('2026-11-07T15:00:00Z',' ARSENAL ','hull city'),
  indexKey('2026-11-07T15:00:00+00:00','Arsenal','Hull City'));
const duplicate=audit({entries:[record,record]},header+row);
assert.equal(duplicate.counts.duplicate_archive_fixture,1);
const ambiguous=audit({entries:[record]},header+row+row);
assert.equal(ambiguous.counts.ambiguous_external_identity,1);
assert.equal(ambiguous.counts.matched_usable_markets,0);
const reversed=audit({entries:[record]},header+row.replace('Arsenal,Hull City','Hull City,Arsenal'));
assert.equal(reversed.counts.missing_exact_fixture,1);
const unpriced=audit({entries:[record]},header+row.replace('1.60,4.0,6.0',',4.0,6.0'));
assert.equal(unpriced.counts.incomplete_market_or_result,1);
const outcome=audit({entries:[record]},header+row.replace(',1,,',',X,,'));
assert.equal(outcome.counts.incomplete_market_or_result,1);
assert.throws(()=>audit({entries:null},header+row),/Invalid/);
console.log('Exact historical football pair audit tests passed');
