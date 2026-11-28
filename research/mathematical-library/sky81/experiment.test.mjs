import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { loadCatalogue } from '../validate-v1.mjs'
import { experiment, grids, marketProbabilities, phase3Probabilities, predict, weights } from './experiment.mjs'

const report = experiment()
const same = (actual, expected) => {
  assert.equal(actual.length, expected.length)
  actual.forEach((value, i) => assert.ok(Math.abs(value - expected[i]) <= 1e-12))
}
const fixture = { n: 3, A: [0.6, 0.3, 0.1], B: [0.1, 0.7, 0.2], decimalOdds: [2, 4, 8] }

test('all 100 settings round trip through 81 rows with a single 20-setting equivalence class', () => {
  assert.equal(report.gridSettings, 100)
  assert.equal(report.uniqueConfigurations, 81)
  assert.equal(new Set(report.configurations.map(row => row.id)).size, 81)
  const expected = grids.a.flatMap(a => grids.r.flatMap(r => grids.m.map(m => [a, r, m].join(','))))
  const actual = report.configurations.flatMap(row => row.settings.map(({ a, r, m }) => [a, r, m].join(',')))
  assert.deepEqual(actual.sort(), expected.sort())
  assert.deepEqual(report.configurations.filter(row => row.settings.length > 1).map(row => row.numerators),
    [[0, 0, 0, 64]])
  assert.equal(report.configurations.find(row => row.settings.length > 1).settings.length, 20)
  assert.equal(report.configurations.filter(row => row.mechanism === 'linear-pool').length, 78)
  assert.equal(report.configurations.filter(row => row.active.includes('M')).length, 61)
})

test('exact coefficients match the expanded formula, are nonnegative and sum to one', () => {
  for (const row of report.configurations) {
    assert.ok(row.numerators.every(w => Number.isInteger(w) && w >= 0))
    assert.equal(row.numerators.reduce((a, b) => a + b), 64)
    for (const { a, r, m } of row.settings) {
      assert.deepEqual(row.numerators.map(w => w / 64),
        [(1 - m) * (1 - r), (1 - m) * r * a, (1 - m) * r * (1 - a), m])
    }
  }
  assert.throws(() => weights(0, 0, 0), RangeError)
})

test('all settings normalize and agree with the nested formula on a complete synthetic field', () => {
  for (const row of report.configurations) {
    for (const setting of row.settings) {
      const { a, r, m } = setting
      const direct = fixture.A.map((ap, i) =>
        (1 - m) * ((1 - r) / 3 + r * (a * ap + (1 - a) * fixture.B[i])) + m * [4 / 7, 2 / 7, 1 / 7][i])
      const p = predict(fixture, setting)
      same(p, direct)
      assert.ok(p.every(v => v >= 0 && v <= 1))
      assert.ok(Math.abs(p.reduce((x, y) => x + y) - 1) <= 1e-12)
    }
  }
})

test('pure endpoints, missing inactive inputs, one runner and identical inputs', () => {
  const { n, A, B, decimalOdds } = fixture
  same(predict({ n, decimalOdds }, { a: 0, r: 0.25, m: 1 }), [4 / 7, 2 / 7, 1 / 7])
  same(predict({ n, A }, { a: 1, r: 1, m: 0 }), A)
  same(predict({ n, B }, { a: 0, r: 1, m: 0 }), B)
  same(predict({ n, B }, { a: 0, r: 0.25, m: 0 }), B.map(p => 0.75 / n + 0.25 * p))
  for (const { settings: [setting] } of report.configurations) {
    same(predict({ n: 1, A: [1], B: [1], decimalOdds: [2] }, setting), [1])
    same(predict({ n: 2, A: [0.5, 0.5], B: [0.5, 0.5], decimalOdds: [2, 2] }, setting), [0.5, 0.5])
  }
})

test('invalid inputs are rejected where their component is active', () => {
  assert.throws(() => predict({ ...fixture, A: [0.4, 0.3, 0.1] }, { a: 1, r: 1, m: 0 }), RangeError)
  assert.throws(() => predict({ n: 0 }, { a: 0, r: 1, m: 0 }), RangeError)
  assert.throws(() => predict({ n: 3, B: fixture.B }, { a: 0, r: 1, m: 0.25 }), RangeError)
  for (const odds of [[2], [2, 4, 1], [2, 4, Infinity], [2, 4, NaN], [2, 4, ,]]) {
    assert.throws(() => marketProbabilities(odds, 3), RangeError)
  }
})

test('frozen Phase 3 score uses unbonused recency, squared 90-day weights for B, and softmax', () => {
  const old = { recency_weight: 0.5, finish_percentile: 1, similarities: { distance: 1, going: null, class: null, course: 0 } }
  const recent = { ...old, recency_weight: 1, finish_percentile: 0, similarities: { ...old.similarities, distance: 0 } }
  const histories = [[old, recent, recent], [recent, recent, recent]]
  const a = [2 * (0.5 + 2.5 / 7.5 * (1 / 3 - 0.5)), 2 * (0.5 - 3 / 8 * 0.5)]
  const b = [4 * (0.5 + 2.25 / 7.25 * (0.25 / 2.25 - 0.5)), 4 * (0.5 - 3 / 8 * 0.5)]
  for (const [model, expected] of [['A', a], ['B', b]]) {
    const first = 1 / (1 + Math.exp(expected[1] - expected[0]))
    same(phase3Probabilities(histories, model), [first, 1 - first])
    same(phase3Probabilities([histories[0]], model), [1])
  }
  assert.throws(() => phase3Probabilities([[old]], 'A'), RangeError)
})

test('manifest is reproducible and links all configurations into the preserved catalogue', () => {
  const manifest = readFileSync(new URL('./configurations.json', import.meta.url), 'utf8')
  assert.deepEqual(JSON.parse(manifest), report)
  const { entries } = loadCatalogue()
  assert.ok(entries.length >= 286, 'The preserved catalogue must not shrink')
  assert.ok(entries.every(entry => !entry.id.startsWith('sky81-')))
  const byId = new Map(entries.map(entry => [entry.id, entry]))
  for (const row of report.configurations) {
    assert.equal(byId.get(row.catalogue.id)?.classification, 'ensemble')
  }
  assert.equal(byId.get('softmax')?.classification, 'feature-transformation')
  assert.equal(byId.get('exp-time-decay')?.classification, 'feature-transformation')
  assert.equal(byId.get('probability-shrinkage')?.classification, 'model-variant')
})
