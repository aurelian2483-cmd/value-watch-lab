// Acceptance of actual fresh producer reports served in the existing integrated site.
import assert from 'node:assert/strict'
import {spawn,spawnSync} from 'node:child_process'
import {once} from 'node:events'
import {readFileSync,writeFileSync,readdirSync} from 'node:fs'
import {join} from 'node:path'
import {createHash} from 'node:crypto'
import {chromium} from 'playwright'
const [site,store,out,revision]=process.argv.slice(2)
assert.match(revision,/^[a-f0-9]{40}$/)
const python=process.env.QA_PYTHON||'python'
const base='research/local-producer-integration/'
const server=spawn(python,['-B',base+'viewer.py',site,store,'--port','0'],{stdio:['ignore','pipe','pipe']})
const url=await new Promise((ok,fail)=>{
 const timeout=setTimeout(()=>fail(Error('Server startup timed out')),10000)
 server.once('error',fail);server.once('exit',code=>fail(Error('Viewer exited '+code)))
 server.stdout.once('data',data=>{clearTimeout(timeout);const s=data.toString().trim();if(/^http:\/\/127\.0\.0\.1:\d+$/.test(s))ok(s);else fail(Error('Bad viewer address'))})
})
const get=async path=>fetch(url+path,{signal:AbortSignal.timeout(5000)})
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex')
const checks=[]
const baseline=hash(join(site,'index.html'))
let browser
try{
 browser=await chromium.launch({headless:true})
 const page=await browser.newPage({viewport:{width:1440,height:900}})
 const external=[],errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/*',route=>{if(route.request().url().startsWith(url+'/'))return route.continue();external.push(route.request().url());return route.abort()})
 await page.goto(url+'/')
 assert.equal(await page.locator('[data-live-state]').getAttribute('data-live-state'),'waiting')
 checks.push('initial-waiting')
 function cycle(){
  const result=spawnSync(python,['-B',base+'producers.py','--fixed-qa-only',store,revision],{encoding:'utf8',timeout:300000,maxBuffer:1024*1024})
  assert.equal(result.status,0,JSON.stringify({stderr:result.stderr,stdout:result.stdout}))
  return JSON.parse(result.stdout)
 }
 const first=cycle()
 assert.equal(first.sequence,1)
 assert.equal(first.status,'FIXED_QA_COMPLETE_RESEARCH_BLOCKED')
 assert.equal(first.producers.filter(x=>x.status==='PASS').length,4)
 assert.equal(first.producers.find(x=>x.id==='references').status,'REVIEW_REQUIRED')
 const second=cycle()
 assert.equal(second.sequence,2)
 assert.equal(second.previousSha256,hash(join(store,'batch-001.json')))
 assert.equal(second.status,first.status)
 const v=await (await get('/status')).json()
 assert.deepEqual(v.latestReceipt,second)
 assert.equal(v.latestReceiptSha256,hash(join(store,'batch-002.json')))
 assert.equal(v.productionProducerConnected,false)
 assert.equal(v.liveGpuProducerConnected,false)
 assert.equal(v.executionAuthorized,false)
 assert.equal(v.publicationGate,'BLOCKED')
 checks.push('two-actual-producer-cycles')
 for(const width of [1440,768,390,280]){
  await page.setViewportSize({width,height:900})
  assert.equal((await page.goto(url+'/')).status(),200)
  assert.match(await page.locator('[data-live-state]').innerText(),/Local receipt 2/)
  assert.equal(await page.locator('[data-producer]').count(),5)
  assert.equal(await page.locator('main > section').count(),11)
  await page.locator('nav a[href="#live-producers"]').click()
  assert.equal(new URL(page.url()).hash,'#live-producers')
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth))
  assert.equal(await page.locator('script,form,button,input,iframe').count(),0)
  const body=await page.locator('body').innerText()
  for(const t of ['UNVALIDATED','PUBLICATION BLOCKED','EXECUTION BLOCKED','Measurement freshness: UNKNOWN'])assert.ok(body.includes(t),t)
  await page.screenshot({path:join(out,'live-producers-'+width+'.png'),fullPage:true})
  checks.push('responsive-'+width)
 }
 await page.goto(url+'/live')
 assert.equal(await page.locator('meta[http-equiv="refresh"]').getAttribute('content'),'15')
 assert.deepEqual(external,[]);assert.deepEqual(errors,[])
 checks.push('auto-refresh-and-no-network')
 for(const [path,method,expected] of [['/dispatch','POST',405],['/status','DELETE',405],['/missing','GET',404]]){
  assert.equal((await fetch(url+path,{method})).status,expected)
 }
 assert.equal((await fetch(url+'/status',{headers:{Origin:'https://invalid.example'}})).status,403)
 checks.push('read-only-http')
 const before=readFileSync(join(store,'batch-002.json'))
 writeFileSync(join(store,'batch-002.json'),'{bad')
 assert.equal((await get('/status')).status,503)
 assert.equal((await get('/')).status,503)
 writeFileSync(join(store,'batch-002.json'),before)
 assert.equal((await get('/status')).status,200)
 assert.equal(hash(join(site,'index.html')),baseline)
 assert.deepEqual(readdirSync(store).sort(),['batch-001.json','batch-002.json'])
 checks.push('corruption-rejection-and-restoration')
 writeFileSync(join(out,'acceptance.json'),JSON.stringify({kind:'LOCAL_PRODUCER_INTEGRATION_ACCEPTANCE',revision,checks,producerCycles:2,latest:v.latestReceipt,baselineHtmlSha256:baseline,productionProducerConnected:false,executionAuthorized:false,publicationGate:'BLOCKED',modelValidation:'UNVALIDATED'},null,2)+'\n')
 console.log('PASS '+checks.length+' acceptance scenarios, 2 actual producer cycles, 5 local report paths, no production dispatch')
}finally{
 if(browser)await browser.close()
 server.kill()
 if(server.exitCode===null)await once(server,'exit')
}
