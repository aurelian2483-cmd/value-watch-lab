'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {summarize,PROB_BINS,ODDS_BINS}=require('../research/match-intelligence/stage15-outcome-odds-calibration.cjs');
const data=[
 {id:'f1',date:'2024-12-01',actual:0,model:[.5,.25,.25],market:[.5,.25,.25],odds:[2.5,3.5,4],score:'1-0'},
 {id:'f2',date:'2024-12-02',actual:1,model:[.5,.25,.25],market:[.5,.25,.25],odds:[2.5,3.5,4],score:'0-0'},
 {id:'f3',date:'2024-12-03',actual:2,model:[.5,.25,.25],market:[.5,.25,.25],odds:[2.5,3.5,4],score:'0-1'}
];
test('each fixture contributes precisely once to each all-match outcome class',()=>{
 const r=summarize(data,{id:'raw',share:1,maxOdds:null});
 for(const name of ['HOME','DRAW','AWAY'])assert.equal(r.all_match_outcome_calibration[name].n,3);
 assert.equal(r.all_match_outcome_calibration.HOME.expected_wins,1.5);
 assert.equal(r.all_match_outcome_calibration.HOME.observed_wins,1);
 assert.equal(r.all_match_outcome_calibration.DRAW.expected_wins,.75);
 assert.equal(r.all_match_outcome_calibration.DRAW.observed_wins,1);
 assert.equal(r.all_match_outcome_calibration.AWAY.expected_wins,.75);
 assert.equal(r.all_match_outcome_calibration.AWAY.observed_wins,1);
});
test('selected class x odds reconciles to wins, stakes and P/L',()=>{
 const r=summarize(data,{id:'raw',share:1,maxOdds:null});
 assert.equal(r.selections+r.passes,3);
 assert.equal(r.selections,3);
 assert.equal(r.selected_outcome_calibration.HOME.n,3);
 assert.equal(r.selected_outcome_calibration.DRAW.n,0);
 assert.equal(r.selected_outcome_calibration.AWAY.n,0);
 assert.equal(r.selected_odds_bands.reduce((x,b)=>x+b.n,0),r.selections);
 assert.equal(r.selected_outcome_x_odds.HOME.reduce((x,b)=>x+b.n,0),3);
 assert.equal(r.selected_outcome_calibration.HOME.observed_wins,1);
 assert.equal(r.selected_outcome_calibration.HOME.profit_units,-.5);
});
test('odds cap can move selection to different market or PASS',()=>{
 const r=summarize([{id:'f',date:'2024-01-01',actual:0,score:'0-1',
  model:[.65,.1,.25],market:[.65,.1,.25],odds:[1.8,3.5,10]}],
  {id:'capped',share:1,maxOdds:5});
 assert.equal(r.selections,1);
 assert.equal(r.selected_outcome_calibration.HOME.n,1);
 assert.equal(r.selected_outcome_calibration.AWAY.n,0);
});
test('invalid odds selected are excluded from histogram',()=>{
 const r=summarize([{id:'x',date:'2024-01-01',actual:2,score:'0-1',
  model:[.6,.2,.2],market:[.6,.2,.2],odds:[1.3,4,4]}],
  {id:'pass',share:1,maxOdds:5});
 assert.equal(r.selections,0);
 assert.equal(r.passes,1);
});
test('probability bins and odds bins cover class boundaries',()=>{
 assert.equal(PROB_BINS.length,5);
 assert.deepEqual(ODDS_BINS.map(b=>b.id),['below-2','2-to-below-3','3-to-below-5','5-to-below-10','10-plus']);
 const r=summarize(data,{id:'raw',share:1,maxOdds:null});
 for(const name of ['HOME','DRAW','AWAY'])assert.equal(
   r.all_match_probability_bands[name].reduce((a,b)=>a+b.n,0),3);
});
