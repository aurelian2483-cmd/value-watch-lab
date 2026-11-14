'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {auditClubFixtureJoin}=require('../research/match-intelligence/fixture-lineup-join');
const archive={club:'Chelsea FC',tmId:631,season:'2024',scrapedAt:'2026-03-27T22:06:40Z',
 competitions:[{code:'GB1',players:Array.from({length:12},(_,i)=>({name:'P'+i,tmId:i+1,matches:[
 {round:'1',status:i<11?'starting':'bench'},
 {round:'2',status:i>0?'starting':'bench'}
 ]}))}]};
const results={matches:[
 {round:'Matchday 1',date:'2024-08-10',team1:'Chelsea FC',team2:'Arsenal FC',score:{ft:[1,0]}},
 {round:'Matchday 2',date:'2024-08-18',team1:'Liverpool FC',team2:'Chelsea FC',score:{ft:[0,1]}}
]};
test('full matchday linkage carries only prior match XI info into prematch features',()=>{
 const a=auditClubFixtureJoin({archive,results});
 assert.equal(a.joined,2);
 assert.equal(a.rows[0].prematchFeatures,null);
 assert.equal(a.rows[1].prematchFeatures.previous_matchday,1);
 assert.equal(a.rows[1].prematchFeatures.prior_match_previous_XI_retention,null);
 assert.equal(a.rows[1].historicalContinuity,10/11);
 assert.equal(a.rows[1].forecast_eligible,false);
});
test('altering later match lineup cannot change its pre-match features',()=>{
 const a=auditClubFixtureJoin({archive,results});
 const b=structuredClone(archive);
 b.competitions[0].players[0].matches[1].status='starting';
 b.competitions[0].players[1].matches[1].status='bench';
 const bb=auditClubFixtureJoin({archive:b,results});
 assert.deepEqual(a.rows[1].prematchFeatures,bb.rows[1].prematchFeatures);
});
test('later fixture score must not enter the stored prior lineup features',()=>{
 const a=auditClubFixtureJoin({archive,results});
 const rr=structuredClone(results);rr.matches[1].score.ft=[7,0];
 const b=auditClubFixtureJoin({archive,results:rr});
 assert.deepEqual(a.rows[1].prematchFeatures,b.rows[1].prematchFeatures);
});
test('team identity aliases cannot be assumed',()=>{
 assert.throws(()=>auditClubFixtureJoin({archive,results,teamName:'Chelsea'}),/alias/);
});
test('duplicate club round is explicitly flagged',()=>{
 const r=structuredClone(results);r.matches.push({...r.matches[0],team2:'Leeds United'});
 const x=auditClubFixtureJoin({archive,results:r});
 assert.ok(x.issues.some(z=>z.reason==='DUPLICATE_CLUB_ROUND'));
});
test('missing matchday results block full structural verification',()=>{
 const a=auditClubFixtureJoin({archive,results:{matches:[results.matches[0]]}});
 assert.ok(a.issues.some(z=>z.reason==='MISSING_RESULT_MATCHDAYS'));
 assert.equal(a.valid_38_rounds,false);
});
