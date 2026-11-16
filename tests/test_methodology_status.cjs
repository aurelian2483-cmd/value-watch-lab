'use strict';
const assert=require('node:assert/strict');
const methods=require('../paper-lab/methodology-status.js');
for(const sport of ['football','racing','tennis','nfl']){
  const rows=methods.forEvent({sport,model:{name:'TEST_SOURCE_MODEL'}});
  assert.equal(rows[0].status,'EXPERIMENTAL_ACTIVE');
  assert.equal(rows[0].name,'TEST_SOURCE_MODEL');
  assert(rows.slice(1).every(row=>row.status==='NOT_CONNECTED'));
  assert(rows.slice(1).every(row=>!/verified|validated probability/i.test(row.detail)));
  const missing=methods.forEvent({sport,model:null});
  assert.equal(missing[0].status,'NO_MODEL_ESTIMATE');
  assert(missing.slice(1).every(row=>row.status==='NOT_CONNECTED'));
}
assert.deepEqual(methods.forEvent({sport:'darts'}),[]);
assert.deepEqual(methods.forEvent({sport:'rugby'}),[]);
assert.deepEqual(methods.forEvent(null),[]);
console.log('Sport methodology display status: assertions passed');
