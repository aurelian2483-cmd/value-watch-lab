import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,mkdirSync,rmSync,writeFileSync,readFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {inventoryProspective} from './experiment-registry-prospective-evidence.mjs'
const prediction={prediction_id:'example',sport:'tennis',event_id:'e1',model_version:'v1',market:'MATCH_WINNER',recorded_at_utc:'2026-11-15T12:00:00Z',event_start_utc:'2026-11-16T12:00:00Z',source_observed_at_utc:'2026-11-15T11:00:00Z',snapshot_sha256:'a'.repeat(64),source_fingerprint:'b'.repeat(64),training_fingerprint:'c'.repeat(64),source_url:'https://example.org',participant_ids:['a','b'],probabilities:{a:0.6,b:0.4},research_only:true,model_validated:false}
const review={prediction_id:'example',sport:'tennis',event_id:'e1',event_start_utc:prediction.event_start_utc,review_state:'READY_FOR_HUMAN_REVIEW',auto_certified:false,betting_eligible:false}
function setup(t,records=[prediction],items=[review]){
 const root=mkdtempSync(join(tmpdir(),'vw-prospective-'))
 t.after(()=>rmSync(root,{recursive:true,force:true}))
 mkdirSync(join(root,'research'))
 writeFileSync(join(root,'prediction-ledger.json'),JSON.stringify({schemaVersion:1,kind:'PROSPECTIVE_PREDICTION_LEDGER',modelValidated:false,records}))
 writeFileSync(join(root,'results-feed.json'),JSON.stringify({schemaVersion:1,kind:'VERIFIED_OUTCOME_FEED',records:[]}))
 writeFileSync(join(root,'research/result-review-status.json'),JSON.stringify({schema_version:1,research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED',generated_at_utc:'2026-11-24T02:00:00Z',items}))
 return root
}
test('matches review identity without certifying or rewriting source',t=>{
 const root=setup(t)
 const before=readFileSync(join(root,'prediction-ledger.json'))
 const r=inventoryProspective(root)
 assert.equal(r.counts.structurallyAccepted,1)
 assert.equal(r.counts.matchedReview,1)
 assert.equal(r.reviewStatusCounts.READY_FOR_HUMAN_REVIEW,1)
 assert.equal(r.counts.outcomeFeedInput,0)
 assert.equal(r.validationAuthorized,false)
 assert.equal(r.publicationGate,'BLOCKED')
 assert.deepEqual(readFileSync(join(root,'prediction-ledger.json')),before)
})
test('rejects late forecasts, future source observations and malformed probabilities',t=>{
 const root=setup(t,[prediction,{...prediction,prediction_id:'late',recorded_at_utc:prediction.event_start_utc},{...prediction,prediction_id:'future',source_observed_at_utc:prediction.event_start_utc},{...prediction,prediction_id:'bad',probabilities:{a:0.7,b:0.5}}])
 const r=inventoryProspective(root)
 assert.equal(r.counts.structurallyAccepted,1)
 assert.equal(r.counts.rejected,3)
})
test('duplicate prediction IDs and mismatched review identity do not advance evidence',t=>{
 const root=setup(t,[prediction,prediction,{...prediction,prediction_id:'other'}],[{...review,prediction_id:'other',event_id:'wrong'}])
 const r=inventoryProspective(root)
 assert.equal(r.counts.duplicateOrConflict,2)
 assert.equal(r.counts.structurallyAccepted,1)
 assert.equal(r.counts.matchedReview,0)
})
test('checked-in data reconciles without promoting research',()=>{
 const r=inventoryProspective(fileURLToPath(new URL('../../',import.meta.url)))
 assert.equal(r.counts.predictionInput,r.counts.structurallyAccepted+r.counts.rejected+r.counts.duplicateOrConflict)
 assert.equal(r.counts.structurallyAccepted,r.counts.matchedReview+r.counts.unmatchedAccepted)
 assert.equal(r.executionAuthorized,false)
})
