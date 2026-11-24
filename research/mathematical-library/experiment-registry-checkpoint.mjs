import { createHash, randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync, linkSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { history, append } from './experiment-registry-lifecycle.mjs'
const digest = bytes => createHash('sha256').update(bytes).digest('hex')
const validHash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)
const limit = 4 * 1024 * 1024
function encode(state) {
  const payload = JSON.stringify(state, (_,v) => {
    if (v === undefined || typeof v === 'function' || typeof v === 'symbol' ||
        (typeof v === 'number' && !Number.isFinite(v))) throw new TypeError('Invalid checkpoint value')
    return v
  })
  const bytes = Buffer.from(payload,'utf8')
  if (bytes.length > limit) throw new RangeError('Checkpoint exceeds size limit')
  return bytes
}
function store(directory, bytes) {
  const artifactHash = digest(bytes)
  const folder = join(directory,'artifacts')
  mkdirSync(folder,{recursive:true})
  const path = join(folder,artifactHash+'.json')
  const temp = path+'.'+randomUUID()+'.tmp'
  try {
    writeFileSync(temp,bytes,{flag:'wx',mode:0o600,flush:true})
    try { linkSync(temp,path) } catch(e) {
      if (e.code !== 'EEXIST') throw e
      if (!readFileSync(path).equals(bytes)) throw new Error('Conflicting checkpoint artifact')
    }
  } finally {
    try { unlinkSync(temp) } catch(e) { if(e.code!=='ENOENT') throw e }
  }
  return artifactHash
}
export function saveCheckpoint(directory,id,state) {
  if (history(directory,id).status !== 'RUNNING') throw new Error('Experiment is not running')
  if (!state || Object.getPrototypeOf(state)!==Object.prototype) throw new TypeError('Expected checkpoint state object')
  const artifactHash = store(directory,encode({schemaVersion:1,experimentId:id,state}))
  return append(directory,id,'CHECKPOINTED',{artifactHash})
}
export function restoreCheckpoint(directory,id) {
  const h=history(directory,id)
  if (!['CHECKPOINTED','INTERRUPTED','RUNNING'].includes(h.status)) throw new Error('Experiment is not recoverable')
  const checkpoint=h.events.findLast(event=>event.status==='CHECKPOINTED')
  if (!checkpoint) return null
  const artifactHash=checkpoint.details?.artifactHash
  if (!validHash(artifactHash)) throw new Error('Invalid checkpoint hash')
  const bytes=readFileSync(join(directory,'artifacts',artifactHash+'.json'))
  if (bytes.length>limit || digest(bytes)!==artifactHash) throw new Error('Checkpoint integrity failure')
  const artifact=JSON.parse(bytes.toString('utf8'))
  if (artifact.schemaVersion!==1 || artifact.experimentId!==id ||
      !artifact.state || Object.getPrototypeOf(artifact.state)!==Object.prototype)
    throw new Error('Checkpoint identity failure')
  return {sequence:checkpoint.sequence,artifactHash,state:artifact.state}
}
