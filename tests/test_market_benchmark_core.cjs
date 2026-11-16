'use strict';
const assert=require('node:assert/strict');
const M=require('../research/market-benchmark/core.js');
const market=M.deVig([2,3.5,4]);
assert(market);
assert(Math.abs(market.probabilities.reduce((a,b)=>a+b,0)-1)<1e-10);
assert(Math.abs(market.overround-(1/2+1/3.5+1/4-1))<1e-10);
for(const x of [null,[],[1,2],[2,Infinity],[2,NaN],[2,0],[2]])assert.equal(M.deVig(x),null);
const p=[.5,.3,.2];
const s=M.score(p,0);assert(Math.abs(s.logLoss-Math.log(2))<1e-12);assert(Math.abs(s.brier-.38)<1e-12);
assert.equal(M.score([.5,.6],0),null);
assert.equal(M.score([1,0],2),null);
assert.deepEqual(M.blend([.6,.4],[.4,.6],.5),[.5,.5]);
assert.equal(M.blend([.6,.4],[.4,.6],1.1),null);
const row={event_id:'fixture-001',market_id:'full-time-result-1x2',
 start_utc:'2026-11-22T15:00:00Z',
 model_probabilities:[.5,.3,.2],model_frozen_at_utc:'2026-11-21T10:00:00Z',
 closing_odds:[2,3.5,4],closing_observed_at_utc:'2026-11-22T14:59:00Z',
 closing_source:'https://source.example/quote',winner_index:0};
const result=M.evaluate(row);
assert.equal(result.status,'RETROSPECTIVE_RESEARCH');
assert.equal(result.publication_gate,'BLOCKED');
assert.equal(result.closing_benchmark,'HINDSIGHT_ONLY_NOT_MODEL_INPUT');
assert(Math.abs(result.model.logLoss-Math.log(2))<1e-12);
assert.equal(M.evaluate({...row,closing_observed_at_utc:'2026-11-22T15:00:01Z'}).status,'INELIGIBLE');
assert.equal(M.evaluate({...row,model_frozen_at_utc:'2026-11-22T15:00:00Z'}).status,'INELIGIBLE');
assert.equal(M.evaluate({...row,closing_source:'javascript:bad()'}).status,'INELIGIBLE');
assert.equal(M.evaluate({...row,closing_odds:[2,3]}).status,'INELIGIBLE');
assert.equal(M.evaluate({...row,winner_index:null}).status,'INELIGIBLE');
const blended=M.evaluate({...row,blend_weight:.4});
assert.equal(blended.status,'RETROSPECTIVE_RESEARCH');
assert(blended.combined_warning.includes('cannot represent'));
console.log('Market benchmark: chronology, de-vig, scoring and research-only guards passed');
