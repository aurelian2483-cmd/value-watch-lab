'use strict';
const assert=require('node:assert/strict');
const {privateMarketSummary,parseCSV}=require('../research/market-benchmark/import-football-csv.cjs');
const input='Div,HomeTeam,AwayTeam,FTR,AvgCH,AvgCD,AvgCA\r\n'
  +'E0,"Club, A",Club B,H,2.0,3.5,4.0\r\n'
  +'E0,Club C,Club D,D,2.2,3.0,3.7\r\n'
  +'E0,Club E,Club F,A,1.8,3.6,5.1\r\n'
  +'E0,Club G,Club H,,1.8,3.6,5.1\r\n'
  +'E0,Club I,Club J,H,2.0,,4.0\r\n';
assert.equal(parseCSV(input).length,6);
assert.equal(parseCSV(input)[1][1],'Club, A');
const result=privateMarketSummary(input,{personalUseConfirmed:true});
assert.equal(result.status,'HISTORICAL_MARKET_ONLY_UNATTESTED');
assert.equal(result.counts.total,5);
assert.equal(result.counts.scored,3);
assert.equal(result.counts.missing_outcome,1);
assert.equal(result.counts.invalid_prices,1);
assert(Number.isFinite(result.market_only.mean_log_loss));
assert(Number.isFinite(result.market_only.mean_multiclass_brier));
assert.equal(result.publication_gate,'BLOCKED');
const text=JSON.stringify(result);
assert(!text.includes('Club, A'));
assert(!text.includes('Club B'));
assert(!text.includes('2.2'));
assert.throws(()=>privateMarketSummary(input),/Confirm permitted/);
assert.throws(()=>privateMarketSummary(input,{pricePrefix:'B365C',personalUseConfirmed:true}),/Required/);
assert.throws(()=>privateMarketSummary(input,{pricePrefix:'BAD',personalUseConfirmed:true}),/Unsupported/);
assert.throws(()=>parseCSV('a,b\n"bad,hi\n'),/Unclosed/);
assert.equal(privateMarketSummary('FTR,AvgCH,AvgCD,AvgCA\nH,0,3,3',{personalUseConfirmed:true}).status,'NO_ELIGIBLE_MARKETS');
console.log('Manual football historical closing-odds adapter: passed');
