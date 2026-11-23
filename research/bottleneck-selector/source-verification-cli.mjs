#!/usr/bin/env node
// Read-only follow-up to result-review-cli.mjs. Emits no certified result.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {buildSourceVerificationDossier} from './source-verification.mjs';

const path=process.argv[2];
if(!path) throw Error('Usage: node source-verification-cli.mjs /path/to/result-review-worklist.json');
const input=JSON.parse(readFileSync(resolve(path),'utf8'));
const result=buildSourceVerificationDossier(input);
if(result.certified_outcomes_added!==0||result.source_independence_certified!==0||
  result.selected_method!==null||result.betting_eligible!==false||
  result.packets.some(p=>p.independently_verified_outcome!==false||
    p.verified_dropdown_engine!==null||p.scoring_authorised!==false))
  throw Error('Unsafe independent-result or engine-selection promotion');
process.stdout.write(JSON.stringify(result,null,2)+'\n');
