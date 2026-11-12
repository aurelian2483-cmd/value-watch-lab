'use strict';
const assert=require('node:assert/strict');
const E=require('../paper-lab/engine.js');
const now=Date.parse('2026-11-12T20:00:00Z');
const future='2026-11-14T14:00:00Z';
const source={kind:'PROVIDER_RECEIPT',url:'https://example.com/source',observedAt:'2026-11-12T19:30:00Z'};
function event(sport,id,extra={}){
 return {id,sport,name:id,startUTC:future,observedAt:'2026-11-12T19:30:00Z',
  sources:[source],model:{name:'Experimental Model'},stats:{},ttlMs:129600000,
  choices:[{id:'home',label:'Home',probability:.61},{id:'away',label:'Away',probability:.39}],
  participants:[{id:'home',name:'Home'},{id:'away',name:'Away'}],
  providerStatus:'SCHEDULED',...extra};
}
const season={prob_home:.61,prob_draw:.16,prob_away:.23};
const events=[
 event('football','f1',{seasonComparison:season}),
 event('tennis','t1'),
 event('nfl','n1'),
 event('tennis','t2'),
 event('nfl','n2'),
 event('racing','r-provisional',{provisionalEntry:true,fieldConfirmed:false}),
 event('football','f-no-season',{seasonComparison:null}),
 event('tennis','t-no-model',{model:null}),
 event('nfl','n-old',{startUTC:'2026-11-11T12:00:00Z'})
];
const original=JSON.stringify(events);
const res=E.wildcardRiskStudio(events,'2026-11-12','2026-11-18',now);
assert.equal(res.kind,'WILDCARD_FIFTH_PAPER_SLIP');
assert.equal(res.available,5);
assert.equal(res.modes.length,4);
assert.equal(res.modes.find(x=>x.id==='double').selections.length,2);
assert.equal(res.modes.find(x=>x.id==='treble').available,true);
assert.equal(res.modes.find(x=>x.id==='five').available,true);
assert.equal(res.modes.find(x=>x.id==='seven').available,false);
assert.equal(new Set(res.candidates.map(x=>x.eventId)).size,res.candidates.length);
assert(res.candidates.every(x=>x.priceVerified===false&&x.decimalOdds===null&&x.expectedValue===null));
assert(!res.candidates.some(x=>x.eventId==='r-provisional'||x.eventId==='f-no-season'||x.eventId==='t-no-model'));
assert.equal(res.verifiedCombinedOdds,null);assert.equal(res.combinedProbability,null);
assert.equal(res.publicationGate,'BLOCKED');assert.equal(res.modelValidation,'UNVALIDATED');
assert.equal(JSON.stringify(events),original,'Risk studio must be read-only');
assert.equal(E.wildcardRiskStudio([],'2026-11-12','2026-11-18',now).modes.every(x=>!x.available),true);
console.log('PASS: fifth research slip, independent candidates, risk modes, missing football/racing safeguards, no fabricated price/EV and no model writes');
