'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {pick,pairedProfitUncertainty}=require('../research/match-intelligence/fixture-winnings-audit.cjs');
test('bet-selection uses maximal expected value, not maximum win probability',()=>{
 const p=pick([.65,.20,.15],[1.3,4,10],2);
 assert.equal(p.selection,'AWAY');
 assert.equal(p.odds,10);
 assert.equal(p.won,true);
 assert.equal(p.pnl,9);
});
test('PASS creates zero profit and no stake',()=>{
 const p=pick([.5,.3,.2],[1.8,3,4],0);
 assert.equal(p.selection,'PASS');
 assert.equal(p.pnl,0);
 assert.equal(p.won,null);
});
test('losing hypothetical selection loses exactly one unit',()=>{
 const p=pick([.5,.2,.3],[3,4,4],1);
 assert.equal(p.pnl,-1);
});
test('missing complete archived quote produces PASS, not a wager',()=>{
 const p=pick([.5,.3,.2],null,0);
 assert.equal(p.selection,'PASS');
 assert.equal(p.pnl,0);
});
test('matched-fixture profit comparison resamples entire fixture dates',()=>{
 const rows=Array.from({length:60},(_,i)=>({date:'2024-11-'+String(i%20+1).padStart(2,'0'),
  archive_open_odds:[2,3,4],delta_new_minus_old:i%2===0?1:-1}));
 const p=pairedProfitUncertainty(rows,{draws:500,seed:11});
 assert.equal(p.paired_priced_fixtures,60);
 assert.equal(p.fixture_date_clusters,20);
 assert.equal(p.observed_total_profit_difference_units,0);
 assert.ok(p.bootstrap_95_percent_interval_for_total_units[0]<0);
 assert.ok(p.bootstrap_95_percent_interval_for_total_units[1]>0);
});
