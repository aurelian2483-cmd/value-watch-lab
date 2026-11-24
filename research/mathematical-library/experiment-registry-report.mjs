import { supervise } from './experiment-registry-supervisor.mjs'
import { loadCatalogue } from './validate-v1.mjs'
import { pathToFileURL } from 'node:url'

export function report(directory) {
  const catalogue = loadCatalogue()
  const operational = supervise(directory)
  return {
    schemaVersion: 1,
    kind: 'RESEARCH_INFRASTRUCTURE_STATUS',
    generatedAt: new Date().toISOString(),
    researchOnly: true,
    publicationGate: 'BLOCKED',
    executionAuthorized: false,
    catalogue: {
      registered: catalogue.entries.length,
      readinessTarget: 1000,
      remaining: Math.max(0,1000-catalogue.entries.length),
      sizeGateMet: catalogue.entries.length >= 1000,
      independentReviewRequired: true
    },
    operational,
    limitations: [
      'Local registry lifecycle counts only.',
      'Catalogue registration is not empirical qualification.',
      'Synthetic infrastructure runs do not demonstrate sports prediction performance.',
      'This report neither starts experiments nor modifies research records.'
    ]
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.length !== 3) {
    console.error('Usage: node experiment-registry-report.mjs <registry-directory>')
    process.exitCode = 2
  } else {
    try {
      const result = report(process.argv[2])
      console.log(JSON.stringify(result,null,2))
      if (result.operational.status === 'BLOCKED') process.exitCode = 1
    } catch (error) {
      console.error(error.message)
      process.exitCode = 1
    }
  }
}
