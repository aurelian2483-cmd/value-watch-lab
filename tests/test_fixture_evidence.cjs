'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs');
const F = require('../paper-lab/fixture-evidence.js');
const now = Date.parse('2026-11-19T09:00:00Z');
const gates = {schema_version:1,research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED',generated_at_utc:'2026-11-19T08:00:00Z'};
const a = {id:'a',name:'Alice'}, b = {id:'b',name:'Bob'};
const match = {id:'m1',player_a:a,player_b:b,start_utc:'2026-11-20T18:00:00Z',status:'SCHEDULED',competition:'Test Cup'};
const results = Array.from({length:8},(_,i)=>({id:'r'+i,player_a:a,player_b:b,winner_id:i%2?'a':'b',played_at:'2026-11-'+String(i+1).padStart(2,'0')+'T12:00:00Z',status:'FINAL'}));
const doc = {...gates,results,fixtures:[match],tentative_fixtures:[]};
let report = F.normalize('darts',doc,[],now);
assert.equal(report.fixtures.length,1);
assert.equal(report.fixtures[0].model.prior_a,8);
assert.equal(report.fixtures[0].model.prob_a+report.fixtures[0].model.prob_b,1);
assert.equal(report.fixtures[0].selectable,false);assert.equal(report.fixtures[0].odds,null);
const official = {date:'2026-11-20',participants:['Alice','Bob'],competition:'Test Cup',sources:['https://example.org/schedule','javascript:alert(1)']};
report = F.normalize('darts',doc,[official],now);
assert.equal(report.fixtures.length,1,'same-day provider and official merge');
assert.equal(report.fixtures[0].official,true);
assert.deepEqual(report.fixtures[0].sources,['https://example.org/schedule']);
assert(report.fixtures[0].model,'merging preserves model inputs');
const reverse = F.normalize('darts',doc,[{...official,participants:['Bob','Alice']}],now).fixtures[0];
assert.equal(reverse.model.player_a.name,'Bob');
assert.equal(reverse.model.prob_a,report.fixtures[0].model.prob_b);
assert.match(reverse.sourceStatus,/provider match time unverified/);
assert.equal(F.normalize('darts',null,[{...official,date:'2026-99-99'}],now).fixtures.length,0);
assert.equal(F.normalize('darts',{...doc,results:results.slice(0,2)},[],now).fixtures[0].model.prob_a,null);
assert.match(F.normalize('darts',{...doc,results:results.slice(0,2)},[],now).fixtures[0].reason,/2 \/ 2/);
assert.equal(F.normalize('darts',{...doc,generated_at_utc:'2026-11-10T08:00:00Z'},[],now).fixtures[0].model,null);
assert.equal(F.normalize('darts',{...doc,generated_at_utc:'2026-11-20T08:00:00Z'},[],now).fixtures[0].model,null);
assert.equal(F.normalize('darts',{...doc,publication_gate:'OPEN'},[official],now).fixtures.length,1);
const conflict=F.normalize('darts',{...doc,fixtures:[match,{...match,id:'m2',start_utc:'2026-11-20T19:00:00Z'}]},[],now).fixtures[0];
assert.equal(conflict.start,null);assert.equal(conflict.model,null);assert.match(conflict.reason,/Conflicting/);
assert.equal(F.normalize('darts',null,[official],now).fixtures[0].start,null);
const Darts = require('../darts/model.js');
const aggregate = {...gates,...Darts.model(results,[match],gates.generated_at_utc),raw_history_published:false,
 source_verification:'PROVIDER_OBSERVED_UNCORROBORATED',history_latest_date:'2026-11-08',
 coverage:{pagination_complete:true,history_period:['2026-10-15','2026-11-11'],usable_result_rows:8,returned_result_rows:8},
 source_receipts:Array.from({length:5},(_,i)=>({endpoint:i===4?'/v1/fixtures':'/v1/results',sha256:'a'.repeat(64)}))};
assert(F.validAnalysis(aggregate,now));
const sparse = {...doc,results:results.slice(0,1)};
const analysed = F.normalize('darts',sparse,[],now,aggregate);
assert.equal(analysed.fixtures[0].model.prior_a,8,'complete aggregate replaces bounded sample analysis');
assert.equal(analysed.fixtures[0].analysisHistory,8);
assert.match(analysed.fixtures[0].reason,/recent results are delayed/);
assert.equal(analysed.fixtures[0].selectable,false);
assert.equal(F.normalize('darts',sparse,[{...official,participants:['Bob','Alice']}],now,aggregate).fixtures[0].model.prob_a,aggregate.fixtures[0].prob_b);
for(const mutation of [
 a=>a.publication_gate='OPEN',a=>a.generated_at_utc='2026-11-20T00:00:00Z',
 a=>a.generated_at_utc='2026-11-10T00:00:00Z',a=>a.coverage.pagination_complete=false,
 a=>a.coverage.returned_result_rows=9,a=>a.source_receipts=[],a=>a.raw_history_published=true,
 a=>a.fixtures[0].prob_a=0.999,a=>a.fixtures[0].prior_a=0,a=>a.model='UNRECOGNISED'
]) {
 const bad=structuredClone(aggregate);mutation(bad);
 assert.equal(F.validAnalysis(bad,now),false,'invalid aggregate rejected');
 assert.equal(F.normalize('darts',sparse,[],now,bad).fixtures[0].model.prior_a,1,'safe bounded sample retained');
}
for(const mutation of [a=>a.fixtures[0].id='different',a=>a.fixtures[0].player_a={id:'new',name:'Alice'},a=>a.fixtures[0].start_utc='2026-11-21T18:00:00Z']) {
 const mismatch=structuredClone(aggregate);mutation(mismatch);
 assert.equal(F.normalize('darts',sparse,[],now,mismatch).fixtures[0].model.prior_a,1,'stale fixture identity must not receive an old prediction');
}
const rugby={...gates,upcoming_fixtures:['RU','RL'].map(code=>({code,home:'Team A',away:'Team B',kickoff_utc:'2026-11-20T18:00:00Z',competition_name:'Test '+code,source_receipts:[{url:'https://example.org/'+code}]}))};
report=F.normalize('rugby',rugby,[],now);
assert.equal(report.fixtures.length,2,'rugby codes remain distinct');
assert(report.fixtures.every(r=>r.model===null&&r.odds===null&&!r.selectable));
const state={plan:{from:'2026-11-19',to:'2026-11-21'},eventView:'upcoming',competition:'Test RU',query:'team a'};
assert.equal(F.matching(report,state,now).length,1);
assert.equal(F.matching(report,{...state,query:'absent'},now).length,0);
assert.equal(F.matching(report,{...state,eventView:'history'},now).length,0);
assert.equal(F.matching(report,{...state,plan:{from:'2026-11-21',to:'2026-11-22'}},now).length,0);
assert.equal(F.matching({loading:true},state,now).length,0);
assert.equal(F.normalize('rugby',{...rugby,upcoming_fixtures:[{...rugby.upcoming_fixtures[0],status:'CANCELLED'}]},[],now).fixtures.length,0);
for(const [sport,path] of [['darts','darts/feed.json'],['rugby','rugby-research-data.json']]) {
 const actual=F.normalize(sport,JSON.parse(fs.readFileSync(path,'utf8')),[],now);
 assert(actual.valid);assert(actual.fixtures.every(r=>!r.selectable&&r.odds===null));
 console.log(sport+': '+actual.fixtures.length+' provider calendar records, '+actual.historyCount+' historical records');
}
console.log('Fixture evidence: D1, sparse history, deduplication, timestamps, source safeguards, rugby identities and filters passed');
