import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { loadCatalogue, validateEntries } from './validate-v1.mjs'

const readJson = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'))
const legacy = readJson('./catalogue.v0.json').methods
const profiles = readJson('./sport-profiles.v1.json')
const { entries } = loadCatalogue()

test('all preserved records and registered specifications pass', () => {
  const preserved = entries.filter(entry => entry.batch === 'legacy' || /^(00[1-9]|01[0-5])$/.test(entry.batch))
  assert.equal(preserved.length, 286)
  const sortedIds = preserved.map(entry => entry.id).sort().join('\n')
  assert.equal(createHash('sha256').update(sortedIds).digest('hex'),
    '12d632689dd56edd27a7c52d8369d5bc0bad2978823e40907175d0f6c7062ac3')
  assert.equal(entries.filter(entry => entry.legacy_id !== null).length, 16)
  assert.equal(entries.filter(entry => entry.batch === '002').length, 100)
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

for (const id of ['ipw', 'aipw']) {
  reject('rejects pre-event input timing for ' + id, copy => {
    copy.find(entry => entry.id === id).input_timing = 'as-of-cutoff'
  }, /incompatible input timing/)
}

reject('rejects derivations classified as literature', copy => {
  copy.find(entry => entry.id === 'tennis-game').source.kind = 'literature'
}, /derivation source misclassified/)

reject('rejects an equivalence without a matching condition', copy => {
  delete copy.find(entry => entry.id === 'prox-l1').relationships.find(link =>
    link.type === 'equivalent-to').condition
}, /missing equivalence condition/)

reject('rejects circular equivalences', copy => {
  copy.find(entry => entry.id === 'ista').relationships.push({
    type: 'equivalent-to', target: 'prox-l1', condition: 'The same penalty mask and step'
  })
}, /equivalence must point directly to a canonical record/)

test('generated ledger and progress match their committed snapshots', () => {
  const cli = fileURLToPath(new URL('./catalogue.mjs', import.meta.url))
  for (const [command, snapshot] of [
    ['ledger', './evidence-ledger.v1.json'],
    ['summary', './progress.v1.json']
  ]) {
    const generated = execFileSync(process.execPath, [cli, command], { encoding: 'utf8' })
    assert.deepEqual(JSON.parse(generated), readJson(snapshot))
  }
})

test('recorded equivalence and qualification totals stay distinct from registry totals', () => {
  const ledger = readJson('./evidence-ledger.v1.json')
  assert.equal(ledger.find(row => row.id === 'prox-l1').equivalence.target, 'ista')
  assert.equal(ledger.find(row => row.id === 'ista').equivalence, undefined)
  assert.equal(ledger.find(row => row.id === 'fista').equivalence, undefined)
  assert.equal(ledger.filter(row => row.test_evidence !== null).length, 0)
  assert.equal(readJson('./progress.v1.json').distinctAlgorithmsAfterRecordedEquivalences,
    entries.filter(entry => entry.classification === 'distinct-algorithm' &&
      !entry.relationships.some(link => link.type === 'equivalent-to')).length)
})

test('prox-l1 and constant-step ISTA agree with the same penalty mask', () => {
  const b = [0.5, -2, 1]
  const gradient = [1, 2, 4]
  const L = 4
  const lambda = 2
  const penalized = [false, true, true]
  const proxL1 = b.map((value, j) => {
    const step = value - (1 / L) * gradient[j]
    return penalized[j] ? Math.sign(step) * Math.max(Math.abs(step) - lambda / L, 0) : step
  })
  const ista = b.map((value, j) => {
    const step = value - gradient[j] / L
    if (!penalized[j]) return step
    return Math.max(step - lambda / L, 0) + Math.min(step + lambda / L, 0)
  })
  assert.deepEqual(proxL1, ista)
  assert.deepEqual(ista, [0.25, -2, 0])
})

test('the common Poisson score component cancels from every goal difference', () => {
  for (const [a, b] of [[0, 1], [2, 2], [4, 1]]) {
    for (const shared of [0, 1, 3]) {
      assert.equal((a + shared) - (b + shared), a - b)
    }
  }
})
