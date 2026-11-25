import {test} from 'node:test'
import assert from 'node:assert/strict'
import {fileURLToPath} from 'node:url'
import {mkdtempSync,rmSync,readdirSync,readFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {qualityReport,renderQualityReport} from './quality-report.mjs'
const root=fileURLToPath(new URL('../../',import.meta.url)),rev='bdbcb340cd65f21b9a49984e81a73cf65acdfdda'
test('combined report agrees with existing source counts and remains read-only',()=>{
 const file=join(root,'historical-reliability-data.json'),before=readFileSync(file)
 const r=qualityReport(root,rev),html=renderQualityReport(root,rev)
 assert.equal(r.inspectionConsistent,true)
 assert.equal(r.sources.length,9)
 assert.equal(r.historical.counts.input,JSON.parse(before).results.length)
 assert.equal(r.validationAuthorized,false)
 assert.equal(r.executionAuthorized,false)
 assert.ok(r.gaps.includes('SOURCE_RIGHTS_NOT_ESTABLISHED'))
 assert.equal(r.provenanceReview.counts.NO_RECORDED_CLAIM,9)
 assert.equal(r.provenanceReview.accessAuthorized,false)
 assert.match(html,/Source provenance and rights/)
 assert.match(html,/REVIEW REQUIRED · PUBLICATION BLOCKED/)
 assert.ok(html.includes('<strong>'+r.historical.counts.input+'</strong>'))
 assert.equal((html.match(/<tr>/g)||[]).length,10)
 assert.doesNotMatch(html,/<script\b|<form\b|<iframe\b/i)
 assert.deepEqual(readFileSync(file),before)
})
test('missing sources stay unknown and no files are written',t=>{
 const d=mkdtempSync(join(tmpdir(),'quality-report-'));t.after(()=>rmSync(d,{recursive:true,force:true}))
 const r=qualityReport(d,rev),html=renderQualityReport(d,rev)
 assert.equal(r.status,'INCOMPLETE')
 assert.equal(r.historical.counts,null)
 assert.equal(r.prospective.counts,null)
 assert.ok(r.gaps.includes('ALLOWLISTED_SOURCE_UNAVAILABLE'))
 assert.ok(html.includes('<strong>Unavailable</strong>'))
 assert.deepEqual(readdirSync(d),[])
})
