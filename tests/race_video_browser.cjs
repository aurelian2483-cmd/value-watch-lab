'use strict';
const { chromium } = require('playwright');
const path = require('node:path');
const assert = require('node:assert/strict');

(async()=>{
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({acceptDownloads:true});
try{
const url='file://'+path.resolve(__dirname,'../race-video-lab/index.html');
await page.goto(url);
await assert.equal(await page.locator('#count').innerText(),'0');
await page.locator('#race-id').fill('test-race-1');
await page.locator('#race-id').dispatchEvent('change');
await page.locator('#runner').fill('Example Runner');
await page.locator('#timestamp').fill('14.5');
await page.locator('#evidence').fill('Runner visibly lost position');
await page.locator('#add').click();
assert.equal(await page.locator('#count').innerText(),'1');
assert.match(await page.locator('#watchlist').innerText(),/Example Runner/);
await page.reload();
assert.equal(await page.locator('#count').innerText(),'1','local recovery');
assert.equal(await page.locator('#race-id').inputValue(),'test-race-1');
const downloadPromise=page.waitForEvent('download');
await page.locator('#export').click();
const download=await downloadPromise;
assert.match(download.suggestedFilename(),/^cardano-race-video-/);
page.once('dialog',dialog=>dialog.accept());
await page.locator('#clear').click();
assert.equal(await page.locator('#count').innerText(),'0');
await page.locator('#import-file').setInputFiles({name:'research.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({schema:'cardano-race-video-v1',race:{raceId:'imported'},observations:[{id:'abc',runner:'Example Runner',seconds:3,incident:'blocked',confidence:'high',evidence:'Blocked behind another runner',hypothesis:'Does it affect later form?',recordedAt:new Date().toISOString()}]}))});
await page.getByText('Imported 1 observations.',{exact:false}).waitFor({timeout:10000});
assert.equal(await page.locator('#count').innerText(),'1','valid import');
await page.locator('#import-file').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({schema:'cardano-race-video-v1',race:{},observations:[{id:'bad',runner:'X',seconds:-5}]}))});
await page.getByText('Import failed:',{exact:false}).waitFor({timeout:10000});
assert.equal(await page.locator('#count').innerText(),'1','invalid import must not overwrite data');
console.log('PASS race-video prototype smoke checks');
}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
