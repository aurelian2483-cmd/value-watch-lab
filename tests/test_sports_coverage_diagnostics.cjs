'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const E=require('../paper-lab/engine.js');
const {report}=require('../scripts/sports_coverage_report.cjs');
const now=Date.now(),from=E.day(new Date(now).toISOString()),to=E.day(new Date(now+6*86400000).toISOString());
const source=fs.readFileSync(require.resolve('../scripts/sports_coverage_report.cjs'),'utf8');
assert.match(source,/community\.eligible\(entry,event\)&&entry\.stance==='support'/,'Diagnostic must use the same community eligibility boundary as the browser');
assert.match(source,/paper-lab\/community-evidence\.js/);
const deskSource=fs.readFileSync(require.resolve('../paper-lab/desk.js'),'utf8');
const declared=[...deskSource.matchAll(/'([^']+\.json)': \['(?:football|racing|racing-future|racing-context|other|history)'/g)].map(match=>match[1]).sort();
const reportSpecs=[...source.matchAll(/\['(?:football|racing|racing-future|racing-context|other|history)','([^']+\.json)'\]/g)].map(match=>match[1]).sort();
assert.deepEqual(reportSpecs,declared,'Diagnostic sources must match every production desk source');

assert.match(source,/if\(snapshot\.kind==='racing'\)/);
assert.match(source,/if\(snapshot\.kind==='football'\)/);
assert.match(source,/if\(snapshot\.kind==='other'\)/);
assert.match(source,/return \[\];\s*\}\)\.filter\(event=>typeof event\.start/);
const result=report(from,to,now);
assert.equal(result.research_only,true);
assert.equal(result.model_validation,'UNVALIDATED');
assert.equal(result.publication_gate,'BLOCKED');
assert.deepEqual(result.shortlist_diagnostics.sports.map(row=>row.sport),['football','racing','tennis','nfl']);
assert.equal(result.shortlist_diagnostics.slips.length,4);
assert.equal(result.shortlist_diagnostics.coverage.length,4);
const allowed=new Set(['NO_NORMALIZED_EVENTS_IN_RANGE','NO_SELECTABLE_EVENTS_IN_RANGE','SELECTABLE_BUT_NOT_EVIDENCE_ELIGIBLE','ELIGIBLE_CANDIDATES_AVAILABLE']);
for(const row of result.shortlist_diagnostics.coverage){
  assert(allowed.has(row.diagnostic));
  assert(['NO_ELIGIBLE_CANDIDATES','REPRESENTED_IN_SLIPS','ELIGIBLE_BUT_NOT_SELECTED'].includes(row.selectionDiagnostic));
  assert.equal(row.selectionDiagnostic==='NO_ELIGIBLE_CANDIDATES',row.eligible===0);
  if(row.selectionDiagnostic==='ELIGIBLE_BUT_NOT_SELECTED')assert.equal(row.selectedInAnySlip,false);
  if(row.selectionDiagnostic==='REPRESENTED_IN_SLIPS')assert.equal(row.selectedInAnySlip,true);
  assert(row.normalized>=row.inRange);
  assert(row.inRange>=row.selectable);
  assert(row.eligible<=row.selectable);
  if(row.diagnostic==='ELIGIBLE_CANDIDATES_AVAILABLE')assert(row.eligible>0);
  if(row.diagnostic==='SELECTABLE_BUT_NOT_EVIDENCE_ELIGIBLE')assert(row.selectable>0&&row.eligible===0);
}

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
