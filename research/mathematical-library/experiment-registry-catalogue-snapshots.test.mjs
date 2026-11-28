import {test} from 'node:test'
import assert from 'node:assert/strict'
import {verifySnapshots} from './experiment-registry-catalogue-snapshots.mjs'
test('generated catalogue snapshots match committed outputs',()=>{
 const r=verifySnapshots()
 assert.equal(r.reports.length,4)
 assert.ok(r.reports.every(x=>x.status==='MATCH'))
 assert.equal(r.executionAuthorized,false)
})
