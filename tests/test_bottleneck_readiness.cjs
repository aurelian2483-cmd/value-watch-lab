'use strict';

const assert = require('node:assert/strict');
const { forSelection } = require('../paper-lab/bottleneck-lab.js');
const { statusOf } = require('../paper-lab/engine.js');

const now = Date.parse('2026-11-23T10:00:00Z');
const observedAt = '2026-11-23T09:00:00Z';
const tennis = {
  id: 'tennis-1', sport: 'tennis', startUTC: '2026-11-23T12:00:00Z', observedAt, ttlMs: 7200000,
  model: { name: 'Elo', validation: 'UNVALIDATED' },
  choices: [{ probability: 0.55 }, { probability: 0.45 }],
  sources: [{ kind: 'PROVIDER_RECEIPT', observedAt }],
};
const rugby = { ...tennis, id: 'rugby-1', sport: 'rugby', model: { ...tennis.model, name: 'Pro D2 Elo' } };
const inputs = [
  tennis, tennis, rugby,
  { ...tennis, id: 'stale', observedAt: '2026-11-22T09:00:00Z' },
  { ...tennis, id: 'conflict', identityConflict: true },
  { ...tennis, id: 'no-source', sources: [] },
  { ...tennis, id: 'missing-vector', choices: [{ probability: 0.55 }, { probability: null }] },
  { ...tennis, id: 'invalid-vector', choices: [{ probability: -0.1 }, { probability: 1.1 }] },
  { ...tennis, id: 'claimed-star', model: { validation: 'VALIDATED' }, bottleneckStar: true },
];
const snapshot = JSON.stringify(inputs);
const select = (sport) => forSelection(sport, inputs, (event) => statusOf(event, now));

assert.deepEqual(select('tennis').map(row => [row.key, row.baselineEstimateCount]), [['tennis', 1]]);
assert.deepEqual(select('rugby').map(row => [row.key, row.baselineEstimateCount]),
  [['rugby_union', 1], ['rugby_league', 0]]);
assert.equal(select('all').length, 10);
assert.deepEqual(select('constructor'), []);
assert.equal(forSelection('tennis', inputs)[0].baselineEstimateCount, 0);
for (const row of select('all')) {
  assert.equal(row.bottleneckEstimate, null);
  assert.equal(row.bottleneckStar, false);
}
assert.equal(JSON.stringify(inputs), snapshot);
console.log('PASS: Bottleneck sport isolation, current estimate evidence and fail-closed star');

const { footballPaperPairs } = require('../paper-lab/bottleneck-lab.js');
const pair = {
  home: 'Home', away: 'Away', kickoff_utc: '2026-11-28T15:00:00Z',
  captured_at_utc: '2026-11-28T14:50:00Z',
  baseline_model:'FOOTBALL_DATA_VENUE_POISSON_V1',
  challenger_model:'BOTTLENECK_PL_RECENT_GOAL_DIFF_PILOT_V1',
  source:'https://api.football-data.org/v4/competitions/PL/matches?season=2026',
  source_sha256:'a'.repeat(64), baseline:[.4,.2,.4], challenger:[.5,.2,.3]
};
const archiveNow = Date.parse('2026-11-28T14:59:00Z');
assert.deepEqual(footballPaperPairs({valid:pair, late:{...pair,captured_at_utc:'2026-11-28T14:57:00Z'},
  invalid:{...pair,challenger:[.5,.2,.5]}, future:{...pair,captured_at_utc:'2026-11-28T15:01:00Z'}},archiveNow),[pair]);
console.log('PASS: archived football choices require paired vectors, official source and pre-kickoff capture');

const { scoreFootballPairs } = require('../paper-lab/bottleneck-lab.js');
const championship = {...pair, league:'E1',
  challenger_model:'BOTTLENECK_ELC_RECENT_GOAL_DIFF_PILOT_V1',
  source:'https://api.football-data.org/v4/competitions/ELC/matches?season=2026'};
assert.deepEqual(footballPaperPairs({championship}, archiveNow), [championship]);
const final = {league:'E1', home:pair.home, away:pair.away, startUTC:pair.kickoff_utc,
  score_home:2, score_away:1, result_verification:'TWO_PUBLISHER_RESULT_CORROBORATED'};
const settle = Date.parse('2026-11-28T19:00:00Z');
const scored = scoreFootballPairs([pair,championship],[final],settle);
assert.equal(scored.stats.scored,1);
assert.equal(scored.stats.unmatched,1);
assert.equal(scored.stats.baseline.correct,0);
assert.equal(scored.stats.challenger.correct,1);
assert.equal(scored.stats.disagreements,1);
assert.equal(scoreFootballPairs([championship],[final],archiveNow).stats.pending,1);
assert.equal(scoreFootballPairs([championship],[final,{...final,score_home:0}],settle).stats.unmatched,1);
console.log('PASS: league isolation, corroborated scoring, ties, pending and conflicts');
