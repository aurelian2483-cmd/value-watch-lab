import { evidenceView } from './experiment-registry-evidence-view.mjs'
import { alphaPerformance } from './experiment-registry-alpha-performance.mjs'
import { alphaMarket } from './experiment-registry-alpha-market.mjs'
import { falseEdgeReadiness } from './experiment-registry-alpha-false-edge.mjs'
import { researchDecision } from './experiment-registry-alpha-decision.mjs'
import { estimands } from './experiment-registry-alpha-protocol.mjs'
import { pathToFileURL } from 'node:url'


export function alphaReadiness(root,directory){
 const view=evidenceView(root,directory,'alpha-hunt')
 const performance=alphaPerformance(root)
 const market=alphaMarket(root)
 const historical=view.historical.available?view.historical.data:null
 const prospective=view.prospective.available?view.prospective.data:null
 const falseEdge=falseEdgeReadiness({historical,prospective,performance,market})
 const decision=researchDecision({performance,market,falseEdge})
 const stage=(id,name,status,reason)=>({id,name,status,reason,executionAuthorized:false})
 const stages=[
  stage('market-data','Market data',market.available?'INVENTORY_ONLY':'EVIDENCE_UNAVAILABLE',market.available?'Existing football market archive inspected; '+market.counts.observations+' structurally matched source observations. No live or executable prices exposed.':'Market source inventory unavailable: '+market.reason+'.'),
  stage('prediction-model','Prediction model',prospective?.counts.structurallyAccepted>0?'INVENTORY_ONLY':'EVIDENCE_UNAVAILABLE','Frozen prediction inventory; no individual model vectors or protected partitions exposed.'),
  stage('calibration','Calibration','NOT_EVALUATED',performance.available?(performance.matchedPairs===0?'Source-matched performance report has zero contract-matched pairs.':'Source-matched descriptive performance report exists; independent calibration is not established.'):'Performance report unavailable or not matched to current source records.'),
  stage('disagreement','Disagreement detection',market.disagreement?.status??'EVIDENCE_UNAVAILABLE',market.disagreement?'Historical archive diagnostic: '+market.disagreement.eligibleFixtures+' elapsed fixtures with aligned stored evidence. No outcome or value claim.':'Market diagnostic unavailable.'),
  stage('false-edge','False Edge Laboratory','UNCERTAIN','All ten mandatory investigations lack evaluated evidence.'),
  stage('bayesian','Bayesian posterior engine','SYNTHETIC_MATH_COMPONENT','Numerical Bayes update component exists for synthetic identity tests only; no approved fitted prior/likelihood model or real-data estimates.'),
  stage('pep','Posterior Edge Probability (PEP)','PROTOCOL_COMPONENT_ONLY','Research design fingerprinting and distinct estimands are implemented; no fitted posterior or probability estimate.'),
  stage('decision','Decision layer',decision.status,'Research advancement blocked: '+decision.blockers.join('; ')+'.'),
  stage('capital','Capital allocation','SYNTHETIC_ACCOUNTING_COMPONENT','Virtual accounting and drawdown arithmetic implemented for supplied fictional entries only. No sports simulation, stake sizing or capital allocation authorised.')
 ]
 return {schemaVersion:1,kind:'ALPHA_HUNT_V5_READINESS',generatedAt:view.generatedAt,
  system:'alpha-hunt',researchOnly:true,modelValidation:'UNVALIDATED',publicationGate:'BLOCKED',
  executionAuthorized:false,validationAuthorized:false,sourceMutationAuthorized:false,
  status:'RESEARCH_NOT_READY',inventoryStatus:view.status,stages,
  falseEdgeChecks:falseEdge.checks,
  falseEdge,
  estimands:estimands.map(x=>({...x})),
  decision,
  estimates:decision.estimates,
  catalogue:view.operations.available?view.operations.data.catalogue:null,
  evidence:{
   historical:historical?{counts:historical.counts,sourceSha256:historical.sourceSha256,evidenceTier:historical.evidenceTier}:null,
   prospective:prospective?{counts:prospective.counts,reviewStatusCounts:prospective.reviewStatusCounts,sources:prospective.sources}:null,
   performance,
   market,
   operations:view.operations.available?view.operations.data.operational:null
  },
  limitations:['Readiness reporting only; not an implemented posterior model.',
   'Structural inventory acceptance is not verified settlement or statistical validation.',
   'No individual protected records or market probabilities exposed.',
   'Source read-only behaviour is not an independently enforced access-control boundary.']
 }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(process.argv.length!==4){console.error('Usage: node experiment-registry-alpha-readiness.mjs <source-root> <registry-directory>');process.exitCode=2}
 else{try{console.log(JSON.stringify(alphaReadiness(process.argv[2],process.argv[3]),null,2))}catch(error){console.error(error.message);process.exitCode=1}}
}
