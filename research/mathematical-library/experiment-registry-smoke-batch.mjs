// Synthetic infrastructure verification only; no sports experiments.
import { manifest } from './experiment-registry.mjs'
import { prepareBatch, history } from './experiment-registry-lifecycle.mjs'
import { runSmoke } from './experiment-registry-smoke-runner.mjs'

export function runSmokeBatch(directory,specs,{stepBudget=250}={}){
  if(!Number.isSafeInteger(stepBudget)||stepBudget<1||stepBudget>250)
    throw new RangeError('Invalid batch step budget')
  if(!Array.isArray(specs)||specs.length<1||specs.length>250)
    throw new RangeError('Invalid batch size')
  const records=specs.map(spec=>{
    if(spec?.formulaId!=='synthetic-infrastructure-smoke'||
       !Number.isSafeInteger(spec?.configuration?.steps)||
       spec.configuration.steps<1||spec.configuration.steps>100)
      throw new Error('Only bounded synthetic specifications permitted')
    return manifest(spec)
  })
  prepareBatch(directory,specs)
  let remaining=stepBudget
  const results=[]
  for(let i=0;i<specs.length;i++){
    const id=records[i].experimentId
    const status=history(directory,id).status
    if(['COMPLETED','FAILED','RUNNING'].includes(status)||remaining===0){
      results.push({id,status,executed:0})
      continue
    }
    const result=runSmoke(directory,specs[i],{
      maxSteps:specs[i].configuration.steps,stopAfter:Math.min(remaining,100)
    })
    remaining-=result.executed
    results.push(result)
  }
  return {researchOnly:true,publicationGate:'BLOCKED',synthetic:true,
    executedSteps:stepBudget-remaining,remainingBudget:remaining,results}
}
