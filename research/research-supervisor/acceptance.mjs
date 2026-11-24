// Test the actual produced evidence and browser views, including a missing-evidence copy.
import {chromium} from 'playwright'
import assert from 'node:assert/strict'
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,rmSync,realpathSync} from 'node:fs'
import {join,resolve} from 'node:path'
import {tmpdir} from 'node:os'
import {pathToFileURL} from 'node:url'
import {dashboard,renderDashboard} from './dashboard.mjs'
import {verifyStoredSuite} from '../mathematical-testing-lab/persistence.mjs'
const [registry,artifacts,revision]=process.argv.slice(2)
const read=name=>JSON.parse(readFileSync(join(artifacts,name),'utf8'))
const r=read('supervisor-dashboard.json')
assert.equal(r.declaredRevision,revision)
assert.equal(r.status,'REVIEW_REQUIRED')
assert.equal(r.registryCounts.COMPLETED,5)
assert.equal(r.incidentCounts.review,1)
assert.equal(r.recommendations[0].subject,'scientific-gpu')
assert.equal(r.repairAuthorized,false)
assert.equal(verifyStoredSuite(registry,read('report.json'),read('persistence-repeat.json')).verified,5)
const history=read('incident-history.json'),loop=read('monitor-loop.json')
assert.equal(history.incidents[0].id,r.recommendations[0].incidentId)
assert.equal(loop.cycles,2);assert.equal(loop.suppressed,1)
const html=readFileSync(join(artifacts,'supervisor-dashboard.html'),'utf8')
assert.equal(html,renderDashboard(r))
const temp=realpathSync(mkdtempSync(join(tmpdir(),'supervisor-browser-')))
try{
 const empty=join(temp,'empty');mkdirSync(empty)
 const incomplete=dashboard(registry,empty,revision)
 assert.equal(incomplete.incidentCounts.review,3)
 const incompletePath=join(temp,'incomplete.html');writeFileSync(incompletePath,renderDashboard(incomplete))
 const browser=await chromium.launch({headless:true})
 try{
  for(const [path,expected] of [[join(artifacts,'supervisor-dashboard.html'),r],[incompletePath,incomplete]]){
   for(const width of [1440,390,320]){
    const page=await browser.newPage({viewport:{width,height:850}})
    const errors=[],requests=[]
    page.on('pageerror',e=>errors.push(String(e)))
    page.on('request',q=>{if(/^https?:/.test(q.url()))requests.push(q.url())})
    await page.goto(pathToFileURL(resolve(path)).href)
    assert.equal(await page.locator('article').count(),expected.recommendations.length)
    assert.equal(await page.locator('section').count(),3)
    assert.ok((await page.locator('body').innerText()).includes(expected.dashboardSha256))
    assert.ok((await page.locator('body').innerText()).includes('PUBLICATION BLOCKED'))
    assert.equal(await page.locator('button,form,script,iframe').count(),0)
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true)
    assert.deepEqual(errors,[]);assert.deepEqual(requests,[])
    await page.close()
   }
  }
 }finally{await browser.close()}
 console.log('PASS stored fixture evidence, incident reconciliation and supervisor browser acceptance at three widths')
}finally{rmSync(temp,{recursive:true,force:true})}
