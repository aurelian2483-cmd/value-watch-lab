// Explicitly started, bounded local observation loop. No network notifications or automatic repair.
import {setTimeout as delay} from 'node:timers/promises'
import {pathToFileURL} from 'node:url'
import {recordObservation} from './incident-history.mjs'
const flags={researchOnly:true,publicationGate:'BLOCKED',executionAuthorized:false,validationAuthorized:false,repairAuthorized:false}
const active=new Set(['NEW','RECURRING','OBSERVED_AGAIN'])
export function alertsFor(summary){
 if(summary?.kind!=='RESEARCH_INCIDENT_HISTORY_SUMMARY'||!Array.isArray(summary.incidents)||
    !Object.entries(flags).every(([k,v])=>summary[k]===v))throw Error('Invalid observation summary')
 const current=summary.incidents.filter(i=>active.has(i.state))
 return {blocking:current.filter(i=>i.severity==='BLOCK').length,
  review:current.filter(i=>i.severity==='REVIEW').length,
  alerts:current.filter(i=>['NEW','RECURRING'].includes(i.state)).map(i=>({incidentId:i.id,code:i.code,subject:i.subject,severity:i.severity,state:i.state})),
  suppressed:current.filter(i=>i.state==='OBSERVED_AGAIN').length,
  unknownCoverage:summary.incidents.filter(i=>i.state==='UNKNOWN_COVERAGE').length}
}
export async function monitorBounded(history,registry,artifacts,revision,{intervalSeconds=60,maxCycles=10,stopOnBlock=true,signal,onObservation=()=>{}}={}){
 if(!Number.isSafeInteger(intervalSeconds)||intervalSeconds<1||intervalSeconds>3600||
   !Number.isSafeInteger(maxCycles)||maxCycles<1||maxCycles>120||
   (maxCycles-1)*intervalSeconds>3600||typeof stopOnBlock!=='boolean'||typeof onObservation!=='function')
  throw Error('Invalid bounded monitoring policy')
 let cycles=0,alerts=0,suppressed=0,lastObservation=null,reason='CYCLE_LIMIT',failure=null
 const started=Date.now(),deadline=started+3600000
 while(cycles<maxCycles){
  if(signal?.aborted){reason='STOP_REQUESTED';break}
  if(Date.now()>=deadline){reason='TIME_BUDGET';break}
  try{
   const summary=recordObservation(history,registry,artifacts,revision)
   const detected=alertsFor(summary)
   cycles++;alerts+=detected.alerts.length;suppressed+=detected.suppressed
   lastObservation={sequence:summary.observations,entrySha256:summary.latestEntrySha256,...detected}
   await onObservation({kind:'RESEARCH_MONITOR_OBSERVATION',schemaVersion:1,cycle:cycles,...lastObservation,...flags})
   if(stopOnBlock&&detected.blocking){reason='BLOCKING_INCIDENT';break}
  }catch(e){reason='OBSERVATION_FAILED';failure=e?.code==='EEXIST'?'STORE_LOCK_OR_CONFLICT':'INSPECTION_OR_OUTPUT_FAILED';break}
  if(cycles>=maxCycles)break
  if(signal?.aborted){reason='STOP_REQUESTED';break}
  const remaining=deadline-Date.now()
  if(remaining<=0){reason='TIME_BUDGET';break}
  try{await delay(Math.min(intervalSeconds*1000,remaining),undefined,{signal})}
  catch(e){if(signal?.aborted){reason='STOP_REQUESTED';break}reason='OBSERVATION_FAILED';failure='WAIT_FAILED';break}
 }
 return {kind:'RESEARCH_BOUNDED_MONITOR_SUMMARY',schemaVersion:1,declaredRevision:revision,
  status:reason==='OBSERVATION_FAILED'?'FAILED':reason==='BLOCKING_INCIDENT'?'BLOCKED':'STOPPED',
  reason,failure,cycles,alerts,suppressed,lastObservation,intervalSeconds,maxCycles,stopOnBlock,...flags,
  limitations:['Foreground local polling only; no installed service or external notifications.',
   'Observation budget checked between scans; not a hard deadline for a synchronous filesystem read.',
   'Missing evidence and repeated alerts do not indicate repair or validation.']}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(process.argv.length!==8||!/^\d+$/.test(process.argv[6])||!/^\d+$/.test(process.argv[7])){
  console.error('Usage: node monitor-loop.mjs <history-directory> <registry-directory> <artifact-directory> <revision> <interval-seconds> <max-cycles>')
  process.exitCode=2
 }else{
  const controller=new AbortController()
  const stop=()=>controller.abort()
  process.once('SIGINT',stop);process.once('SIGTERM',stop)
  try{
   const result=await monitorBounded(...process.argv.slice(2,6),{intervalSeconds:Number(process.argv[6]),maxCycles:Number(process.argv[7]),signal:controller.signal,
    onObservation:r=>console.error(JSON.stringify(r))})
   console.log(JSON.stringify(result,null,2))
   if(['FAILED','BLOCKED'].includes(result.status))process.exitCode=1
  }catch(e){console.error(e.message);process.exitCode=1}
  finally{process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop)}
 }
}
