const test=require('node:test');
const assert=require('node:assert/strict');
const {safeStatus,normalizeMatch,makeUrl,widgetUrl,listFromPayload,SPORTS}=require('./fixtures.js');
test('live status is not inferred from scheduled, finished or unknown statuses',()=>{
  for(const v of ['live','LIVE','in_progress','playing','1st half','HT']) assert.equal(safeStatus(v),'live');
  for(const v of ['scheduled','upcoming','not started']) assert.equal(safeStatus(v),'upcoming');
  for(const v of ['finished','FT','cancelled',null,'???']) assert.equal(safeStatus(v),'other');
});
test('fixture classification respects requested mode and requires competitors',()=>{
  const live={home:'Team A',away:'Team B',status:'live',time:'2026-11-16T20:00:00Z'};
  assert.equal(normalizeMatch(live,'football','live').home,'Team A');
  assert.equal(normalizeMatch(live,'football','upcoming'),null);
  assert.equal(normalizeMatch({...live,status:'finished'},'football','live'),null);
  assert.equal(normalizeMatch({...live,status:'unknown',status_text:'In Progress'},'football','live').status,'live');
  assert.equal(normalizeMatch({...live,away:''},'football','live'),null);
  assert.equal(normalizeMatch({home:'A',away:'B',status:'scheduled'},'tennis','upcoming').sport,'tennis');
});
test('API URLs restrict sport and safe mode',()=>{
  assert.equal(makeUrl('football','live','2026-11-16'),'https://sportscore.com/api/v1/fixtures/?sport=football&status=live&limit=100&date=2026-11-16');
  assert.equal(widgetUrl('football'),'https://sportscore.com/api/widget/matches/?sport=football&limit=50');
  assert.equal(makeUrl('football','live'),null);
  assert.equal(makeUrl('tennis','upcoming','2026-11-16'),'https://sportscore.com/api/v1/fixtures/?sport=tennis&status=upcoming&limit=100&date=2026-11-16');
  assert.equal(makeUrl('football','upcoming','x'),null);
  assert.equal(makeUrl('../bad','live','2026-11-16'),null);
  assert.equal(widgetUrl('../bad'),null);
  assert.deepEqual(SPORTS,['football','tennis','basketball','cricket']);
});
test('invalid or incompatible fixture data fails closed rather than fabricating fixtures',()=>{
  assert.deepEqual(listFromPayload({matches:[{home:'A'}]}),[{home:'A'}]);
  assert.deepEqual(listFromPayload({fixtures:[]}),[]);
  assert.equal(listFromPayload({bad:'data'}),null);
  assert.equal(listFromPayload(null),null);
});
