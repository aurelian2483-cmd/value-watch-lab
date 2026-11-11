'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {report}=require('../scripts/sports_coverage_report.cjs');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'cardano-coverage-'));
const now=Date.parse('2026-11-11T12:00:00Z');
try{
  fs.writeFileSync(path.join(tmp,'research-dashboard-data.json'),'{invalid json');
  fs.mkdirSync(path.join(tmp,'racing-research'));
  fs.writeFileSync(path.join(tmp,'racing-research','source-observations.json'),JSON.stringify({entries:[]}));
  const result=report('2026-11-11','2026-11-17',now,tmp);
  assert.equal(result.publication_gate,'BLOCKED');
  assert.equal(result.shortlist_diagnostics.coverage.length,4);
  assert(result.source_read_errors.some(x=>x.path==='research-dashboard-data.json'&&x.reason==='SOURCE_FILE_UNREADABLE'));
  assert(result.source_read_errors.some(x=>x.path==='other-sports-data.json'&&x.reason==='SOURCE_FILE_MISSING'));
  assert.equal(result.snapshots.length,0);
  assert(result.shortlist_diagnostics.coverage.every(x=>x.eligible===0));
  fs.writeFileSync(path.join(tmp,'racing-research','source-observations.json'),'{}');
  const missingArchive=report('2026-11-11','2026-11-17',now,tmp);
  assert(missingArchive.source_read_errors.some(x=>x.reason==='COMMUNITY_ARCHIVE_UNAVAILABLE'));
  console.log('PASS isolated malformed, missing, and invalid community archive diagnostics');
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
