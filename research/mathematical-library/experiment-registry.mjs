import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

function canonical(value) {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value)
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value)
  if (Array.isArray(value)) return '[' + Array.from(value, canonical).join(',') + ']'
  if (value && Object.getPrototypeOf(value) === Object.prototype)
    return '{' + Object.keys(value).sort().map(k => JSON.stringify(k)+':'+canonical(value[k])).join(',') + '}'
  throw new TypeError('Unsupported manifest value')
}
const digest = v => createHash('sha256').update(canonical(v)).digest('hex')
export function manifest(spec) {
  if (!spec || typeof spec !== 'object') throw new TypeError('Missing specification')
  const { formulaId, codeRevision, datasetHash, configuration, seed, primaryMetric } = spec
  if (!/^[a-z][a-z0-9-]*$/.test(formulaId || '') ||
      !/^[a-f0-9]{40}$/.test(codeRevision || '') ||
      !/^[a-f0-9]{64}$/.test(datasetHash || '') ||
      !configuration || Object.getPrototypeOf(configuration) !== Object.prototype ||
      !Number.isSafeInteger(seed) || typeof primaryMetric !== 'string' || !primaryMetric.trim())
    throw new TypeError('Incomplete experiment specification')
  if (spec.partition !== 'development') throw new Error('Only development partition supported')
  const identity = { formulaId, codeRevision, datasetHash, configuration: JSON.parse(canonical(configuration)), seed, primaryMetric, partition:'development', schemaVersion:1 }
  return { ...identity, experimentId:digest(identity), researchOnly:true, publicationGate:'BLOCKED' }
}
export function register(directory, spec) {
  const record = manifest(spec)
  mkdirSync(directory, { recursive:true })
  const file = join(directory, record.experimentId + '.json')
  const payload = canonical(record)
  try {
    writeFileSync(file, payload, { flag:'wx', mode:0o600 })
    return { experimentId:record.experimentId, status:'REGISTERED' }
  } catch (error) {
    if (error.code !== 'EEXIST') throw error
    if (readFileSync(file,'utf8') !== payload) throw new Error('Existing manifest corrupt or conflicting')
    return { experimentId:record.experimentId, status:'DUPLICATE' }
  }
}
