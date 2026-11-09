'use strict';
const assert = require('node:assert/strict');
const X = require('../paper-lab/experimental.js');
const close = (a,b) => assert(Math.abs(a-b)<1e-10, `${a} != ${b}`);
const r = X.calculate(.1,12);
close(r.centralEV,.2); close(r.lowEV,-.16); close(r.highEV,.56);
close(r.breakEven,1/12); close(r.fragility,1/60); close(r.variance,12.96);
close(r.sensitivity,12);
close(X.calculate(.01,20).low,0); close(X.calculate(.99,2).high,1);
close(X.calculate(0,2).variance,0); close(X.calculate(1,2).variance,0);
close(X.calculate(.5,2).fragility,0);
assert(X.calculate(.1,6).fragility<0);
for (const p of [null,undefined,'0.1',NaN,Infinity,-.1,1.1]) assert.equal(X.calculate(p,12),null);
for (const o of [null,undefined,'12',NaN,Infinity,0,1,-2]) assert.equal(X.calculate(.1,o),null);
for (const d of [null,'0.03',NaN,Infinity,-1,2]) assert.equal(X.calculate(.1,12,d),null);
assert.equal(X.mode('compare'),'compare'); assert.equal(X.mode('experimental'),'experimental');
for (const mode of [null,'invalid',{},undefined]) assert.equal(X.mode(mode),'current');
const fs = require('node:fs');
for (const file of ['index.html','paper-lab/index.html']) {
 const html = fs.readFileSync(file,'utf8');
 for (const name of ['current','experimental','compare']) assert(html.includes(`data-engine="${name}"`));
 assert(html.indexOf('experimental.js')<html.indexOf('desk.js'));
 for (const sport of ['football','racing','tennis','nfl']) assert(html.includes(`data-sport="${sport}"`));
 assert(html.includes('UNVALIDATED')); assert(html.includes('BLOCKED'));
}
console.log('Experimental arithmetic: EV, sensitivity, fragility, variance, bounds, missing inputs, defaults and both entrypoints passed');
