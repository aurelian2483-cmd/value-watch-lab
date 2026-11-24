import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,rmSync,readdirSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {qualityReport} from './quality-report.mjs'
import {controlCentre} from '../mathematical-library/experiment-registry-control-centre.mjs'
import {integratedStatus,integrateReports,renderIntegratedStatus} from './integration.mjs'
const root=fileURLToPath(new URL('../../',import.meta.url)),rev='06b180ead0f7d38ae72d95127c63122e6d83b99b'
function fixture(t){const d=mkdtempSync(join(tmpdir(),'central-integration-'));t.after(()=>rmSync(d,{recursive:true,force:true}));return d}
test('existing inventories agree without enabling access or modifying registry',t=>{
 const d=fixture(t),r=integratedStatus(root,d,rev)
 assert.equal(r.dataQuality.aggregateCountsAgree,true)
 assert.equal(r.dataQuality.sourceCount,9)
 assert.equal(r.dataQuality.sourcesRequiringReview,9)
 assert.equal(r.systems.length,3)
 assert.equal(r.publicationGate,'BLOCKED')
 assert.equal(r.accessAuthorized,false)
 assert.equal(r.validationAuthorized,false)
 assert.equal(r.executionAuthorized,false)
 assert.ok(r.blockers.includes('INDEPENDENT_SOURCE_REVIEW_REQUIRED'))
 const html=renderIntegratedStatus(root,d,rev)
 assert.match(html,/Integrated research status/)
 assert.match(html,/UNVALIDATED · PUBLICATION BLOCKED/)
 assert.doesNotMatch(html,/<script\b|<form\b|<iframe\b/i)
 assert.deepEqual(readdirSync(d),[])
})
test('mismatched counts suppress both shared count inventories',t=>{
 const d=fixture(t),q=qualityReport(root,rev),c=controlCentre(root,d)
 const changed=structuredClone(c);changed.systems[0].historical.input++
 const r=integrateReports(q,changed)
 assert.equal(r.dataQuality.aggregateCountsAgree,false)
 assert.equal(r.dataQuality.historical,null)
 assert.equal(r.dataQuality.prospective,null)
 assert.ok(r.blockers.includes('SHARED_AGGREGATE_COUNTS_UNRECONCILED'))
 assert.throws(()=>integrateReports({...q,executionAuthorized:true},c))
})
test('missing inputs cannot become zero or a successful reconciliation',t=>{
 const d=fixture(t),r=integratedStatus(d,join(d,'missing'),rev)
 assert.equal(r.dataQuality.aggregateCountsAgree,false)
 assert.equal(r.dataQuality.historical,null)
 assert.equal(r.dataQuality.prospective,null)
 assert.equal(r.status,'RESEARCH_NOT_READY')
 assert.deepEqual(readdirSync(d),[])
})
