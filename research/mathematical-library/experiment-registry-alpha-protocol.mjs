// Protocol registration for research design only; no real-data execution or posterior inference.
import { createHash } from 'node:crypto'
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex')
const hash=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x)
const text=x=>typeof x==='string'&&x.trim().length>0&&x.length<=2000
const utc=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(x)&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString().replace('.000Z','Z')===x
export const estimands=Object.freeze([
 Object.freeze({id:'outcome-probability',definition:'Probability of a specified observable outcome under a specified event and settlement contract.'}),
 Object.freeze({id:'genuine-edge-probability',definition:'Posterior probability of a prespecified population-level advantage hypothesis under an explicit statistical model and evidence definition.'}),
 Object.freeze({id:'persistence-probability',definition:'Probability that the prespecified advantage hypothesis continues to hold in a separately defined future population and time horizon.'})
])
export function registerProtocol(input){
 if(!input||typeof input!=='object'||input.mode!=='RESEARCH_DESIGN_ONLY')throw new Error('Only research design registration permitted')
 const fields=['hypothesis','population','endpoint','baseline','primaryMetric','uncertaintyMethod','multiplicityMethod','dependenceMethod','missingDataPolicy','priorSpecification','likelihoodSpecification','persistenceHypothesis']
 for(const key of fields)if(!text(input[key]))throw new TypeError('Missing or invalid '+key)
 if(!hash(input.developmentManifest)||!hash(input.validationManifest)||input.developmentManifest===input.validationManifest)
  throw new Error('Distinct development and validation manifest references required')
 const dates=['developmentEnd','validationStart','validationEnd','persistenceStart','persistenceEnd']
 if(!dates.every(k=>utc(input[k])))throw new Error('Explicit UTC study boundaries required')
 if(!(input.developmentEnd<input.validationStart&&input.validationStart<input.validationEnd&&input.validationEnd<input.persistenceStart&&input.persistenceStart<input.persistenceEnd))
  throw new Error('Study windows must be strictly chronological and disjoint')
 const specification={schemaVersion:1,mode:'RESEARCH_DESIGN_ONLY',...Object.fromEntries(fields.map(k=>[k,input[k].trim()])),
  developmentManifest:input.developmentManifest,validationManifest:input.validationManifest,
  ...Object.fromEntries(dates.map(k=>[k,input[k]]))}
 return {kind:'ALPHA_RESEARCH_PROTOCOL_DRAFT',protocolId:digest(specification),specification,
  estimands:estimands.map(x=>({...x})),status:'REGISTERED_DESIGN_ONLY',
  researchOnly:true,publicationGate:'BLOCKED',executionAuthorized:false,validationAuthorized:false,
  estimates:{outcomeProbability:null,genuineEdgeProbability:null,persistenceProbability:null},
  limitations:['Registration does not verify source rights, dataset contents, isolation, chronology of individual records or statistical adequacy.',
   'Manifest references must be independently verified before use.',
   'A protocol ID is a content fingerprint, not timestamp attestation or approval.',
   'No data is opened, no model is fitted and no probability is estimated.']}
}
