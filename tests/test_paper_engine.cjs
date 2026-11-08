'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs');
const E = require('../paper-lab/engine.js');
const now = Date.parse('2026-11-08T09:00:00Z');
const event = (i, sport = 'football') => ({ id:'event-'+i, identity:'identity-'+i, sport, sport_type:E.SPORTS[sport], name:'Synthetic test event '+i, competition:'Test competition', participants:[{id:'a',name:'A'},{id:'b',name:'B'}], startUTC:'2026-11-'+(i%2 ? '09':'08')+'T18:00:00Z', observedAt:'2026-11-08T08:59:00Z', ttlMs:36*3600000, providerStatus:'SCHEDULED', sources:[{url:'https://example.org/event/'+i,kind:'PROVIDER_RECEIPT',observedAt:'2026-11-08T08:59:00Z',sha256:null}], model:{name:'SYNTHETIC_TEST_MODEL',validation:'UNVALIDATED'}, choices:[{id:'a',label:'A',probability:.6,uncertainty:null,market:'Match winner',quote:null},{id:'b',label:'B',probability:.4,uncertainty:null,market:'Match winner',quote:null}],stats:{h2h:null,recent:null,rankings:null} });
let p=E.createPlan({from:'2026-11-08',to:'2026-11-09',createdAt:new Date(now).toISOString()});
assert.equal(p.slots.length,4);assert.equal(p.slots[3].name,'Experimental Longshot');
const a=event(0),b=event(1,'tennis'),c=event(2,'nfl'),events=[a,b,c];
p=E.addSelection(p,1,a,'a',now);p=E.addSelection(p,1,b,'b',now);
assert.equal(p.slots[0].legs.length,2,'cross-day and cross-sport accepted');
assert.throws(()=>E.addSelection(p,1,a,'b',now));
const original=JSON.stringify(p);const moved=E.moveSelection(p,1,0,1,now);assert.equal(moved.slots[0].legs[0].eventId,b.id);assert.equal(JSON.stringify(p),original);
const replaced=E.replaceSelection(p,1,0,c,'a',now);assert.equal(replaced.slots[0].legs[0].eventId,c.id);
assert.throws(()=>E.replaceSelection(p,1,0,b,'a',now));
assert.throws(()=>E.addSelection(p,1,{...c,providerStatus:'CANCELLED'},'a',now));
assert.throws(()=>E.addSelection(p,1,{...c,providerStatus:'POSTPONED'},'a',now));
assert.throws(()=>E.addSelection(p,1,{...c,observedAt:'2026-11-01T00:00:00Z'},'a',now));
assert.throws(()=>E.addSelection(p,1,{...c,identityConflict:true},'a',now));
let long=E.createPlan({from:p.from,to:p.to,createdAt:p.createdAt});
for(let i=0;i<15;i++)long=E.addSelection(long,4,event(i),'a',now);
assert.throws(()=>E.addSelection(long,4,event(16),'a',now));assert.equal(long.slots[3].legs.length,15);
assert.equal(E.evaluateSlot(p.slots[0],events,now).grossReturnMinor,null);
const observation={decimal:2.5,source:'https://example.org/price',observedAt:'2026-11-08T08:59:00Z',bookmaker:'Synthetic test source'};
p=E.setRecordedQuote(p,1,0,observation,now);p=E.setRecordedQuote(p,1,1,{...observation,decimal:3},now);
p=E.setStructure(p,1,'accumulator',now);p=E.setStake(p,1,'1.00',now);
const calc=E.evaluateSlot(p.slots[0],events,now);assert.equal(calc.grossReturnMinor,750);assert.equal(calc.netReturnMinor,650);assert.equal(calc.totalStakeMinor,100);assert.equal(calc.expectedValue,null);assert.equal(calc.probability,null);assert.equal(calc.verifiedCombinedOdds,null);assert(calc.warnings.some(x=>x.includes('user-recorded')));
assert.equal(E.evaluateSlot(p.slots[0],events,now+31*60000).grossReturnMinor,null,'stale quote cannot calculate a current return');
assert.throws(()=>E.setRecordedQuote(p,1,0,{...observation,source:'javascript:alert(1)'},now));
assert.throws(()=>E.setRecordedQuote(p,1,0,{...observation,observedAt:'2026-11-08T09:01:00Z'},now));
assert.equal(E.moneyMinor('0.01'),1);assert.equal(E.moneyMinor('1.10'),110);assert.throws(()=>E.moneyMinor('1.001'));assert.throws(()=>E.moneyMinor('-1'));assert.throws(()=>E.moneyMinor('NaN'));
assert.equal(E.combinations(15,2).length,105);assert.equal(E.combinations(15,3).length,455);
assert.equal(E.fractionalToDecimal('5/2'),3.5);assert.equal(E.impliedProbability(2),.5);assert.throws(()=>E.fractionalToDecimal('1/0'));
const frozen=E.freeze(p,now,events);p=E.removeSelection(p,1,0,now);assert.equal(frozen.slots[0].legs.length,2);assert.equal(frozen.independentlyAttested,false);assert.equal(frozen.roi,null);
assert.equal(E.restore(E.serialize(p)).publication_gate,'BLOCKED');assert.throws(()=>E.restore(JSON.stringify({...p,publication_gate:'OPEN'})));
assert.throws(()=>E.range('2026-02-31','2026-03-01'));assert.throws(()=>E.range('2026-11-10','2026-11-08'));assert.throws(()=>E.range('2026-01-01','2026-12-31'));
const changedRange=E.updateRange(frozen,'2026-11-10','2026-11-12',now);assert.equal(changedRange.slots[0].legs.length,2,'range changes retain original selections');
const generated=E.generateResearch(E.createPlan({from:'2026-11-08',to:'2026-11-09',createdAt:new Date(now).toISOString()}),events,now);
assert(generated.slots.some(s=>s.legs.length));assert(generated.slots.every(s=>s.legs.length<=15));
const nonempty=generated.slots.find(s=>s.legs.length),again=E.generateResearch(generated,[...events,event(3)],now);assert.deepEqual(again.slots.find(s=>s.id===nonempty.id).legs,nonempty.legs);
assert.equal(E.generateResearch(E.createPlan({from:'2026-11-08'}),[],now).slots.reduce((n,s)=>n+s.legs.length,0),0);
for(const [kind,path]of [['football','research-dashboard-data.json'],['football','football-expanded-data.json'],['racing','racing-research-data.json'],['other','other-sports-data.json'],['history','research-history.json']]){
 const d=JSON.parse(fs.readFileSync(path,'utf8')),rows=E.normalizeFeeds([{kind,path,document:d}],Date.now());
 assert.equal(rows.diagnostics.length,0);assert.equal(new Set(rows.map(e=>e.id)).size,rows.length);
 for(const r of rows){assert(E.SPORTS[r.sport]===r.sport_type);assert.equal(r.publication_gate,'BLOCKED');assert.equal(r.model_validation,'UNVALIDATED');assert(r.sources.length);assert(r.choices.every(c=>c.quote?.executable!==true));}
}
console.log('Research engine: cross-day edits, 15 legs, real-feed contracts, stale/cancelled gates, exact paper arithmetic, immutable evidence and evidence-only generation passed');

const cachedOther=JSON.parse(fs.readFileSync('other-sports-data.json','utf8'));
for(const part of Object.values(cachedOther.sports))for(const row of part.events||[])row.source_collected_at_utc='2026-11-01T00:00:00Z';
const cachedRows=E.normalizeFeeds([{kind:'other',path:'other-sports-data.json',document:cachedOther}],now);
assert(cachedRows.length>0);assert(cachedRows.every(row=>row.observedAt==='2026-11-01T00:00:00Z'&&!E.statusOf(row,now).selectable),'a refreshed collector cannot freshen an old cached schedule receipt');



const simulatedFootball={
 schema_version:1,research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED',
 generated_at_utc:'2026-11-08T01:30:00Z',
 upcoming_fixtures:[{
  league:'I1',home:'Synthetic Napoli',away:'Synthetic Lazio',
  kickoff_utc:'2026-11-09T11:30:00Z',
  forecast_eligible:false,
  verification:'SCHEDULE_CROSS_CHECK',
  head_to_head_research:{
   sample_size:6,home_team_wins:1,draws:1,away_team_wins:4,
   at_current_home_venue:{sample_size:4,home_wins:0,draws:0,away_wins:4},
   status:'DESCRIPTIVE_ONLY_NOT_VALIDATED'
  },
  schedule_source_receipts:[{url:'https://example.org/football',observed_at_utc:'2026-11-08T01:20:00Z'}]
 }],
 experimental_model_forecasts:[{
  league:'I1',home:'Synthetic Napoli',away:'Synthetic Lazio',
  kickoff_utc:'2026-11-09T11:30:00Z',
  generated_at_utc:'2026-11-08T01:25:00Z',
  prob_home:.46,prob_draw:.31,prob_away:.23,
  research_only:true,publication_gate:'BLOCKED',model_validation:'UNVALIDATED',
  odds:null,expected_value:null,model:'SYNTHETIC_TEST_PRIOR_SEASON',
  training_basis:{mode:'PRIOR_SEASON',training_matches:380,source_receipts:[]}
 }]
};
const comparisonTime=Date.parse('2026-11-08T01:45:00Z');
let syntheticRows=E.normalizeFeeds([{kind:'football',path:'synthetic-football.json',document:simulatedFootball}],comparisonTime);
let syntheticNapoli=syntheticRows.find(row=>row.name==='Synthetic Napoli vs Synthetic Lazio');
assert(syntheticNapoli?.model,'Synthetic prior-season model must remain visible');
const review=E.footballEvidenceReview(syntheticNapoli);
assert.equal(review.status,'REVIEW_REQUIRED');
assert(review.notes.some(note=>note.includes('prior-season')));
assert(review.notes.some(note=>note.includes('4 recorded meetings')));
assert(review.notes.some(note=>note.includes('not eligible')));
assert.equal(review.actionable,false);
assert.equal(review.verifiedMarketComparison,false);
assert.equal(E.footballEvidenceReview(event(1,'tennis')),null);

simulatedFootball.upcoming_fixtures[0].current_season_comparison={
 method:'CURRENT_SEASON_POISSON_COMPARISON_V1',season:'2627',
 prob_home:.25,prob_draw:.28,prob_away:.47,
 home_venue_matches:4,away_venue_matches:5,
 training_matches:70,source_receipts:[],research_only:true,
 publication_gate:'BLOCKED',odds:null,expected_value:null,small_sample:true
};
syntheticRows=E.normalizeFeeds([{kind:'football',path:'synthetic-football.json',document:simulatedFootball}],comparisonTime);
syntheticNapoli=syntheticRows.find(row=>row.name==='Synthetic Napoli vs Synthetic Lazio');
assert.equal(syntheticNapoli.seasonComparison.prob_away,.47);
assert.equal(syntheticNapoli.choices[0].probability,.46,'original model must not be overwritten');
simulatedFootball.upcoming_fixtures[0].current_season_comparison.prob_away=1.47;
syntheticRows=E.normalizeFeeds([{kind:'football',path:'synthetic-football.json',document:simulatedFootball}],comparisonTime);
syntheticNapoli=syntheticRows.find(row=>row.name==='Synthetic Napoli vs Synthetic Lazio');
assert.equal(syntheticNapoli.seasonComparison,null,'invalid season comparison is not presented');
