import { createHash, randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync, linkSync, unlinkSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { manifest, register } from './experiment-registry.mjs'

const hash = text => createHash('sha256').update(text).digest('hex')
const validId = id => typeof id === 'string' && /^[a-f0-9]{64}$/.test(id)
const transitions = {
  REGISTERED: ['RUNNING'],
  RUNNING: ['CHECKPOINTED','COMPLETED','FAILED','INTERRUPTED'],
  CHECKPOINTED: ['RUNNING','FAILED','INTERRUPTED'],
  INTERRUPTED: ['RUNNING','FAILED'],
  COMPLETED: [], FAILED: []
}
function atomicCreate(file, payload) {
  const temp = file + '.' + randomUUID() + '.tmp'
  try {
    writeFileSync(temp, payload, {flag:'wx',mode:0o600,flush:true})
    linkSync(temp,file)
  } finally {
    try { unlinkSync(temp) } catch (e) { if(e.code !== 'ENOENT') throw e }
  }
}
export function history(directory,id) {
  if (!validId(id)) throw new TypeError('Invalid experiment ID')
  const record = JSON.parse(readFileSync(join(directory,id+'.json'),'utf8'))
  if (manifest(record).experimentId !== id || record.experimentId !== id ||
      record.researchOnly !== true || record.publicationGate !== 'BLOCKED')
    throw new Error('Invalid registry manifest')
  const folder = join(directory,id)
  let files
  try { files = readdirSync(folder).filter(n=>/^\d{8}\.json$/.test(n)).sort() }
  catch(e) { if(e.code==='ENOENT') files=[]; else throw e }
  let previous = id, status = 'REGISTERED'
  const events = files.map((name,i)=>{
    if(name !== String(i+1).padStart(8,'0')+'.json') throw new Error('Lifecycle sequence gap')
    const raw = readFileSync(join(folder,name),'utf8')
    const event = JSON.parse(raw)
    if(event.experimentId!==id || event.sequence!==i+1 || event.previous!==previous ||
       !transitions[status]?.includes(event.status) || event.researchOnly!==true ||
       event.publicationGate!=='BLOCKED') throw new Error('Invalid lifecycle chain')
    previous=hash(raw); status=event.status
    return event
  })
  return {status,events,previous}
}
export function append(directory,id,status,details={}) {
  const current=history(directory,id)
  if(!transitions[current.status]?.includes(status)) throw new Error('Invalid lifecycle transition')
  if(!details || Object.getPrototypeOf(details)!==Object.prototype) throw new TypeError('Invalid details')
  if(['CHECKPOINTED','COMPLETED'].includes(status) && !validId(details.artifactHash))
    throw new Error('Evidence artifact hash required')
  if(['FAILED','INTERRUPTED'].includes(status) && (typeof details.reason!=='string'||!details.reason.trim()))
    throw new Error('Failure or interruption reason required')
  const sequence=current.events.length+1
  const event={experimentId:id,sequence,previous:current.previous,status,details,
    recordedAt:new Date().toISOString(),researchOnly:true,publicationGate:'BLOCKED'}
  const folder=join(directory,id)
  mkdirSync(folder,{recursive:true})
  atomicCreate(join(folder,String(sequence).padStart(8,'0')+'.json'),JSON.stringify(event))
  return event
}
export function prepareBatch(directory,specs) {
  if(!Array.isArray(specs)||specs.length<1||specs.length>250) throw new RangeError('Batch must contain 1–250 specifications')
  const records=specs.map(manifest)
  if(new Set(records.map(r=>r.experimentId)).size!==records.length) throw new Error('Duplicate specification within batch')
  return {status:'PREPARED_NOT_EXECUTED',researchOnly:true,publicationGate:'BLOCKED',
    records:specs.map(spec=>register(directory,spec))}
}
