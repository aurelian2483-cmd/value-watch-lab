const assert=require('node:assert/strict');const C=require('../track-record/core.js');
(async()=>{
const t='2026-11-03T12:00:00Z',payload={event:'Test race',selection:'Runner',market:'WIN',bookmaker:'Example',sourceURL:'https://example.org/race',odds:3,startUTC:'2026-11-03T14:00:00Z',observedAtUTC:t};
let es=await C.append([],'QUOTE',payload,t);assert(await C.verify(es));
await assert.rejects(()=>C.append([],'QUOTE',{...payload,startUTC:'2026-11-03T12:04:00Z'},t),/cutoff/);
await assert.rejects(()=>C.append(es,'RESULT',{quoteId:es[0].id,outcome:'WIN',sourceURL:'https://example.org/result'},t),/after/);
const changed=JSON.parse(JSON.stringify(es));changed[0].payload.odds=4;await assert.rejects(()=>C.verify(changed),/hash chain/);
es=await C.append(es,'RESULT',{quoteId:es[0].id,outcome:'LOSS',sourceURL:'https://example.org/result'},'2026-11-03T15:00:00Z');assert.equal(C.stats(es).profit,-1);
es=await C.append(es,'RESULT',{quoteId:es[0].id,outcome:'WIN',sourceURL:'https://example.org/correction'},'2026-11-03T16:00:00Z');assert.equal(C.stats(es).profit,2);assert.equal(C.stats(es).wins,1);assert.equal(C.stats(es).quotes,1);
await assert.rejects(()=>C.append(es,'CLOSE',{quoteId:es[0].id,odds:2,bookmaker:'Different',observedAtUTC:'2026-11-03T13:55:00Z',sourceURL:'https://example.org/close'},'2026-11-03T16:00:00Z'));
assert.equal(C.vector({prob_home:.5,prob_draw:.3,prob_away:.2}),true);assert.equal(C.vector({prob_home:.8,prob_draw:.3,prob_away:.2}),false);assert.equal(C.url('javascript:alert(1)'),null);
const race=(p,w='a')=>({race_id:'1',startUTC:'2026-11-03T14:00:00Z',generated_at_utc:t,winner_horse_id:w,runners:[{horse_id:'a',model_probability:p},{horse_id:'b',model_probability:1-p}]});assert.equal(C.paired([race(.5)],[race(.7)]).n,1);assert(C.paired([race(.5)],[race(.7)]).logDelta<0);assert.equal(C.paired([race(.5)],[race(.7,'b')]).excluded,1);assert.equal(C.paired([race(.5)],[{...race(.7),generated_at_utc:'2026-11-03T14:01:00Z'}]).n,0);
console.log('Research ledger timing, integrity, corrections and price controls passed');
})().catch(e=>{console.error(e);process.exit(1)});
