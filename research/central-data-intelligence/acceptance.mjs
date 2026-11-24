// Acceptance tests of the generated static artifact bundle; no deployment.
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {join,resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
import {chromium} from 'playwright'
import {verifyManifest} from './manifest.mjs'
import {verifyPacket} from './review-packet.mjs'
import {sourcePaths} from './source-audit.mjs'
if(process.argv.length!==3)throw Error('Expected artifact directory')
const root=resolve(process.argv[2])
const json=name=>JSON.parse(readFileSync(join(root,name),'utf8'))
const m=json('manifest.json'),a=json('source-audit.json'),q=json('quality-report.json'),i=json('integrated-status.json'),p=json('documentary-review-packet.json')
assert.ok(verifyManifest(m))
assert.ok(verifyPacket(p))
for(const report of [m,a,q,i,p]){
 assert.equal(report.publicationGate,'BLOCKED')
 assert.equal(report.executionAuthorized,false)
 assert.equal(report.validationAuthorized,false)
}
assert.equal(q.manifestSha256,m.manifestSha256)
assert.equal(i.dataQuality.manifestSha256,m.manifestSha256)
assert.equal(p.manifestSha256,m.manifestSha256)
for(const report of [q,i,p])assert.equal(report.declaredSourceRevision,m.declaredSourceRevision)
assert.equal(m.sourceStableDuringInspection,true)
assert.equal(a.sourceStableDuringInspection,true)
assert.equal(q.inspectionConsistent,true)
assert.equal(i.dataQuality.aggregateCountsAgree,true)
assert.deepEqual(q.sources,a.rows)
assert.deepEqual(q.archive,a.archive)
assert.deepEqual(q.historical,m.historical)
assert.deepEqual(q.prospective,m.prospective)
assert.deepEqual(i.dataQuality.historical,m.historical.counts)
assert.deepEqual(i.dataQuality.prospective,m.prospective.counts)
assert.equal(i.dataQuality.sourceCount,sourcePaths.length)
assert.equal(i.dataQuality.filesPresent,a.rows.filter(r=>r.status==='PRESENT').length)
assert.equal(p.tasks.length,sourcePaths.length)
for(const task of p.tasks){
 const row=a.rows.find(r=>r.path===task.path)
 assert.ok(row)
 assert.equal(task.sourceSha256,row.status==='PRESENT'?row.sha256:null)
 assert.equal(task.accessAuthorized,false)
 assert.equal(task.independentReviewRecorded,false)
}
assert.equal(p.counts.independentlyVerified,0)
assert.equal(p.counts.documentaryReviewRequired+p.counts.sourceUnavailable,p.tasks.length)
assert.equal(i.dataQuality.sourcesRequiringReview,sourcePaths.length)
assert.ok(q.provenanceReview.sources.every(s=>!s.accessAuthorized&&!s.rightsVerified&&!s.provenanceVerified))
const browser=await chromium.launch()
try{
 for(const [filename,title,metrics] of [['index.html','Data quality and provenance',15],['integrated-status.html','Integrated research status',8]]){
  for(const width of [1440,390,320]){
   const page=await browser.newPage({viewport:{width,height:900}})
   const errors=[],external=[]
   page.on('pageerror',e=>errors.push(e.message))
   page.on('request',r=>{if(/^https?:/.test(r.url()))external.push(r.url())})
   await page.route(/^https?:/,route=>route.abort())
   await page.goto(pathToFileURL(join(root,filename)).href,{waitUntil:'load'})
   assert.equal(await page.getByRole('heading',{level:1}).textContent(),title)
   assert.equal(await page.locator('.metric').count(),metrics)
   assert.match(await page.locator('body').innerText(),/PUBLICATION BLOCKED/)
   assert.equal(await page.locator('script,form,iframe,button').count(),0)
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'Page overflow at '+filename+' '+width)
   assert.deepEqual(errors,[])
   assert.deepEqual(external,[])
   await page.close()
  }
 }
 console.log('PASS cross-artifact fingerprints/counts and both static dashboards at 1440, 390, 320px; no external requests or execution controls.')
}finally{await browser.close()}
