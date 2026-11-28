import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {report} from './experiment-registry-report.mjs'
import {loadCatalogue} from './validate-v1.mjs'
import {register} from './experiment-registry.mjs'
test('report derives counts from registry and catalogue without granting authority',t=>{
 const dir=mkdtempSync(join(tmpdir(),'vw-report-'))
 t.after(()=>rmSync(dir,{recursive:true,force:true}))
 register(dir,{formulaId:'synthetic-infrastructure-smoke',codeRevision:'a'.repeat(40),datasetHash:'b'.repeat(64),configuration:{steps:5},seed:1,primaryMetric:'synthetic-checksum',partition:'development'})
 const r=report(dir)
 const count=loadCatalogue().entries.length
 assert.equal(r.catalogue.registered,count)
 assert.equal(r.catalogue.remaining,Math.max(0,1000-count))
 assert.equal(r.catalogue.sizeGateMet,count>=1000)
 assert.equal(r.catalogue.independentReviewRequired,true)
 assert.equal(r.operational.snapshot.statuses.REGISTERED,1)
 assert.equal(r.executionAuthorized,false)
 assert.equal(r.publicationGate,'BLOCKED')
 assert.equal(report(join(dir,'missing')).operational.status,'BLOCKED')
})
