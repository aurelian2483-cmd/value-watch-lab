import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium } from 'playwright'

if(process.argv.length!==3)throw new Error('Expected generated HTML preview path')
const url=pathToFileURL(resolve(process.argv[2])).href
const browser=await chromium.launch()
try {
 for(const width of [1440,390,320]){
   const page=await browser.newPage({viewport:{width,height:900}})
   const errors=[],external=[]
   page.on('pageerror',e=>errors.push(e.message))
   page.on('request',r=>{if(/^https?:/.test(r.url()))external.push(r.url())})
   await page.route(/^https?:/,route=>route.abort())
   await page.goto(url,{waitUntil:'load'})
   assert.equal(await page.getByRole('heading',{level:1}).textContent(),'Research readiness')
   assert.equal(await page.locator('.metric').count(),6)
   assert.equal(await page.locator('ol > li').count(),9)
   assert.equal(await page.locator('section').nth(2).locator('ul > li').count(),10)
   assert.equal(await page.locator('script,form,iframe').count(),0)
   assert.match(await page.locator('body').innerText(),/PUBLICATION BLOCKED/)
   assert.match(await page.locator('body').innerText(),/Genuine-edge probability: unavailable/)
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true)
   assert.deepEqual(errors,[])
   assert.deepEqual(external,[])
   await page.close()
 }
 console.log('PASS static Alpha Hunt readiness preview at 1440, 390 and 320 pixels; no external requests or execution controls.')
}finally{await browser.close()}
