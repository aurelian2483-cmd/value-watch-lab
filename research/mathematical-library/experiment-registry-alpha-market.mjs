import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import {createHash} from 'node:crypto'
import FootballMatchEvidence from '../../football-match/core.js'
import {summarizeDisagreement} from './experiment-registry-alpha-disagreement.mjs'

const paths=['paper-lab/hybrid-market-data.json','research-dashboard-data.json','football-expanded-data.json']
const unavailable=reason=>({available:false,reason,counts:null,sources:[],researchOnly:true,publicationGate:'BLOCKED',executionAuthorized:false})
export function alphaMarket(root,asOf=Date.now()){
 if(!Number.isFinite(asOf))return unavailable('INVALID_AS_OF')
 try{
  const files=paths.map(path=>{
   const bytes=readFileSync(join(root,path))
   return {path,sha256:createHash('sha256').update(bytes).digest('hex'),data:JSON.parse(bytes)}
  })
  const [market,...fixtures]=files
  if(market.data.schema_version!==1||!Array.isArray(market.data.records)||
   fixtures.some(({data:d})=>d.schema_version!==1||d.research_only!==true||
    d.model_validation!=='UNVALIDATED'||d.publication_gate!=='BLOCKED'||
    !Array.isArray(d.upcoming_fixtures)||!Number.isFinite(Date.parse(d.generated_at_utc))||Date.parse(d.generated_at_utc)>asOf))
    return unavailable('UNSUPPORTED_OR_FUTURE_SOURCE')
  const index=FootballMatchEvidence.fixtureIndex(fixtures.map(f=>f.data),asOf)
  const result=FootballMatchEvidence.verifyMarkets(market.data,index,asOf)
  const matches=result.matches.filter(m=>m.sourceHistories.length>0)
  const histories=matches.flatMap(m=>m.sourceHistories)
  const sourceCounts=Object.create(null)
  for(const h of histories) sourceCounts[h.sourceId]=(sourceCounts[h.sourceId]??0)+h.observationCount
  return {available:true,reason:histories.length?'ARCHIVED_OBSERVATIONS_ONLY':'NO_MATCHED_OBSERVATIONS',
   disagreement:summarizeDisagreement(matches,asOf),
   counts:{archiveRows:market.data.records.length,matchedFixtures:matches.length,
    sourceHistories:histories.length,observations:histories.reduce((sum,h)=>sum+h.observationCount,0),
    withheldItems:result.withheld},sourceCounts,
   collectionState:typeof result.collectionStatus?.state==='string'?result.collectionStatus.state:null,
   sources:files.map(({path,sha256})=>({path,sha256})),
   asOf:new Date(asOf).toISOString(),researchOnly:true,publicationGate:'BLOCKED',executionAuthorized:false,
   limitations:['Football regulation-time archive only; current fixture coverage may exclude older captures.',
    'Existing verifier checks stored evidence metadata, not independent provider authenticity.',
    'Source counts are observations, not unique events; withheld items are not archive-row counts.',
    'Only unsigned aggregate distribution distances are exposed; no price values, executable quotes or selections.']}
 }catch(e){return unavailable(e.code==='ENOENT'?'SOURCE_MISSING':'SOURCE_UNREADABLE_OR_INVALID')}
}
