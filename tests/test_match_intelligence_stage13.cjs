'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {WEIGHTS,blend,observedPairs,auditFutureQuote}=require('../research/match-intelligence/stage13-market-blend.cjs');
const base={fixture_id:'example-fixture',kickoff_utc:'2026-11-21T15:00:00Z',
 forecast_cutoff_utc:'2026-11-21T12:00:00Z'};
const quote={provider:'EXAMPLE_ONLY',source_record_id:'example-1',evidence_uri:'https://example.org/receipt',
 market:'1X2_FULL_TIME',venue_rule:'REGULATION_TIME',decimal_odds:[2.5,3.2,3.1],
 quoted_at_utc:'2026-11-21T10:00:00Z',captured_at_utc:'2026-11-21T10:00:02Z',independent_receipt_verified:true};
test('zero weight is market-only and full weight is form-only',()=>{
 const m=[.5,.28,.22],f=[.4,.32,.28];
 assert.deepEqual(blend(m,f,0),m);
 const full=blend(m,f,1);full.forEach((v,i)=>assert.ok(Math.abs(v-f[i])<1e-12));
});
test('blended probabilities are bounded, normalized and convex',()=>{
 const a=[.7,.2,.1],b=[.4,.3,.3];
 const v=blend(a,b,.25);
 assert.ok(Math.abs(v.reduce((s,x)=>s+x,0)-1)<1e-12);
 assert.ok(v.every((x,i)=>x>=Math.min(a[i],b[i])&&x<=Math.max(a[i],b[i])));
});
test('unregistered weight and malformed probabilities fail closed',()=>{
 assert.throws(()=>blend([.5,.3,.2],[.5,.3,.2],.333),/Unregistered/);
 assert.throws(()=>blend([.4,.3,.2],[.5,.3,.2],.25),/normalized/);
 assert.throws(()=>blend([.5,.3,.2],[NaN,.3,.2],.25),/invalid/);
});
test('fixed grid spans market-only through form-only',()=>{
 assert.deepEqual(WEIGHTS,[0,.1,.25,.5,.75,1]);
});
test('well-formed quote metadata does not certify an executable bet',()=>{
 const r=auditFutureQuote({...base,quote});
 assert.equal(r.status,'EVIDENCE_READY_FOR_MANUAL_REVIEW');
 assert.equal(r.executable_bet_verified,false);
 assert.equal(r.publication_gate,'BLOCKED');
});
test('missing timestamp, receipts and invalid settlement rules are flagged',()=>{
 const q={...quote,captured_at_utc:null,independent_receipt_verified:false,venue_rule:'EXTRA_TIME'};
 const r=auditFutureQuote({...base,quote:q});
 assert.ok(r.issues.includes('MISSING_CAPTURE_TIMESTAMP'));
 assert.ok(r.issues.includes('NO_INDEPENDENT_RECEIPT_VERIFICATION'));
 assert.ok(r.issues.includes('UNCONFIRMED_SETTLEMENT_RULE'));
});
test('post-cutoff quotes and capture times are rejected',()=>{
 const r=auditFutureQuote({...base,quote:{...quote,quoted_at_utc:'2026-11-21T12:01:00Z',captured_at_utc:'2026-11-21T12:02:00Z'}});
 assert.ok(r.issues.includes('PROVIDER_QUOTE_AFTER_CUTOFF'));
 assert.ok(r.issues.includes('CAPTURED_AFTER_CUTOFF'));
});
test('quote-after-capture chronology conflict is rejected',()=>{
 const r=auditFutureQuote({...base,quote:{...quote,quoted_at_utc:'2026-11-21T11:00:00Z',captured_at_utc:'2026-11-21T10:00:00Z'}});
 assert.ok(r.issues.includes('QUOTE_AFTER_CAPTURE'));
});
test('archived source and missing market do not claim timestamp certification',()=>{
 const sample='Date,HomeTeam,AwayTeam,FTHG,FTAG,PSH,PSD,PSA,PSCH,PSCD,PSCA\n01/08/2024,TeamA,TeamB,1,0,,,,,,\n';
 const x=observedPairs(sample);
 assert.equal(x.rows.length,0);
 assert.equal(x.missing_market_quotes,0);
});
test('invalid fixture time fails closed',()=>{
 assert.throws(()=>auditFutureQuote({...base,forecast_cutoff_utc:base.kickoff_utc,quote}),/precede kickoff/);
});
