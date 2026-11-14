'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {normalizeHistoricalAvailability}=require('../research/match-intelligence/historical-availability.js');
function sample(){
 return {club:'Chelsea FC',tmId:631,season:'2024',scrapedAt:'2026-03-27T22:06:40Z',
 competitions:[{code:'GB1',players:Array.from({length:11},(_,i)=>({name:'Player '+i,tmId:i+1,position:'CM',matches:[{round:'1',status:'starting'}]}))}]};
}
test('valid retrospective XI is counted but never cleared for live predictions',()=>{
 const a=normalizeHistoricalAvailability(sample());
 assert.equal(a.rounds[0].starters,11);
 assert.deepEqual(a.rounds[0].issues,[]);
 assert.equal(a.eligible_for_prematch_prediction,false);
 assert.equal(a.eligible_for_historical_training,false);
 assert.equal(a.prematch_known_at,null);
});
test('missing starters prevent matchday validation',()=>{
 const x=sample();x.competitions[0].players[0].matches[0].status='injured';
 const a=normalizeHistoricalAvailability(x);
 assert.ok(a.rounds[0].issues.includes('STARTING_XI_COUNT_NOT_11'));
});
test('duplicate player identity is rejected',()=>{
 const x=sample();x.competitions[0].players.push({...x.competitions[0].players[0]});
 assert.throws(()=>normalizeHistoricalAvailability(x),/Duplicate player ID/);
});
test('multiple states per same round do not silently count twice',()=>{
 const x=sample();x.competitions[0].players[0].matches.push({round:'1',status:'bench'});
 const a=normalizeHistoricalAvailability(x);
 assert.equal(a.errors[0].reason,'DUPLICATE_ROUND_STATUS');
 assert.equal(a.rounds[0].starters,11);
});
test('invalid matchday status is reported, not assumed fit',()=>{
 const x=sample();x.competitions[0].players[0].matches[0].status='maybe_fine';
 const a=normalizeHistoricalAvailability(x);
 assert.equal(a.errors[0].reason,'INVALID_MATCHDAY_OR_STATUS');
 assert.equal(a.rounds[0].starters,10);
});
test('do not merge other competition matchdays into Premier League',()=>{
 const x=sample();x.competitions.push({code:'FAC',players:[]});
 assert.equal(normalizeHistoricalAvailability(x).rounds[0].starters,11);
 assert.throws(()=>normalizeHistoricalAvailability(x,{competition:'UCL'}),/Exactly one/);
});

test('source absent means unclassified absence, not confirmed injury',()=>{
 const x=sample();x.competitions[0].players[0].matches[0].status='absent';
 const a=normalizeHistoricalAvailability(x);
 assert.equal(a.rounds[0].absent_unclassified,1);
 assert.equal(a.rounds[0].injured,0);
 assert.equal(a.rounds[0].starters,10);
 assert.equal(a.errors.length,0);
});
