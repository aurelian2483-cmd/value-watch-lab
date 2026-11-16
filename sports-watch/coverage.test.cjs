const test=require('node:test');
const assert=require('node:assert/strict');
const {PROVIDERS,SPORTS,providersFor,permittedProvider}=require('./coverage.js');
test('coverage only reports configured official destinations',()=>{
  assert.ok(PROVIDERS.length>=10);
  for(const source of PROVIDERS){
    assert.equal(permittedProvider(source.url),true,source.name);
    assert.ok(source.sports.length>0);
    for(const sport of source.sports)assert.ok(SPORTS.includes(sport),sport);
  }
});
test('unknown sports and all sports do not imply known match broadcasters',()=>{
  assert.deepEqual(providersFor('all'),[]);
  assert.deepEqual(providersFor('unknown'),[]);
  assert.ok(providersFor('darts').some(s=>s.name==='PDC'));
  assert.ok(providersFor('basketball').some(s=>s.name==='NBA'));
  assert.ok(providersFor('cricket').some(s=>s.name==='ICC'));
});
test('foreign, spoofed, insecure or redirected URLs are not trusted',()=>{
  for(const value of [
    'http://www.bbc.com/sport','https://www.bbc.com.evil.example/sport',
    'https://evil.example/','https://www.bbc.com/sport?redirect=https://evil.example',
    'javascript:alert(1)','https://www.bbc.com:444/sport'
  ]) assert.equal(permittedProvider(value),false,value);
});
