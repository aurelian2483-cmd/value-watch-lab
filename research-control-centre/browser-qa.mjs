// Test the actual checked-in site at the GitHub Pages-style subpath.
// No network data requests, mutation or producer execution.
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {readFileSync,statSync,mkdirSync,writeFileSync} from 'node:fs'
import {resolve,join,relative,isAbsolute,extname} from 'node:path'
import {createServer} from 'node:http'
import {chromium} from 'playwright'
const root=resolve('.'),out=resolve(process.argv[2]??'')
assert.equal(process.argv.length,3)
mkdirSync(out,{recursive:true})
const originalSha='f8919ac7209fa9d8b4100d6cb6853e90253746b12718ffe983057c48c66d5826'
const homeBlob='f0e343322c3aff6c7251d9318c656f4b4b40c906'
const back='<p class="muted"><a href="../" id="return-research-desk">← Back to Value Watch research desk</a></p><p class="muted" id="measurement-freshness">Measurement freshness: UNKNOWN</p>'
const operationalLink='<p class="muted"><a id="operational-evidence-link" href="./operational-status/">Hosted CPU and scheduling evidence (historical QA)</a></p>'
const operationalBack='<p><a id="return-control-centre" href="../">← Back to Research Control Centre</a></p>'
const links=['<a href="./research-control-centre/">Research Control Centre · Evidence</a>','<a href="./research-control-centre/">Control Centre</a>']
const bytes=p=>readFileSync(join(root,p))
const hash=b=>createHash('sha256').update(b).digest('hex')
const blob=b=>createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex')
const site=bytes('research-control-centre/index.html'),home=bytes('index.html')
let restored=home.toString('utf8')
for(const link of links){assert.equal(restored.split(link).length,2);restored=restored.replace(link,'')}
assert.equal(blob(Buffer.from(restored)),homeBlob,'Unrelated homepage bytes changed')
assert.equal(site.toString('utf8').split(back).length,2)
assert.equal(site.toString('utf8').split(operationalLink).length,2)
assert.equal(hash(Buffer.from(site.toString('utf8').replace(back,'').replace(operationalLink,''))),originalSha,'Approved website changed beyond reviewed links')
const op=bytes('research-control-centre/operational-status/index.html'),status=bytes('research-control-centre/operational-status/status.json')
assert.equal(op.toString('utf8').split(operationalBack).length,2)
assert.equal(hash(Buffer.from(op.toString('utf8').replace(operationalBack,''))),'27505b9b55c9cf2d8a37fda65193bc9055634dbf3fee6e785231036c6ef0a9d1')
assert.equal(hash(status),'1f2293bf431e1819fd54f2da297106ec3f0a079b24f2378fef1c9a705db3a25d')
assert.equal(bytes('research-control-centre/operational-status/status.sha256').toString(),hash(status)+'  status.json\n')
const statusRecord=JSON.parse(status)
assert.equal(statusRecord.kind,'HOSTED_SCHEDULED_FIXED_QA_EVIDENCE')
assert.equal(statusRecord.revision,'ddf3a61edf426cd50c108007ee7461b3a74f4364')
assert.equal(statusRecord.runId,'45531570259')
assert.equal(statusRecord.runAttempt,'1')
for(const key of ['gpuDispatchAuthorized','productionDispatchAuthorized','homePcRequired'])assert.equal(statusRecord[key],false)
assert.equal(statusRecord.researchStatus,'UNVALIDATED')
assert.equal(statusRecord.publicationGate,'BLOCKED')
assert.equal(statusRecord.physicalPc,'NOT_CONNECTED_IN_THIS_TEST')
assert.equal(statusRecord.measurementFreshness,'UNKNOWN')
assert.equal(statusRecord.syntheticChecks,500)
const prefix='/value-watch-lab/'
const types={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2'}
const server=createServer((req,res)=>{
 try{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return}
  const url=new URL(req.url,'http://localhost')
  if(!url.pathname.startsWith(prefix)){res.writeHead(404).end();return}
  const part=decodeURIComponent(url.pathname.slice(prefix.length))
  const target=resolve(root,part+(url.pathname.endsWith('/')?'index.html':''))
  const rel=relative(root,target)
  if(isAbsolute(rel)||rel==='..'||rel.startsWith('../')||!statSync(target).isFile()){res.writeHead(404).end();return}
  const body=readFileSync(target)
  res.writeHead(200,{'Content-Type':types[extname(target)]??'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'})
  res.end(req.method==='HEAD'?undefined:body)
 }catch{res.writeHead(404).end()}
})
let browser
const checks=[]
try{
 await new Promise((ok,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',ok)})
 const origin='http://127.0.0.1:'+server.address().port,base=origin+prefix
 browser=await chromium.launch({headless:true})
 for(const width of [1440,1024,768,390,320,280]){
  const page=await browser.newPage({viewport:{width,height:900}})
  const errors=[],external=[]
  let onControlCentre=false
  page.on('pageerror',e=>{if(onControlCentre)errors.push(e.message)})
  await page.route('**/*',route=>{
   const u=route.request().url()
   if(u.startsWith(origin+'/'))return route.continue()
   if(onControlCentre)external.push(u)
   return route.abort()
  })
  try{
   const landing=await page.goto(base+'?sport=football',{waitUntil:'domcontentloaded'})
   assert.equal(landing.status(),200)
   const menu=page.locator('#research-pages > summary')
   // Existing responsive menu is the stable entry point; workspace bar may be hidden.
   assert.equal(await page.locator('#desk-page-group a[href="./research-control-centre/"]').count(),1)
   if(width>=320){
    await menu.click()
    const link=page.locator('#desk-page-group a[href="./research-control-centre/"]')
    await link.waitFor({state:'visible'})
    onControlCentre=true
    await Promise.all([page.waitForURL(base+'research-control-centre/'),link.click()])
   }else{
    onControlCentre=true
    await page.goto(base+'research-control-centre/')
   }
   assert.equal(await page.title(),'Sky Research · Integrated Control Centre')
   assert.equal(await page.locator('h1').innerText(),'Research Control Centre')
   const text=await page.locator('body').innerText()
   for(const gate of ['UNVALIDATED','PUBLICATION BLOCKED','EXECUTION BLOCKED','OFFLINE SNAPSHOT','Measurement freshness: UNKNOWN'])assert.ok(text.includes(gate),gate)
   assert.equal(await page.locator('script,iframe,form,input,button').count(),0)
   assert.ok(await page.locator('#measurement-freshness').isVisible(),'Freshness warning must remain visible')
   const nav=page.locator('nav[aria-label="Research navigation"] a')
   assert.equal(await nav.count(),10)
   for(const a of await nav.all()){
    const id=(await a.getAttribute('href')).slice(1)
    assert.equal(await page.locator('[id="'+id+'"]').count(),1)
    await a.click()
    assert.equal(new URL(page.url()).hash,'#'+id)
   }
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),'Control Centre overflow at '+width)
   const detail=page.locator('details > summary').first()
   await detail.focus();await page.keyboard.press('Enter')
   assert.ok(await detail.evaluate(x=>x.parentElement.open),'Keyboard details failed')
   await page.screenshot({path:join(out,'control-centre-'+width+'.png'),fullPage:true})
   await page.locator('#operational-evidence-link').click()
   await page.waitForURL(base+'research-control-centre/operational-status/')
   assert.equal(await page.title(),'Sky Research — operational QA evidence')
   const opText=await page.locator('main').innerText()
   for(const value of ['UNVALIDATED','PUBLICATION BLOCKED','PRODUCTION DISPATCH BLOCKED','not live telemetry','500 fixed synthetic checks','Physical PC not connected'])assert.ok(opText.includes(value),value)
   assert.equal(await page.locator('script,iframe,form,input,button').count(),0)
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),'Operational evidence overflow at '+width)
   await page.screenshot({path:join(out,'operational-status-'+width+'.png'),fullPage:true})
   await page.locator('#return-control-centre').click()
   await page.waitForURL(base+'research-control-centre/')
   assert.deepEqual(errors,[]);assert.deepEqual(external,[])
   await page.locator('#return-research-desk').click()
   await page.waitForURL(base)
   onControlCentre=false
   assert.equal(await page.locator('#research-pages').count(),1)
   checks.push({width,status:'PASS',navigation:width>=320?'MENU_ROUND_TRIP':'DIRECT_ROUTE_ROUND_TRIP'})
  }finally{await page.close()}
 }
 assert.equal((await fetch(base+'research-control-centre/',{method:'POST'})).status,405)
 assert.equal((await fetch(base+'research-control-centre/operational-status/',{method:'POST'})).status,405)
 assert.equal(hash(bytes('research-control-centre/operational-status/index.html')),hash(op))
 assert.equal(hash(bytes('research-control-centre/operational-status/status.json')),hash(status))
 assert.equal(hash(bytes('research-control-centre/index.html')),hash(site))
 assert.equal(hash(bytes('index.html')),hash(home))
 writeFileSync(join(out,'integration-receipt.json'),JSON.stringify({kind:'READ_ONLY_SITE_INTEGRATION_ACCEPTANCE',checks,originalHtmlSha256:originalSha,integratedHtmlSha256:hash(site),operationalHtmlSha256:hash(op),operationalStatusSha256:hash(status),homeSha256:hash(home),modelValidation:'UNVALIDATED',publicationGate:'BLOCKED',executionAuthorized:false},null,2)+'\n')
 console.log('PASS six responsive integration scenarios, original-byte reconstruction, navigation, keyboard details, no external page requests and read-only HTTP')
}finally{
 if(browser)await browser.close()
 await new Promise(ok=>server.close(ok))
}
