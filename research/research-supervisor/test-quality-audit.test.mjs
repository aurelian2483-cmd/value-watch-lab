import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {mkdtempSync,realpathSync,mkdirSync,rmSync,writeFileSync,readFileSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {register} from '../mathematical-library/experiment-registry.mjs'
import {append} from '../mathematical-library/experiment-registry-lifecycle.mjs'
import {inspectRegistry} from './supervisor.mjs'
import {summarizeHistory} from './incident-history.mjs'
import {alertsFor} from './monitor-loop.mjs'
const rev='37e8617ec875c63cd7428612f48bee7638b89050'
function fixture(t){const d=realpathSync(mkdtempSync(join(tmpdir(),'supervisor-audit-')));t.after(()=>rmSync(d,{recursive:true,force:true}));return d}
function create(d){return register(d,{formulaId:'bisection',codeRevision:rev,datasetHash:'a'.repeat(64),configuration:{scope:'synthetic'},seed:0,primaryMetric:'absolute-error',partition:'development'}).experimentId}
test('byte-valid artifact with wrong experiment identity is blocked',t=>{
 const d=fixture(t),id=create(d);append(d,id,'RUNNING')
 const content=JSON.stringify({schemaVersion:1,experimentId:'b'.repeat(64),state:{kind:'synthetic'}})
 const hash=createHash('sha256').update(content).digest('hex')
 mkdirSync(join(d,'artifacts'));writeFileSync(join(d,'artifacts',hash+'.json'),content)
 append(d,id,'COMPLETED',{artifactHash:hash})
 const r=inspectRegistry(d)
 assert.equal(r.status,'BLOCKED')
 assert.ok(r.incidents.some(i=>i.code==='TERMINAL_EVIDENCE_MISSING_OR_INVALID'))
 assert.equal(readFileSync(join(d,'artifacts',hash+'.json'),'utf8'),content)
})
test('invalid manifest suppresses misleading partial counts',t=>{
 const d=fixture(t);writeFileSync(join(d,'b'.repeat(64)+'.json'),'{}')
 const r=inspectRegistry(d)
 assert.equal(r.status,'BLOCKED');assert.equal(r.counts,null)
 assert.ok(r.incidents.some(i=>i.code==='UNREADABLE_OR_INVALID_HISTORY'))
})
test('incidents reappearing after incomplete coverage generate another alert',()=>{
 const i={id:'a',source:'registry',code:'EXAMPLE',severity:'REVIEW'}
 const entry=(n,incidents,coverage)=>({observedAt:new Date(Date.UTC(2026,10,24,21,0,n)).toISOString(),incidents,coverage:{registry:coverage}})
 const rows=summarizeHistory([entry(0,[i],true),entry(1,[],false),entry(2,[i],true)])
 assert.equal(rows[0].state,'RECURRING')
 const a=alertsFor({kind:'RESEARCH_INCIDENT_HISTORY_SUMMARY',incidents:rows,researchOnly:true,publicationGate:'BLOCKED',executionAuthorized:false,validationAuthorized:false,repairAuthorized:false})
 assert.equal(a.alerts.length,1);assert.equal(a.suppressed,0)
})
