'use strict';
const assert=require('node:assert/strict');
const E=require('../paper-lab/engine.js');
const now=Date.parse('2026-11-12T20:00:00Z');
const future='2026-11-15T14:00:00Z';
const outside='2026-11-21T14:00:00Z';
const source={kind:'PROVIDER_RECEIPT',url:'https://www.example.org/observed-fixtures',observedAt:'2026-11-12T19:00:00Z'};
function fixture(sport,name,startUTC,extra={}){
 return {id:sport+'-'+name,sport,name,startUTC,observedAt:'2026-11-12T19:00:00Z',
  sources:[source],ttlMs:sport==='racing'?1800000:129600000,
  choices:[{id:'a',label:'Alpha',probability:.62},{id:'b',label:'Beta',probability:.38}],
  model:{name:'EXPERIMENTAL'},participants:[{id:'a',name:'Alpha'},{id:'b',name:'Beta'}],
  stats:{},providerStatus:sport==='racing'?'DORMANT':'SCHEDULED',
  fieldConfirmed:sport==='racing',...extra};
}
const season={prob_home:.62,prob_draw:.2,prob_away:.18};
const events=[
 fixture('football','Future fixture',outside,{seasonComparison:season}),
 fixture('football','Season comparison missing',future,{seasonComparison:null}),
 fixture('racing','Future declarations',future,{model:null,fieldConfirmed:false,futureScheduleOnly:true}),
 fixture('tennis','Match A',future),
 fixture('nfl','Match B',future,{model:null,choices:[{id:'a',label:'Alpha',probability:null},{id:'b',label:'Beta',probability:null}]}),
 fixture('nfl','Started match','2026-11-12T12:00:00Z')
];
const before=JSON.stringify(events);
const result=E.wildcardCandidateAudit(events,'2026-11-12','2026-11-18',now);
assert.equal(result.kind,'WILDCARD_RESEARCH_CANDIDATE_AUDIT');
assert.equal(result.sports.length,4);
const get=sport=>result.sports.find(x=>x.sport===sport);
assert.equal(get('football').inWindow,1);assert.equal(get('football').outsideWindow,1);
assert.equal(get('football').nextOutside.event,'Future fixture');
assert(get('football').watchlist[0].reasons.includes('CURRENT_SEASON_COMPARISON_MISSING'));
assert.equal(get('racing').inWindow,1);
assert(get('racing').watchlist[0].reasons.includes('DECLARATIONS_PENDING'));
assert.equal(get('tennis').qualifying,1);
assert.equal(get('tennis').watchlist[0].status,'PRELIMINARY_MODEL_LEAD');
assert.equal(get('tennis').watchlist[0].priceVerified,false);
assert.equal(get('tennis').watchlist[0].estimatedEV,null);
assert.equal(get('nfl').blocked,1);assert(get('nfl').watchlist[0].reasons.includes('MODEL_UNAVAILABLE'));
assert.equal(get('nfl').inWindow,1,'Started match cannot appear as upcoming lead');
assert.equal(JSON.stringify(events),before,'Audit is strictly read-only');
assert.equal(result.publicationGate,'BLOCKED');
assert.equal(E.wildcardCandidateAudit([], '2026-11-12','2026-11-18',now).sports.every(x=>x.inWindow===0),true);
console.log('PASS: transparent weekly Wildcard research radar, upcoming vs outside dates, explicit blockers, no invented odds/EV and no mutations');
