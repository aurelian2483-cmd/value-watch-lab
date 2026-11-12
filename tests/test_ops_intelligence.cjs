'use strict';
const assert=require('node:assert/strict');
const I=require('../ops-control/director-intelligence.cjs');
function report(when,issues=[],secondary='MEETING_LIST_MATCHED_NOT_CERTIFIED',bad=[]){
 return {kind:'OPERATIONS_SCHEDULED_RESEARCH_AUDIT',generatedAt:when,issues:issues.map(([code,priority])=>({code,priority})),feeds:['football','racing','other','horse'].map(id=>({id,state:bad.includes(id)?'STALE':'OBSERVED'})),secondaryRacingCoverage:{status:secondary,missing:[],unexpected:[],raceCountMismatches:[]}};
}
const date='2026-11-12T10:00:00.000Z',later='2026-11-12T19:00:00.000Z';
const p2=['racing:COVERAGE_UNVERIFIED','P2'];
const one=I.snapshot(report(date,[p2]),'100');
assert.equal(one.p1,0);assert.equal(one.p2,1);assert.equal(one.secondary,'MEETING_LIST_MATCHED_NOT_CERTIFIED');
assert.deepEqual(I.assess(null,one),{changes:['HISTORY_BASELINE_STARTED'],alert:false});
const again=I.snapshot(report(later,[p2]),'101');
assert.equal(I.assess(one,again).alert,false,'Stable known P2 must not spam notification');
const first=I.append([],one);
assert.equal(first.records.length,1);
assert.equal(I.append(first.records,one).duplicate,true,'Rerun must not inflate history');
const serialization=I.serialize(first.records);assert.deepEqual(I.read(serialization),first.records);
assert.equal(I.trends(first.records).observedUTCDays,1);
const alert=I.snapshot(report(later,[p2,['football:FEED_UNAVAILABLE','P1']],'DISCREPANCY',['football']),'102');
const delta=I.assess(one,alert);
assert.equal(delta.alert,true);assert(delta.changes.includes('P1_INCREASED'));assert(delta.changes.includes('SECONDARY_DISCREPANCY'));
assert(delta.changes.some(x=>x.startsWith('NEW_ISSUES:')));
const reverted=I.snapshot(report(later,[p2],'SECONDARY_UNAVAILABLE'), '103');
assert.equal(I.assess(one,reverted).alert,true,'A formerly matched secondary check becoming unavailable is actionable');
const unverified=I.snapshot(report(later,[p2],'SECONDARY_UNAVAILABLE'), '104');
assert.equal(I.assess(reverted,unverified).alert,false,'Repeated unchanged unavailability should not notify');
const metrics=I.trends([one,again,alert]);
assert.equal(metrics.totalRuns,3);assert.equal(metrics.secondaryMatchRuns,2);assert.equal(metrics.secondaryDiscrepancyRuns,1);
assert.equal(metrics.recurring[0].code,'racing:COVERAGE_UNVERIFIED');
assert.match(I.summary([one,again,alert],alert,delta),/Repeated observation codes/);
assert.throws(()=>I.read('<!-- ops-director-history-v1:not-base64 -->'),/Cannot safely read existing Director history/);
let records=[];
for(let day=0;day<110;day++){const time=new Date(Date.UTC(2026,0,1+day,12)).toISOString();records=I.append(records,I.snapshot(report(time,[p2]),String(day))).records;}
assert.equal(records.length,I.MAX);
assert.equal(records[0].runId,'20');
assert.equal(I.trends(records).observedUTCDays,90);
assert.throws(()=>I.snapshot({kind:'wrong'},'1'),/Invalid scheduled audit envelope/);
console.log('PASS: central issue history, 90-run retention, change detection, P1/secondary alerts, quiet stable P2, rerun dedup and corrupted-state fail closed');
