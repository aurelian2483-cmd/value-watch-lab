// Read an existing descriptive performance report, without scoring or promotion.
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import {createHash} from 'node:crypto'
const digest=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex')
const natural=n=>Number.isSafeInteger(n)&&n>=0
const unavailable=reason=>({available:false,reason,matchedPairs:null,reportGeneratedAt:null,calibrationEstablished:false,executionAuthorized:false})
export function alphaPerformance(root){
 try {
   const read=path=>JSON.parse(readFileSync(join(root,path),'utf8'))
   const ledger=read('prediction-ledger.json'),outcomes=read('results-feed.json'),review=read('research/result-review-status.json')
   const report=read('research/performance-report-latest.json')
   if(ledger.schemaVersion!==1||ledger.kind!=='PROSPECTIVE_PREDICTION_LEDGER'||ledger.modelValidated!==false||
      !Array.isArray(ledger.records)||outcomes.schemaVersion!==1||outcomes.kind!=='VERIFIED_OUTCOME_FEED'||!Array.isArray(outcomes.records)||
      review.schema_version!==1||review.research_only!==true||review.model_validation!=='UNVALIDATED'||review.publication_gate!=='BLOCKED'||
      report.schema_version!==1||report.kind!=='INDEPENDENT_RESEARCH_PERFORMANCE_V1'||report.research_only!==true||
      report.model_validation!=='UNVALIDATED'||report.publication_gate!=='BLOCKED'||report.verified_betting_value!==false||
      report.verified_roi!==false||!Number.isFinite(Date.parse(report.generated_at_utc)))
     return unavailable('UNSUPPORTED_CONTRACT')
   const expected=digest({predictions:ledger.records,results:outcomes.records,review:review.status_counts,reviewTime:review.generated_at_utc})
   if(expected!==report.evidence_sha256||report.forecast_records!==ledger.records.length||report.outcome_archive_records!==outcomes.records.length)
     return unavailable('SOURCE_REPORT_MISMATCH')
   const n=report.contract_matched_pairs
   if(!natural(n)||n>ledger.records.length||(n>0&&outcomes.records.length===0)||
     !['NO_PAIRED_RESULTS','DESCRIPTIVE_RESULTS_ONLY'].includes(report.verdict)||
     (n===0)!==(report.verdict==='NO_PAIRED_RESULTS'))return unavailable('INCONSISTENT_REPORT')
   return {available:true,reason:n===0?'NO_PAIRED_RESULTS':'DESCRIPTIVE_REPORT_ONLY',matchedPairs:n,
     reportGeneratedAt:report.generated_at_utc,sourceFingerprint:expected,calibrationEstablished:false,
     executionAuthorized:false,researchOnly:true,publicationGate:'BLOCKED',
     notice:'Source matching is not provider authentication, independent statistical validation or evidence of a financial advantage.'}
 }catch(e){return unavailable(e.code==='ENOENT'?'SOURCE_MISSING':'SOURCE_UNREADABLE_OR_INVALID')}
}
