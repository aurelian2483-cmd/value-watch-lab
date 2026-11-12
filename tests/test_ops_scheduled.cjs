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
 horse:doc({form_forecasts:[]})
};
function write(){for(const f of SOURCES)fs.writeFileSync(path.join(base,f.filename),JSON.stringify(data[f.id]));}
try{
 write();
 let report=audit(base,now);
 assert.equal(report.priority,'CLEAR');assert.equal(report.feeds.length,4);assert.equal(report.sports.length,4);
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
 data.football.generated_at_utc=now;write();fs.writeFileSync(path.join(base,'other-sports-data.json'),'{broken json');
 report=audit(base,now);assert.equal(report.priority,'P1');assert(report.issues.some(x=>x.code==='other:FEED_UNAVAILABLE'));assert.equal(report.bookmakerPricesVerified,false);
 fs.rmSync(path.join(base,'horse-model-data.json'));report=audit(base,now);assert(report.issues.some(x=>x.code==='horse:FEED_UNAVAILABLE'));
 fs.writeFileSync(path.join(base,'horse-model-data.json'),'[]');report=audit(base,now);assert(report.issues.some(x=>x.code==='horse:FEED_UNAVAILABLE'));
 const issueText=markdown(report);assert.match(issueText,/Manager actions/);assert.match(issueText,/UNVALIDATED \/ BLOCKED/);assert(!issueText.includes('NaN'));
 console.log('PASS: offline source audit, four sports, P1/P2 gates, freshness, missing/malformed/future feeds, deterministic signatures and zero source writes');
}finally{fs.rmSync(base,{recursive:true,force:true})}
