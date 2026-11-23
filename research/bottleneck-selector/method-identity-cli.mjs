#!/usr/bin/env node
// Read-only exact version mapping audit. No writes, bets, or web requests.
import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildEvidenceSnapshot} from './evidence-bridge.mjs';
import {buildMethodIdentityReport} from './method-identity.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const read=name=>readFileSync(resolve(root,name),'utf8');
const sources={
  history:'research/football-baseline-v1/608-reconstructed-forecasts.json',
  ledger:'prediction-ledger.json',
  results:'results-feed.json',
  report:'research/performance-report-latest.json',
  progress:'research/mathematical-library/progress.v1.json'
};
const text=Object.fromEntries(Object.entries(sources).map(([key,path])=>[key,read(path)]));
const parsed=Object.fromEntries(Object.entries(text).map(([key,raw])=>[key,JSON.parse(raw)]));
const bridge=buildEvidenceSnapshot({...parsed,sourceTexts:text});
const codePaths=['paper-lab/engine.js','paper-lab/experimental.js','paper-lab/hybrid.js',
  'paper-lab/desk-compact-20261116.js','paper-lab/reliability-core.js','paper-lab/sport-methods.js'];
const sourceTexts=Object.fromEntries(codePaths.map(path=>[path,read(path)]));
const identity=buildMethodIdentityReport({
  bridge,ledger:parsed.ledger,
  football:JSON.parse(read('research-dashboard-data.json')),
  racing:JSON.parse(read('horse-predictions-data.json')),
  sourceTexts
});
if(identity.selected_method!==null || identity.selection_eligible!==false ||
  identity.dropdown_methods.some(row=>row.exact_ledger_receipts!==0))
  throw Error('Refusing unverified engine promotion');
process.stdout.write(JSON.stringify(identity,null,2)+'\n');
