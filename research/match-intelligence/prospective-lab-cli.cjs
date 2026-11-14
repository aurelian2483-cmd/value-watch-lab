'use strict';
// Explicit JSON I/O. This CLI NEVER fetches live fixtures, executes orders or updates production.
// Usage:
//   node research/match-intelligence/prospective-lab-cli.cjs freeze input.json
//   node research/match-intelligence/prospective-lab-cli.cjs score input.json
// Freeze input: {fixture,history,created_at_utc,quote?}
// Score input:  {predictions:[frozen,...],settlements:[...]}
const fs=require('node:fs');
const {freezePrediction,buildLedger}=require('./prospective-validation-lab.cjs');
const [action,path]=process.argv.slice(2);
if(!['freeze','score'].includes(action)||!path||process.argv.length!==4)
 throw Error('Usage: node prospective-lab-cli.cjs freeze|score input.json');
const input=JSON.parse(fs.readFileSync(path,'utf8'));
const result=action==='freeze'?freezePrediction(input):buildLedger(input.predictions,input.settlements);
process.stdout.write(JSON.stringify(result,null,2)+'\n');
