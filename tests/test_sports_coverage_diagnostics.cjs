'use strict';
const assert=require('node:assert/strict');
const E=require('../paper-lab/engine.js');
const {report}=require('../scripts/sports_coverage_report.cjs');
const now=Date.now(),from=E.day(new Date(now).toISOString()),to=E.day(new Date(now+6*86400000).toISOString());
const result=report(from,to,now);
assert.equal(result.research_only,true);
assert.equal(result.model_validation,'UNVALIDATED');
assert.equal(result.publication_gate,'BLOCKED');
assert.deepEqual(result.shortlist_diagnostics.sports.map(row=>row.sport),['football','racing','tennis','nfl']);
assert.equal(result.shortlist_diagnostics.slips.length,4);
for(const row of result.shortlist_diagnostics.sports){
  assert(Number.isInteger(row.eligible)&&row.eligible>=0);
  assert(Number.isInteger(row.excluded)&&row.excluded>=0);
  assert(Object.values(row.reasons).every(n=>Number.isInteger(n)&&n>0));
}
for(const slot of result.shortlist_diagnostics.slips){
  assert(slot.selections>=0&&slot.selections<=15);
  assert.equal(Object.values(slot.sports).reduce((a,b)=>a+b,0),slot.selections);
}
console.log('PASS production four-sport diagnostic contract; source counts may be zero');
