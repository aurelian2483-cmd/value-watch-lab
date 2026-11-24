// Hosted browser acceptance using verified historical aggregates, not live measurements.
import assert from 'node:assert/strict'
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,rmSync,realpathSync,copyFileSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {chromium} from 'playwright'
import {startViewer} from './viewer.mjs'
import {synchronise,status} from './sync.mjs'
import {createHash} from 'node:crypto'
const [inboxArg,stateArg,outArg]=process.argv.slice(2)
assert.ok(inboxArg&&stateArg&&outArg&&process.argv.length===5,'Usage: browser-acceptance.mjs inbox accepted-state output')
const inbox=realpathSync(inboxArg),accepted=realpathSync(stateArg),out=realpathSync(outArg)
const baseline=readFileSync(join(accepted,'current.json'))
const approvalRaw=readFileSync(join(inbox,'approval.json'))
const approvalHash=createHash('sha256').update(approvalRaw).digest('hex')
const baselineState=JSON.parse(baseline)
const root=realpathSync(mkdtempSync(join(tmpdir(),'live-browser-')))
const local=join(root,'state'),stale=join(root,'stale')
mkdirSync(local);mkdirSync(stale)
let browser,server,staleServer
const results=[]
try{
 browser=await chromium.launch({headless:true})
 server=await startViewer(local,{port:0})
 const url='http://127.0.0.1:'+server.address().port
 // Stale test uses unchanged, verified reports with a synthetic past receipt clock.
 const old=new Date(Date.now()-7200000).toISOString()
 const testInbox=join(root,'inbox');mkdirSync(testInbox)
 const pins=JSON.parse(readFileSync(new URL('../unified-control-centre/source-pins.json',import.meta.url),'utf8'))
 for(const p of pins)copyFileSync(join(inbox,p.file),join(testInbox,p.file))
 const oldApproval={...JSON.parse(approvalRaw),approvedAt:old}
 const oldRaw=JSON.stringify(oldApproval);writeFileSync(join(testInbox,'approval.json'),oldRaw)
 synchronise(testInbox,stale,createHash('sha256').update(oldRaw).digest('hex'),{now:old})
 staleServer=await startViewer(stale,{port:0})
 const staleUrl='http://127.0.0.1:'+staleServer.address().port
 async function inspect(page,target,scenario,expected){
  const requests=[],errors=[]
  const onRequest=r=>{if(!r.url().startsWith(target+'/')&&r.url()!==target)requests.push(r.url())}
  const onError=e=>errors.push(e.message)
  page.on('request',onRequest);page.on('pageerror',onError)
  try{
   const response=await page.goto(target+'/')
   assert.equal(response.status(),scenario==='corrupt'?503:200)
   assert.match(await page.locator('body').innerText(),expected)
   assert.match(await page.locator('body').innerText(),/UNVALIDATED/)
   assert.match(await page.locator('body').innerText(),/PUBLICATION BLOCKED/)
   assert.equal(await page.locator('script,form,button,input,iframe').count(),0)
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
   if(scenario==='recent'||scenario==='stale'){
    assert.equal(await page.locator('section').count(),6)
    assert.equal(await page.locator('nav a').count(),6)
    assert.match(await page.locator('body').innerText(),/Measurement freshness: UNKNOWN/)
    for(const pin of pins){
     await page.locator('nav a[href="#'+pin.id+'"]').click()
     const section=page.locator('section#'+pin.id)
     await section.locator('summary').click()
     assert.equal(await section.locator('details').getAttribute('open'),'')
     assert.match(await section.innerText(),new RegExp(pin.head))
    }
   }
   assert.deepEqual(requests,[]);assert.deepEqual(errors,[])
   results.push({scenario,width:page.viewportSize().width,status:'PASS'})
   await page.screenshot({path:join(out,'live-'+scenario+'-'+page.viewportSize().width+'.png'),fullPage:true})
  }finally{page.off('request',onRequest);page.off('pageerror',onError)}
 }
 for(const width of [1440,390,320]){
  rmSync(join(local,'current.json'),{force:true})
  const context=await browser.newContext({viewport:{width,height:900}})
  try{
   const page=await context.newPage()
   await inspect(page,url,'empty',/NO_ACCEPTED_BATCH/)
   synchronise(inbox,local,approvalHash)
   // The already-open page must see the new state without restarting the server.
   await inspect(page,url,'recent',/RECENTLY_RECEIVED/)
   await inspect(page,staleUrl,'stale',/STALE/)
   writeFileSync(join(local,'current.json'),'{corrupt')
   await inspect(page,url,'corrupt',/Evidence unavailable or invalid/)
  }finally{await context.close()}
 }
 // Real timed auto-refresh: open empty page, then accept a batch and await reload.
 rmSync(join(local,'current.json'),{force:true})
 const page=await browser.newPage({viewport:{width:390,height:900}})
 try{
  await page.goto(url+'/')
  assert.match(await page.locator('body').innerText(),/NO_ACCEPTED_BATCH/)
  synchronise(inbox,local,approvalHash)
  await page.getByText('Receipt status: RECENTLY_RECEIVED',{exact:false}).waitFor({timeout:25000})
  assert.equal(await page.locator('section').count(),6)
  results.push({scenario:'timed-auto-refresh',width:390,status:'PASS'})
 }finally{await page.close()}
 assert.deepEqual(readFileSync(join(accepted,'current.json')),baseline)
 assert.equal(status(accepted).snapshot.snapshotSha256,baselineState.snapshot.snapshotSha256)
 writeFileSync(join(out,'live-browser-acceptance.json'),JSON.stringify({kind:'LIVE_BROWSER_ACCEPTANCE',checks:results,snapshotSha256:baselineState.snapshot.snapshotSha256,modelValidation:'UNVALIDATED',publicationGate:'BLOCKED',executionAuthorized:false,limitations:['Hosted Chromium loopback only.','Historical reports, simulated receipt age; no live producer or measurement validation.']},null,2)+'\n')
 console.log('PASS twelve live browser scenarios and timed automatic refresh')
}finally{
 if(browser)await browser.close()
 for(const s of [server,staleServer])if(s)await new Promise(ok=>s.close(ok))
 rmSync(root,{recursive:true,force:true})
}
