// End-to-end acceptance of completed synthetic artifacts and static report.
import assert from 'node:assert/strict'
import {readFileSync,realpathSync,cpSync,mkdtempSync,rmSync,readdirSync} from 'node:fs'
import {join,resolve} from 'node:path'
import {tmpdir} from 'node:os'
import {pathToFileURL} from 'node:url'
import {createHash} from 'node:crypto'
import {chromium} from 'playwright'
import {readStatus,renderStatus,consolidate} from './status.mjs'
import {verifyStoredSuite} from './persistence.mjs'
if(process.argv.length!==5)throw Error('Usage: acceptance.mjs <artifact-dir> <registry-dir> <revision>')
const [dir,store,revision]=process.argv.slice(2),root=resolve(dir)
const json=n=>JSON.parse(readFileSync(join(root,n),'utf8'))
const report=json('report.json'),persisted=json('persistence-repeat.json')
assert.deepEqual(readStatus(root,revision),json('lab-status.json'))
assert.equal(json('lab-status.json').status,'SYNTHETIC_QA_PASSED')
assert.deepEqual(report,json('repeat.json'))
assert.equal(json('reference-check.json').counts.passed,5)
assert.ok(persisted.records.every(r=>r.action==='REUSED_VERIFIED'))
const inventory=p=>readdirSync(p,{recursive:true,withFileTypes:true}).filter(x=>x.isFile()).map(x=>{
 const name=join(x.parentPath??x.path,x.name);return [name.slice(p.length),createHash('sha256').update(readFileSync(name)).digest('hex')]
}).sort(([a],[b])=>a.localeCompare(b))
const before=inventory(store)
assert.equal(verifyStoredSuite(store,report,persisted).verified,5)
assert.deepEqual(inventory(store),before)
const temp=realpathSync(mkdtempSync(join(tmpdir(),'lab-restore-')))
try{
 const restored=join(temp,'restored')
 cpSync(store,restored,{recursive:true})
 assert.deepEqual(inventory(restored),before)
 assert.deepEqual(verifyStoredSuite(restored,report,persisted),verifyStoredSuite(store,report,persisted))
}finally{rmSync(temp,{recursive:true,force:true})}
const browser=await chromium.launch()
try{
 for(const width of [1440,390,320]){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[],external=[]
  page.on('pageerror',e=>errors.push(e.message))
  page.on('request',r=>{if(/^https?:/.test(r.url()))external.push(r.url())})
  await page.route(/^https?:/,route=>route.abort())
  await page.goto(pathToFileURL(join(root,'lab-status.html')).href,{waitUntil:'load'})
  assert.equal(await page.getByRole('heading',{level:1}).textContent(),'Mathematical Testing Laboratory')
  assert.equal(await page.locator('.metric').count(),6)
  assert.match(await page.locator('body').innerText(),/SYNTHETIC_QA_PASSED/)
  assert.match(await page.locator('body').innerText(),/PUBLICATION BLOCKED/)
  assert.equal(await page.locator('script,form,iframe,button').count(),0)
  const checkWidth=async label=>{
   const sizes=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll('main *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).map(e=>e.tagName+': '+e.textContent.slice(0,80)).slice(0,8)}))
   assert.ok(sizes.document<=sizes.viewport+1,label+' at '+width+'px: '+JSON.stringify(sizes))
  }
  await checkWidth('Complete report')
  await page.setContent(renderStatus(consolidate([],revision)))
  assert.match(await page.locator('body').innerText(),/EVIDENCE_INCOMPLETE_OR_INCONSISTENT/)
  assert.match(await page.locator('body').innerText(),/Unavailable/)
  await checkWidth('Incomplete report')
  assert.equal(await page.locator('script,form,iframe,button').count(),0)
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);await page.close()
 }
}finally{await browser.close()}
console.log('PASS fixed synthetic evidence reconciliation, stored artifacts, copied-store recovery and Chromium static dashboard at three widths.')
