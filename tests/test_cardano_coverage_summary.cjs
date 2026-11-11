'use strict';
const assert=require('node:assert/strict');
const {summary}=require('../scripts/cardano_coverage_summary.cjs');
const sports=['football','racing','tennis','nfl'];
const fixture={
  research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED',
  shortlist_diagnostics:{
    coverage:sports.map((sport,i)=>({
      sport,inRange:4,selectable:3,eligible:i===0?2:0,
      diagnostic:i===0?'ELIGIBLE_CANDIDATES_AVAILABLE':'SELECTABLE_BUT_NOT_EVIDENCE_ELIGIBLE',
      selectionDiagnostic:i===0?'ELIGIBLE_BUT_NOT_SELECTED':'NO_ELIGIBLE_CANDIDATES',
      exclusionReasons:i===0?{'No current-season comparison':2}:{'No eligible experimental outcome':3}
    })),
    slips:['best-evidence','balanced','explorer','longshot'].map(approach=>({
      approach,selections:0,sports:{},status:'INSUFFICIENT_DISTINCT_EVIDENCE'
    }))
  }
};
const output=summary(fixture);
assert.match(output,/ELIGIBLE_BUT_NOT_SELECTED/);
assert.match(output,/SELECTABLE_BUT_NOT_EVIDENCE_ELIGIBLE/);
assert.match(output,/No current-season comparison \(2\)/);
assert.match(output,/Research-only · Models UNVALIDATED · Publication BLOCKED/);
assert.equal((output.match(/INSUFFICIENT_DISTINCT_EVIDENCE/g)||[]).length,4);
assert.throws(()=>summary({...fixture,publication_gate:'OPEN'}),/safety gates/);
assert.throws(()=>summary({...fixture,shortlist_diagnostics:{coverage:[],slips:[]}}),/four-sport diagnostics/);
console.log('PASS synthetic coverage summary output and safety gates');
