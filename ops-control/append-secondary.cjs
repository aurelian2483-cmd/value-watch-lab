'use strict';
// Adds a distinct secondary-source evidence section to the scheduled Director report.
// No modification to any racing source snapshot, research model or betting output.
const fs=require('node:fs');
function format(r){
 const x=r?.sourceCheck||{},date=r?.raceDateUK||'unknown';
 const lines=['','## Secondary racing meeting cross-check','- UK date: '+date,'- Secondary source: '+(r?.secondarySource||'unavailable'),'- Evidence status: **'+(x.status||'UNKNOWN')+'**','- Director decision: **RETAIN P2 — full coverage not independently certified**'];
 if(x.receipt?.observedAt)lines.push('- Observation (UTC): '+x.receipt.observedAt);
 if(x.receipt?.sha256)lines.push('- Source SHA-256: '+x.receipt.sha256);
 if(Number.isInteger(x.secondaryActive))lines.push('- Secondary active meetings: '+x.secondaryActive);
 if(x.secondaryAbandoned?.length)lines.push('- Explicitly reported abandoned meetings: '+x.secondaryAbandoned.join(', '));
 if(x.missing?.length)lines.push('- **Potential missing active meetings (investigate):** '+x.missing.join(', '));
 if(x.unexpected?.length)lines.push('- **Primary-only meetings (investigate):** '+x.unexpected.join(', '));
 if(x.raceCountMismatches?.length)lines.push('- **Race counts need review:** '+x.raceCountMismatches.map(z=>z.meeting+': '+z.primary+' vs '+z.secondary).join('; '));
 if(x.reason)lines.push('- Limitation: '+String(x.reason).replace(/[\r\n|]/g,' ').slice(0,300));
 lines.push('- A matching list does not establish complete declarations, confirmed runners, true live odds or a betting edge.','');
 return lines.join('\n');
}
function append(reportDir){
 const file=reportDir+'/racing-secondary.json',md=reportDir+'/briefing.md',json=reportDir+'/report.json';
 const sec=JSON.parse(fs.readFileSync(file,'utf8'));
 fs.appendFileSync(md,format(sec));
 const report=JSON.parse(fs.readFileSync(json,'utf8'));report.secondaryRacingCoverage=sec.sourceCheck;
 fs.writeFileSync(json,JSON.stringify(report,null,2)+'\n');
 if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,format(sec));
}
if(require.main===module)append(process.argv[2]||'ops-control/out');
module.exports={format,append};
