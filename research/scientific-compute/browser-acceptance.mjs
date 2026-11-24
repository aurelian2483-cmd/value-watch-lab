import {chromium} from 'playwright'
import assert from 'node:assert/strict'
import {pathToFileURL} from 'node:url'
import {resolve} from 'node:path'
const root=process.argv[2]
const browser=await chromium.launch({headless:true})
try {
 for(const width of [1440,390,320]){
  const page=await browser.newPage({viewport:{width,height:850}})
  const errors=[],requests=[]
  page.on('pageerror',e=>errors.push(String(e)))
  page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url())})
  await page.goto(pathToFileURL(resolve(root,'compute-status.html')).href)
  assert.equal(await page.locator('section').count(),2)
  assert.match(await page.locator('body').innerText(),/RECORDED_LOCAL_PASS/)
  assert.match(await page.locator('body').innerText(),/NOT_SUPPLIED/)
  assert.match(await page.locator('body').innerText(),/PUBLICATION BLOCKED/)
  assert.equal(await page.locator('button,form,script,iframe').count(),0)
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true)
  assert.deepEqual(errors,[])
  assert.deepEqual(requests,[])
  await page.close()
 }
 console.log('PASS scientific CPU/GPU static dashboard at desktop and mobile widths')
} finally {await browser.close()}
