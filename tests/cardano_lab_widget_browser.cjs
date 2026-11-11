'use strict';
const {chromium}=require('playwright');
const path=require('node:path');
const assert=require('node:assert/strict');
(async()=>{
const browser=await chromium.launch({headless:true});
try{
for(const file of ['index.html','paper-lab/index.html']){
const page=await browser.newPage();
await page.goto('file://'+path.resolve(__dirname,'../'+file));
const toggle=page.locator('#cardano-lab-toggle'),panel=page.locator('#cardano-lab-panel');
await toggle.waitFor({timeout:10000});
assert.equal(await panel.isVisible(),false);
await toggle.click();
assert.equal(await panel.isVisible(),true);
assert.match(await panel.innerText(),/Not connected/);
assert.match(await panel.innerText(),/0 local observations/);
await page.keyboard.press('Escape');
assert.equal(await panel.isVisible(),false);
assert.equal(await page.locator('#slip-panel').count(),1,'paper slip remains present');
await page.close();
}
console.log('PASS Cardano dashboard lab widget smoke checks');
}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
