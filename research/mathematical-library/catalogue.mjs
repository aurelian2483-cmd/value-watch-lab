import { loadCatalogue } from './validate-v1.mjs'

const { entries } = loadCatalogue()
const args = process.argv.slice(2)
const command = args.shift() || 'summary'

function tally(key) {
  const counts = new Map()
  for (const entry of entries) {
    for (const value of [entry[key]].flat()) counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return Object.fromEntries([...counts].sort(([left], [right]) => left.localeCompare(right)))
}

switch (command) {
  case 'summary':
    console.log(JSON.stringify({
      target: 1000,
      registered: entries.length,
      remaining: Math.max(0, 1000 - entries.length),
      qualified: entries.filter(entry => entry.status === 'VALIDATED' && entry.test_evidence !== null).length,
      distinctAlgorithmsAfterRecordedEquivalences: entries.filter(entry =>
        entry.classification === 'distinct-algorithm' &&
        !entry.relationships.some(link => link.type === 'equivalent-to')).length,
      legacy: entries.filter(entry => entry.legacy_id).length,
      distinctAlgorithms: entries.filter(entry => entry.classification === 'distinct-algorithm').length,
      variantsAndConfigurations: entries.filter(entry =>
        ['model-variant', 'parameter-configuration'].includes(entry.classification)).length,
      byClassification: tally('classification'),
      byStatus: tally('status'),
      byFamily: tally('family'),
      bySport: tally('sports'),
      byBatch: tally('batch')
    }, null, 2))
    break
  case 'search': {
    const words = args.join(' ').toLowerCase().split(/\s+/u).filter(Boolean)
    console.log(JSON.stringify(entries.filter(entry => {
      const text = [entry.id, entry.name, entry.family, entry.application, ...entry.sports].join(' ').toLowerCase()
      return words.every(word => text.includes(word))
    }), null, 2))
    break
  }
  case 'index':
    for (const key of ['family', 'sports']) {
      console.log('## ' + (key === 'sports' ? 'Sport' : 'Method family') + '\n')
      for (const value of Object.keys(tally(key))) {
        const matching = entries.filter(entry => [entry[key]].flat().includes(value))
        console.log('- **' + value + '** (' + matching.length + ') ' + matching.map(entry => entry.id).join(', '))
      }
      console.log('')
    }
    break
  case 'reference':
    console.log('# Sky mathematical reference')
    for (const entry of entries) {
      console.log('\n## ' + entry.name + ' (' + entry.id + ')\n')
      console.log('> ' + entry.definition + '\n')
      console.log(entry.variables + '.\n')
      console.log(entry.application + '\n')
      console.log('Assumptions — ' + entry.assumptions + '.\n')
      console.log('Limitations — ' + entry.limitations + '.\n')
      if (entry.mechanism_note) console.log('Mechanism — ' + entry.mechanism_note + '\n')
      console.log('Source — ' + entry.source.citation)
    }
    break
  case 'ledger':
    console.log(JSON.stringify(entries.map(entry => ({
      id: entry.id,
      source: entry.source,
      status: entry.status,
      legacy_id: entry.legacy_id,
      implementation_ref: entry.implementation_ref,
      test_evidence: entry.test_evidence,
      input_timing: entry.input_timing,
      sports: entry.sports,
      applicability_profile: entry.profile,
      ...(entry.mechanism_note && { mechanism_note: entry.mechanism_note }),
      ...(entry.relationships.some(link => link.type === 'equivalent-to') && {
        equivalence: entry.relationships.find(link => link.type === 'equivalent-to')
      })
    })), null, 2))
    break
  default:
    throw Error('Unknown catalogue command: ' + command)
}
