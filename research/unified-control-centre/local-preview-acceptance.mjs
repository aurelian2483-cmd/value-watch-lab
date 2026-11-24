// Verify the extracted, portable HTML on a local file URL with networking disabled.
import assert from 'node:assert/strict'
import {readFileSync,writeFileSync,realpathSync} from 'node:fs'
import {join,resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
import {createHash} from 'node:crypto'
import {chromium} from 'playwright'
import {verifySnapshot} from './overview.mjs'
import {render} from './website.mjs'

const [extractedArg,outputArg]=process.argv.slice(2)
assert.ok(extractedArg&&outputArg&&process.argv.length===4,'Usage: local-preview-acceptance.mjs extracted output')
const extracted=realpathSync(extractedArg),output=realpathSync(outputArg)
const raw=readFileSync(join(output,'local-preview.zip'))
const sha=createHash('sha256').update(raw).digest('hex')
assert.equal(readFileSync(join(output,'local-preview.sha256'),'ascii'),sha+'  local-preview.zip\n')
const snapshot=JSON.parse(readFileSync(join(extracted,'overview.json'),'utf8'))
assert.equal(verifySnapshot(snapshot),true)
const htmlPath=join(extracted,'index.html')
assert.equal(readFileSync(htmlPath,'utf8'),render(snapshot))
assert.deepEqual(readFileSync(htmlPath),readFileSync(join(output,'index.html')))
const url=pathToFileURL(htmlPath).href
const browser=await chromium.launch({headless:true})
const checks=[]
try{
 for(const width of [1440,390,320]){
  const context=await browser.newContext({offline:true,viewport:{width,height:900}})
  try{
   const page=await context.newPage()
   const external=[],errors=[]
   page.on('request',r=>{if(!r.url().startsWith('file:'))external.push(r.url())})
   page.on('pageerror',e=>errors.push(e.message))
   await page.goto(url,{waitUntil:'load'})
   assert.equal(await page.title(),'Research Control Centre')
   assert.ok(page.url().startsWith('file:'))
   assert.equal(await page.locator('section').count(),6)
   assert.equal(await page.locator('nav a').count(),6)
   assert.equal(await page.locator('script,form,iframe,button,input').count(),0)
   assert.ok((await page.locator('body').innerText()).includes('UNVALIDATED · PUBLICATION BLOCKED · NO EXECUTION AUTHORISED'))
   assert.ok((await page.locator('.overview').innerText()).includes('6 / 6 summary contracts checked'))
   for(const m of snapshot.modules){
    const section=page.locator('section#'+m.id)
    await page.locator('nav a[href="#'+m.id+'"]').click()
    await section.locator('summary').click()
    assert.equal(await section.locator('details').getAttribute('open'),'')
    assert.ok((await section.innerText()).includes(m.source.head))
   }
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth))
   assert.deepEqual(external,[]);assert.deepEqual(errors,[])
   checks.push({width,status:'PASS',offline:true,transport:'file:'})
  }finally{await context.close()}
 }
}finally{await browser.close()}
writeFileSync(join(output,'local-browser-acceptance.json'),JSON.stringify({
 kind:'UNIFIED_LOCAL_BROWSER_ACCEPTANCE',archiveSha256:sha,snapshotSha256:snapshot.snapshotSha256,
 checks,modelValidation:'UNVALIDATED',publicationGate:'BLOCKED',executionAuthorized:false,
 limitations:['Hosted Linux Chromium only, not physical Windows or Firefox acceptance.','Historical summary preview only.']
},null,2)+'\n')
console.log('PASS extracted local preview in offline Chromium at three widths')
