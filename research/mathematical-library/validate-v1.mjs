import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import fs from 'node:fs'

const here = new URL('./', import.meta.url)
const read = name => fs.readFileSync(new URL(name, here), 'utf8')
const json = name => JSON.parse(read(name))
const idPattern = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/
const classes = new Set([
  'distribution', 'distinct-model', 'distinct-algorithm', 'framework',
  'model-variant', 'parameter-configuration', 'feature-transformation',
  'diagnostic', 'calibration', 'ensemble', 'decision'
])
const variants = new Set(['model-variant', 'parameter-configuration'])
const sports = new Set(['football', 'horse-racing', 'tennis', 'rugby', 'nfl', 'darts'])
const nonempty = value => typeof value === 'string' && value.trim().length > 0
const slug = name => name.normalize('NFKD').toLowerCase().replace(/\p{M}|[^\p{L}\p{N}]/gu, '')
const signature = equation => equation.normalize('NFKC').replace(/\s+/gu, '').replace(/−/gu, '-')

export function loadCatalogue() {
  const manifest = json('catalogue.v1.json')
  assert.equal(manifest.schema_version, '1.0')
  assert.equal(manifest.status, 'RESEARCH_ONLY')
  assert.equal(new Set(manifest.batches).size, manifest.batches.length)
  const originalText = read('catalogue.v0.json')
  assert.equal(createHash('sha256').update(originalText).digest('hex'), manifest.legacy_sha256)
  const legacy = JSON.parse(originalText).methods
  const profiles = json('sport-profiles.v1.json')
  const entries = manifest.batches.flatMap((name, position) => {
    assert.match(name, /^(legacy-specifications|batch-\d{3})\.json$/)
    const records = json(name)
    const batch = position === 0 ? 'legacy' : String(position).padStart(3, '0')
    const expectedName = position === 0 ? 'legacy-specifications.json' : 'batch-' + batch + '.json'
    assert.equal(name, expectedName)
    assert(records.length > 0 && records.length <= 100, name + ': invalid batch size')
    assert(records.every(record => record.batch === batch), name + ': batch mismatch')
    return records
  })
  validateEntries(entries, legacy, profiles)
  return { entries, manifest }
}

export function validateEntries(entries, legacy, profiles) {
  const byId = new Map(entries.map(entry => [entry.id, entry]))
  assert.equal(byId.size, entries.length, 'Duplicate IDs')
  const names = new Set()
  const equations = new Set()
  const old = new Map(legacy.map(entry => [entry.id, entry]))
  for (const historical of legacy) {
    assert.equal(byId.get(historical.id)?.legacy_id, historical.id, 'Missing preserved entry: ' + historical.id)
  }
  for (const entry of entries) {
    const context = entry.id + ': '
    assert.match(entry.id, idPattern, context + 'invalid identifier')
    for (const key of [
      'name', 'family', 'profile', 'definition', 'variables', 'assumptions', 'limitations',
      'computation', 'application', 'required_inputs', 'data_rights', 'batch'
    ]) assert(nonempty(entry[key]), context + 'missing ' + key)
    assert(classes.has(entry.classification), context + 'invalid classification')
    assert(/[=~∼←→∝≤≥]/u.test(entry.definition) && entry.definition.trim().length >= 5,
      context + 'missing mathematical specification')
    assert(!names.has(slug(entry.name)), context + 'normalized name duplicates another record')
    assert(!equations.has(signature(entry.definition)), context + 'normalized specification duplicates another record')
    names.add(slug(entry.name))
    equations.add(signature(entry.definition))
    for (const key of ['failure_conditions', 'compatible_methods', 'incompatible_methods']) {
      assert(Array.isArray(entry[key]) && entry[key].length && entry[key].every(nonempty), context + 'invalid ' + key)
    }
    assert(['literature', 'original-derivation', 'repository'].includes(entry.source?.kind) &&
      nonempty(entry.source.citation), context + 'invalid source')
    if (entry.source.citation.startsWith('doi:')) {
      assert.match(entry.source.citation, /^doi:10\.\d{4,9}\/\S+$/u, context + 'invalid DOI form')
    }
    assert(Array.isArray(entry.sports) && entry.sports.length && entry.sports.every(sport => sports.has(sport)),
      context + 'invalid sports')
    const profile = profiles[entry.profile]
    assert(profile, context + 'unknown sport/data profile')
    const original = old.get(entry.id)
    if (original) {
      assert.equal(entry.legacy_id, entry.id, context + 'missing legacy identity')
      for (const key of ['name', 'family', 'status', 'implementation_ref', 'sports']) {
        assert.deepEqual(entry[key], original[key], context + 'historical ' + key + ' changed')
      }
    } else {
      assert.equal(entry.legacy_id, null)
      assert(entry.sports.every(sport => profile.sports.includes(sport)), context + 'sport/profile mismatch')
      assert(
        entry.status === 'SPECIFIED' && entry.implementation_ref === null ||
        entry.source?.kind === 'repository' && entry.status === 'IMPLEMENTED' &&
          entry.id === 'poisson-form-025' && entry.implementation_ref === 'research/football-baseline-v1/replay.mjs',
        context + 'unsupported research lifecycle claim'
      )
    }
    assert.equal(entry.test_evidence, null, context + 'unsupported test claim')
    assert.equal(entry.input_timing, (entry.profile === 'assessment' || (entry.profile === 'causal' && !['ipw', 'aipw'].includes(entry.id)))
      ? 'assessment-only' : 'as-of-cutoff',
      context + 'incompatible input timing')
    assert(Array.isArray(entry.relationships) && entry.relationships.length, context + 'missing relationships')
    for (const relationship of entry.relationships) {
      assert(['variant-of', 'related'].includes(relationship.type) && relationship.target !== entry.id &&
        byId.has(relationship.target), context + 'invalid relationship')
    }
    assert(entry.compatible_methods.every(id => byId.has(id) && id !== entry.id), context + 'unknown related method')
    assert.equal(entry.relationships.filter(r => r.type === 'variant-of').length, Number(variants.has(entry.classification)),
      context + 'incorrect variant classification or missing parent')
  }
}
