'use strict';
// Read-only CI presentation of the production-engine coverage report.
const fs=require('node:fs');
function summary(report){
  if(!report||report.research_only!==true||report.model_validation!=='UNVALIDATED'||report.publication_gate!=='BLOCKED')throw Error('Invalid research safety gates');
  const rows=report.shortlist_diagnostics?.coverage,slips=report.shortlist_diagnostics?.slips;
  if(!Array.isArray(rows)||rows.length!==4||!Array.isArray(slips)||slips.length!==4)throw Error('Missing four-sport diagnostics');
  const clean=value=>String(value??'').replace(/[|\r\n]/g,' ').slice(0,160);
  const lines=['## Cardano paper slip source-to-selection diagnostic','','Research-only · Models UNVALIDATED · Publication BLOCKED','','### Seven-day sport coverage','','| Sport | In range | Selectable | Evidence eligible | Classification |','|---|---:|---:|---:|---|'];
  for(const row of rows)lines.push('| '+[row.sport,row.inRange,row.selectable,row.eligible,row.diagnostic].map(clean).join(' | ')+' |');
  lines.push('','### Four paper approaches','','| Approach | Selections | Sports | Status |','|---|---:|---|---|');
  for(const slip of slips)lines.push('| '+[slip.approach,slip.selections,Object.entries(slip.sports||{}).map(([k,v])=>k+': '+v).join(', ')||'none',slip.status].map(clean).join(' | ')+' |');
  lines.push('','### Exclusion reasons');
  for(const row of rows){const reasons=Object.entries(row.exclusionReasons||{});lines.push('- **'+clean(row.sport)+'**: '+(reasons.length?reasons.map(([reason,count])=>clean(reason)+' ('+count+')').join('; '):'No recorded exclusion reasons'));}
  lines.push('','This report uses repository snapshot files, not live browser data. A missing selection is not proof of a defect or a validated betting signal.');
  return lines.join('\n')+'\n';
}
module.exports={summary};
if(require.main===module){
  const report=JSON.parse(fs.readFileSync(process.argv[2]||'cardano-sports-coverage.json','utf8'));
  const output=summary(report);
  process.stdout.write(output);
  if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,output);
}
