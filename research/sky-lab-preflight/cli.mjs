import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {loadCatalogue} from '../mathematical-library/validate-v1.mjs';
import {auditDataset,pairedScores,dateClusterIntervals,readinessGate} from './paired-audit.mjs';

// Read-only command: no training, network, writes or betting/publishing actions.
const file=process.argv[2]||fileURLToPath(new URL('../football-baseline-v1/608-reconstructed-forecasts.json',import.meta.url));
const bytes=readFileSync(file), data=JSON.parse(bytes.toString('utf8'));
const census=auditDataset(data);
const {entries}=loadCatalogue();
const qualified=entries.filter(e=>e.test_evidence!==null).length;
const report={
  schema:'sky_lab_preflight.v1',research_only:true,
  source_type:'RETROSPECTIVE_RECONSTRUCTION_NOT_AS_ISSUED',
  data_sha256:createHash('sha256').update(bytes).digest('hex'),
  source_model:data.meta.name,source_commit:data.meta.historical_source_commit,
  input_cutoff_disclosure:data.meta.input_cutoff,
  census,comparison:pairedScores(data.rows),uncertainty:dateClusterIntervals(data.rows),
  gate:readinessGate(entries.length,qualified),
  conclusions:[
    'Descriptive comparison on previously examined reconstructed matches.',
    'Neither candidate has independently verified prospective validation.',
    'Scores and exploratory intervals do not establish bookmaker value.',
    'No tournament, model promotion, website modification or betting operation occurred.'
  ]
};
process.stdout.write(JSON.stringify(report,null,2)+'\n');
