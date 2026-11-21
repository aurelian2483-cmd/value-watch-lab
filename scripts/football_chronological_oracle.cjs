'use strict';
// Read only the isolated replay function. Its normal download/write CLI stays inert.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const file = path.join(__dirname, '../research/football-baseline-v1/replay.mjs');
const source = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
assert.equal(crypto.createHash('sha256').update(source).digest('hex'),
  'eee0da9df463b182301bae47c8bcb02095c3d3d49184594703e50dcc145ecb04');
const begin = source.indexOf('const run = function run(seasons)');
const end = source.indexOf('const commit =', begin);
assert(begin >= 0 && end > begin);
const run = vm.runInNewContext(source.slice(begin, end) + '\nrun', {},
  {timeout:1000, contextCodeGeneration:{strings:false, wasm:false}});
const records = JSON.parse(fs.readFileSync(0, 'utf8'));
assert(Array.isArray(records) && records.length === 608);
const seasons = {};
for (const {season, date, home, away, ft} of records) {
  (seasons[season] ??= {matches:[]}).matches.push({date, team1:home, team2:away, score:{ft}});
}
const output = run(seasons).rows.map(({id, p_unadjusted, p_recent_form_alpha_0_025}) =>
  [id, p_unadjusted, p_recent_form_alpha_0_025]);
process.stdout.write(JSON.stringify(output));
