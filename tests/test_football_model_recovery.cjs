'use strict';
const assert = require('node:assert/strict');
const experimental = require('../paper-lab/experimental');
const benchmark = require('../research/market-benchmark/core');
const reliability = require('../paper-lab/reliability-core');

const model = [0.6, 0.25, 0.15];
const fair = [0.5, 0.25, 0.25];
const raw = [2, 4, 4];
const expected = [0.55, 0.25, 0.20];
const result = experimental.marketCandidate(model, raw);
assert.deepEqual(result.marketProbabilities, fair);
assert.deepEqual(result.probabilities, expected);
assert.deepEqual(benchmark.blend(model, benchmark.deVig(raw).probabilities, 0.5), expected);
assert.equal(benchmark.blend(model, fair, Infinity), null);
assert.equal(experimental.marketCandidate([NaN, 0, 1], raw), null);
assert.equal(experimental.marketCandidate(model, [2, 4, Infinity]), null);

const event = {sport:'football', competition:'Premier League',
  participants:[{name:'Synthetic Home'}, {name:'Synthetic Away'}], startUTC:'2026-11-01T19:00:00Z'};
assert.equal(reliability.qualifyingEvidence(event, []).status, 'INSUFFICIENT_HISTORY');
const history = Array.from({length: 5}, (_, n) => [
  {competition:event.competition, kickoff_utc:`2026-10-${20+n}T12:00:00Z`, home:'Synthetic Home', away:'Third', actual_outcome:'H'},
  {competition:event.competition, kickoff_utc:`2026-10-${20+n}T13:00:00Z`, home:'Third', away:'Synthetic Away', actual_outcome:'H'}
]).flat();
assert.deepEqual(reliability.qualifyingEvidence(event, [...history,
  {...history[0], kickoff_utc:event.startUTC, actual_outcome:'A'}]), {
  status:'FORM_CANDIDATE', side:'HOME', homeWins:5, awayWins:0,
  oddsStatus:'UNVERIFIED', valueStatus:'NOT_CALCULATED'
});
console.log('PASS synthetic football composition and reliability checks');
