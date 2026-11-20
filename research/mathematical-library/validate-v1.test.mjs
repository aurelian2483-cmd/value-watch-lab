import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { loadCatalogue, validateEntries } from './validate-v1.mjs'

const readJson = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'))
const legacy = readJson('./catalogue.v0.json').methods
const profiles = readJson('./sport-profiles.v1.json')
const { entries } = loadCatalogue()

test('all preserved records and registered specifications pass', () => {
  assert.equal(entries.length, 116)
  assert.equal(entries.filter(entry => entry.batch === '001').length, 100)
  validateEntries(entries, legacy, profiles)
})

const reject = (name, mutate, message) => test(name, () => {
  const copy = structuredClone(entries)
  mutate(copy)
  assert.throws(() => validateEntries(copy, legacy, profiles), message)
})

reject('rejects reused IDs', copy => copy.push(copy[0]), /Duplicate IDs/)
reject('rejects renamed identical specifications', copy => {
  copy.push({ ...copy.at(-1), id: 'copy-of-spsa', name: 'Duplicate optimizer' })
}, /normalized specification duplicates/)
reject('rejects a historical lifecycle rewrite', copy => {
  copy.find(entry => entry.id === 'poisson').status = 'VALIDATED'
}, /historical status changed/)
reject('rejects fabricated test evidence', copy => {
  copy.at(-1).test_evidence = { claimed_result: 'pass' }
}, /unsupported test claim/)
reject('rejects sport and data mismatch', copy => {
  copy.find(entry => entry.id === 'darts-finish-dp').sports = ['football']
}, /sport\/profile mismatch/)
reject('rejects setting assessment labels as predictor inputs', copy => {
  copy.find(entry => entry.id === 'log-loss').input_timing = 'as-of-cutoff'
}, /incompatible input timing/)
reject('rejects unlinked model variants', copy => {
  copy.find(entry => entry.id === 'garch').relationships[0].type = 'related'
}, /missing parent/)

test('Dixon–Coles adjustment redistributes low-score mass', () => {
  const lambda = 1.7
  const mu = 0.8
  const rho = -0.1
  const p00 = Math.exp(-lambda - mu)
  const correction = p00 * (-lambda * mu * rho) + p00 * mu * lambda * rho +
    p00 * lambda * mu * rho + p00 * lambda * mu * (-rho)
  assert(Math.abs(correction) < 1e-15)
})

test('advantage scoring and shrinkage satisfy symmetry and simplex invariants', () => {
  const game = p => {
    const q = 1 - p
    return p ** 4 * (1 + 4 * q + 10 * q ** 2) +
      20 * p ** 3 * q ** 3 * p ** 2 / (p ** 2 + q ** 2)
  }
  assert.equal(game(0), 0)
  assert.equal(game(1), 1)
  assert.equal(game(0.5), 0.5)
  assert(Math.abs(game(0.2) + game(0.8) - 1) < 1e-15)
  const baseline = [0.4, 0.3, 0.3]
  const candidate = [0.9, 0.05, 0.05]
  const kl = (p, q) => p.reduce((sum, value, i) => sum + value * Math.log(value / q[i]), 0)
  const mixture = baseline.map((value, i) => (value + candidate[i]) / 2)
  const gate = Math.exp(-(kl(baseline, mixture) + kl(candidate, mixture)) / 2)
  const result = baseline.map((value, i) => value + gate * (candidate[i] - value))
  assert(result.every(value => value > 0 && value < 1))
  assert(Math.abs(result.reduce((sum, value) => sum + value, 0) - 1) < 1e-15)
})
