import {test} from 'node:test'
import assert from 'node:assert/strict'
import {registerProtocol,estimands} from './experiment-registry-alpha-protocol.mjs'
const input={mode:'RESEARCH_DESIGN_ONLY',hypothesis:'Synthetic hypothesis',population:'Synthetic population',endpoint:'Synthetic observable endpoint',baseline:'Fixed synthetic reference',primaryMetric:'Predefined metric',uncertaintyMethod:'Prespecified interval',multiplicityMethod:'Prespecified correction',dependenceMethod:'Prespecified dependence model',missingDataPolicy:'Exclude with recorded reason',priorSpecification:'Unfitted synthetic prior',likelihoodSpecification:'Unfitted synthetic likelihood',persistenceHypothesis:'Separate synthetic future hypothesis',developmentManifest:'a'.repeat(64),validationManifest:'b'.repeat(64),developmentEnd:'2026-01-01T00:00:00Z',validationStart:'2026-02-01T00:00:00Z',validationEnd:'2026-03-01T00:00:00Z',persistenceStart:'2026-04-01T00:00:00Z',persistenceEnd:'2026-05-01T00:00:00Z'}
test('protocol fingerprint is reproducible and changes with substantive design',()=>{
 const a=registerProtocol(input),b=registerProtocol(Object.fromEntries(Object.entries(input).reverse()))
 assert.equal(a.protocolId,b.protocolId)
 assert.notEqual(a.protocolId,registerProtocol({...input,primaryMetric:'Different metric'}).protocolId)
 assert.equal(estimands.length,3)
 assert.equal(new Set(estimands.map(x=>x.id)).size,3)
 assert.deepEqual(a.estimates,{outcomeProbability:null,genuineEdgeProbability:null,persistenceProbability:null})
 assert.equal(a.executionAuthorized,false)
 assert.equal(a.validationAuthorized,false)
 assert.equal(a.publicationGate,'BLOCKED')
})
test('reject overlapping windows, same manifest and incomplete study design',()=>{
 for(const change of [{validationStart:input.developmentEnd},{persistenceStart:input.validationEnd},{validationManifest:input.developmentManifest},{primaryMetric:''},{priorSpecification:null},{validationStart:'2026-02-30T00:00:00Z'},{mode:'REAL_EXECUTION'}])
  assert.throws(()=>registerProtocol({...input,...change}))
})
