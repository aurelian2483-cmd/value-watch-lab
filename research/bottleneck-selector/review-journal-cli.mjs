#!/usr/bin/env node
// Read-only private review register. Never writes source files or verified outcomes.
import assert from 'node:assert/strict';
import {readFileSync,lstatSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildReviewJournalReport,emptyReviewJournal} from './review-journal.mjs';

const MAX=10_000_000;
function readJSON(path){
  const target=resolve(path),info=lstatSync(target);
  assert(info.isFile()&&!info.isSymbolicLink()&&info.size>0&&info.size<=MAX,
    'Invalid input file or symlink');
  return JSON.parse(readFileSync(target,'utf8'));
}
export function runCLI(args,nowUTC){
  assert(args.length>=1&&args.length<=3,
    'Usage: node review-journal-cli.mjs <raw-audit.json> [private-journal.json | --template] [as-of-utc]');
  const [rawPath,journalPath,asOfUTC=nowUTC]=args;
  const raw=readJSON(rawPath);
  if(journalPath==='--template'){
    assert(args.length===2,'Template mode accepts only original audit path');
    return emptyReviewJournal(raw);
  }
  const journal=journalPath?readJSON(journalPath):null;
  return buildReviewJournalReport(raw,journal,asOfUTC);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const out=runCLI(process.argv.slice(2),new Date().toISOString());
  assert(out.kind==='BOTTLENECK_PRIVATE_REVIEW_JOURNAL_V1'||
    (out.kind==='BOTTLENECK_MANUAL_REVIEW_REGISTER_V1'&&
      out.independent_outcomes_certified===0&&out.selected_method===null&&
      out.scoring_authorised===false&&out.betting_eligible===false),
    'Unsafe review output');
  process.stdout.write(JSON.stringify(out,null,2)+'\n');
}
