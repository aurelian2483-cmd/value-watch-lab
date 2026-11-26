'use strict';
const assert = require('node:assert/strict');
const {daily} = require('../ops-control/racing-coverage-core');
const day = {date:'2026-07-02',status:'SOURCE_DATE_MISMATCH',count:0,meeting_page_races:1};
const race = {race_id:'123',startUTC:'2026-07-01T23:30:00Z',runner_data_status:'RUNNER_FIELD_UNCONFIRMED'};
const report = daily({
  days:[day,{date:'2026-07-03',status:'COLLECTION_FAILED',count:0}],
  fixture_meetings:[{date:day.date,course:'Example'},{date:day.date,course:'example'}],
  meeting_card_results:[{date:day.date,url:'good',status:'SOURCE_OBSERVED'},{date:day.date,url:'bad',status:'COLLECTION_FAILED'}],
  races:[race,race],
});
assert.equal(report[0].meetings,1);
assert.equal(report[0].attempted,2);
assert.equal(report[0].recoveredPages,1);
assert.equal(report[0].races,1);
assert.equal(report[0].unconfirmedFields,1);
assert.equal(report[0].scope,'Partial source observations');
assert.equal(report[1].scope,'Schedule unknown; no racecards recovered');
assert.equal(report[1].indexStatus,'COLLECTION_FAILED');
assert.equal(daily({days:[day]})[0].attempted,null);
assert.equal(daily({days:[day],fixture_meetings:[{date:day.date,course:'Example'}]})[0].scope,
  'Meetings observed; race coverage unknown');
console.log('PASS: UK dates, distinct race and meeting counts, successful recovery and unknown schedule');
