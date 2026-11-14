'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const X = require('../paper-lab/experimental.js');
test('50/50 de-vigged market blend retains valid 1X2 vector', () => {
  const r = X.marketCandidate([0.6,0.25,0.15],[2,3.5,5]);
  const imp = [1/2,1/3.5,1/5], sum = imp.reduce((a,b)=>a+b,0);
  assert.ok(r);
  assert.equal(r.researchOnly,true);
  r.probabilities.forEach((p,i)=>assert.ok(Math.abs(p-(0.5*[0.6,0.25,0.15][i]+0.5*imp[i]/sum))<1e-12));
  assert.ok(Math.abs(r.probabilities.reduce((a,b)=>a+b,0)-1)<1e-12);
});
test('incomplete or invalid three-way odds never create a selection', () => {
  assert.equal(X.marketCandidate([0.6,0.25,0.15],[2,3.5]),null);
  assert.equal(X.marketCandidate([0.6,0.25,0.15],[2,0,5]),null);
  assert.equal(X.marketCandidate([0.6,0.25,0.1],[2,3.5,5]),null);
});
test('odds cap blocks an otherwise attractive longshot', () => {
  const r = X.marketCandidate([0.05,0.05,0.9],[11,12,1.1]);
  assert.equal(r.selection,'PASS');
});
test('at least five percent EV required; tie-break is stable', () => {
  assert.equal(X.marketCandidate([0.33,0.34,0.33],[2.4,2.4,2.4]).selection,'PASS');
  const r = X.marketCandidate([0.7,0.2,0.1],[2.2,3,5]);
  assert.equal(r.selection,'HOME');
  assert.ok(r.estimatedEV>=0.05);
});
