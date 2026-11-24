// Bounded local worker execution for the five fixed synthetic numerical cases only.
import {Worker} from 'node:worker_threads'
import {availableParallelism,totalmem,freemem} from 'node:os'
import {performance} from 'node:perf_hooks'
import {pathToFileURL} from 'node:url'
import {suiteSpecifications,runSuite} from './suite.mjs'
const workerURL=new URL('./fixture-worker.mjs',import.meta.url)
const natural=(x,min,max)=>Number.isSafeInteger(x)&&x>=min&&x<=max
export function resourcePlan({workers=2,timeoutMs=10000,heapMiB=32}={}){
 if(!natural(workers,1,4)||!natural(timeoutMs,100,30000)||!natural(heapMiB,16,64))throw RangeError('Invalid synthetic resource limits')
 const cpu=availableParallelism(),free=freemem()
 // Conservative scheduling estimate, not a reservation or hard process memory limit.
 const memorySlots=Math.floor(free/(128*1024*1024))
 if(memorySlots<1)throw Error('Insufficient reported free memory for synthetic worker')
 return {backend:'CPU_NODE_WORKER',requestedWorkers:workers,workers:Math.min(workers,cpu,memorySlots),
  availableCpuSlots:cpu,hostTotalMemoryBytes:totalmem(),hostReportedFreeMemoryBytes:free,
  workerOldGenerationMiB:heapMiB,workerYoungGenerationMiB:8,workerStackMiB:4,
  perFixtureTimeoutMs:timeoutMs,gpu:{status:'DISABLED_NOT_VALIDATED',devicesDetected:null}}
}
function executeFixture(revision,index,plan){
 return new Promise(resolve=>{
  const started=performance.now()
  let worker,timer,finished=false
  const finish=async result=>{
   if(finished)return
   finished=true
   clearTimeout(timer)
   if(worker){
    try{await worker.terminate()}catch{result={status:'WORKER_TERMINATION_FAILED',result:null}}
   }
   resolve({index,...result,wallMs:performance.now()-started})
  }
  try{
   worker=new Worker(workerURL,{workerData:{revision,index},resourceLimits:{maxOldGenerationSizeMb:plan.workerOldGenerationMiB,maxYoungGenerationSizeMb:plan.workerYoungGenerationMiB,stackSizeMb:plan.workerStackMiB}})
   worker.once('message',data=>void finish({status:'RETURNED',result:data}))
   worker.once('error',()=>void finish({status:'WORKER_ERROR',result:null}))
   worker.once('exit',()=>void finish({status:'NO_RESULT',result:null}))
   timer=setTimeout(()=>void finish({status:'TIMEOUT',result:null}),plan.perFixtureTimeoutMs)
  }catch{void finish({status:'WORKER_START_FAILED',result:null})}
 })
}
export async function runParallel(revision,options={}){
 if(typeof revision!=='string'||!/^[a-f0-9]{40}$/.test(revision))throw TypeError('Full declared revision required')
 const plan=resourcePlan(options),started=performance.now(),specs=suiteSpecifications(revision)
 const baseline=runSuite(revision),rows=new Array(specs.length)
 let next=0,active=0,peakActive=0
 async function lane(){
  while(next<specs.length){
   const index=next++
   active++;peakActive=Math.max(peakActive,active)
   try{rows[index]=await executeFixture(revision,index,plan)}finally{active--}
  }
 }
 await Promise.all(Array.from({length:Math.min(plan.workers,specs.length)},lane))
 const results=rows.map(r=>{
  const row=r.result?.row
  const match=r.status==='RETURNED'&&JSON.stringify(row)===JSON.stringify(baseline.results[r.index])
  return {index:r.index,fixtureId:baseline.results[r.index].id,status:match&&row.status==='PASS'?'PASS':'FAIL',
   workerStatus:r.status,serialAgreement:match,observed:row??null,wallMs:r.wallMs,
   workerElapsedMs:r.result?.elapsedMs??null,heapUsedBytes:r.result?.heapUsedBytes??null,heapTotalBytes:r.result?.heapTotalBytes??null}
 })
 return {kind:'SYNTHETIC_CPU_RESOURCE_REPORT',schemaVersion:1,declaredCodeRevision:revision,plan,peakActiveWorkers:peakActive,
  elapsedMs:performance.now()-started,results,counts:{total:results.length,passed:results.filter(r=>r.status==='PASS').length,failed:results.filter(r=>r.status==='FAIL').length},
  researchOnly:true,publicationGate:'BLOCKED',executionAuthorized:false,validationAuthorized:false,
  limitations:['Worker V8 heap/stack limits do not cap process RSS, native allocations or all memory.',
   'Host-reported memory and CPU availability are estimates; no reservation, OS-level quota or GPU detection.',
   'Timings include scheduling and startup overhead; no performance advantage or cross-hardware reproducibility established.',
   'Only fixed mathematical fixtures; no arbitrary jobs or predictive model execution.']}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(![3,4].includes(process.argv.length)){console.error('Usage: node parallel.mjs <revision> [workers]');process.exitCode=2}
 else{try{const r=await runParallel(process.argv[2],{workers:process.argv[3]===undefined?2:Number(process.argv[3])});console.log(JSON.stringify(r,null,2));if(r.counts.failed)process.exitCode=1}catch(e){console.error(e.message);process.exitCode=1}}
}
