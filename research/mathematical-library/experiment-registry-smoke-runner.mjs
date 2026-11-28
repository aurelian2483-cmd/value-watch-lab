// Infrastructure verification only. No sports data, model selection or betting execution.
import { register } from './experiment-registry.mjs'
import { history, append } from './experiment-registry-lifecycle.mjs'
import { saveCheckpoint, restoreCheckpoint } from './experiment-registry-checkpoint.mjs'
export function runSmoke(directory,spec,{maxSteps=10,stopAfter=10}={}) {
  if(spec.formulaId!=='synthetic-infrastructure-smoke') throw new Error('Only synthetic infrastructure tests permitted')
  if(!Number.isSafeInteger(maxSteps)||maxSteps<1||maxSteps>100||
     !Number.isSafeInteger(stopAfter)||stopAfter<1||stopAfter>100) throw new RangeError('Invalid step budget')
  if(spec.configuration.steps!==maxSteps) throw new Error('Step count must be bound to manifest')
  const {experimentId:id}=register(directory,spec)
  const h=history(directory,id)
  if(['COMPLETED','FAILED'].includes(h.status)) return {id,status:h.status,executed:0}
  if(h.status==='RUNNING') throw new Error('Running experiment requires explicit interruption review')
  const recovered=h.status==='REGISTERED'?null:restoreCheckpoint(directory,id)
  let cursor=recovered?.state.cursor??0
  let total=recovered?.state.total??0
  if(!Number.isSafeInteger(cursor)||cursor<0||cursor>maxSteps||total!==cursor*(cursor+1)/2)
    throw new Error('Invalid recovered state')
  let executed=0
  append(directory,id,'RUNNING')
  while(cursor<maxSteps && executed<stopAfter){
    cursor++; total+=cursor; executed++
    saveCheckpoint(directory,id,{cursor,total})
    append(directory,id,'RUNNING')
  }
  if(cursor===maxSteps){
    const event=saveCheckpoint(directory,id,{cursor,total})
    append(directory,id,'RUNNING')
    append(directory,id,'COMPLETED',{artifactHash:event.details.artifactHash})
    return {id,status:'COMPLETED',executed,total}
  }
  append(directory,id,'INTERRUPTED',{reason:'Synthetic step budget exhausted'})
  return {id,status:'INTERRUPTED',executed,total}
}
