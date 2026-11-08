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
  row.publisher_forecast={status:'COMPLETE_PUBLISHER_FORECAST',basis:'PUBLISHER_BETTING_FORECAST_NOT_BOOKMAKER_QUOTES',bookmaker:null,executable_verified:false,
    source:row.runner_source,source_sha256:row.runner_source_sha256,observed_at_utc:guard.generated_at_utc,
    prices:[{horse_id:'1',decimal:3},{horse_id:'2',decimal:5}]};
  let community=[];
  const post=(author,horse='1')=>{
    const url='https://www.fatjockey.com/forum/topic/42#'+author;
    return {group:'forum',race_id:row.race_id,startUTC:row.startUTC,horse:'Synthetic Horse '+horse,stance:'support',url,author,
      verification:'PRIMARY_POST_CAPTURED',observed_at_utc:guard.generated_at_utc,published_at_utc:'2026-11-08T19:50:00Z',
      primary_capture:{method:'JSONLD_DISCUSSION_POST_V1',post_url:url,author,race_id:row.race_id,race_start_utc:row.startUTC,horse_id:horse,
        explicit_selection:true,explicit_value_backing:true,thread_url:'https://www.fatjockey.com/forum/topic/42',text_sha256:'c'.repeat(64),
        published_at_utc:'2026-11-08T19:50:00Z',receipt:{url,sha256:'d'.repeat(64),observed_at_utc:guard.generated_at_utc}}};
  };
  const results=[];
  const initialMarket=row.market_observation;
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
    community=[];row.market_observation=initialMarket;
    const context=await browser.newContext({viewport}),page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.clock.install({time:new Date('2026-11-08T20:00:00Z')});
    await page.route('**/*.json',route=>{
      const name=new URL(route.request().url()).pathname.split('/').pop();
      const document=name==='source-observations.json'?{...guard,entries:community}:name==='racing-future-data.json'?{...guard,races:[row],fixture_meetings:[meeting],fixture_source_status:'SOURCE_OBSERVED'}:
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
    assert.equal(await page.evaluate(()=>typeof window.ValueWatchEvidenceV3?.evaluate),'function');
    assert((await choice.textContent()).includes('FORECAST FAVOURITE'),'A source-labelled publisher forecast must restore provisional green');
    await choice.click();
    assert((await page.locator('#slip-content').textContent()).includes('Synthetic Horse 1'));
    assert((await page.locator('#slip-content').textContent()).includes('Provisional paper entry'));
    const out=path.resolve(__dirname,'../work/browser-qa');fs.mkdirSync(out,{recursive:true});
    await page.screenshot({path:path.join(out,'racing-paper-'+viewport.width+'.png'),fullPage:false});
    await page.locator('#paper-open').isVisible().then(async visible=>{if(visible)await page.locator('#paper-open').click();});
    await page.locator('#freeze').click();
    await page.waitForFunction(()=>JSON.parse(localStorage.getItem('value-watch-research-desk-v4'))?.history?.length===1);
    const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('value-watch-research-desk-v4')).history);
    assert.equal(saved.length,1);
    assert.equal(saved[0].snapshot.slots[0].legs[0].declarationStatus,'NOT_VERIFIED');
    assert.equal(saved[0].snapshot.publication_gate,'BLOCKED');
    assert.equal(saved[0].snapshot.slots[0].legs[0].quote,null,'Forecast prices must not become bookmaker quotes or cash-return inputs');
    if(await page.locator('body.paper-open').count())await page.keyboard.press('Escape');
    row.market_observation={status:'COMPLETE_SOURCE_OBSERVATION',bookmaker:'Sky Bet',bookmaker_market_id:'synthetic-test-win',executable_verified:false,
      verification:'SOURCE_OBSERVED_UNVERIFIED',observed_at_utc:guard.generated_at_utc,source:row.runner_source,source_sha256:row.runner_source_sha256,
      quotes:[{horse_id:'1',decimal:3},{horse_id:'2',decimal:5}]};
    community=[post('SyntheticAlice','2')];
    await page.locator('#refresh').click();await page.waitForFunction(()=>!document.querySelector('#refresh').disabled);
    await page.waitForFunction(()=>document.querySelector('#events [data-choice-id="2"]')?.dataset.evidenceBlue==='true');
    const other=page.locator('#events .selection-button[data-choice-id="2"]');
    assert.equal(await other.evaluate(e=>getComputedStyle(e).borderTopColor),'rgb(96, 165, 250)','A checked community pick can be blue without being the favourite');
    community=[post('SyntheticAlice'),post('SyntheticBob')];
    await page.locator('#refresh').click();await page.waitForFunction(()=>!document.querySelector('#refresh').disabled);
    await page.waitForFunction(()=>document.querySelector('#events [data-choice-id="1"]')?.dataset.evidenceYellow==='true');
    assert.equal(await choice.evaluate(e=>getComputedStyle(e).borderTopColor),'rgb(250, 204, 21)','Two checked same-thread value selections and an observed favourite produce yellow agreement');
    community[1].primary_capture.receipt.sha256='invalid';
    await page.locator('#refresh').click();await page.waitForFunction(()=>!document.querySelector('#refresh').disabled);
    await page.waitForFunction(()=>document.querySelector('#events [data-choice-id="1"]')?.dataset.evidenceYellow==='false'&&document.querySelector('#events [data-choice-id="1"]')?.dataset.evidenceBlue==='true');
    assert.equal(await choice.evaluate(e=>getComputedStyle(e).borderTopColor),'rgb(96, 165, 250)','Invalid post receipts cannot create yellow agreement');
    await page.clock.fastForward(31*60*1000);
    await page.waitForFunction(()=>document.querySelector('#events .selection-button')?.disabled===true);
    assert.deepEqual(errors,[]);
    results.push({width:viewport.width,manualPaperChoice:true,savedWithProvisionalLabel:true,staleChoiceBlocked:true,duplicatePanels:0,forecastGreen:true,communityOnlyBlue:true,checkedAgreementYellow:true,invalidReceiptRejected:true});
    await context.close();
  }
  return results;
};
