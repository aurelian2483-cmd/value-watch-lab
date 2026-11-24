import {test} from 'node:test'
import assert from 'node:assert/strict'
import {load} from './library.mjs'
import {loadLedger,digest} from './review-history.mjs'
import {loadAnnotations} from './compare-claims.mjs'
import {dashboard,renderDashboard} from './dashboard.mjs'
const date='2026-11-24'
test('dashboard reconciles all three registered references and avoids false agreement',()=>{
 const r=load(),l=loadLedger(),a=loadAnnotations(),before=JSON.stringify([r,l,a])
 const d=dashboard(r,l,a,date)
 assert.equal(d.counts.sources,3);assert.equal(d.counts.claims,3)
 assert.equal(d.counts.recordedLocatorReviews,2);assert.equal(d.counts.recordedMetadataReviews,1)
 assert.equal(d.comparisonCoverage,'NO_COMPARABLE_PAIRS')
 assert.equal(d.counts.independentlyReviewed,0)
 assert.match(renderDashboard(d),/Unassessed/)
 assert.equal(JSON.stringify([r,l,a]),before)
 assert.deepEqual(dashboard(r,l,a,date),d)
 const {dashboardSha256,...payload}=d;assert.equal(digest(payload),dashboardSha256)
})
test('changed and future evidence is not promoted',()=>{
 const r=load(),l=loadLedger(),a=loadAnnotations()
 r.sources[0].version='Changed version'
 assert.equal(dashboard(r,l,a,date).counts.changedMetadata,1)
 assert.equal(dashboard(r,l,a,'2026-11-23').counts.noReviewRecorded,3)
})
test('HTML escapes source content and rejects altered snapshot',()=>{
 const r=load();r.claims[0].statement='<script>alert(1)</script>'
 const d=dashboard(r,loadLedger(),loadAnnotations(),date),html=renderDashboard(d)
 assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<(?:script|button|form|iframe)\b/i)
 assert.match(html,/PUBLICATION BLOCKED/)
 assert.throws(()=>renderDashboard({...d,publicationGate:'OPEN'}))
})
