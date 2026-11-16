'use strict';
const assert=require('node:assert/strict');
const {compile}=require('../research/market-benchmark/evaluate-file.cjs');
const event={event_id:'test-1',market_id:'REGULATION_1X2',model_version:'EXPERIMENTAL_V1',
 start_utc:'2026-11-22T15:00:00Z',model_probabilities:[.5,.3,.2],
 model_frozen_at_utc:'2026-11-21T10:00:00Z',closing_odds:[2,3.5,4],
 closing_observed_at_utc:'2026-11-22T14:59:00Z',closing_source:'https://licensed-source.example/research',
 winner_index:0,outcome_verified:true,event_identity_verified:true,market_identity_verified:true,
 quote_source_verified:true,model_forecast_archive_verified:true};
const envelope={schema_version:1,data_rights_confirmed:true,use_scope:'PRIVATE_RESEARCH',events:[event]};
const result=compile(envelope);
assert.equal(result.counts.paired_eligible,1);
assert.equal(result.publication_gate,'BLOCKED');
assert(Number.isFinite(result.scores.model_log_loss));
assert(!JSON.stringify(result).includes('licensed-source.example'));
assert(!JSON.stringify(result).includes('test-1'));
assert.equal(compile({...envelope,events:[event,event]}).counts.reasons.DUPLICATE_EVENT_MARKET_MODEL,1);
assert.equal(compile({...envelope,events:[{...event,quote_source_verified:false}]}).counts.paired_eligible,0);
assert.equal(compile({...envelope,events:[{...event,closing_observed_at_utc:'2026-11-22T15:01:00Z'}]}).counts.paired_eligible,0);
assert.equal(compile({...envelope,events:[]}).status,'NO_ELIGIBLE_COMPARISONS');
assert.throws(()=>compile({...envelope,data_rights_confirmed:false}),/rights/);
assert.throws(()=>compile({...envelope,use_scope:'PUBLIC'}),/rights/);
assert.throws(()=>compile({...envelope,events:Array(100001).fill(event)}),/envelope/);
console.log('Private historical odds evaluation: assertions passed');
