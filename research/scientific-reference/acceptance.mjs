// Reconcile real generated artifacts and exercise static browser views.
import assert from 'node:assert/strict'
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs'
import {join,resolve} from 'node:path'
import {tmpdir} from 'node:os'
import {pathToFileURL} from 'node:url'
import {chromium} from 'playwright'
import {load,summarize} from './library.mjs'
import {loadLedger,assessReviews} from './review-history.mjs'
import {loadAnnotations,compareClaims} from './compare-claims.mjs'
import {exportReferences,renderReferenceNotes} from './citation-export.mjs'
import {dashboard,renderDashboard} from './dashboard.mjs'
const root=process.argv[2],date='2026-11-24',register=load(),ledger=loadLedger(),annotations=loadAnnotations()
const read=name=>JSON.parse(readFileSync(join(root,name),'utf8'))
assert.deepEqual(read('summary.json'),summarize(register))
assert.deepEqual(read('review-status.json'),assessReviews(register,ledger,date))
assert.deepEqual(read('comparison-report.json'),compareClaims(register,ledger,annotations,date))
const exported=read('reference-export.json')
assert.deepEqual(exported,exportReferences(register,ledger,date))
assert.equal(readFileSync(join(root,'reference-notes.md'),'utf8'),renderReferenceNotes(exported))
const snapshot=read('dashboard.json')
assert.deepEqual(snapshot,dashboard(register,ledger,annotations,date))
assert.equal(readFileSync(join(root,'dashboard.html'),'utf8'),renderDashboard(snapshot))
const temp=mkdtempSync(join(tmpdir(),'reference-browser-'))
try{
 const changed=structuredClone(register);changed.sources[0].version='Synthetic changed release for browser test'
 const stale=dashboard(changed,ledger,annotations,date)
 assert.equal(stale.counts.changedMetadata,1)
 const path=join(temp,'stale.html');writeFileSync(path,renderDashboard(stale))
 const browser=await chromium.launch({headless:true})
 try{
  for(const [file,expected] of [[join(root,'dashboard.html'),snapshot],[path,stale]]){
   for(const width of [1440,390,320]){
    const page=await browser.newPage({viewport:{width,height:850}})
    const errors=[],requests=[]
    page.on('pageerror',e=>errors.push(String(e)))
    page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url())})
    await page.goto(pathToFileURL(resolve(file)).href)
    assert.equal(await page.locator('section').count(),expected.counts.sources)
    assert.equal(await page.locator('article').count(),expected.counts.claims)
    const body=await page.locator('body').innerText()
    assert.ok(body.includes(expected.dashboardSha256))
    assert.ok(body.includes('PUBLICATION BLOCKED'))
    assert.ok(body.includes('Unassessed'))
    if(expected.counts.changedMetadata)assert.ok(body.includes('METADATA_CHANGED_REVIEW_REQUIRED'))
    assert.equal(await page.locator('script,button,form,iframe').count(),0)
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true)
    assert.deepEqual(errors,[]);assert.deepEqual(requests,[])
    await page.close()
   }
  }
 }finally{await browser.close()}
 console.log('PASS reference bundle reconciliation, stale review and Chromium acceptance at three widths')
}finally{rmSync(temp,{recursive:true,force:true})}
