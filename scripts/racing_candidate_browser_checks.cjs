'use strict';
const assert=require('node:assert/strict');
module.exports=async function(browser,base){
 const results=[];
 for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:1000}});await page.clock.install({time:new Date('2026-11-10T10:00:00Z')});
  const guard={schema_version:1,research_only:true,publication_gate:'BLOCKED',model_validation:'UNVALIDATED',generated_at_utc:'2026-11-10T09:59:00Z'};
  const source='https://www.sportinglife.com/racing/racecards/2026-11-10/synthetic/racecard/qa-race/test';
  const row={race_id:'qa-race',racecourse:'Synthetic Course',name:'Synthetic Race',startUTC:'2026-11-10T14:00:00Z',observedAtUTC:guard.generated_at_utc,runner_observed_at_utc:guard.generated_at_utc,source,runner_source:source,runner_source_sha256:'a'.repeat(64),race_stage:'DORMANT',runner_data_status:'SINGLE_SOURCE_RUNNERS_OBSERVED',active_runner_count:2,runners:[1,2].map(i=>({horse_id:String(i),name:'Synthetic Horse '+i,cloth_number:i,active_runner:true,runner_status:'RUNNER',previous_results:[]})),publisher_forecast:{status:'COMPLETE_PUBLISHER_FORECAST',basis:'PUBLISHER_BETTING_FORECAST_NOT_BOOKMAKER_QUOTES',bookmaker:null,executable_verified:false,source,source_sha256:'a'.repeat(64),observed_at_utc:guard.generated_at_utc,prices:[{horse_id:'1',decimal:2},{horse_id:'2',decimal:4}]}};
  await page.route('**/*.json',route=>{const name=new URL(route.request().url()).pathname.split('/').pop();return route.fulfill({contentType:'application/json',body:JSON.stringify(name==='racing-future-data.json'?{...guard,races:[row]}:{...guard,races:[],upcoming_fixtures:[],experimental_model_forecasts:[],sports:{},entries:[]})});});
  await page.goto(base+'/',{waitUntil:'networkidle'});await page.locator('#find-racing').click();const panel=page.locator('#racing-candidates');await panel.waitFor();assert((await panel.textContent()).includes('1 of 4 racing research candidates'));assert((await panel.textContent()).includes('Publisher forecast favourite'));
  await panel.getByRole('button',{name:'Choose for current paper slip'}).click();await panel.getByRole('button',{name:'In current paper slip'}).waitFor();assert.equal(await panel.getByRole('button',{name:'In current paper slip'}).isDisabled(),true);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);results.push({width,buttonWorks:true,reasonsShown:true,manualAddWorks:true});await page.close();
 }
 return results;
};
