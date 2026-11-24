import { evidenceView } from './experiment-registry-evidence-view.mjs'
import { alphaPerformance } from './experiment-registry-alpha-performance.mjs'
import { pathToFileURL } from 'node:url'

const checks=Object.freeze(['randomness','overfitting','sample-size','data-leakage','bookmaker-margin','selection-bias','market-drift','multiple-testing','data-quality','variable-correlation'])

export function alphaReadiness(root,directory){
 const view=evidenceView(root,directory,'alpha-hunt')
 const performance=alphaPerformance(root)
 const historical=view.historical.available?view.historical.data:null
 const prospective=view.prospective.available?view.prospective.data:null
 const stage=(id,name,status,reason)=>({id,name,status,reason,executionAuthorized:false})
 const stages=[
  stage('market-data','Market data','NOT_CONNECTED','No event-matched price evidence is exposed by the combined inventory.'),
  stage('prediction-model','Prediction model',prospective?.counts.structurallyAccepted>0?'INVENTORY_ONLY':'EVIDENCE_UNAVAILABLE','Frozen prediction inventory; no individual model vectors or protected partitions exposed.'),
  stage('calibration','Calibration','NOT_EVALUATED',performance.available?(performance.matchedPairs===0?'Source-matched performance report has zero contract-matched pairs.':'Source-matched descriptive performance report exists; independent calibration is not established.'):'Performance report unavailable or not matched to current source records.'),
  stage('disagreement','Disagreement detection','NOT_EVALUATED','No aligned model and market evidence is available through this interface.'),
  stage('false-edge','False Edge Laboratory','UNCERTAIN','All ten mandatory investigations lack evaluated evidence.'),
  stage('bayesian','Bayesian posterior engine','NOT_EVALUATED','No approved and independently tested prior/likelihood model.'),
  stage('pep','Posterior Edge Probability (PEP)','NOT_EVALUATED','No defensible posterior estimate; persistence is a separate estimand.'),
  stage('decision','Decision layer','BLOCKED','Research evidence is insufficient for advancement.'),
  stage('capital','Capital allocation','BLOCKED','No real-money execution or paper simulation is performed by this interface.')
 ]
 return {schemaVersion:1,kind:'ALPHA_HUNT_V5_READINESS',generatedAt:view.generatedAt,
  system:'alpha-hunt',researchOnly:true,modelValidation:'UNVALIDATED',publicationGate:'BLOCKED',
  executionAuthorized:false,validationAuthorized:false,sourceMutationAuthorized:false,
  status:'RESEARCH_NOT_READY',inventoryStatus:view.status,stages,
  falseEdgeChecks:checks.map(id=>({id,status:'UNCERTAIN',evidence:null})),
  estimates:{outcomeProbability:null,genuineEdgeProbability:null,persistenceProbability:null},
  evidence:{
   historical:historical?{counts:historical.counts,sourceSha256:historical.sourceSha256,evidenceTier:historical.evidenceTier}:null,
   prospective:prospective?{counts:prospective.counts,reviewStatusCounts:prospective.reviewStatusCounts,sources:prospective.sources}:null,
   performance,
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
