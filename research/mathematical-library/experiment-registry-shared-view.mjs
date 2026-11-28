import { report } from './experiment-registry-report.mjs'

const roles = Object.freeze({
  'value-watch':'Outcome prediction research',
  'bottleneck-lab':'Diagnostic research',
  'alpha-hunt':'Independent evidence research'
})
export function sharedView(directory,system) {
  if(typeof system!=='string'||!Object.hasOwn(roles,system))
    throw new Error('Unknown research system')
  const source=report(directory)
  return {
    schemaVersion:1,
    kind:'SHARED_RESEARCH_OPERATIONAL_VIEW',
    system,
    responsibility:roles[system],
    generatedAt:source.generatedAt,
    researchOnly:true,
    publicationGate:'BLOCKED',
    executionAuthorized:false,
    sourceMutationAuthorized:false,
    validationAccessAuthorized:false,
    catalogue:{...source.catalogue},
    operational:{
      status:source.operational.status,
      available:source.operational.snapshot.available,
      integrity:source.operational.snapshot.integrity??null,
      counts:source.operational.snapshot.statuses,
      incidentCount:source.operational.incidents.length
    },
    limitations:[
      'Read-only aggregate operational view, not an authentication or access-control boundary.',
      'No raw records, model probabilities, odds, validation datasets or financial decisions exposed.',
      'No actual cross-system data connection established by this view.'
    ]
  }
}
