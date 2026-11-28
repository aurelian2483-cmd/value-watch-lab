// Historical evidence inventory only. No prediction generation or validation promotion.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'

const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const nonempty = s => typeof s === 'string' && s.trim().length > 0
const utc = s => typeof s === 'string' && /Z$/.test(s) && Number.isFinite(Date.parse(s))
function https(s) {
  try { const u=new URL(s); return u.protocol==='https:' && !u.username && !u.password }
  catch { return false }
}
export function inventoryHistorical(root) {
  const bytes=readFileSync(join(root,'historical-reliability-data.json'))
  const data=JSON.parse(bytes)
  if(data.schema_version!==1 || data.research_only!==true ||
     data.model_validation!=='UNVALIDATED' || data.publication_gate!=='BLOCKED' ||
     data.source_verification!=='SINGLE_SOURCE_UNVERIFIED' ||
     !utc(data.generated_at_utc) || !Array.isArray(data.results))
    throw new Error('Unsupported historical evidence contract')
  const groups=new Map()
  let rejected=0,duplicates=0,conflicting=0
  for(const row of data.results){
    if(!row || ![row.competition,row.home,row.away,row.upstream_provider].every(nonempty) ||
       row.home.trim()===row.away.trim() || !utc(row.kickoff_utc) ||
       row.time_precision!=='DATE_ONLY_END_OF_DAY' || !https(row.source_url) ||
       ![row.score_home,row.score_away].every(n=>Number.isSafeInteger(n)&&n>=0) ||
       row.actual_outcome!==(row.score_home>row.score_away?'H':row.score_home<row.score_away?'A':'D')){
      rejected++; continue
    }
    const key=JSON.stringify([row.competition,row.home,row.away,row.kickoff_utc.slice(0,10)])
    const signature=JSON.stringify([row.score_home,row.score_away,row.actual_outcome])
    const group=groups.get(key)??{competition:row.competition,signatures:new Set(),count:0}
    group.signatures.add(signature);group.count++;groups.set(key,group)
  }
  const competitions=Object.create(null)
  let accepted=0
  for(const group of groups.values()){
    if(group.signatures.size>1){conflicting+=group.count;continue}
    accepted++;duplicates+=group.count-1
    competitions[group.competition]=(competitions[group.competition]??0)+1
  }
  return {schemaVersion:1,kind:'HISTORICAL_EVIDENCE_INVENTORY',source:'historical-reliability-data.json',
    sourceSha256:sha(bytes),observedAt:data.generated_at_utc,
    evidenceTier:'SINGLE_SOURCE_UNVERIFIED',timePrecision:'DATE_ONLY_END_OF_DAY',
    counts:{input:data.results.length,accepted,duplicates,conflicting,rejected},
    competitions,researchOnly:true,publicationGate:'BLOCKED',
    prospectiveEligible:false,validationEligible:false,executionAuthorized:false,
    limitations:['Date-only records are not exact event timestamps.',
      'Identity grouping uses source-native names and dates, not certified cross-provider IDs.',
      'Accepted means structurally consistent inventory record, not independently verified result.',
      'Source availability at a historical prediction cutoff and reuse rights are not established by this inventory.']}
}
