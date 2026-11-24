// Candidate review only. Does not modify the registry or open any datasets.
import {loadCatalogue,validateEntries} from './validate-v1.mjs'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {pathToFileURL} from 'node:url'
const json=name=>JSON.parse(readFileSync(new URL(name,import.meta.url),'utf8'))
export function nextCandidateName(){
 const {manifest}=loadCatalogue()
 return 'candidate-batch-'+String(manifest.batches.length).padStart(3,'0')+'.json'
}
export function assessCandidates(candidates){
 const {entries,manifest}=loadCatalogue()
 if(!Array.isArray(candidates)||candidates.length<1||candidates.length>100)throw new Error('Candidate batch must contain 1–100 entries')
 const expected=String(manifest.batches.length).padStart(3,'0')
 if(candidates.some(c=>!c||c.batch!==expected||c.status!=='SPECIFIED'||c.legacy_id!==null||
   c.implementation_ref!==null||c.test_evidence!==null))throw new Error('Invalid candidate batch or unsupported lifecycle claim')
 validateEntries([...entries,...candidates],json('catalogue.v0.json').methods,json('sport-profiles.v1.json'))
 return {kind:'CATALOGUE_INTAKE_REVIEW',status:'STRUCTURAL_CHECKS_PASSED_REVIEW_PENDING',
  registered:entries.length,candidates:candidates.length,prospectiveCount:entries.length+candidates.length,
  candidateIds:candidates.map(c=>c.id),candidateFingerprint:createHash('sha256').update(JSON.stringify(candidates)).digest('hex'),
  batch:expected,registeredNewEntries:0,researchOnly:true,publicationGate:'BLOCKED',executionAuthorized:false,
  limitations:['Structural validation does not establish mathematical novelty or verify citations.',
   'Candidate entries remain outside the registered catalogue until reviewed and committed with regenerated snapshots.',
   'No experiments, protected data or empirical qualification accessed.']}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(process.argv.length!==3){console.error('Usage: node experiment-registry-catalogue-intake.mjs <candidate-json|--next>');process.exitCode=2}
 else{try{console.log(JSON.stringify(assessCandidates((process.argv[2]==='--next'?json(nextCandidateName()):JSON.parse(readFileSync(process.argv[2],'utf8')))),null,2))}catch(e){console.error(e.message);process.exitCode=1}}
}
