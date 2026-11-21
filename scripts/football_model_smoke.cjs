'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const experimental = require('../paper-lab/experimental');
const hybrid = require('../paper-lab/hybrid');
const market = require('../research/market-benchmark/core');

function archived(directory, name) {
  return require(path.join(directory, 'research/match-intelligence', name));
}

function pureSlice(source, start, end, exportNames) {
  const left = source.indexOf(start), right = source.indexOf(end, left);
  assert(left >= 0 && right > left);
  return vm.runInNewContext(source.slice(left, right) + `\n({${exportNames}})`, {},
    {timeout:1000, contextCodeGeneration:{strings:false, wasm:false}});
}

const read = relative => fs.readFileSync(path.join(__dirname, '..', relative), 'utf8');
const close = (actual, expected) => assert(Math.abs(actual - expected) < 1e-10, `actual ${actual}, expected ${expected}`);
function vector(actual, expected) {
  assert.equal(actual.length, 3);
  actual.forEach((value, i) => close(value, expected[i]));
  close(actual.reduce((a, b) => a + b, 0), 1);
}

function referencePoisson(home, away) {
  const scores = rate => Array.from({length:12}, (_, goals) => {
    let factorial = 1;
    for (let n = 2; n <= goals; n++) factorial *= n;
    return Math.exp(-rate) * rate ** goals / factorial;
  });
  const result = [0, 0, 0], h = scores(home), a = scores(away);
  for (const [i, p] of h.entries()) for (const [j, q] of a.entries()) {
    result[i > j ? 0 : i === j ? 1 : 2] += p * q;
  }
  const total = result.reduce((x, y) => x + y, 0);
  return result.map(value => value / total);
}

function retrospective() {
  const {run} = pureSlice(read('research/football-baseline-v1/replay.mjs'),
    'const run = function run(seasons)', 'const commit =', 'run');
  const matches = Array.from({length:31}, (_, i) => ({
    date:`2026-10-${String(i + 1).padStart(2, '0')}`, team1:'Synthetic Home', team2:'Synthetic Away', score:{ft:[2,1]}
  }));
  const runFixture = () => run({'synthetic-season':{matches}}).rows;
  const rows = runFixture();
  assert.equal(rows.length, 1);
  // Replay uses the opposite-venue league mean as each denominator.
  const row = rows[0], base = [2 * 2 / 1, 1 * 1 / 2];
  const rates = [base[0] * Math.exp(.05), base[1] * Math.exp(-.05)];
  matches.at(-1).score.ft = [0,6];
  const changed = runFixture()[0];
  assert.deepEqual(changed.p_unadjusted, row.p_unadjusted);
  assert.deepEqual(changed.p_recent_form_alpha_0_025, row.p_recent_form_alpha_0_025);
  vector(row.p_unadjusted, referencePoisson(...base));
  vector(row.p_recent_form_alpha_0_025, referencePoisson(...rates));
  return {prior_matches:30, base_lambda:base, form_delta:2, adjusted_lambda:rates,
    base_probabilities:row.p_unadjusted, form_probabilities:row.p_recent_form_alpha_0_025};
}

function marketPaths() {
  const model = [0.6, 0.25, 0.15], odds = [2,4,4];
  const frozen = experimental.marketCandidate(model, odds);
  vector(frozen.probabilities, [.55,.25,.20]);
  assert.equal(experimental.marketCandidate(model, [2,4]), null);

  const now = Date.parse('2026-11-19T09:00:00Z'), observed = '2026-11-19T08:50:00Z';
  const start = '2026-11-19T18:00:00Z', sha = 'a'.repeat(64);
  const fixture = {id:'synthetic-fixture',sport:'football',startUTC:start,observedAt:observed,seasonComparison:{
    method:'CURRENT_SEASON_POISSON_COMPARISON_V1', unvalidated:true, research_only:true, publication_gate:'BLOCKED',
    odds:null, expected_value:null, home_venue_matches:4, away_venue_matches:5,
    prob_home:model[0], prob_draw:model[1], prob_away:model[2], cutoff_utc:start, training_sha256:sha,
    source_receipts:[{url:'https://example.invalid/results',sha256:sha,observed_at_utc:observed}]
  }};
  const row = {event_id:fixture.id,start_utc:start,market:'FOOTBALL_90_MINUTE_1X2',
    benchmark:{source:'https://example.invalid/market',source_id:'SYNTHETIC',verified:true,
      observed_at_utc:observed,prices:{home:2,draw:4,away:4}}};
  const independent = hybrid.evaluate(fixture,{schema_version:1,records:[row]},now);
  vector(independent.probabilities, frozen.probabilities);
  assert.equal(independent.selection, null);
  assert.equal(hybrid.evaluate(fixture,{schema_version:1,records:[row,row]},now).probabilities, null);

  const proxy = pureSlice(read('reliability-lab/challenger.js'), '  function parseForm(s)', '  const pct =',
    'parseForm,evaluate');
  const form = proxy.evaluate(proxy.parseForm('WWWWD'), proxy.parseForm('LLLLD'), odds);
  vector(form.form,[10/16,4/16,2/16]);
  vector(form.blend,market.blend(Array.from(form.form), [.5,.25,.25], .5));
  assert.equal(proxy.parseForm('WW'),null);
  return {decimal_fixture_inputs:odds, market_probabilities:frozen.marketProbabilities,
    frozen_blend:frozen.probabilities, hybrid_blend:independent.probabilities,
    hybrid_separate_price_state:'unavailable', manual_form_probabilities:form.form, manual_form_blend:form.blend};
}

function scenarios(directory) {
  const {computeDynamicPlayerImpact} = archived(directory, 'dynamic-player-impact.js');
  const pathFromRoot = name => require(path.join(directory,'scripts',name));
  const stage2 = pathFromRoot('match_intelligence_backtest.cjs');
  const stage3 = pathFromRoot('match_intelligence_stage3.cjs');
  const fixture = {home:'Synthetic Home',away:'Synthetic Away'};
  const earlier = Array.from({length:30}, () => ({...fixture,hg:2,ag:1}));
  assert.deepEqual(stage2.baseline(earlier,fixture),[2,1]);
  assert.deepEqual(stage3.factors(stage3.summary(earlier),fixture),
    {homeAttack:1,homeDefence:1,awayAttack:1,awayDefence:1});
  assert.equal(stage2.baseline(earlier.slice(1),fixture),null);
  assert.equal(stage3.factors(stage3.summary(earlier.slice(1)),fixture),null);
  const {assessMatchContext} = archived(directory, 'squad-context.js');
  const player = {id:'synthetic-player', training_matches:20, attack_effect:.2, defence_effect:.1,
    form_multiplier:1, matchup_multiplier:1, expected_minutes:90, baseline_reference_minutes:0};
  const run = player => computeDynamicPlayerImpact({lambda_home:2,lambda_away:1,home_players:[player]});
  const scenario = run(player);
  close(scenario.player_contributions[0].reliability,.5);
  close(scenario.player_contributions[0].attack_shift,.1);
  close(scenario.adjusted.lambda_home,2 * Math.exp(.1));
  close(scenario.adjusted.lambda_away,Math.exp(-.05));
  vector(Object.values(scenario.adjusted.probabilities),
    referencePoisson(scenario.adjusted.lambda_home, scenario.adjusted.lambda_away));
  assert.equal(run({...player,expected_minutes:null}).adjusted,null);
  assert.throws(() => run({...player,attack_effect:Infinity}),/finite/);
  const context = assessMatchContext({fixture:{home:'Synthetic Home',away:'Synthetic Away',
    kickoff_utc:'2026-11-22T18:00:00Z'},as_of_utc:'2026-11-22T17:00:00Z'});
  assert.equal(context.probability_adjustment,null);
  assert(context.teams.every(team => team.squad_strength_delta === null));
  const priorSignal = archived(directory,'stage10-player-residuals.cjs').priorPlayerSignal;
  const signal = priorSignal('synthetic', [{residual:.4,lineup:[1]}, {residual:0,lineup:[2]}]);
  close(signal.signal,-.2/21);
  assert.equal(priorSignal('synthetic', []),null);
  const ridge = archived(directory,'stage11-replacement-proxy.cjs').solveRidge([[2,0],[0,4]],[2,8],2);
  close(ridge[0],.5); close(ridge[1],4/3);

  const blend = archived(directory,'stage13-market-blend.cjs').blend;
  const anchor = archived(directory,'stage14-market-anchored-ev.cjs').anchor;
  vector(blend([.5,.25,.25],[.6,.25,.15],.5),[.55,.25,.20]);
  vector(anchor([.6,.25,.15],[.5,.25,.25],.5),[.55,.25,.20]);
  assert.throws(() => blend([.5,.25,.25],[.6,.25,.15],.2),/Unregistered/);
  const calibration = archived(directory,'stage12-market-calibration.cjs').implied([2,4,4]);
  const correction = archived(directory,'stage16-chronological-selection-correction.cjs').train([]);
  assert.deepEqual(correction.adjustments,[0,0,0]);
  return {opponent_prior:{stage2_baseline_lambda:stage2.baseline(earlier,fixture),
      stage3_venue_factors:stage3.factors(stage3.summary(earlier),fixture)}, dynamic_player:{contribution:scenario.player_contributions[0], adjusted:scenario.adjusted},
    squad_adjustment:context.probability_adjustment, prior_player_signal:signal, replacement_ridge:ridge,
    market_calibration:calibration, market_blend:blend([.5,.25,.25],[.6,.25,.15],.5),
    missing_calibration_adjustments:correction.adjustments};
}

const directory = process.argv[2];
assert(directory, 'isolated source directory required');
console.log(JSON.stringify({retrospective:retrospective(), markets:marketPaths(), scenarios:scenarios(directory)}));
