'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs');
const E = require('../paper-lab/engine.js');
const now = Date.parse('2026-11-08T09:00:00Z');
const event = (i, sport = 'tennis') => ({ id:'event-'+i, identity:'identity-'+i, sport, sport_type:E.SPORTS[sport], name:'Synthetic test event '+i, competition:'Test competition', participants:[{id:'a',name:'A'},{id:'b',name:'B'}], startUTC:'2026-11-'+(i%2 ? '09':'08')+'T18:00:00Z', observedAt:'2026-11-08T08:59:00Z', ttlMs:36*3600000, providerStatus:'SCHEDULED', sources:[{url:'https://example.org/event/'+i,kind:'PROVIDER_RECEIPT',observedAt:'2026-11-08T08:59:00Z',sha256:null}], model:{name:'SYNTHETIC_TEST_MODEL',validation:'UNVALIDATED'}, choices:[{id:'a',label:'A',probability:.6,uncertainty:null,market:'Match winner',quote:null},{id:'b',label:'B',probability:.4,uncertainty:null,market:'Match winner',quote:null}],stats:{h2h:null,recent:null,rankings:null} });
let p=E.createPlan({from:'2026-11-08',to:'2026-11-09',createdAt:new Date(now).toISOString()});
assert.equal(p.slots.length,4);assert.equal(p.slots[3].name,'Experimental Longshot');
const a=event(0),b=event(1,'tennis'),c=event(2,'nfl'),events=[a,b,c];
assert.throws(()=>E.addSelection(p,1,event(99,'football'),'a',now),/Current-season football evidence unavailable/,'football selection remains blocked without season evidence');
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
assert(cachedRows.every(row=>row.observedAt==='2026-11-01T00:00:00Z'&&!E.statusOf(row,now).selectable),'a refreshed collector cannot freshen an old cached schedule receipt; filtered stale rows are acceptable');



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
assert(syntheticNapoli?.model,'Synthetic prior-season model must remain visible: '+JSON.stringify({diagnostics:syntheticRows.diagnostics,events:syntheticRows.map(row=>({name:row.name,model:row.model}))}));
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

 
// Four-sport audit must use the exact same candidate gates as automatic generation.
const auditPlan=E.createPlan({from:'2026-11-08',to:'2026-11-09',createdAt:new Date(now).toISOString()});
const footballEligible={...event(201,'football'),seasonComparison:{prob_home:.54,prob_draw:.27,prob_away:.19},choices:[{id:'home',label:'A',probability:.54},{id:'draw',label:'Draw',probability:.27},{id:'away',label:'B',probability:.19}]};
const racingEligible={...event(202,'racing'),fieldConfirmed:true,providerStatus:'DORMANT'};
const fourSports=[footballEligible,racingEligible,event(203,'tennis'),event(204,'nfl')];
const fourAudit=E.paperEligibilityAudit(auditPlan,fourSports,now);
assert.deepEqual(fourAudit.map(row=>[row.sport,row.eligible,row.excluded]),[['football',1,0],['racing',1,0],['tennis',1,0],['nfl',1,0]]);
const fourGenerated=E.generateResearch(auditPlan,fourSports,now);
assert.deepEqual(new Set(fourGenerated.slots[2].legs.map(leg=>leg.sport)),new Set(['football','racing','tennis','nfl']),
  'Cross-Sport Explorer rotates between all eligible sports rather than repeating tennis');
const oneSport=E.generateResearch(auditPlan,[event(205,'tennis')],now);
assert(oneSport.slots.every(slot=>slot.legs.every(leg=>leg.sport==='tennis')),
  'No other sport may be forced when only tennis qualifies');
const exclusions=E.paperEligibilityAudit(auditPlan,[
  event(207,'football'),{...event(208,'racing'),provisionalEntry:true},
  {...event(209,'nfl'),observedAt:'2026-11-01T00:00:00Z'},
  event(210,'tennis')
],now);
assert.equal(exclusions.find(row=>row.sport==='football').reasons['No current-season comparison'],1);
assert.equal(exclusions.find(row=>row.sport==='racing').reasons['Provisional event / declarations'],1);
assert.equal(exclusions.find(row=>row.sport==='nfl').reasons['Unavailable, stale or unconfirmed status'],1);
assert.equal(exclusions.find(row=>row.sport==='tennis').eligible,1);
let savedExplorer=E.addSelection(auditPlan,3,fourSports[2],'a',now);
const originalExplorer=JSON.stringify(savedExplorer);
const snapshotAudit=E.paperEligibilityAudit(savedExplorer,fourSports,now);
assert.equal(snapshotAudit.find(row=>row.sport==='tennis').selected,1);
assert.equal(JSON.stringify(savedExplorer),originalExplorer,'Audit must not mutate browser-local plans');
const keptExplorer=E.generateResearch(savedExplorer,fourSports,now);
assert.deepEqual(keptExplorer.slots[2].legs,savedExplorer.slots[2].legs,
  'Existing manually chosen Cross-Sport Explorer legs must never be replaced');
for(const path of ['index.html','paper-lab/index.html']){
  const content=fs.readFileSync(require('node:path').join(__dirname,'..',path),'utf8');
  assert(content.includes('id="paper-eligibility-audit"'),path+' must expose eligibility disclosure');
  assert(content.includes('engine.js?v=3.4.61'),path+' must load updated engine');
  assert(content.includes('desk.js?v=3.4.62'),path+' must load updated disclosure');
  assert(content.includes('style.css?v=3.4.46'),path+' must load updated styling');
}
console.log('Four-sport eligibility, zero-forced-picks and preserved manual paper plans passed');


// Football form maturity: count only venue-specific current-season observations.
// This is descriptive and must not modify probabilities or auto-selection gates.
const maturityFootball={...event(301,'football'),seasonComparison:{prob_home:.53,prob_draw:.26,prob_away:.21,home_venue_matches:4,away_venue_matches:6}};
const immature=E.footballSeasonMaturity(maturityFootball);
assert.equal(immature.status,'DESCRIPTIVE_ONLY');
assert.equal(immature.homePhase,'EARLY_SMALL_SAMPLE');
assert.equal(immature.awayPhase,'EMERGING_CHECKPOINT');
assert.equal(immature.overallMatchesKnown,false);
assert(immature.notes.some(note=>note.includes('not either team’s total league games')));
assert(immature.notes.some(note=>note.includes('Manager appointments, transfers, injuries')));
const mature=E.footballSeasonMaturity({...maturityFootball,seasonComparison:{...maturityFootball.seasonComparison,home_venue_matches:8,away_venue_matches:7}});
assert.equal(mature.homePhase,'BROADER_VENUE_SAMPLE');
assert.equal(mature.awayPhase,'EMERGING_CHECKPOINT');
assert.equal(E.footballSeasonMaturity({...maturityFootball,seasonComparison:null}).status,'NOT_AVAILABLE');
assert.equal(E.footballSeasonMaturity({...maturityFootball,international:true}),null);
assert.equal(E.footballSeasonMaturity(event(302,'tennis')),null);
assert.equal(JSON.stringify(maturityFootball.seasonComparison),JSON.stringify({prob_home:.53,prob_draw:.26,prob_away:.21,home_venue_matches:4,away_venue_matches:6}),
  'Maturity assessment cannot alter model probabilities or source samples');
const deskAudit=fs.readFileSync(require('node:path').join(__dirname,'..','paper-lab','desk.js'),'utf8');
assert(deskAudit.includes('E.footballSeasonMaturity(event)'), 'Football maturity appears in event card UI');
for(const path of ['index.html','paper-lab/index.html']){
 const html=fs.readFileSync(require('node:path').join(__dirname,'..',path),'utf8');
 assert(html.includes('engine.js?v=3.4.61'),'Updated football engine cache revision required');
 assert(html.includes('desk.js?v=3.4.62'),'Updated football UI cache revision required');
}
console.log('Football venue sample maturity, 5–7 checkpoint and no invented manager or transfer impact passed');


// Source-observed total-league-match form is admitted only with consistent
// pre-kickoff results, correct current-season venue totals and source receipts.
const rawForm={
 method:'SOURCE_OBSERVED_CURRENT_SEASON_FORM_V1',season:'2627',
 home:{completed_league_matches:6,home_matches:4,away_matches:2,
   last_five:[['2026-10-01','W',2,1],['2026-10-02','D',1,1],['2026-10-03','L',0,1],['2026-10-04','W',3,0],['2026-10-05','D',0,0]]
     .map(([date,result,goals_for,goals_against])=>({date,opponent:'Source opponent',venue:'HOME',result,goals_for,goals_against})),
   last_five_points:8,last_five_count:5,first_five_points:null,first_five_count:null},
 away:{completed_league_matches:7,home_matches:2,away_matches:5,
   last_five:Array.from({length:5},(_,i)=>({date:'2026-10-0'+(i+1),opponent:'Other opponent',venue:'AWAY',result:'W',goals_for:2,goals_against:0})),
   last_five_points:15,last_five_count:5,first_five_points:null,first_five_count:null},
 cutoff_date_exclusive:'2026-11-08',
 source_receipts:[{url:'https://www.football-data.co.uk/mmz4281/2627/I1.csv',sha256:'b'.repeat(64),observed_at_utc:'2026-11-08T01:20:00Z'}],
 source_rows_sha256:'a'.repeat(64),
 completeness:'SOURCE_OBSERVED_NOT_INDEPENDENTLY_VERIFIED',
 opponent_strength_adjusted:false,manager_change_evidence:null,transfer_impact_evidence:null,
 manager_pre_post_comparison:null,squad_pre_post_comparison:null,
 research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED',odds:null,expected_value:null
};
const fixtureWithForm=simulatedFootball.upcoming_fixtures[0];
fixtureWithForm.current_season_comparison.prob_away=.47;
fixtureWithForm.current_season_form=rawForm;
function normalizedForm() {
 const rows=E.normalizeFeeds([{kind:'football',path:'synthetic-football.json',document:simulatedFootball}],comparisonTime);
 return rows.find(row=>row.name==='Synthetic Napoli vs Synthetic Lazio');
}
let sourced=normalizedForm();
assert.equal(sourced?.seasonForm?.home.completed_league_matches,6);
assert.equal(sourced.seasonForm.away.completed_league_matches,7);
let maturitySourced=E.footballSeasonMaturity(sourced);
assert.equal(maturitySourced.overallMatchesKnown,true);
assert.equal(maturitySourced.homePhase,'EMERGING_CHECKPOINT');
assert.equal(maturitySourced.awayPhase,'EMERGING_CHECKPOINT');
assert(maturitySourced.notes.some(n=>n.includes('not independently complete')));
assert.equal(sourced.choices[0].probability,.46,'Season research cannot change the independent model prediction');
assert.equal(sourced.publication_gate,'BLOCKED');
rawForm.home.last_five[0].date='2026-11-08';
assert.equal(normalizedForm().seasonForm,null,'A same-day result must be rejected from earlier snapshots');
rawForm.home.last_five[0].date='2026-10-01';
rawForm.source_receipts[0].url='http://unsafe.example/league.csv';
assert.equal(normalizedForm().seasonForm,null,'Unsourced HTTPS evidence is not accepted');
rawForm.source_receipts[0].url='https://www.football-data.co.uk/mmz4281/2627/I1.csv';
rawForm.home.home_matches=5;
assert.equal(normalizedForm().seasonForm,null,'Conflicting venue counts are not silently accepted');
rawForm.home.home_matches=4;
rawForm.manager_change_evidence={manager:'Unverified'};
assert.equal(normalizedForm().seasonForm,null,'Claims of manager changes require separate provenance');
rawForm.manager_change_evidence=null;
assert.equal(normalizedForm().seasonForm.home.completed_league_matches,6);
console.log('Source-observed total season form and safe fallback passed');


// Fresh daily research must use a distinct plan without mutating old captured legs.
const previousDaily=E.addSelection(E.createPlan({from:'2026-11-08',to:'2026-11-09',createdAt:'2026-11-08T08:00:00Z'}),1,event(401,'tennis'),'a',now);
const previousOriginal=JSON.stringify(previousDaily);
const newDaily=E.freshDailyResearch(previousDaily,[event(403,'tennis'),event(404,'nfl')],'2026-11-08','2026-11-14',now);
assert.notEqual(newDaily.id,previousDaily.id);
assert.equal(newDaily.from,'2026-11-08');
assert.equal(newDaily.to,'2026-11-14');
assert(newDaily.slots.some(slot=>slot.legs.some(leg=>leg.eventId==='event-403')));
assert.equal(JSON.stringify(previousDaily),previousOriginal,'Daily refresh cannot rewrite older saved paper selections');
assert(newDaily.slots.every(slot=>slot.legs.every(leg=>leg.research_only===true&&leg.publication_gate==='BLOCKED')));
assert.deepEqual(E.freshDailyResearch(previousDaily,[],'2026-11-08','2026-11-14',now).slots.map(slot=>slot.legs.length),[0,0,0,0]);
assert.throws(()=>E.freshDailyResearch(previousDaily,[],'2026-11-14','2026-11-08',now));
assert.throws(()=>E.freshDailyResearch(previousDaily,[],'2026-11-08','2026-11-14',Date.parse(previousDaily.createdAt)),/distinct identity/);
for(const path of ['index.html','paper-lab/index.html']){
 const html=fs.readFileSync(require('node:path').join(__dirname,'..',path),'utf8');
 assert(html.includes('id="fresh-daily-slips"'),path+' must expose a fresh daily rollover control');
 assert(html.includes('engine.js?v=3.4.61'),path+' must load fresh generator');
 assert(html.includes('desk.js?v=3.4.62'),path+' must load safe refresh controller');
}
const dailyUI=fs.readFileSync(require('node:path').join(__dirname,'..','paper-lab','desk.js'),'utf8');
assert(dailyUI.includes('saveEnvelope({plan:next,history,replacing:null})'),'Archive and new plan must be persisted together');
assert(dailyUI.includes('if (!persistence.write(next)) throw Error'),'Persistence must fail closed');
console.log('Fresh daily paper plan immutability, distinct identity and entrypoint controls passed');
