import { sharedView } from './experiment-registry-shared-view.mjs'
import { inventoryHistorical } from './experiment-registry-historical-evidence.mjs'
import { inventoryProspective } from './experiment-registry-prospective-evidence.mjs'

function readSection(reader) {
  try { return {available:true,data:reader(),error:null} }
  catch(error) {
    return {available:false,data:null,error:error?.code==='ENOENT'?'SOURCE_MISSING':'SOURCE_UNREADABLE_OR_INVALID'}
  }
}

export function evidenceView(root,directory,system) {
  if(!['value-watch','bottleneck-lab','alpha-hunt'].includes(system))
    throw new Error('Unknown research system')
  const operations=readSection(()=>sharedView(directory,system))
  const historical=readSection(()=>inventoryHistorical(root))
  const prospective=readSection(()=>inventoryProspective(root))
  const available=operations.available&&operations.data.operational.available&&historical.available&&prospective.available
  return {
    schemaVersion:1,
    kind:'SHARED_RESEARCH_EVIDENCE_INVENTORY',
    system,
    generatedAt:new Date().toISOString(),
    status:available?'INVENTORIES_AVAILABLE':'INCOMPLETE',
    researchOnly:true,
    publicationGate:'BLOCKED',
    executionAuthorized:false,
    validationAuthorized:false,
    sourceMutationAuthorized:false,
    operations,historical,prospective,
    limitations:[
      'This interface exposes aggregate inventories, not individual historical records.',
      'Historical and prospective evidence counts must not be added as unique events.',
      'Source hashes identify files read, not independently authenticated provider data.',
      'Availability does not establish mathematical readiness or validated results.',
      'System labels are not an authentication or operating-system access-control boundary.'
    ]
  }
}
