'use strict';
const assert=require('node:assert/strict'),I=require('../paper-lab/insights.js');
const now=Date.parse('2026-11-08T10:00:00Z'),source={url:'https://example.org/stats',observedAtUTC:'2026-11-08T09:00:00Z'};
const appearances=Array.from({length:5},(_,i)=>({eventId:'test-'+i,startUTC:'2026-11-0'+(i+1)+'T10:00:00Z',completedAtUTC:'2026-11-0'+(i+1)+'T12:00:00Z',completed:true,metrics:{goals:1},minutes:90,source}));
const input={eventStartUTC:'2026-11-09T10:00:00Z',metric:'goals',perMinutes:90,appearances,baseline:{metric:'goals',value:.3,sampleSize:20,perMinutes:90,asOfUTC:'2026-11-08T08:00:00Z',source}};
assert.equal(I.playerTrend(input,now).status,'IMPROVING');assert.equal(I.playerTrend(input,now).samples,5);assert.equal(I.playerTrend(input,now).rosterFlags.is_new_signing,null);
assert.equal(I.playerTrend({...input,appearances:appearances.slice(0,4)},now).status,'INSUFFICIENT_DATA');
assert.equal(I.playerTrend({...input,appearances:[...appearances,{...appearances[0],metrics:{goals:5}}]},now).status,'INSUFFICIENT_DATA');
assert.equal(I.playerTrend({...input,appearances:appearances.map(r=>({...r,minutes:0}))},now).status,'INSUFFICIENT_DATA');
const zero=I.playerTrend({...input,appearances:appearances.map(r=>({...r,metrics:{goals:0}}))},now);assert.equal(zero.status,'DECLINING');assert.equal(zero.drought.consecutiveZeroAppearances,5);assert.equal(zero.drought.noDueOutcomeInference,true);
assert.equal(I.playerTrend({...input,baseline:{...input.baseline,asOfUTC:'2026-11-10T10:00:00Z'}},now).status,'INSUFFICIENT_DATA');
assert.equal(I.playerTrend({...input,roster:{verified:true,is_new_signing:true,is_debutant:false,source}},now).rosterFlags.is_new_signing,true);
for(const claim of ['inside information','jockey friend','friend of a jockey','stable secret','guaranteed winner','certain profit']){const r=I.classifyClaim(claim,'FORM_ANALYSIS',['https://example.org']);assert(r.highRisk);assert.equal(r.trustScore,null);assert.equal(r.verifiedROI,null);}
assert.equal(I.classifyClaim('Analytical opinion','OTHER',['javascript:alert(1)']).sources.length,0);
(async()=>{
 let calls=0,release;const cache=I.createStatisticsCache({loader:async query=>{calls++;if(query.eventId==='held')await new Promise(r=>release=r);return query.eventId;},maxEntries:2});
 const q={eventId:'one',sport:'FOOTBALL',season:'2026',source:'v1',tab:'h2h'};assert.equal(await cache.load(q),'one');assert.equal(await cache.load(q),'one');assert.equal(calls,1);
 assert.equal(await cache.load({...q,eventId:'two'}),'two');assert.equal(await cache.load({...q,source:'v2'}),'one');assert.equal(calls,3);assert.equal(cache.size,2);
 const abort=new AbortController(),waiting=cache.load({...q,eventId:'held'},{signal:abort.signal});await Promise.resolve();abort.abort();await assert.rejects(waiting,{name:'AbortError'});release();await new Promise(setImmediate);
 cache.dispose();await assert.rejects(cache.load(q),{name:'AbortError'});
 console.log('Player insights: sourced five-appearance comparisons, chronology, minutes, drought limits, roster evidence, full community taxonomy and bounded async cache passed');
})().catch(e=>{console.error(e);process.exitCode=1});
