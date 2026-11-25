'use strict';
const {execFileSync} = require('node:child_process');
const approved = JSON.parse(execFileSync('python',['-c',
  "import sys,json; from datetime import date; sys.path.insert(0,'scripts'); from pl_bookmakers import approved; print(json.dumps(approved(json.load(open('tests/fixtures/pl-bookmakers.synthetic.json')),date(2026,11,26),allow_test=True)[0]))"],
  {encoding:'utf8'}));
module.exports = keys => new Map(keys.map(key => [key,approved[key]]));
