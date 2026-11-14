'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {CONFIG,freezePrediction,buildLedger}=require('../research/match-intelligence/prospective-validation-lab.cjs');
const iso=(year,month,day)=>new Date(Date.UTC(year,month,day,15)).toISOString().replace('.000','');
const teams=['Arsenal','Chelsea','Everton','Liverpool','Fulham','Brentford'];
const history=()=>Array.from({length:120},(_,i)=>{
 const played=iso(2026,0,1+i),known=new Date(Date.parse(played)+4*3600*1000).toISOString().replace('.000','');
 return {id:'past-'+i,kickoff_utc:played,result_known_at_utc:known,
   home:teams[i%6],away:teams[(i+1)%6],hg:i%4,ag:(i+1)%3};
});
const fixture={id:'future-example',home:'Arsenal',away:'Chelsea',kickoff_utc:iso(2026,6,1)};
const args=()=>({fixture,history:history(),created_at_utc:iso(2026,5,30)});
test('creates two frozen normalized before-match forecasts from earlier known results',()=>{
 const p=freezePrediction(args());
 assert.equal(p.status,'FROZEN_PREDICTION');
 assert.equal(p.outcome_known,false);
 assert.equal(p.publication_gate,'BLOCKED');
 for(const a of Object.values(p.probabilities))assert.ok(Math.abs(a.reduce((x,y)=>x+y,0)-1)<1e-10);
 assert.equal(p.market,null);
});
test('same historical observations yield deterministic record digest',()=>{
 const a=freezePrediction(args()),b=freezePrediction(args());
 assert.equal(a.record_sha256,b.record_sha256);
});
test('post-forecast or future outcome data fail closed',()=>{
 const x=args();x.history[0].result_known_at_utc=iso(2026,6,2);
 assert.throws(()=>freezePrediction(x),/not verifiably available/);
});
test('same calendar date fixtures are conservatively unavailable',()=>{
 const x=args();x.history.push({id:'same-day',kickoff_utc:'2026-07-01T01:00:00Z',
  result_known_at_utc:'2026-07-01T05:00:00Z',home:'Fulham',away:'Everton',hg:1,ag:0});
 assert.throws(()=>freezePrediction(x),/Same-date/);
});
test('predictions created at or after kickoff cannot enter frozen ledger',()=>{
 const x=args();x.created_at_utc=fixture.kickoff_utc;
 assert.throws(()=>freezePrediction(x),/at or after kickoff/);
});
test('fixture requiring more baseline data produces explicit PASS',()=>{
 const x=args();x.history=x.history.slice(0,10);
 const p=freezePrediction(x);
 assert.equal(p.status,'PASS_INSUFFICIENT_HISTORICAL_DATA');
});
test('archived or supplied quote metadata never constitutes independent verification',()=>{
 const x=args();x.quote={provider:'EXAMPLE',source_record_id:'r1',evidence_uri:'https://example.org/receipt',
 market:'1X2_FULL_TIME',venue_rule:'REGULATION_TIME',decimal_odds:[2.1,3.3,3.5],
 quoted_at_utc:'2026-06-29T11:00:00Z',captured_at_utc:'2026-06-29T11:00:01Z',
 independent_receipt_verified:true};
 const p=freezePrediction(x);
 assert.equal(p.market.evidence_status,'EVIDENCE_READY_FOR_MANUAL_REVIEW');
 assert.equal(p.market.executable_quote_verified,false);
});
test('frozen records are scored only after result with source, never retroactively altered',()=>{
 const p=freezePrediction(args());
 const before=JSON.stringify(p);
 const empty=buildLedger([p],[]);
 assert.equal(empty.settled_count,0);
 assert.equal(empty.baseline_ll,null);
 const out=buildLedger([p],[{fixture_id:fixture.id,home_goals:2,away_goals:1,
   source_uri:'https://example.org/fixture-result',result_observed_at_utc:iso(2026,6,2)}]);
 assert.equal(out.settled_count,1);
 assert.ok(Number.isFinite(out.delta_ll_form_minus_baseline));
 assert.equal(out.verified_betting_roi,null);
 assert.equal(JSON.stringify(p),before);
});
test('duplicate predictions, tampering, duplicate settlements and missing result URLs fail',()=>{
 const p=freezePrediction(args());
 assert.throws(()=>buildLedger([p,p],[]),/Duplicate/);
 assert.throws(()=>buildLedger([{...p,history_count:2}],[]),/integrity/);
 const row={fixture_id:fixture.id,home_goals:1,away_goals:0,
 source_uri:'https://example.org/result',result_observed_at_utc:iso(2026,6,2)};
 assert.throws(()=>buildLedger([p],[row,row]),/unique/);
 assert.throws(()=>buildLedger([p],[{...row,source_uri:''}]),/source URI/);
});
test('wrong competition teams or malformed historical goal counts fail closed',()=>{
 const x=args();x.history[0].hg=-1;
 assert.throws(()=>freezePrediction(x),/Invalid prior fixture/);
});
