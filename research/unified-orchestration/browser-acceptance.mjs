// Real browser acceptance on copies of the accepted historical Phase 2 state.
import assert from 'node:assert/strict'
import {readFileSync,writeFileSync,mkdirSync,rmSync,mkdtempSync,realpathSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {createHash} from 'node:crypto'
import {chromium} from 'playwright'
import {status} from '../unified-live/sync.mjs'
import {inspect,advance,setReviewControl} from './registry.mjs'
import {startDashboard} from './dashboard.mjs'
const [evidence,out]=process.argv.slice(2)
assert.ok(evidence&&out&&process.argv.length===4,'Usage: browser-acceptance.mjs evidence-dir output-dir')
const baseline=readFileSync(join(evidence,'current.json'))
const root=realpathSync(mkdtempSync(join(tmpdir(),'orchestration-browser-')))
const local=join(root,'evidence'),registry=join(root,'registry'),plan=join(root,'plan.json')
mkdirSync(local);mkdirSync(registry)
writeFileSync(join(local,'current.json'),baseline)
const state=status(local)
const raw=JSON.stringify({kind:'APPROVED_ORCHESTRATION_REVIEW',schemaVersion:1,baseRevision:'79379e17c448f17404d0df70d76b87fcb4f51504',stateSha256:state.stateSha256,trustSha256:null,mode:'HISTORICAL_MANUAL_REVIEW'})
writeFileSync(plan,raw)
const args=[local,registry,plan,createHash('sha256').update(raw).digest('hex')]
let browser,server
const checks=[]
try{
 server=await startDashboard(...args,{port:0})
 const url='http://127.0.0.1:'+server.address().port
 browser=await chromium.launch({headless:true})
 for(const width of [1440,390,320,280]){
  rmSync(join(registry,'registry.json'),{force:true})
  rmSync(join(registry,'control.json'),{force:true})
  const page=await browser.newPage({viewport:{width,height:900}})
  const external=[],errors=[]
  page.on('pageerror',e=>errors.push(e.message))
  await page.route('**/*',route=>{
   if(route.request().url().startsWith(url+'/'))return route.continue()
   external.push(route.request().url());return route.abort()
  })
  async function check(name,reviewed,recorded,ready,waiting){
   const response=await page.goto(url+'/')
   assert.equal(response.status(),200)
   assert.equal(await page.locator('[data-task]').count(),7)
   assert.equal(await page.locator('.task.recorded').count(),recorded)
   assert.equal(await page.locator('.task.ready').count(),ready)
   assert.equal(await page.locator('.task.waiting').count(),waiting)
   assert.equal(await page.locator('[data-reviewed]').getAttribute('data-reviewed'),String(reviewed))
   const text=await page.locator('body').innerText()
   for(const value of ['UNVALIDATED','PUBLICATION BLOCKED','EXECUTION BLOCKED','Measurement freshness: UNKNOWN'])assert.ok(text.includes(value))
   assert.equal(await page.locator('script,form,button,input,iframe').count(),0)
   const layout=await page.evaluate(()=>{
    const viewport=document.documentElement.clientWidth
    const overflow=[...document.querySelectorAll('main,main *')].filter(el=>{
     const rect=el.getBoundingClientRect()
     return rect.right>viewport+1||rect.left< -1||el.scrollWidth>el.clientWidth+1&&getComputedStyle(el).overflowX==='visible'
    }).map(el=>({tag:el.tagName,className:el.className,text:el.innerText?.slice(0,80)}))
    return {viewport,scrollWidth:document.documentElement.scrollWidth,overflow}
   })
   assert.ok(layout.scrollWidth<=layout.viewport&&layout.overflow.length===0,JSON.stringify({scenario:name,width,...layout}))
   const expectedLifecycle=reviewed===0?'NOT_INITIALIZED':reviewed===7?'METADATA_REVIEW_COMPLETE_EXECUTION_BLOCKED':'REVIEW_PENDING'
   assert.equal(await page.locator('[data-lifecycle]').getAttribute('data-lifecycle'),expectedLifecycle)
   if(reviewed===7)assert.match(await page.locator('[data-lifecycle]').innerText(),/Metadata review complete — execution remains blocked/)
   for(const fingerprint of await page.locator('dd code').all()){
    assert.ok(await fingerprint.isVisible())
    const value=await fingerprint.innerText()
    assert.match(value,/^(?:[a-f0-9]{64}|Not initialized)$/)
   }
   checks.push({scenario:name,width,status:'PASS'})
   await page.screenshot({path:join(out,'orchestration-'+name+'-'+width+'.png'),fullPage:true})
  }
  try{
   await check('empty',0,0,3,4)
   let s=advance(...args,null)
   await check('partial',1,1,2,4)
   const paused=setReviewControl(...args,'PAUSE',s.registrySha256,null)
   await check('held',1,1,2,4)
   assert.equal(await page.locator('[data-control]').getAttribute('data-control'),'REVIEW_HOLD')
   assert.equal(await page.getByText('Next explicit review',{exact:true}).count(),0)
   assert.throws(()=>advance(...args,s.registrySha256,{trustedControlSha256:paused.control.controlSha256}),/on hold/)
   const resumed=setReviewControl(...args,'RESUME',s.registrySha256,paused.control.controlSha256)
   const controlAnchor=resumed.control.controlSha256
   await check('resumed',1,1,2,4)
   assert.equal(await page.locator('[data-control]').getAttribute('data-control'),'METADATA_REVIEW_AVAILABLE')
   for(let i=1;i<7;i++)s=advance(...args,s.registrySha256,{trustedControlSha256:controlAnchor})
   await check('complete',7,7,0,0)
   writeFileSync(join(registry,'registry.json'),'{corrupt')
   const response=await page.goto(url+'/')
   assert.equal(response.status(),503)
   assert.match(await page.locator('body').innerText(),/EXECUTION BLOCKED/)
   checks.push({scenario:'corrupt',width,status:'PASS'})
   assert.deepEqual(external,[]);assert.deepEqual(errors,[])
  }finally{await page.close()}
 }
 rmSync(join(registry,'registry.json'),{force:true})
 rmSync(join(registry,'control.json'),{force:true})
 const page=await browser.newPage({viewport:{width:390,height:900}})
 try{
  await page.goto(url+'/')
  assert.equal(await page.locator('[data-reviewed]').getAttribute('data-reviewed'),'0')
  advance(...args,null)
  await page.locator('[data-reviewed="1"]').waitFor({timeout:25000})
  checks.push({scenario:'timed-refresh',width:390,status:'PASS'})
 }finally{await page.close()}
 assert.deepEqual(readFileSync(join(evidence,'current.json')),baseline)
 assert.deepEqual(readFileSync(join(local,'current.json')),baseline)
 writeFileSync(join(out,'orchestration-browser-acceptance.json'),JSON.stringify({checks,source:'PINNED_HISTORICAL_PHASE2_STATE',executionAuthorized:false,modelValidation:'UNVALIDATED',publicationGate:'BLOCKED'},null,2)+'\n')
 console.log('PASS twenty-four orchestration browser scenarios and timed refresh')
}finally{
 if(browser)await browser.close()
 if(server)await new Promise(ok=>server.close(ok))
 rmSync(root,{recursive:true,force:true})
}
