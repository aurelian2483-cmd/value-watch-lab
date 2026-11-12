'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const context={window:{},URL};vm.runInNewContext(fs.readFileSync('paper-lab/evidence-v3.js','utf8'),context);
const E=context.window.ValueWatchEvidenceV3;
const now=Date.parse('2026-11-09T19:00:00Z'),url='https://www.sportinglife.com/racing/racecards/2026-11-10/test/racecard/12/test';
const receipt={status:'EXPLICIT_FIRST_CHOICE_OBSERVED',rank:1,race_id:'12',startUTC:'2026-11-10T13:00:00Z',horse_id:'7',horse:'Example',url,sha256:'a'.repeat(64),verdict_sha256:'b'.repeat(64),observed_at_utc:'2026-11-09T18:59:00Z'};
const event={sport:'racing',providerEventId:'12',startUTC:receipt.startUTC,publisherVerdict:{...receipt},choices:[{id:'7',label:'Example',quote:{decimal:2,observedAt:receipt.observed_at_utc,source:url,bookmaker:'Sky Bet',status:'SOURCE_OBSERVED_UNVERIFIED',executable:false}},{id:'8',label:'Other',quote:{decimal:4,observedAt:receipt.observed_at_utc,source:url,bookmaker:'Sky Bet',status:'SOURCE_OBSERVED_UNVERIFIED',executable:false}}]};
const entry={extraction_method:'RANKED_RACECARD_VERDICT_V1',verification:'PUBLIC_SELECTION_OBSERVED',url,horse:'Example',observed_at_utc:receipt.observed_at_utc,selection_receipt:receipt};
const proof=E.selectionAvailability(entry,event,now);assert.equal(proof.preRaceAvailabilityVerified,true);
event.communityTips=[{choiceId:'7',type:'tipster',sourceUrl:url,sourceIdentity:'publisher:timeform',observedAt:receipt.observed_at_utc,publishedAt:null,...proof}];
assert.equal(E.evaluate(event,event.choices[0],now).yellow,'EXPERIMENTAL_AGREEMENT');
for(const change of [{horse_id:'8'},{sha256:'c'.repeat(64)},{observed_at_utc:'2026-11-10T14:00:00Z'},{rank:2},{url:'https://example.org/12'}]){
 const altered={...entry,selection_receipt:{...receipt,...change}};
 assert.equal(E.selectionAvailability(altered,event,now).preRaceAvailabilityVerified,false);
}
event.publisherVerdict={...receipt,horse_id:'8',horse:'Other'};
assert.equal(E.selectionAvailability(entry,event,now).preRaceAvailabilityVerified,false);
console.log('Ranked verdict availability, unknown publication time, exact receipt binding and changed-source withdrawal passed');
