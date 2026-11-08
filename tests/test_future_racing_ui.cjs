'use strict';
const assert=require('node:assert/strict');
const E=require('../paper-lab/engine.js');
const now=Date.parse('2026-11-08T20:00:00Z');
const row={race_id:'synthetic',racecourse:'Test Course',name:'Synthetic Test Hurdle',startUTC:'2026-11-09T13:00:00Z',
  source:'https://www.sportinglife.com/racing/racecards/2026-11-09/test-course/racecard/synthetic/test',
  observedAtUTC:'2026-11-08T19:59:00Z',runner_source:'https://www.sportinglife.com/racing/meeting/2026-11-09/test-course/12',
  runner_source_sha256:'a'.repeat(64),runner_observed_at_utc:'2026-11-08T19:59:00Z',race_stage:'DORMANT',
  runner_data_status:'SINGLE_SOURCE_RUNNERS_OBSERVED',active_runner_count:2,
  runners:[1,2].map(i=>({horse_id:String(i),name:'Test Horse '+i,runner_status:'RUNNER',active_runner:true,previous_results:[]}))};
const document={schema_version:1,research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED',generated_at_utc:'2026-11-08T19:59:00Z',races:[row]};
const normalize=d=>E.normalizeFeeds([{kind:'racing-future',path:'racing-future-data.json',document:d}],now);
const events=normalize(document);
assert.equal(events.length,1);assert.equal(events[0].choices.length,2);
assert.equal(events[0].choices[0].label,'Test Horse 1');assert.equal(events[0].model,null);
assert.equal(events[0].status.selectable,false);assert.equal(events[0].choices[0].quote,null);
assert.equal(E.statusOf(events[0],now+31*60000).selectable,false);
assert.equal(normalize({...document,publication_gate:'OPEN'}).length,0);
const pending=normalize({...document,races:[{...row,runner_data_status:'RUNNER_FIELD_UNCONFIRMED',runners:[]}]});
assert.equal(pending[0].futureScheduleOnly,true);assert.equal(pending[0].status.selectable,false);
console.log('Future meeting cards retain named runners, source receipts, freshness and blocked publication gates');

const numbered={...row,runners:row.runners.map((horse,i)=>({...horse,cloth_number:i+1}))};
const paper=normalize({...document,races:[numbered]})[0];
assert.equal(paper.provisionalEntry,true);
assert.equal(paper.futureScheduleOnly,false);
assert.equal(paper.fieldConfirmed,false,'A consistent numbered source list is not a verified final declaration');
assert.equal(paper.status.code,'PROVISIONAL_ENTRY');assert.equal(paper.status.selectable,true);
assert(paper.choices.every(choice=>choice.quote===null&&choice.probability===null));
let plan=E.createPlan({from:'2026-11-09',to:'2026-11-15',createdAt:new Date(now).toISOString()});
plan=E.addSelection(plan,1,paper,'1',now);
assert.equal(plan.slots[0].legs[0].provisionalEntry,true);
assert.equal(E.restore(E.serialize(plan)).slots[0].legs[0].declarationStatus,'NOT_VERIFIED');
assert.equal(E.statusOf(paper,now+31*60000).code,'STALE');
assert.equal(E.statusOf({...paper,providerStatus:'CANCELLED'},now).selectable,false);
assert.equal(E.statusOf(paper,Date.parse(paper.startUTC)).selectable,false);
for(const changed of [
  {...numbered,runner_source_sha256:null},
  {...numbered,runner_source:'https://example.org/racing/meeting/2026-11-09/test/12'},
  {...numbered,runner_source:numbered.runner_source.replace('11-09','11-10')},
  {...numbered,active_runner_count:3},
  {...numbered,runner_data_status:'RUNNER_FIELD_UNCONFIRMED'},
  {...numbered,runners:numbered.runners.map(h=>({...h,cloth_number:1}))},
])assert.equal(normalize({...document,races:[changed]})[0]?.status.selectable??false,false);
const empty=E.createPlan({from:'2026-11-09',to:'2026-11-15',createdAt:new Date(now).toISOString()});
const generated=E.generateResearch(empty,[{...paper,communityTips:[{choiceId:'1',type:'tipster',sourceUrl:'https://example.org/tip'}]}],now);
assert(generated.slots.every(slot=>slot.legs.length===0),'Provisional entry hypotheses must not be auto-generated as model picks');
console.log('Numbered source entries support manual paper research while declarations, forecasts, prices and automatic picks stay gated');
