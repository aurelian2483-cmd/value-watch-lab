#!/usr/bin/env node
// Read-only snapshot-time review worklist. Never writes verified outcomes.
import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildEvidenceSnapshot} from './evidence-bridge.mjs';
import {buildMethodIdentityReport} from './method-identity.mjs';
import {buildReviewWorklist} from './result-review.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const read=name=>readFileSync(resolve(root,name),'utf8');
const sourcePaths={
  history:'research/football-baseline-v1/608-reconstructed-forecasts.json',
  ledger:'prediction-ledger.json',results:'results-feed.json',
  report:'research/performance-report-latest.json',
  progress:'research/mathematical-library/progress.v1.json'
};
const sourceTexts=Object.fromEntries(Object.entries(sourcePaths).map(([k,v])=>[k,read(v)]));
const parsed=Object.fromEntries(Object.entries(sourceTexts).map(([k,v])=>[k,JSON.parse(v)]));
const bridge=buildEvidenceSnapshot({...parsed,sourceTexts});
const codePaths=['paper-lab/engine.js','paper-lab/experimental.js','paper-lab/hybrid.js',
  'paper-lab/desk-compact-20261116.js','paper-lab/reliability-core.js','paper-lab/sport-methods.js'];
const code=Object.fromEntries(codePaths.map(path=>[path,read(path)]));
const identity=buildMethodIdentityReport({bridge,ledger:parsed.ledger,
  football:JSON.parse(read('research-dashboard-data.json')),
  racing:JSON.parse(read('horse-predictions-data.json')),sourceTexts:code});
const reviewPaths={
  review:'research/result-review-status.json',
  primary:'research/provider-result-observations.json',
  secondary:'research/secondary-result-evidence.json'
};
const reviewTexts=Object.fromEntries(Object.entries(reviewPaths).map(([k,p])=>[k,read(p)]));
const docs=Object.fromEntries(Object.entries(reviewTexts).map(([k,s])=>[k,JSON.parse(s)]));
const report=buildReviewWorklist({bridge,identity,ledger:parsed.ledger,
  results:parsed.results,...docs,
  sourceTexts:{...sourceTexts,...reviewTexts,
    'research-dashboard-data.json':read('research-dashboard-data.json'),
    'horse-predictions-data.json':read('horse-predictions-data.json'),
    ...code}});
if(report.selected_method!==null||report.selection_eligible!==false||
  report.packets.some(p=>p.scoring_authorised!==false||
    p.independent_outcome_verified!==false||p.linked_dropdown_engine!==null))
  throw Error('Unsafe result promotion');
process.stdout.write(JSON.stringify(report,null,2)+'\n');
