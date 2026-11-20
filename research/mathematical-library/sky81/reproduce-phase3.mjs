import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { phase3Probabilities } from './experiment.mjs'

const root = process.argv[2]
if (!root || process.argv.length !== 3) throw new Error('Supply the pinned Phase 3 package directory')

const json = path => JSON.parse(readFileSync(join(root, path), 'utf8'))
const manifest = json('audit/raw76_manifest.json')
const original = json('analysis/robustness.json')
const records = json('reproduction/phase2_snapshot/inputs/derived_inputs.json').races
const labels = new Map(records.map(row => [row.race_id, row]))
const baseline = new Map(original.rows.map(row => [row.race_id, row]))
assert.equal(manifest.source_commit, '69582ebc3d2196e2fb35276d8233c0e1f0d826bc')
assert.equal(original.status, 'RETROSPECTIVE_DESCRIPTIVE_ONLY')
assert.equal(manifest.records.length, 76)
assert.equal(new Set(manifest.records.map(row => row.race_id)).size, 76)
assert.equal(labels.size, 76)
assert.equal(baseline.size, 76)

let runnerAppearances = 0
let oddsPresent = 0
let maxArchivedAProbabilityDifference = 0
let maxArchivedMetricDifference = 0
const totals = { A: { firstChoices: 0, logLoss: 0, brier: 0 }, B: { firstChoices: 0, logLoss: 0, brier: 0 } }
for (const { race_id: id, forecast_sha: forecast, git_blob: expectedBlob } of manifest.records) {
  assert.match(forecast, /^[a-f0-9]{64}$/)
  const bytes = readFileSync(join(root, 'audit/raw76', forecast + '.json'))
  const blob = createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex')
  assert.equal(blob, expectedBlob, id + ' Git blob mismatch')
  const race = JSON.parse(bytes)
  assert.equal(race.race_id, id)
  assert.equal(race.record_sha256, forecast)
  const label = labels.get(id)
  assert.equal(label.forecast_sha, forecast)
  assert.equal(label.git_blob, blob)
  const archived = baseline.get(id)
  assert.equal(race.runners.length, archived.field_size)
  assert.equal(race.runners.length, race.active_runner_count)
  const ids = race.runners.map(runner => runner.horse_id)
  assert.equal(new Set(ids).size, ids.length)
  const winner = ids.indexOf(label.entry.winner_horse_id)
  assert.ok(winner >= 0)
  runnerAppearances += ids.length
  if (race.odds !== null) oddsPresent++
  const histories = race.runners.map(runner => runner.context_features.history)
  for (const [model, total] of Object.entries(totals)) {
    const p = phase3Probabilities(histories, model)
    const lower = model.toLowerCase()
    const firstChoice = p.indexOf(Math.max(...p)) === winner
    const logLoss = -Math.log(p[winner])
    const brier = p.reduce((score, value, i) => score + (value - Number(i === winner)) ** 2, 0)
    assert.equal(firstChoice, archived[lower + '_correct'])
    maxArchivedMetricDifference = Math.max(maxArchivedMetricDifference,
      Math.abs(logLoss - archived[lower + '_log_loss']),
      Math.abs(brier - archived[lower + '_brier']))
    if (model === 'A') {
      p.forEach((value, i) => {
        maxArchivedAProbabilityDifference = Math.max(maxArchivedAProbabilityDifference,
          Math.abs(value - race.runners[i].model_probability))
      })
    }
    total.firstChoices += Number(firstChoice)
    total.logLoss += logLoss
    total.brier += brier
  }
}

assert.equal(runnerAppearances, 730)
assert.ok(maxArchivedAProbabilityDifference <= 1e-12)
assert.ok(maxArchivedMetricDifference <= 1e-12)

console.log(JSON.stringify({
  scope: 'RETROSPECTIVE_PHASE3_AB_REPRODUCTION',
  races: manifest.records.length,
  runnerAppearances,
  gitBlobsVerified: manifest.records.length,
  archiveRecordsWithNonNullOdds: oddsPresent,
  maxArchivedAProbabilityDifference,
  maxArchivedMetricDifference,
  models: Object.fromEntries(Object.entries(totals).map(([model, row]) => [model, {
    firstChoices: row.firstChoices,
    meanLogLoss: row.logLoss / manifest.records.length,
    meanBrierSum: row.brier / manifest.records.length
  }])),
  reconstructedTournamentConfigurationsScored: 0
}, null, 2))
