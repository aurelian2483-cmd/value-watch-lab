// Fixed internal worker entry point, no user-supplied code or datasets.
import {parentPort,workerData} from 'node:worker_threads'
import {performance} from 'node:perf_hooks'
import {runFixture} from './suite.mjs'
if(!parentPort)throw Error('Worker context required')
const start=performance.now()
const row=runFixture(workerData.revision,workerData.index)
const memory=process.memoryUsage()
parentPort.postMessage({row,elapsedMs:performance.now()-start,heapUsedBytes:memory.heapUsed,heapTotalBytes:memory.heapTotal})
