// CI-only acceptance of generated artifacts. No source dataset access.
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {readFileSync,writeFileSync,mkdtempSync,rmSync,realpathSync} from 'node:fs'
import {join,resolve} from 'node:path'
import {tmpdir} from 'node:os'
import {chromium} from 'playwright'
import {build,verifySnapshot} from './overview.mjs'
import {render} from './website.mjs'
const [inputArg,outputArg]=process.argv.slice(2)
assert.ok(inputArg&&outputArg&&process.argv.length===4,'Usage: acceptance.mjs input output')
const input=realpathSync(inputArg),output=resolve(outputArg)
const pins=JSON.parse(readFileSync(new URL('./source-pins.json',import.meta.url),'utf8'))
const json=p=>JSON.parse(readFileSync(p,'utf8'))
const hash=b=>createHash('sha256').update(b).digest('hex')
const snapshot=json(join(output,'overview.json')),html=readFileSync(join(output,'index.html'),'utf8')
const receipts=json(join(output,'archive-receipts.json'))
assert.equal(receipts.kind,'PINNED_ARCHIVE_VERIFICATION')
assert.equal(receipts.researchValidation,'UNVALIDATED')
assert.equal(receipts.publicationGate,'BLOCKED')
assert.equal(receipts.archives.length,5)
assert.equal(new Set(receipts.archives.map(x=>x.id)).size,5)
assert.equal(verifySnapshot(snapshot),true)
assert.deepEqual(build(input),snapshot)
assert.equal(render(snapshot),html)
assert.deepEqual(snapshot.counts,{modules:6,available:6,unavailable:0})
assert.deepEqual(snapshot.modules.map(m=>m.id),pins.map(p=>p.id))
const originals=new Map(), reports=new Map()
for(const pin of pins){
 const bytes=readFileSync(join(input,pin.file)),m=snapshot.modules.find(x=>x.id===pin.id)
 originals.set(pin.id,bytes);reports.set(pin.id,JSON.parse(bytes))
 assert.equal(m.receiptSha256,hash(bytes))
 assert.deepEqual([m.source.pr,m.source.head,m.source.reportRevision,m.source.run,m.source.artifact],[pin.pr,pin.head,pin.reportRevision,pin.run,pin.artifact])
 if(pin.artifact!==null){
  const a=receipts.archives.find(x=>x.id===pin.id)
  assert.ok(a);assert.equal(a.artifactId,pin.artifact);assert.equal(a.runId,pin.run)
  assert.equal(a.head,pin.head);assert.equal(a.summarySha256,hash(bytes))
  assert.match(a.archiveSha256,/^[a-f0-9]{64}$/)
  assert.ok(Number.isFinite(Date.parse(a.expiresAt)))
 }
}
const metric=(id,label)=>snapshot.modules.find(m=>m.id===id).metrics.find(m=>m.label===label)?.value
const cat=reports.get('catalogue'),data=reports.get('data'),lab=reports.get('lab'),compute=reports.get('compute'),supervisor=reports.get('supervisor'),refs=reports.get('references')
assert.equal(metric('catalogue','Registered specifications'),cat.registered)
assert.equal(metric('catalogue','Remaining'),1000-cat.registered)
assert.equal(metric('data','Allowlisted files'),data.dataQuality.sourceCount)
assert.equal(metric('lab','Expected fixtures'),lab.expectedFixtures)
assert.equal(metric('lab','Known answers passed'),lab.checks?.knownAnswer.passed??null)
assert.equal(metric('compute','CPU evidence'),compute.cpu.status)
assert.equal(metric('compute','GPU evidence'),compute.gpu.status)
assert.equal(metric('supervisor','Blocking incidents'),supervisor.incidentCounts.blocking)
assert.equal(metric('supervisor','Review incidents'),supervisor.incidentCounts.review)
assert.equal(metric('references','Registered sources'),refs.counts.sources)
assert.equal(metric('references','Scientific claims'),refs.counts.claims)
assert.equal(metric('references','Potential conflicts'),refs.counts.comparablePairs?refs.counts.potentialConflicts:'Unassessed')
const temp=realpathSync(mkdtempSync(join(tmpdir(),'unified-acceptance-')))
let browser
try{
 const missing=build(temp)
 assert.deepEqual(missing.counts,{modules:6,available:0,unavailable:6})
 for(const p of pins)writeFileSync(join(temp,p.file),originals.get(p.id))
 for(const p of pins){
  const target=join(temp,p.file)
  writeFileSync(target,'{broken')
  const invalid=build(temp)
  assert.equal(invalid.counts.available,5)
  assert.equal(invalid.modules.find(m=>m.id===p.id).evidenceState,'INVALID_CONTRACT')
  assert.equal(invalid.modules.find(m=>m.id===p.id).status,'UNKNOWN')
  assert.equal(invalid.modules.find(m=>m.id===p.id).metrics.length,0)
  const modified=JSON.parse(originals.get(p.id))
  if(p.id==='catalogue')modified.qualified=1
  else modified.publicationGate='OPEN'
  writeFileSync(target,JSON.stringify(modified))
  assert.equal(build(temp).modules.find(m=>m.id===p.id).evidenceState,'INVALID_CONTRACT')
  writeFileSync(target,originals.get(p.id))
 }
 const missingPin=pins.find(p=>p.id==='compute')
 rmSync(join(temp,missingPin.file))
 writeFileSync(join(temp,'supervisor.json'),'{invalid')
 const partial=build(temp)
 assert.deepEqual(partial.counts,{modules:6,available:4,unavailable:2})
 assert.equal(partial.modules.find(m=>m.id==='compute').evidenceState,'MISSING')
 assert.equal(partial.modules.find(m=>m.id==='supervisor').evidenceState,'INVALID_CONTRACT')
 browser=await chromium.launch({headless:true})
 const widths=[1440,390,320],results=[]
 for(const [name,report,markup] of [['complete',snapshot,html],['missing',missing,render(missing)],['partial',partial,render(partial)]]){
  for(const width of widths){
   const page=await browser.newPage({viewport:{width,height:900}})
   const requests=[],errors=[]
   page.on('request',r=>requests.push(r.url()));page.on('pageerror',e=>errors.push(e.message))
   try{
    await page.setContent(markup)
    assert.equal(await page.locator('h1').innerText(),'Research Control Centre')
    assert.equal(await page.locator('section').count(),6)
    assert.equal(await page.locator('nav a').count(),6)
    assert.equal(await page.locator('script,button,form,iframe,input').count(),0)
    assert.ok((await page.locator('body').innerText()).includes('UNVALIDATED · PUBLICATION BLOCKED · NO EXECUTION AUTHORISED'))
    assert.ok((await page.locator('.overview').innerText()).includes(report.counts.available+' / 6 summary contracts checked'))
    for(const m of report.modules){
     const section=page.locator('section#'+m.id)
     assert.equal(await section.locator('h2').innerText(),m.name)
     assert.equal(await section.locator('.state').innerText(),m.status)
     assert.equal(await section.locator('.metrics strong').count(),m.metrics.length)
     await page.locator('nav a[href="#'+m.id+'"]').click()
     await section.locator('summary').click()
     assert.equal(await section.locator('details').getAttribute('open'),'')
     assert.ok((await section.innerText()).includes(m.source.head))
    }
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth))
    assert.deepEqual(requests,[]);assert.deepEqual(errors,[])
    if(name==='complete')await page.screenshot({path:join(output,'browser-'+width+'.png'),fullPage:true})
    results.push({scenario:name,width,status:'PASS'})
   }finally{await page.close()}
  }
 }
 for(const p of pins)assert.ok(readFileSync(join(input,p.file)).equals(originals.get(p.id)))
 writeFileSync(join(output,'acceptance.json'),JSON.stringify({kind:'UNIFIED_CONTROL_CENTRE_ACCEPTANCE',snapshotSha256:snapshot.snapshotSha256,sourceSummariesReconciled:6,archiveReceiptsReconciled:5,malformedInputsRejected:6,unsafeGateInputsRejected:6,browserChecks:results,publicationGate:'BLOCKED',modelValidation:'UNVALIDATED',executionAuthorized:false,limitations:['Historical summary checks only; not raw evidence or physical hardware validation.','Archive digest verification performed by the preceding CI step.']},null,2)+'\n')
 console.log('PASS six summary reconciliation, five receipt bindings, twelve invalid-input checks and nine Chromium scenarios')
}finally{
 if(browser)await browser.close()
 rmSync(temp,{recursive:true,force:true})
}
