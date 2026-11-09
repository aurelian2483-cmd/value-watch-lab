'use strict';
const assert=require('node:assert/strict');
module.exports=async function(browser,base){
 const results=[];
 for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install({time:new Date('2026-11-09T12:00:00Z')});
  const guard={schema_version:1,research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED',generated_at_utc:'2026-11-09T11:59:00Z',odds:null,expected_value:null};
  const receipt={url:'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.friendly/scoreboard?dates=2026&limit=1000',observed_at_utc:guard.generated_at_utc,sha256:'a'.repeat(64)};
  const sample=Array.from({length:5},(_,i)=>({event_id:String(i),date:'2026-10-01T12:00:00Z',opponent:'Synthetic Opponent',goals_for:2,goals_against:1,result:'W',source_receipt:receipt}));
  const fixture={international:true,league:'INT:fifa.friendly',league_name:'International Friendlies',home:'Synthetic Nation A',away:'Synthetic Nation B',kickoff_utc:'2026-11-10T14:00:00Z',forecast_eligible:false,schedule_source_receipts:[receipt],international_analysis:{...guard,method:'INTERNATIONAL_RECENT_RESULTS_V1',status:'EXPERIMENTAL_COMPARISON_AVAILABLE',home_sample:sample,away_sample:sample,home_matches:5,away_matches:5}};
  const forecast={...guard,league:fixture.league,home:fixture.home,away:fixture.away,kickoff_utc:fixture.kickoff_utc,model:'Synthetic international comparison',prob_home:.4,prob_draw:.3,prob_away:.3,training_basis:{mode:'INTERNATIONAL_RECENT_RESULTS'}};
  await page.route('**/*.json',route=>{const name=new URL(route.request().url()).pathname.split('/').pop();const document=name==='international-football-data.json'?{...guard,upcoming_fixtures:[fixture],experimental_model_forecasts:[forecast]}:{...guard,races:[],entries:[],upcoming_fixtures:[],experimental_model_forecasts:[],sports:{}};return route.fulfill({contentType:'application/json',body:JSON.stringify(document)});});
  await page.goto(base+'/',{waitUntil:'networkidle'});await page.locator('[data-range=tomorrow]').click();
  if(await page.locator('#sport').isVisible())await page.selectOption('#sport','football');else await page.locator('[data-sport=football]:visible').first().click();
  const card=page.locator('#events .event-card');await card.waitFor();assert.equal(await card.count(),1);
  const text=await card.textContent();assert(text.includes('International teams · recent captured results'));assert(!text.includes('This season only'));assert(text.includes('40.0%'));assert(text.includes('5 captured matches'));
  const form=card.locator('details').filter({has:page.locator('summary', {hasText:'Synthetic Nation A · 5 captured matches'})}).first();await form.locator('> summary').click();assert.equal(await form.locator('a').count(),5);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
  results.push({width,separateInternationalPanel:true,sourcedResults:true,experimentalEstimate:true});await page.close();
 }
 return results;
};
