// Real Chromium acceptance of the integrated offline website and local static hosting.
import assert from 'node:assert/strict'
import {readFileSync,writeFileSync,readdirSync,cpSync,mkdtempSync,rmSync,realpathSync} from 'node:fs'
import {resolve,join} from 'node:path'
import {pathToFileURL} from 'node:url'
import {tmpdir} from 'node:os'
import {createHash} from 'node:crypto'
import {createServer} from 'node:http'
import {chromium} from 'playwright'
import {project,verifyProjection} from './build.mjs'
import {render} from './render.mjs'
const [prepared,site,out]=process.argv.slice(2).map(resolve)
assert.equal(process.argv.length,5)
const s=JSON.parse(readFileSync(join(site,'status.json'))),html=readFileSync(join(site,'index.html'))
verifyProjection(s)
assert.deepEqual(s,project(prepared))
assert.equal(html.toString(),render(s))
const sha=b=>createHash('sha256').update(b).digest('hex')
const before=sha(html)
const check=[]
const sandbox=realpathSync(mkdtempSync(join(tmpdir(),'integrated-site-tamper-')))
let browser,server
try{
 // Rejection tests: changed source and state, unsafe flags and incorrect snapshot hash.
 cpSync(prepared,join(sandbox,'prepared'),{recursive:true})
 const clone=join(sandbox,'prepared'),p=join(clone,'historical/summary.json')
 const original=readFileSync(p)
 writeFileSync(p,Buffer.concat([original,Buffer.from(' ')]))
 assert.throws(()=>project(clone),/receipt changed/)
 writeFileSync(p,original)
 const state=join(clone,'preview/evidence/current.json')
 const v=JSON.parse(readFileSync(state));v.executionAuthorized=true
 writeFileSync(state,JSON.stringify(v))
 assert.throws(()=>project(clone),/Unsafe research evidence|snapshot|state/i)
 assert.throws(()=>verifyProjection({...s,executionAuthorized:true}),/fingerprint|Unsafe/)
 check.push({scenario:'source-and-state-tamper-rejection',status:'PASS'})
 server=createServer((req,res)=>{
  const safe=req.headers.host==='127.0.0.1:'+server.address().port&&req.socket.remoteAddress==='127.0.0.1'
  if(!safe){res.writeHead(403);res.end();return}
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'});res.end();return}
  if(!['/','/status'].includes(req.url)){res.writeHead(404);res.end();return}
  const body=req.url==='/'?html:Buffer.from(JSON.stringify(s))
  res.writeHead(200,{'Content-Type':req.url==='/'?'text/html; charset=utf-8':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; connect-src 'none'; frame-ancestors 'none'"})
  res.end(req.method==='HEAD'?undefined:body)
 })
 await new Promise((ok,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',ok)})
 const url='http://127.0.0.1:'+server.address().port
 const expected=['overview','catalogue','data','lab','compute','historical','supervisor','references','operations','provenance']
 browser=await chromium.launch({headless:true})
 for(const width of [1440,1024,768,390,320,280]){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'})
  const external=[],errors=[]
  page.on('pageerror',e=>errors.push(e.message))
  await page.route('**/*',route=>{
   const u=route.request().url()
   if(u.startsWith(url+'/'))return route.continue()
   external.push(u);return route.abort()
  })
  try{
   const response=await page.goto(url+'/')
   assert.equal(response.status(),200)
   assert.deepEqual(await page.locator('main>section').evaluateAll(es=>es.map(x=>x.id)),expected)
   assert.equal(await page.locator('nav a').count(),10)
   assert.equal(await page.locator('[data-method]').count(),12)
   assert.equal(await page.locator('[data-historical-method]').count(),5)
   assert.equal(await page.locator('[data-task]').count(),7)
   assert.equal(await page.locator('[data-producer]').count(),6)
   const text=await page.locator('body').innerText()
   for(const value of ['UNVALIDATED','PUBLICATION BLOCKED','EXECUTION BLOCKED','500 / 500','215','331 / 1,000','64/64','7/7','6/6','45.58%','Independent certification'])assert.ok(text.includes(value),value+' missing')
   assert.equal(await page.locator('script,iframe,form,button,input,object,embed').count(),0)
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),'Page horizontal overflow at '+width)
   for(const id of expected){
    await page.locator('nav a[href="#'+id+'"]').click()
    await page.waitForURL('**/#'+id)
    assert.equal(await page.locator('#'+id).count(),1)
    assert.ok(await page.locator('#'+id+' h2').isVisible())
   }
   // Native evidence controls open/close via keyboard; no hidden overflowing hashes.
   const details=page.locator('main details')
   for(const item of await details.all()){
    const summary=item.locator('summary')
    await summary.focus();await page.keyboard.press('Enter')
    assert.equal(await item.getAttribute('open'),'')
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),'Expanded details overflow at '+width)
    await page.keyboard.press('Enter')
    assert.equal(await item.getAttribute('open'),null)
   }
   await page.goto(url+'/#overview')
   await page.screenshot({path:join(out,'website-overview-'+width+'.png')})
   if(width===1440||width===390){
    await page.goto(url+'/#historical')
    await page.screenshot({path:join(out,'website-historical-'+width+'.png')})
   }
   assert.deepEqual(errors,[]);assert.deepEqual(external,[])
   check.push({scenario:'responsive-navigation-and-details',width,status:'PASS'})
  }finally{await page.close()}
 }
 const file=await browser.newPage({viewport:{width:1280,height:900}})
 const requests=[]
 try{
  file.on('request',r=>requests.push(r.url()))
  await file.goto(pathToFileURL(join(site,'index.html')).href)
  assert.match(await file.locator('h1').innerText(),/Research Control Centre/)
  await file.locator('nav a[href="#operations"]').click()
  assert.ok(file.url().endsWith('#operations'))
  assert.equal(requests.filter(x=>/^https?:/.test(x)).length,0)
  check.push({scenario:'standalone-file-open-no-network',status:'PASS'})
 }finally{await file.close()}
 assert.equal((await fetch(url+'/dispatch',{method:'POST'})).status,405)
 assert.equal((await fetch(url+'/status',{method:'POST'})).status,405)
 assert.equal((await fetch(url+'/unknown')).status,404)
 assert.equal((await fetch(url+'/',{method:'HEAD'})).status,200)
 assert.deepEqual(await (await fetch(url+'/status')).json(),s)
 check.push({scenario:'read-only-http-contract',status:'PASS'})
 assert.equal(sha(readFileSync(join(site,'index.html'))),before)
 assert.deepEqual(JSON.parse(readFileSync(join(site,'status.json'))),s)
 writeFileSync(join(out,'browser-acceptance.json'),JSON.stringify({kind:'INTEGRATED_WEBSITE_BROWSER_ACCEPTANCE',snapshotSha256:s.snapshotSha256,htmlSha256:before,checks:check,executionAuthorized:false,publicationGate:'BLOCKED',modelValidation:'UNVALIDATED'},null,2)+'\n')
 console.log('PASS '+check.length+' integrated acceptance scenarios: six responsive widths, keyboard details, file open, read-only HTTP and tamper rejection')
}finally{
 if(browser)await browser.close()
 if(server)await new Promise(ok=>server.close(ok))
 rmSync(sandbox,{recursive:true,force:true})
}
