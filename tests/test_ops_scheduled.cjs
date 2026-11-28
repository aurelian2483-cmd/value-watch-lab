'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {audit,markdown,SOURCES}=require('../ops-control/scheduled-monitor.cjs');
const base=fs.mkdtempSync(path.join(os.tmpdir(),'ops-scheduled-test-'));
const now='2026-11-12T20:00:00.000Z';
const doc=(extra={})=>({generated_at_utc:now,research_only:true,publication_gate:'BLOCKED',model_validation:'UNVALIDATED',...extra});
const data={
 football:doc({upcoming_fixtures:[{home:'A',away:'B'}]}),
 racing:doc({races:[{race_id:'R'}],coverage_verified:true}),
 other:doc({sports:{tennis:{events:[{id:'T'}]},nfl:{events:[{id:'N'}]}},collection_errors:{}}),
 horse:doc({form_forecasts:[]}),
 'racing-future':doc({days:[],provisional_racecards:0,meeting_fixtures:0}),
 'racing-forecasts':doc({forecasts:[],skipped:[]}),
 darts:doc({fixtures:[]}),
 'darts-analysis':doc({fixtures:[]}),
 rugby:doc({upcoming_fixtures:[{code:'RU'}]}),
 'hybrid-prices':{schema_version:1,records:[{start_utc:'2026-11-13T20:00:00Z',benchmark:{observed_at_utc:now},sky_bet:{observed_at_utc:now}}]},
 'fixture-prices':doc({schema_version:1,records:[{start_utc:'2026-11-13T20:00:00Z',benchmark:{captured_at_utc:now},sky_bet:{captured_at_utc:now}}]})

};
function write(){for(const f of SOURCES){const file=path.join(base,f.filename);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(data[f.id]));}}
try{
 write();
 let report=audit(base,now);
 assert.equal(report.priority,'CLEAR');assert.equal(report.feeds.length,11);assert.equal(report.sports.length,7);
 assert.equal(report.qualifiedBettingApprovals,0);assert.equal(report.bookmakerPricesVerified,false);
 assert.equal(report.notLiveWebsiteCheck,true);assert.equal(report.changesApplied,false);
 assert.match(markdown(report),/not a verified live-site/);
 const original=fs.readFileSync(path.join(base,'research-dashboard-data.json'),'utf8');
 report=audit(base,now);
 assert.equal(report.signature,audit(base,now).signature,'same inputs => same incident signature');
 const forecasts=data['racing-forecasts'];
 forecasts.forecasts=[{record_sha256:'a',startUTC:'2026-11-12T21:00:00Z',generated_at_utc:now,runner_observed_at_utc:'2026-11-12T19:29:59Z',
  runners:[{horse_id:'A'},{horse_id:'B'}],context_signature:'fixture-context'}];
 write();report=audit(base,now);
 const racing=report.feeds.find(x=>x.id==='racing-forecasts');
 assert.equal(racing.state,'STALE');
 assert.deepEqual(racing.originalRunnerEvidence,{upcoming:1,stale:1,unknown:0});
 const inspectForecasts=()=>{write();return audit(base,now).feeds.find(x=>x.id==='racing-forecasts');};
 assert.deepEqual(racing.intakeTiming,{insideCutoff:0,invalidStart:0,currentFieldUnconfirmed:1});
 forecasts.forecasts[0].runner_observed_at_utc='2026-11-12T19:30:00Z';
 assert.equal(inspectForecasts().state,'PENDING');
 forecasts.current_field_checks={a:{status:'FRESH_MATCHING_FIELD_AND_CONTEXT',runner_observed_at_utc:now,checked_at_utc:now,
  active_runner_ids:['B','A'],context_signature:'fixture-context'}};
 assert.equal(inspectForecasts().state,'OBSERVED');
 forecasts.current_field_checks.a.active_runner_ids=['A','C'];
 assert.equal(inspectForecasts().state,'PENDING');
 forecasts.current_field_checks.a.active_runner_ids=['A','A'];
 assert.equal(inspectForecasts().state,'PENDING');
 forecasts.current_field_checks.a.active_runner_ids=['A',{toString:1}];
 assert.equal(inspectForecasts().state,'PENDING');
 forecasts.current_field_checks.a.active_runner_ids=['A','B'];
 forecasts.current_field_checks.a.runner_observed_at_utc='2026-11-12T19:29:59Z';
 assert.equal(inspectForecasts().state,'PENDING');
 forecasts.forecasts[0].startUTC='2026-11-12T20:05:00Z';
 assert.deepEqual(inspectForecasts().intakeTiming,{insideCutoff:1,invalidStart:0,currentFieldUnconfirmed:0});
 forecasts.forecasts[0].startUTC='2026-11-12T21:00:00';
 assert.equal(inspectForecasts().state,'BLOCKED');
 forecasts.forecasts[0].startUTC='2026-11-31T21:00:00Z';
 assert.equal(inspectForecasts().state,'BLOCKED');
 forecasts.forecasts=[];
 forecasts.generated_at_utc='2026-11-12T20:00:01Z';
 assert.equal(inspectForecasts().state,'BLOCKED');
 forecasts.generated_at_utc=now;
 assert.equal(original,fs.readFileSync(path.join(base,'research-dashboard-data.json'),'utf8'),'monitor may not alter inputs');
 data.racing.coverage_verified=false;data.football.generated_at_utc='2026-11-10T20:00:00.000Z';write();
 report=audit(base,now);assert.equal(report.priority,'P2');assert(report.issues.some(x=>x.code==='racing:COVERAGE_UNVERIFIED'));assert(report.issues.some(x=>x.code==='football:STALE'));
 data.football.publication_gate='OPEN';write();
 report=audit(base,now);assert.equal(report.priority,'P1');assert(report.issues.some(x=>x.code==='football:GATE_CHANGED'));
 data.football.publication_gate='BLOCKED';data.football.generated_at_utc='2026-11-13T20:00:00.000Z';write();
 report=audit(base,now);assert(report.issues.some(x=>x.code==='football:INVALID_TIMESTAMP'));
 data.football.generated_at_utc=now;write();fs.writeFileSync(path.join(base,'other-sports-data.json'),'{broken json');
 report=audit(base,now);assert.equal(report.priority,'P1');assert(report.issues.some(x=>x.code==='other:FEED_UNAVAILABLE'));assert.equal(report.bookmakerPricesVerified,false);
 fs.rmSync(path.join(base,'horse-model-data.json'));report=audit(base,now);assert(report.issues.some(x=>x.code==='horse:FEED_UNAVAILABLE'));
 fs.writeFileSync(path.join(base,'horse-model-data.json'),'[]');report=audit(base,now);assert(report.issues.some(x=>x.code==='horse:FEED_UNAVAILABLE'));
 data['darts-analysis']={...data['darts-analysis'],status:'AWAITING_PAGINATED_COLLECTION',generated_at_utc:null};
 data['hybrid-prices'].records=[];
 data['racing-future'].days=[{index_status:'SOURCE_DATE_MISMATCH',meeting_page_races:12},{index_status:'COLLECTION_FAILED',meeting_page_races:0}];
 write();
 report=audit(base,now);
 assert(report.issues.some(x=>x.code==='darts-analysis:PENDING'));
 assert(report.issues.some(x=>x.code==='hybrid-prices:PENDING'));
 assert.match(report.issues.find(x=>x.code==='racing-future:PENDING').description,/failed on 2.*1 of those dates/);
 const issueText=markdown(report);assert.match(issueText,/Manager actions/);assert.match(issueText,/UNVALIDATED \/ BLOCKED/);assert(!issueText.includes('NaN'));
 console.log('PASS: offline source audit, seven sports, P1/P2 gates, freshness, missing/malformed/future feeds, deterministic signatures and zero source writes');
}finally{fs.rmSync(base,{recursive:true,force:true})}
