'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {buildScoreboard,bet}=require('../research/match-intelligence/model-scoreboard.cjs');
function frozen(id,odds=[2.2,3.7,4.5]){
 const market=odds?{decimal_odds:odds,implied_probabilities:[.46,.28,.26],evidence_status:'UNVERIFIED'}:null;
 const v={status:'FROZEN_PREDICTION',fixture_id:id,
  fixture:{home:'Example Home',away:'Example Away',kickoff_utc:'2026-12-20T15:00:00Z'},
  created_at_utc:'2026-12-19T12:00:00Z',
  probabilities:{poisson:[.5,.27,.23],recent_form:[.53,.25,.22]},market,
  publication_gate:'BLOCKED'};
 return {...v,record_sha256:crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex')};
}
const settlement=id=>({fixture_id:id,home_goals:1,away_goals:0,source_uri:'https://example.org/match-result',
 result_observed_at_utc:'2026-12-20T18:00:00Z'});
test('before settlement shows no results or paper profit',()=>{
 const s=buildScoreboard([frozen('a')]);assert.equal(s.settled_count,0);
 assert.equal(s.fixtures[0].models.poisson.paper_profit,null);
 assert.equal(s.models.poisson.mean_log_loss,null);
 assert.equal(s.models.poisson.bets,0);
});
test('paired scoring, quote-only illustrative profits, and PASS included',()=>{
 const s=buildScoreboard([frozen('a'),frozen('b',null)],[settlement('a'),settlement('b')]);
 assert.equal(s.settled_count,2);assert.equal(s.models.poisson.unpriced_settled,1);
 assert.equal(s.models.poisson.settled_fixtures,2);
 assert.equal(s.models.market_anchor_cap5.settled_fixtures,1);
 assert.equal(s.fixtures[1].models.market_anchor_cap5.selection,'PASS');
 assert.equal(s.fixtures[1].models.poisson.selection,'PASS');
 assert.equal(s.paired.form_vs_poisson.fixtures,2);
 assert.equal(s.paired.anchor_vs_recent_form.fixtures,1);
 assert.equal(s.verified_profit,false);
});
test('cannot rewrite frozen prediction',()=>{
 const v=frozen('a');v.probabilities.poisson[0]=.8;
 assert.throws(()=>buildScoreboard([v]),/integrity/i);
});
test('cannot score before kickoff or duplicate fixture',()=>{
 const v=frozen('a');
 assert.throws(()=>buildScoreboard([v],[{...settlement('a'),result_observed_at_utc:'2026-12-19T20:00:00Z'}]),/before kickoff/i);
 assert.throws(()=>buildScoreboard([v,v]),/Duplicate/i);
});
test('EV selection enforces minimum EV and caps long odds',()=>{
 assert.equal(bet([.65,.2,.15],[1.5,3,8],5).selection,'PASS');
 assert.equal(bet([.65,.2,.15],[1.5,3,8]).selection,'AWAY');
});
