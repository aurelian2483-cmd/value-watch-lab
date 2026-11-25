import {test} from 'node:test'
import assert from 'node:assert/strict'
import {evaluateRegister,reviewSources} from './source-review.mjs'
import {sourcePaths} from './source-audit.mjs'
import {fileURLToPath} from 'node:url'
const rows=sourcePaths.map(path=>({path,status:'PRESENT',sha256:'a'.repeat(64)}))
const asOf='2026-11-24T12:00:00.000Z'
const claim={path:sourcePaths[0],sourceSha256:'a'.repeat(64),providerNamespace:'synthetic-provider',
 originEvidenceSha256:'b'.repeat(64),rightsEvidenceSha256:'c'.repeat(64),independenceEvidenceSha256:null,
 recordedAt:'2026-11-01T00:00:00.000Z',expiresAt:'2026-12-01T00:00:00.000Z',claimedScopes:['metadata-inspection']}
const run=(claims=[],r=rows,consistent=true)=>evaluateRegister(r,{schemaVersion:1,kind:'SOURCE_REVIEW_CLAIMS',claims},{inspectionConsistent:consistent,asOf})
test('empty register leaves every source unreviewed',()=>{
 const r=run()
 assert.equal(r.counts.NO_RECORDED_CLAIM,sourcePaths.length)
 assert.ok(r.sources.every(s=>!s.rightsVerified&&!s.accessAuthorized&&!s.provenanceVerified))
})
test('valid current claim is documentary metadata only',()=>{
 const r=run([claim])
 assert.equal(r.sources[0].status,'CLAIM_REQUIRES_INDEPENDENT_REVIEW')
 assert.deepEqual(r.sources[0].claimedScopes,['metadata-inspection'])
 assert.equal(r.sources[0].independenceVerified,false)
 assert.equal(r.accessAuthorized,false)
 assert.equal(r.validationAuthorized,false)
 assert.equal(r.publicationGate,'BLOCKED')
})
test('changed, ambiguous, future and expired claims fail closed',()=>{
 assert.equal(run([{...claim,sourceSha256:'d'.repeat(64)}]).sources[0].status,'CONTENT_CHANGED_REVIEW_REQUIRED')
 assert.equal(run([claim,claim]).sources[0].status,'AMBIGUOUS_CLAIMS')
 assert.equal(run([{...claim,expiresAt:asOf}]).sources[0].status,'CLAIM_EXPIRED')
 assert.equal(run([{...claim,recordedAt:'2026-11-25T00:00:00.000Z'}]).sources[0].status,'CLAIM_NOT_YET_EFFECTIVE')
 assert.equal(run([claim],rows,false).sources[0].status,'INSPECTION_INCONSISTENT')
 assert.equal(run([claim],[{...rows[0],status:'MISSING',sha256:null},...rows.slice(1)]).sources[0].status,'SOURCE_UNAVAILABLE')
})
test('malformed register and unapproved scopes cannot authorize anything',()=>{
 for(const c of [{...claim,path:'../secret'},{...claim,rightsEvidenceSha256:'bad'},{...claim,claimedScopes:['unrestricted']}]){
  const r=run([c]);assert.equal(r.registerStatus,'INVALID');assert.equal(r.sources[0].status,'REGISTER_UNAVAILABLE_OR_INVALID')
 }
 assert.throws(()=>evaluateRegister(rows.slice(1),{}, {inspectionConsistent:true,asOf}))
})
test('checked-in register is explicitly empty and does not fabricate reviews',()=>{
 const root=fileURLToPath(new URL('../../',import.meta.url))
 const r=reviewSources(root,rows,true,asOf)
 assert.equal(r.registerStatus,'AVAILABLE')
 assert.equal(r.counts.NO_RECORDED_CLAIM,9)
})
