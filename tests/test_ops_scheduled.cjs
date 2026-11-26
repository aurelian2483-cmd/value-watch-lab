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
 assert.equal(original,fs.readFileSync(path.join(base,'research-dashboard-data.json'),'utf8'),'monitor may not alter inputs');
 data.racing.coverage_verified=false;data.football.generated_at_utc='2026-11-10T20:00:00.000Z';write();
 report=audit(base,now);assert.equal(report.priority,'P2');assert(report.issues.some(x=>x.code==='racing:COVERAGE_UNVERIFIED'));assert(report.issues.some(x=>x.code==='football:STALE'));
 data.football.publication_gate='OPEN';write();
 report=audit(base,now);assert.equal(report.priority,'P1');assert(report.issues.some(x=>x.code==='football:GATE_CHANGED'));
 data.football.publication_gate='BLOCKED';data.football.generated_at_utc='2026-11-13T20:00:00.000Z';write();
 report=audit(base,now);assert(report.issues.some(x=>x.code==='football:INVALID_TIMESTAMP'));
 for(const invalid of ['2026-11-12T20:00:00','November 12, 2026 20:00:00 GMT','2026-02-30T20:00:00Z','2026-11-12T20:01:00Z']){
  data.football.generated_at_utc=invalid;write();report=audit(base,now);
  assert.equal(report.feeds.find(f=>f.id==='football').state,'BLOCKED',invalid);
  assert.equal(report.feeds.find(f=>f.id==='football').ageHours,null,invalid);
 }
 data.football.generated_at_utc='2026-11-12T21:00:00+01:00';write();
 assert.equal(audit(base,now).feeds.find(f=>f.id==='football').state,'OBSERVED');
 const hybrid=data['hybrid-prices'].records[0];
 hybrid.benchmark.observed_at_utc='2026-11-12T20:00:00';write();
 assert.equal(audit(base,now).feeds.find(f=>f.id==='hybrid-prices').state,'PENDING');
 hybrid.benchmark.observed_at_utc=now;
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
