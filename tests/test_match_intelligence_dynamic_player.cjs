'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {computeDynamicPlayerImpact,poisson1x2}=require('../research/match-intelligence/dynamic-player-impact.js');
const base={lambda_home:1.55,lambda_away:1.1};
const p=(over={})=>({id:'home-p1',training_matches:40,attack_effect:0.18,defence_effect:0.04,
  form_multiplier:1,matchup_multiplier:1,expected_minutes:90,baseline_reference_minutes:0,...over});
test('no player changes preserve the exact Poisson baseline',()=>{
 const x=computeDynamicPlayerImpact(base);assert.deepEqual(x.adjusted.probabilities,x.baseline.probabilities);
 assert.equal(x.probability_change.home,0);
 assert.equal(x.publication_gate,'BLOCKED');
});
test('signed impact and absence relative to expectation work in both directions',()=>{
 const gain=computeDynamicPlayerImpact({...base,home_players:[p()]});
 const loss=computeDynamicPlayerImpact({...base,home_players:[p({expected_minutes:0,baseline_reference_minutes:90})]});
 assert.ok(gain.adjusted.lambda_home>base.lambda_home);
 assert.ok(loss.adjusted.lambda_home<base.lambda_home);
 assert.ok(gain.probability_change.home>0);
 assert.ok(loss.probability_change.home<0);
});
test('negative player effect can cause extra minutes to hurt',()=>{
 const x=computeDynamicPlayerImpact({...base,home_players:[p({attack_effect:-0.1,defence_effect:-0.05})]});
 assert.ok(x.adjusted.lambda_home<base.lambda_home);
 assert.ok(x.adjusted.lambda_away>base.lambda_away);
});
test('opposing defensive contribution changes the correct side lambda',()=>{
 const x=computeDynamicPlayerImpact({...base,away_players:[p({id:'away-p1',attack_effect:0,defence_effect:.2})]});
 assert.ok(x.adjusted.lambda_home<base.lambda_home);
 assert.equal(x.adjusted.lambda_away,base.lambda_away);
});
test('form, opponent compatibility and evidence strength modulate impact',()=>{
 const a=computeDynamicPlayerImpact({...base,home_players:[p({training_matches:0})]});
 const b=computeDynamicPlayerImpact({...base,home_players:[p({training_matches:100})]});
 const c=computeDynamicPlayerImpact({...base,home_players:[p({matchup_multiplier:0})]});
 assert.equal(a.adjusted.lambda_home,base.lambda_home);
 assert.ok(b.adjusted.lambda_home>a.adjusted.lambda_home);
 assert.equal(c.adjusted.lambda_home,base.lambda_home);
});
test('missing minutes block scenario, never treated as zero',()=>{
 const x=computeDynamicPlayerImpact({...base,home_players:[p({expected_minutes:null})]});
 assert.equal(x.status,'INSUFFICIENT_EVIDENCE');
 assert.equal(x.adjusted,null);
 assert.equal(x.probability_change,null);
});
test('invalid probabilities, coefficient bounds and duplicated player IDs fail closed',()=>{
 assert.throws(()=>computeDynamicPlayerImpact({...base,lambda_home:0}));
 assert.throws(()=>computeDynamicPlayerImpact({...base,home_players:[p({attack_effect:3})]}));
 assert.throws(()=>computeDynamicPlayerImpact({...base,home_players:[p()],away_players:[p()]}));
 const v=poisson1x2(1.5,1.2);assert.ok(Math.abs(v.home+v.draw+v.away-1)<1e-12);
});
