'use strict';
const assert=require('node:assert/strict');
const {summarize}=require('../research/market-benchmark/tipsaudit-benchmark.cjs');
const header='id,kickoff_utc,league,result,void_reason,pin_close_home,pin_close_draw,pin_close_away\n';
const rows=[
 'a,2026-09-01T15:00:00Z,Premier League,1,,2.00,3.50,4.00',
 'b,2026-09-01T17:00:00Z,Premier League,X,,2.20,3.10,3.80',
 'c,2026-09-01T19:00:00Z,Premier League,,postponed,2.20,3.10,3.80',
 'd,2026-09-02T19:00:00Z,La Liga,2,,2.20,,3.80',
 'e,2026-09-03T19:00:00Z,La Liga,, ,2.20,3.10,3.80',
 'a,2026-09-01T15:00:00Z,Premier League,1,,2.00,3.50,4.00'
].join('\n')+'\n';
const v=summarize(header+rows,{source_sha:'test-sha'});
assert.equal(v.status,'EXTERNAL_MARKET_BENCHMARK_UNVALIDATED');
assert.equal(v.counts.submitted,6);
assert.equal(v.counts.scored,2);
assert.equal(v.counts.excluded,4);
assert.equal(v.counts.reasons.void,1);
assert.equal(v.counts.reasons.missing_or_invalid_market,1);
assert.equal(v.counts.reasons.missing_result,1);
assert.equal(v.counts.reasons.duplicate_id,1);
assert.equal(v.counts.leagues_on_scored_rows,1);
assert.equal(v.source_blob_sha,'test-sha');
assert(Number.isFinite(v.metrics.closing_market_log_loss));
assert(Number.isFinite(v.metrics.closing_market_multiclass_brier));
assert.equal(v.publication_gate,'BLOCKED');
assert(!JSON.stringify(v).includes('Premier League'));
assert.throws(()=>summarize('a,b\n1,2'),/schema/);
assert.throws(()=>summarize('id,id,result,void_reason,pin_close_home,pin_close_draw,pin_close_away,league,kickoff_utc\n'),/schema/);
console.log('CC BY football market benchmark: schema, exclusions, scoring and safeguards passed');
