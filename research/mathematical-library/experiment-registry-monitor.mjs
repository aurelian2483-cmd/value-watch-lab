import { readdirSync } from 'node:fs'
import { history } from './experiment-registry-lifecycle.mjs'

export function monitor(directory) {
  const statuses = {REGISTERED:0,RUNNING:0,CHECKPOINTED:0,INTERRUPTED:0,COMPLETED:0,FAILED:0}
  const records=[],errors=[]
  let files
  try { files=readdirSync(directory,{withFileTypes:true}) }
  catch(e) { return {available:false,researchOnly:true,publicationGate:'BLOCKED',statuses:null,records,errors:[{code:e.code||'READ_FAILURE'}]} }
  for(const file of files.filter(f=>/^[a-f0-9]{64}\.json$/.test(f.name)).sort((a,b)=>a.name.localeCompare(b.name))){
    const id=file.name.slice(0,-5)
    try {
      if(!file.isFile()) throw new Error('Not a regular manifest file')
      const h=history(directory,id)
      statuses[h.status]++
      records.push({experimentId:id,status:h.status,eventCount:h.events.length,
        latestRecordedAt:h.events.at(-1)?.recordedAt??null,
        checkpointRecorded:h.events.some(e=>e.status==='CHECKPOINTED')})
    } catch(e) { errors.push({experimentId:id,code:'UNREADABLE_OR_INVALID_HISTORY'}) }
  }
  return {available:true,integrity:errors.length?'DEGRADED':'NO_READ_ERRORS',
    researchOnly:true,publicationGate:'BLOCKED',statuses,records,errors,
    notice:'Lifecycle counts are not mathematical validation. Checkpoint references are not independently verified artifacts.'}
}
