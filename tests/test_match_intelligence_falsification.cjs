'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {fit,evaluate,runSimulation,syntheticMatches}=require('../research/match-intelligence/player-impact-falsification');
test('synthetic positive and negative coefficients have recoverable signs',()=>{
 const result=runSimulation({seed:20261114,count:4000,trueCoefficients:[.27,-.19]});
 assert.ok(result.estimated[0]>.08,'first positive coefficient should survive shrinkage');
 assert.ok(result.estimated[1]<-.05,'second negative coefficient should survive shrinkage');
 assert.ok(result.holdout.log_loss_improvement>0,'simulation challenger should improve synthetic holdout');
 assert.equal(result.real_world_validation,'NOT_ATTEMPTED');
});
test('reversing generated player contributions reverses fitted coefficients',()=>{
 const result=runSimulation({seed:20261116,count:4000,trueCoefficients:[-.25,.15]});
 assert.ok(result.estimated[0]<-.08);
 assert.ok(result.estimated[1]>.04);
 assert.ok(result.holdout.log_loss_improvement>0);
});
test('coefficient zero means exactly unchanged baseline probabilities',()=>{
 const rows=syntheticMatches({count:60,trueCoefficients:[0,0]});
 const x=evaluate(rows,{coefficients:[0,0]});
 assert.equal(x.challenger_log_loss,x.baseline_log_loss);
 assert.equal(x.challenger_brier,x.baseline_brier);
});
test('no post-match feature permission is allowed in fitting or evaluation',()=>{
 const data=syntheticMatches({count:80});
 data[0].features_known_before_kickoff=false;
 assert.throws(()=>fit(data),/pre-?match/);
 assert.throws(()=>evaluate(data,{coefficients:[0,0]}),/pre-?match/);
});
test('insufficient training data and nonfinite features are rejected',()=>{
 const data=syntheticMatches({count:80});
 assert.throws(()=>fit(data.slice(0,49)),/At least 50/);
 data[0].x[0]=NaN;assert.throws(()=>fit(data),/Invalid feature/);
});
test('no subsequent model claims real-world validation',()=>{
 const result=runSimulation({seed:20261115,count:4000,trueCoefficients:[0,0]});
 assert.equal(result.holdout.validated_for_real_football,false);
 assert.equal(result.publication_gate,'BLOCKED');
 assert.equal(result.holdout.no_live_bets,undefined);
});
