'use strict';
// Isolated synthetic provider records; never written into published snapshots.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
module.exports=async function checkRacingPaper(browser,base){
  const guard={schema_version:1,research_only:true,publication_gate:'BLOCKED',model_validation:'UNVALIDATED',generated_at_utc:'2026-11-08T19:59:00Z'};
  const row={race_id:'paper-qa',racecourse:'Test Course',name:'Synthetic Future Race',startUTC:'2026-11-09T13:00:00Z',
    observedAtUTC:guard.generated_at_utc,runner_observed_at_utc:guard.generated_at_utc,
    source:'https://www.sportinglife.com/racing/racecards/2026-11-09/test-course/racecard/paper-qa/test',
    runner_source:'https://www.sportinglife.com/racing/meeting/2026-11-09/test-course/12',runner_source_sha256:'b'.repeat(64),
    race_stage:'DORMANT',runner_data_status:'SINGLE_SOURCE_RUNNERS_OBSERVED',active_runner_count:2,declaration_stage:'NOT_VERIFIED',
    runners:[1,2].map(i=>({horse_id:String(i),name:'Synthetic Horse '+i,cloth_number:i,active_runner:true,runner_status:'RUNNER',previous_results:[]}))};
  const meeting={date:'2026-11-09',course:'Test Course',source_url:row.runner_source,record_type:'MEETING_FIXTURE',race_times_status:'NOT_SUPPLIED',declarations_status:'NOT_VERIFIED'};
  const results=[];
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
    const context=await browser.newContext({viewport}),page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.clock.install({time:new Date('2026-11-08T20:00:00Z')});
    await page.route('**/*.json',route=>{
      const name=new URL(route.request().url()).pathname.split('/').pop();
      const document=name==='racing-future-data.json'?{...guard,races:[row],fixture_meetings:[meeting],fixture_source_status:'SOURCE_OBSERVED'}:
        {...guard,races:[],upcoming_fixtures:[],experimental_model_forecasts:[],sports:{},forecasts:[],entries:[]};
      return route.fulfill({contentType:'application/json',body:JSON.stringify(document)});
    });
    await page.goto(base+'/',{waitUntil:'networkidle'});
    await page.waitForFunction(()=>document.querySelector('#events')?.getAttribute('aria-busy')==='false');
    await page.locator('[data-range=tomorrow]').click();
    if(await page.locator('#sport').isVisible())await page.selectOption('#sport','racing');
    else await page.locator('[data-sport=racing]:visible').first().click();
    assert.equal(await page.locator('#events .event-card').count(),1);
    const coverage=page.locator('#racing-date-coverage');
    assert.equal(await coverage.count(),1);assert.equal(await coverage.getAttribute('open'),null);
    assert.equal(await page.locator('.meeting-fixture-disclosure').isVisible(),false);
    for(let i=0;i<3;i++){
      await page.locator('#refresh').click();
      await page.waitForFunction(()=>!document.querySelector('#refresh').disabled);
      assert.equal(await coverage.count(),1);
      assert.equal(await page.locator('#tennis-tournament-coverage').count(),1);
      assert.equal(await page.locator('.meeting-fixture-disclosure').count(),1);
      assert.equal(await page.locator('.racing-fixture-board').count(),0);
    }
    await coverage.locator('> summary').click();
    await page.locator('.meeting-fixture-disclosure > summary').click();
    assert.equal(await page.locator('.meeting-fixture-disclosure a').count(),1);
    await page.locator('#refresh').click();await page.waitForFunction(()=>!document.querySelector('#refresh').disabled);
    assert.notEqual(await coverage.getAttribute('open'),null,'Keep the outer dropdown open across refresh');
    await coverage.locator('> summary').click();
    const choice=page.locator('#events .selection-button[data-choice-id="1"]');
    assert.equal(await choice.isEnabled(),true);
    await choice.click();
    assert((await page.locator('#slip-content').textContent()).includes('Synthetic Horse 1'));
    assert((await page.locator('#slip-content').textContent()).includes('Provisional paper entry'));
    const out=path.resolve(__dirname,'../work/browser-qa');fs.mkdirSync(out,{recursive:true});
    await page.screenshot({path:path.join(out,'racing-paper-'+viewport.width+'.png'),fullPage:false});
    await page.locator('#paper-open').isVisible().then(async visible=>{if(visible)await page.locator('#paper-open').click();});
    await page.locator('#freeze').click();
    const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('value-watch-research-desk-v4')).history);
    assert.equal(saved.length,1);
    assert.equal(saved[0].snapshot.slots[0].legs[0].declarationStatus,'NOT_VERIFIED');
    assert.equal(saved[0].snapshot.publication_gate,'BLOCKED');
    if(await page.locator('body.paper-open').count())await page.keyboard.press('Escape');
    await page.clock.fastForward(31*60*1000);
    await page.waitForFunction(()=>document.querySelector('#events .selection-button')?.disabled===true);
    assert.deepEqual(errors,[]);
    results.push({width:viewport.width,manualPaperChoice:true,savedWithProvisionalLabel:true,staleChoiceBlocked:true,duplicatePanels:0});
    await context.close();
  }
  return results;
};
