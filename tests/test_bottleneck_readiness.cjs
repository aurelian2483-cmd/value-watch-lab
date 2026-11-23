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
