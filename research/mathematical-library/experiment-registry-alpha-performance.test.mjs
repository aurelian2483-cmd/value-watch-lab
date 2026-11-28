import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,readFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {createHash} from 'node:crypto'
import {alphaPerformance} from './experiment-registry-alpha-performance.mjs'
function setup(t){
 const root=mkdtempSync(join(tmpdir(),'alpha-performance-'))
 t.after(()=>rmSync(root,{recursive:true,force:true}))
 mkdirSync(join(root,'research'))
 const write=(name,value)=>writeFileSync(join(root,name),JSON.stringify(value))
 const ledger={schemaVersion:1,kind:'PROSPECTIVE_PREDICTION_LEDGER',modelValidated:false,records:[]}
 const results={schemaVersion:1,kind:'VERIFIED_OUTCOME_FEED',records:[]}
 const review={schema_version:1,research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED',status_counts:{},generated_at_utc:'2026-11-24T10:00:00Z'}
 const fingerprint=createHash('sha256').update(JSON.stringify({predictions:ledger.records,results:results.records,review:review.status_counts,reviewTime:review.generated_at_utc})).digest('hex')
 const report={schema_version:1,kind:'INDEPENDENT_RESEARCH_PERFORMANCE_V1',research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED',verified_betting_value:false,verified_roi:false,generated_at_utc:'2026-11-24T10:01:00Z',evidence_sha256:fingerprint,forecast_records:0,outcome_archive_records:0,contract_matched_pairs:0,verdict:'NO_PAIRED_RESULTS'}
 write('prediction-ledger.json',ledger);write('results-feed.json',results);write('research/result-review-status.json',review);write('research/performance-report-latest.json',report)
 return {root,write,ledger,report}
}
test('matching zero-pair report is descriptive and never authorises execution',t=>{
 const {root}=setup(t)
 const r=alphaPerformance(root)
 assert.equal(r.available,true)
 assert.equal(r.matchedPairs,0)
 assert.equal(r.calibrationEstablished,false)
 assert.equal(r.executionAuthorized,false)
})
test('changed source records invalidate report fingerprint without rewriting report',t=>{
 const {root,write,ledger}=setup(t)
 const before=readFileSync(join(root,'research/performance-report-latest.json'))
 write('prediction-ledger.json',{...ledger,records:[{synthetic:true}]})
 assert.equal(alphaPerformance(root).reason,'SOURCE_REPORT_MISMATCH')
 assert.deepEqual(readFileSync(join(root,'research/performance-report-latest.json')),before)
})
test('invalid counts and unsafe publication flags fail closed',t=>{
 const {root,write,report}=setup(t)
 write('research/performance-report-latest.json',{...report,contract_matched_pairs:1})
 assert.equal(alphaPerformance(root).reason,'INCONSISTENT_REPORT')
 write('research/performance-report-latest.json',{...report,publication_gate:'OPEN'})
 assert.equal(alphaPerformance(root).available,false)
})
test('missing report is not interpreted as zero matched pairs',t=>{
 const {root}=setup(t)
 rmSync(join(root,'research/performance-report-latest.json'))
 assert.equal(alphaPerformance(root).matchedPairs,null)
 assert.equal(alphaPerformance(root).reason,'SOURCE_MISSING')
})
