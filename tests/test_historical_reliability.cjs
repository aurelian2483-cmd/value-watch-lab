'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const R=require('../paper-lab/reliability-core.js');
const fixture={sport:'football',competition:'Premier League',startUTC:'2026-11-20T12:00:00Z',participants:[{name:'Home FC'},{name:'Away FC'}]};
function match(date,h,a,result){return {competition:'Premier League',kickoff_utc:date,home:h,away:a,actual_outcome:result};}
const past=[
  match('2026-09-01T12:00:00Z','Home FC','Side A','H'),
  match('2026-09-02T12:00:00Z','Away FC','Side B','A'),
  match('2026-09-03T12:00:00Z','Home FC','Side C','H'),
  match('2026-09-04T12:00:00Z','Away FC','Side D','H'),
  match('2026-09-05T12:00:00Z','Home FC','Side E','H'),
  match('2026-09-06T12:00:00Z','Away FC','Side F','D'),
  match('2026-09-07T12:00:00Z','Home FC','Side G','D'),
  match('2026-09-08T12:00:00Z','Away FC','Side H','H'),
  match('2026-09-09T12:00:00Z','Home FC','Side I','H'),
  match('2026-09-10T12:00:00Z','Away FC','Side J','H')
];
test('strong historic favourite is form candidate but has no verified value',()=>{
  const result=R.qualifyingEvidence(fixture,past);
  assert.equal(result.status,'FORM_CANDIDATE');
  assert.equal(result.side,'HOME');
  assert.equal(result.homeWins,4);
  assert.equal(result.awayWins,1);
  assert.equal(result.valueStatus,'NOT_CALCULATED');
});
test('future match results cannot affect the classification',()=>{
  const future=match('2026-12-01T12:00:00Z','Home FC','Side K','A');
  assert.deepEqual(R.qualifyingEvidence(fixture,[future,...past]),R.qualifyingEvidence(fixture,past));
});
test('missing history fails closed',()=>assert.equal(R.qualifyingEvidence(fixture,past.slice(0,3)).status,'INSUFFICIENT_HISTORY'));
test('unsupported competitions fail closed',()=>assert.equal(R.qualifyingEvidence({...fixture,competition:'Ligue 1'},past).status,'OUTSIDE_SCOPE'));
test('other competition histories are excluded',()=>assert.equal(R.qualifyingEvidence(fixture,past.map(r=>({...r,competition:'Serie A'}))).status,'INSUFFICIENT_HISTORY'));
