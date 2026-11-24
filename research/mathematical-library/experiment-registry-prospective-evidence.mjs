import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import {createHash} from 'node:crypto'
const hash = b => createHash('sha256').update(b).digest('hex')
const sha = s => typeof s==='string' && /^[a-f0-9]{64}$/.test(s)
const nonempty = s => typeof s==='string' && s.trim().length>0
const utc = s => typeof s==='string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(s) && Number.isFinite(Date.parse(s))
const https = s => {try {const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password}catch{return false}}
function source(root,path){
 const bytes=readFileSync(join(root,path))
 return {path,sha256:hash(bytes),data:JSON.parse(bytes)}
}
function validPrediction(r){
 if(!r||r.research_only!==true||r.model_validated!==false||
    ![r.prediction_id,r.event_id,r.model_version,r.market].every(nonempty)||
    ![r.snapshot_sha256,r.source_fingerprint,r.training_fingerprint].every(sha)||
    !https(r.source_url)||![r.recorded_at_utc,r.event_start_utc,r.source_observed_at_utc].every(utc)||
    Date.parse(r.source_observed_at_utc)>Date.parse(r.recorded_at_utc)||
    Date.parse(r.recorded_at_utc)>=Date.parse(r.event_start_utc)||
    !Array.isArray(r.participant_ids)||r.participant_ids.length!==2||
    !r.participant_ids.every(nonempty)||new Set(r.participant_ids).size!==2||
    !r.probabilities||Object.getPrototypeOf(r.probabilities)!==Object.prototype) return false
 const keys=r.sport==='tennis'&&r.market==='MATCH_WINNER'?r.participant_ids:
   r.sport==='nfl'&&r.market==='GAME_RESULT_INCLUDING_OVERTIME'?[...r.participant_ids,'tie']:null
 if(!keys||new Set(keys).size!==keys.length||Object.keys(r.probabilities).length!==keys.length||
    !keys.every(k=>Object.hasOwn(r.probabilities,k))) return false
 const p=Object.values(r.probabilities)
 return p.every(v=>typeof v==='number'&&Number.isFinite(v)&&v>0&&v<1)&&Math.abs(p.reduce((a,b)=>a+b,0)-1)<=1e-8
}
export function inventoryProspective(root){
 const ledger=source(root,'prediction-ledger.json')
 const outcomes=source(root,'results-feed.json')
 const reviews=source(root,'research/result-review-status.json')
 if(ledger.data.schemaVersion!==1||ledger.data.kind!=='PROSPECTIVE_PREDICTION_LEDGER'||
    ledger.data.modelValidated!==false||!Array.isArray(ledger.data.records)||
    outcomes.data.schemaVersion!==1||outcomes.data.kind!=='VERIFIED_OUTCOME_FEED'||!Array.isArray(outcomes.data.records)||
    reviews.data.schema_version!==1||reviews.data.research_only!==true||reviews.data.model_validation!=='UNVALIDATED'||
    reviews.data.publication_gate!=='BLOCKED'||!utc(reviews.data.generated_at_utc)||!Array.isArray(reviews.data.items))
   throw new Error('Unsupported prospective evidence contract')
 const grouped=new Map()
 let rejected=0
 for(const r of ledger.data.records){
   if(!validPrediction(r)){rejected++;continue}
   const group=grouped.get(r.prediction_id)??[]
   group.push(r);grouped.set(r.prediction_id,group)
 }
 const accepted=new Map()
 let duplicateOrConflict=0
 for(const [id,group] of grouped){
   if(group.length!==1){duplicateOrConflict+=group.length;continue}
   accepted.set(id,group[0])
 }
 const reviewGroups=new Map()
 for(const row of reviews.data.items){
   if(!row||!nonempty(row.prediction_id))continue
   const group=reviewGroups.get(row.prediction_id)??[]
   group.push(row);reviewGroups.set(row.prediction_id,group)
 }
 const statusCounts=Object.create(null)
 const allowed=new Set(['READY_FOR_HUMAN_REVIEW','AWAITING_PRIMARY_FINAL','AWAITING_INDEPENDENT_SOURCE','AWAITING_EVENT','SECONDARY_INVALID','SECONDARY_CONFLICT','IDENTITY_CONFLICT','ARCHIVE_INVALID'])
 let matchedReview=0
 for(const [id,p] of accepted){
   const group=reviewGroups.get(id)
   if(!group||group.length!==1)continue
   const r=group[0]
   if(r.sport!==p.sport||r.event_id!==p.event_id||r.event_start_utc!==p.event_start_utc||
      r.auto_certified!==false||r.betting_eligible!==false||!allowed.has(r.review_state))continue
   matchedReview++
   statusCounts[r.review_state]=(statusCounts[r.review_state]??0)+1
 }
 return {schemaVersion:1,kind:'PROSPECTIVE_EVIDENCE_INVENTORY',
   sources:[ledger,outcomes,reviews].map(({path,sha256})=>({path,sha256})),
   counts:{predictionInput:ledger.data.records.length,structurallyAccepted:accepted.size,rejected,duplicateOrConflict,
     reviewInput:reviews.data.items.length,matchedReview,unmatchedAccepted:accepted.size-matchedReview,
     outcomeFeedInput:outcomes.data.records.length},
   reviewStatusCounts:statusCounts,reviewGeneratedAt:reviews.data.generated_at_utc,
   researchOnly:true,publicationGate:'BLOCKED',executionAuthorized:false,validationAuthorized:false,
   limitations:['Structural checks are not authentication or independent verification.',
     'Review states are source-reported claims; no settlement is certified here.',
     'Outcome feed rows are counted only; this inventory does not certify or match them.',
     'Only existing tennis and NFL prediction contracts are supported.']}
}
