import {test} from 'node:test'
import {createHash} from 'node:crypto'
import assert from 'node:assert/strict'
import {mkdtempSync,rmSync,realpathSync,readdirSync,writeFileSync,symlinkSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {runSuite} from './suite.mjs'
import {persistSuite} from './persistence.mjs'
import {runParallel} from './parallel.mjs'
import {consolidate,readStatus,renderStatus} from './status.mjs'
const rev='a6577d60cdc87dcfe610ca6ec71f1effa70f157e'
test('read-only adapter reconciles real synthetic outputs and rejects inconsistent reports',async t=>{
 const d=realpathSync(mkdtempSync(join(tmpdir(),'synthetic-status-')));t.after(()=>rmSync(d,{recursive:true,force:true}))
 const b=runSuite(rev),p=persistSuite(d,rev),c=await runParallel(rev,{workers:1})
 // Unit-test reference fixture. Actual Python output is checked separately by CI.
 const ref={kind:'INDEPENDENT_SYNTHETIC_REFERENCE_CHECK',schemaVersion:1,declaredCodeRevision:rev,benchmarkReportSha256:b.reportSha256,
  results:b.results.map(r=>({id:r.id,status:r.status})),counts:b.counts,researchOnly:true,publicationGate:'BLOCKED',executionAuthorized:false,validationAuthorized:false}
 const bundle=[b,ref,p,c]
 const s=consolidate(bundle,rev)
 assert.equal(s.status,'SYNTHETIC_QA_PASSED')
 assert.equal(s.checks.parallel.passed,5)
 assert.equal(s.validationAuthorized,false)
 assert.match(renderStatus(s),/PUBLICATION BLOCKED/)
 for(const tamper of [
  [b,{...ref,benchmarkReportSha256:'a'.repeat(64)},p,c],
  [b,ref,{...p,records:p.records.slice(1)},c],
  [b,ref,p,{...c,peakActiveWorkers:5}],
  [b,ref,p,{...c,executionAuthorized:true}],
  [{...b,counts:{total:5,passed:4,failed:1}},ref,p,c]
 ])assert.equal(consolidate(tamper,rev).checks,null)
 for(const invalid of [null,{},new Array(4)])assert.equal(consolidate(invalid,rev).checks,null)
 const forged=structuredClone(b);forged.results[0].expected=99
 const {reportSha256:oldHash,...payload}=forged;forged.reportSha256=createHash('sha256').update(JSON.stringify(payload)).digest('hex')
 const cpu=structuredClone(c);cpu.results[0].observed=forged.results[0];cpu.benchmarkReportSha256=forged.reportSha256
 assert.equal(consolidate([forged,{...ref,benchmarkReportSha256:forged.reportSha256},{...p,benchmarkReportSha256:forged.reportSha256},cpu],rev).checks,null)
 const badWorker=structuredClone(c);badWorker.results[0].workerStatus='TIMEOUT'
 assert.equal(consolidate([b,ref,p,badWorker],rev).checks,null)
})
test('missing evidence remains unknown and reader does not write',t=>{
 const d=realpathSync(mkdtempSync(join(tmpdir(),'synthetic-status-empty-')));t.after(()=>rmSync(d,{recursive:true,force:true}))
 const s=readStatus(d,rev)
 assert.equal(s.status,'EVIDENCE_INCOMPLETE_OR_INCONSISTENT')
 assert.equal(s.checks,null)
 assert.match(renderStatus(s),/Unavailable/)
 assert.deepEqual(readdirSync(d),[])
})
