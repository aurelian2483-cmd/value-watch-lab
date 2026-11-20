import { pathToFileURL } from 'node:url'

export const grids = { a: [0, 0.25, 0.5, 0.75, 1], r: [0.25, 0.5, 0.75, 1], m: [0, 0.25, 0.5, 0.75, 1] }
export const denominator = 64
export const basis = ['U', 'A', 'B', 'M']
export const models = {
  A: { phase2Id: 'A0_FULL', distance: 1, going: 1, class: 0.5, course: 0.5, halfLifeDays: 90, K: 5, beta: 2 },
  B: { phase2Id: 'E_NODIST_half_life_inverse_temperature', distance: 0, going: 1, class: 0.5, course: 0.5, halfLifeDays: 45, K: 5, beta: 4 }
}

export function weights(a, r, m) {
  if (!grids.a.includes(a) || !grids.r.includes(r) || !grids.m.includes(m)) {
    throw new RangeError('Parameters must belong to the reconstructed grids')
  }
  const [aq, rq, mq] = [a * 4, r * 4, m * 4]
  return [(4 - mq) * (4 - rq) * 4, (4 - mq) * rq * aq, (4 - mq) * rq * (4 - aq), mq * 16]
}

export function experiment() {
  const canonical = new Map()
  for (const m of grids.m) {
    for (const r of grids.r) {
      for (const a of grids.a) {
        const numerators = weights(a, r, m)
        const key = numerators.join('-')
        if (!canonical.has(key)) {
          const active = basis.filter((_, j) => numerators[j] > 0)
          canonical.set(key, {
            id: 'sky81-' + key,
            classification: 'parameter-configuration',
            mechanism: active.length > 1 ? 'linear-pool' : 'single-component',
            active,
            numerators,
            catalogue: active.length > 1
              ? { id: 'weighted-ensemble', relationship: 'fixed-weights-configuration' }
              : { id: 'weighted-ensemble', relationship: 'single-component-boundary' },
            settings: []
          })
        }
        canonical.get(key).settings.push({ a, r, m })
      }
    }
  }
  const configurations = [...canonical.values()]
  return {
    schemaVersion: 1, grids, basis, denominator, models,
    provenance: {
      grids: 'User-supplied reconstruction for PR #114, 2026-11-20',
      models: 'Phase 3 PHASE3_PROTOCOL.md at 1e7995219a38f4949557f56f123ef03dbfbd3c33',
      settingIds: 'Reconstructed from exact coefficients in U,A,B,M order'
    },
    gridSettings: configurations.reduce((total, row) => total + row.settings.length, 0),
    uniqueConfigurations: configurations.length,
    configurations
  }
}

const sum = values => values.reduce((total, value) => total + value, 0)
const validVector = (values, n, predicate) =>
  Array.isArray(values) && values.length === n && Array.from(values).every(predicate)

function checkedProbability(values, n) {
  if (!validVector(values, n, p => Number.isFinite(p) && p >= 0 && p <= 1) ||
      Math.abs(sum(values) - 1) > 1e-12) {
    throw new RangeError('Expected a normalized probability vector for the complete active field')
  }
  return values
}

export function marketProbabilities(decimalOdds, n) {
  if (!Number.isSafeInteger(n) || n < 1 ||
      !validVector(decimalOdds, n, d => Number.isFinite(d) && d > 1)) {
    throw new RangeError('Expected finite decimal odds above 1 for every active runner')
  }
  const inverse = decimalOdds.map(d => 1 / d)
  const total = sum(inverse)
  return inverse.map(value => value / total)
}

// Inputs share one ordered, cut-off-aligned active field. Validate only active components.
export function predict({ n, A, B, decimalOdds }, { a, r, m }) {
  if (!Number.isSafeInteger(n) || n < 1) throw new RangeError('Expected a nonempty active field')
  const [u, wa, wb, wm] = weights(a, r, m)
  const modelA = wa ? checkedProbability(A, n) : null
  const modelB = wb ? checkedProbability(B, n) : null
  const market = wm ? marketProbabilities(decimalOdds, n) : null
  return Array.from({ length: n }, (_, i) =>
    (u / n + wa * (modelA?.[i] ?? 0) + wb * (modelB?.[i] ?? 0) + wm * (market?.[i] ?? 0)) / denominator
  )
}

// Use the original Phase 3 history extraction and its dated similarity and recency fields.
export function phase3Probabilities(histories, model) {
  if (!Object.hasOwn(models, model)) throw new RangeError('Unknown Phase 3 model')
  const params = models[model]
  if (!Array.isArray(histories) || histories.length < 1) throw new RangeError('Expected runner histories')
  const logits = Array.from(histories, history => {
    if (!Array.isArray(history) || history.length < 3 || history.length > 6) {
      throw new RangeError('Expected three to six resolved same-discipline runs')
    }
    let recencyMass = 0
    let weightedTotal = 0
    let weightedScore = 0
    for (const { recency_weight: recency90, finish_percentile: y, similarities } of history) {
      if (!Number.isFinite(recency90) || recency90 <= 0 || recency90 > 1 ||
          !Number.isFinite(y) || y < 0 || y > 1) throw new RangeError('Invalid frozen history values')
      let multiplier = 1
      for (const name of ['distance', 'going', 'class', 'course']) {
        const value = similarities?.[name]
        if (value === null) continue
        if (!Number.isFinite(value) || value < 0 || value > 1) throw new RangeError('Invalid similarity')
        multiplier += params[name] * value
      }
      const recency = recency90 ** (90 / params.halfLifeDays)
      const weight = recency * multiplier
      recencyMass += recency
      weightedTotal += weight
      weightedScore += weight * y
    }
    const reliability = recencyMass / (recencyMass + params.K)
    return params.beta * (0.5 + reliability * (weightedScore / weightedTotal - 0.5))
  })
  const max = logits.reduce((largest, value) => Math.max(largest, value), -Infinity)
  const exponentials = logits.map(value => Math.exp(value - max))
  const total = sum(exponentials)
  return exponentials.map(value => value / total)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(JSON.stringify(experiment(), null, 2))
}
