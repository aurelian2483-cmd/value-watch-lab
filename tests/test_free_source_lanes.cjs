'use strict';

const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {laneForSport} = require('../paper-lab/free-source-lanes.js');
const index = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');

test('all nine main-site lanes have distinct evidence summaries and no fabricated timed counts', () => {
  const nav = index.match(/<section class="pro-reference-panel pro-quick-filters">[\s\S]*?<\/section>/)[0];
  const sports = ['football','racing','tennis','nfl','darts','rugby','basketball','cricket','golf'];
  const choices = [...nav.matchAll(/data-pro-sport="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(choices, ['all', ...sports]);
  assert.equal(new Set(sports.map(laneForSport)).size, sports.length);
  for (const sport of sports) assert.equal(typeof laneForSport(sport), 'string');
  for (const sport of ['basketball','cricket','golf']) {
    assert.doesNotMatch(nav, new RegExp('data-pro-count="' + sport + '"'));
  }
});

test('unknown, differently cased and non-sport keys do not borrow another lane', () => {
  for (const invalid of ['all','NBA','NFL','__proto__','constructor',null,undefined]) {
    assert.equal(laneForSport(invalid), null);
  }
});
