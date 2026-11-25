import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {resolve,join} from 'node:path'
import {pathToFileURL} from 'node:url'
import {createHash} from 'node:crypto'
import {chromium} from 'playwright'
const root=resolve(process.argv[2])
const raw=readFileSync(join(root,'status.json')),s=JSON.parse(raw)
assert.equal(createHash('sha256').update(raw).digest('hex'),readFileSync(join(root,'status.sha256'),'utf8').split(' ')[0])
assert.equal(s.kind,'HOSTED_SCHEDULED_FIXED_QA_EVIDENCE')
assert.equal(s.productionDispatchAuthorized,false)
assert.equal(s.gpuDispatchAuthorized,false)
assert.equal(s.physicalPc,'NOT_CONNECTED_IN_THIS_TEST')
const browser=await chromium.launch({headless:true})
try{
 for(const width of [1440,1024,768,390,320,280]){
  const page=await browser.newPage({viewport:{width,height:900}})
  const errors=[],external=[]
  page.on('pageerror',e=>errors.push(e.message))
  await page.route('**/*',route=>{
   if(route.request().url().startsWith('file:'))return route.continue()
   external.push(route.request().url());return route.abort()
  })
  try{
   await page.goto(pathToFileURL(join(root,'index.html')).href)
   const text=await page.locator('main').innerText()
   for(const value of ['UNVALIDATED','PUBLICATION BLOCKED','PRODUCTION DISPATCH BLOCKED','not live telemetry','500 fixed synthetic checks','Physical PC not connected'])assert.ok(text.includes(value),value)
   assert.equal(await page.locator('script,form,button,iframe').count(),0)
   assert.equal(await page.locator('a').getAttribute('href'),'https://github.com/aurelian2483-cmd/value-watch-lab/actions/runs/'+s.runId+'/attempts/'+s.runAttempt)
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
   assert.deepEqual(errors,[]);assert.deepEqual(external,[])
  }finally{await page.close()}
 }
}finally{await browser.close()}
console.log('PASS operational evidence browser acceptance at six viewport widths')
