'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage();
  await page.goto('file://'+path.resolve(__dirname,'../cardano-lab/memory.html'));
  assert.match(await page.locator('#message').innerText(),/0 locally stored/);
  assert.equal(await page.locator('#export').isDisabled(),false);
  await page.evaluate(()=>{
   const record={schema_version:1,id:'sample-1',hypothesis:'Reject misleading signal',sport:'racing',lane:'frontier',status:'REJECTED',created_at_utc:'2026-11-11T10:00:00Z',updated_at_utc:'2026-11-11T10:01:00Z',dataset_sha256:'a'.repeat(64),method_version:'test-v1',seed:4,sources:[{url:'https://example.org/evidence',observed_at_utc:'2026-11-11T09:00:00Z'}],research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED',result_summary:'Negative result',result_sha256:'b'.repeat(64)};
   window.CardanoExperimentStore.store(localStorage).append(record);
  });
  await page.locator('#refresh').click();
  assert.equal(await page.locator('#total').innerText(),'1');
  assert.equal(await page.locator('#rejected').innerText(),'1');
  assert.match(await page.locator('#records').innerText(),/Reject misleading signal/);
  await page.locator('#sport').selectOption('football');
  assert.match(await page.locator('#records').innerText(),/No records match/);
  await page.locator('#sport').selectOption('all');
  await page.evaluate(()=>localStorage.setItem('cardano.experiments.v1','{corrupt'));
  await page.locator('#refresh').click();
  assert.match(await page.locator('#message').innerText(),/Archive unavailable/);
  assert.equal(await page.locator('#export').isDisabled(),true);
  assert.equal(await page.evaluate(()=>localStorage.getItem('cardano.experiments.v1')),'{corrupt');
  await page.close();
  console.log('PASS Cardano memory browser smoke and corrupt-data checks');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
