'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const S=require('../paper-lab/method-stars.js');
const M=require('../paper-lab/method-selection.js');
const ids=S.methods.map(x=>x.id);
assert.deepEqual(ids,[...M.methods.map(x=>x.id),'alpha-hunt']);
assert.equal(new Set(ids).size,8);
assert.equal(new Set(S.methods.map(x=>x.colour)).size,8,'Every method/system needs distinct permanent colour');
assert.deepEqual(S.methods.filter(x=>['tool','readiness','place-model','separate-unconnected'].includes(x.kind)).map(x=>x.id),
  ['compare','bottleneck','racing-top-four','alpha-hunt']);
assert.equal(S.directionFromVector([.6,.2,.2],['home','draw','away']),'home');
assert.equal(S.directionFromVector([.5,.5],['home','away']),null);
assert.equal(S.directionFromVector([.5,.1],['home','away']),null);
assert.equal(S.directionFromVector([NaN,.4,.6],['home','draw','away']),null);
const now=Date.parse('2026-11-24T10:00:00Z');
const stamp=ms=>new Date(ms).toISOString();
const start=stamp(now+4*3600000);
const event={
  sport:'football',startUTC:start,observedAt:stamp(now-60000),
  choices:[{id:'home',label:'Alpha FC',probability:.6},
           {id:'draw',label:'Draw',probability:.2},
           {id:'away',label:'Beta FC',probability:.2}],
  model:{name:'poisson.form.alpha.0.025.v1',validation:'UNVALIDATED',probabilityKind:'EXPERIMENTAL_MODEL_ESTIMATE'}
};
const choose={selected:['current','experimental','hybrid','reliability','compare','bottleneck','racing-top-four'],
  leaderId:'home',hybrid:{probabilities:[.55,.25,.20]},
  reliability:{status:'FORM_CANDIDATE',side:'HOME'},now};
const noPrice=S.evaluate(event,choose);
assert.deepEqual((noPrice.byChoice.home||[]).map(x=>x.id),['current','hybrid','reliability']);
assert.equal(noPrice.overlaps.length,1);
assert.equal(noPrice.overlaps[0].methods.length,3);
assert(!Object.values(noPrice.byChoice).flat().some(x=>['compare','bottleneck','alpha-hunt','racing-top-four'].includes(x.id)));
assert.equal(S.evaluate(event,{...choose,selected:['current']}).overlaps.length,0);
assert.equal(S.evaluate(event,{...choose,hybrid:{probabilities:[.2,.2,.6]},reliability:{status:'PATTERN_FAILED'}}).overlaps.length,0);
const ended={...event,startUTC:stamp(now-1000)};
assert.equal(S.evaluate(ended,choose).count,0,'Old match cannot receive new methodological agreement');
// The 3.0 selection is only surfaced with a complete, fresh same-source and time-matched h2h market.
const priced={...event,choices:event.choices.map(c=>({...c,quote:{
  decimal:c.id==='home'?2.5:c.id==='draw'?3.5:4.0,
  source:'https://source.example/fixture',bookmaker:'Sky Bet',
  status:'SOURCE_OBSERVED_UNVERIFIED',observedAt:stamp(now-150000)
}}))};
assert.equal(S.experimentalDirection(priced,now),'home');
assert.deepEqual(S.evaluate(priced,choose).overlaps[0].methods,['current','experimental','hybrid','reliability']);
assert.equal(S.experimentalDirection({...priced,choices:priced.choices.map(c=>({...c,quote:{...c.quote,observedAt:stamp(now-31*60000)}}))},now),null);
assert.equal(S.experimentalDirection({...priced,choices:priced.choices.map(c=>({...c,quote:{...c.quote,bookmaker:c.id==='home'?'Sky Bet':'Other'}}))},now),null);
assert.equal(S.experimentalDirection({...priced,choices:priced.choices.map(c=>({...c,quote:{...c.quote,status:'UNVERIFIED_OTHER'}}))},now),null);
const racing={sport:'racing',startUTC:start,observedAt:stamp(now-60000),
  choices:[{id:'horse-a',probability:.8},{id:'horse-b',probability:.2}],
  model:{name:'Context',validation:'UNVALIDATED',probabilityKind:'EXPERIMENTAL_CONTEXT_WEIGHT'}};
assert.equal(S.evaluate(racing,{selected:['current','racing-top-four'],leaderId:'horse-a',now}).count,0,
  'Context weights and Top Four place market are not win-probability agreement');
const css=fs.readFileSync('paper-lab/method-tiles.css','utf8');
for(const id of ids)assert(css.includes('data-method-star="'+id+'"'),id+' missing colour');
for(const path of ['index.html','paper-lab/index.html']){
  const html=fs.readFileSync(path,'utf8');
  assert(html.includes('method-stars.js?v=1'));
  assert(html.indexOf('method-stars.js?v=1')<html.indexOf('desk-compact-20261116.js'));
}
const desk=fs.readFileSync('paper-lab/desk-compact-20261116.js','utf8');
assert(desk.includes('ValueWatchMethodStars.evaluate(event'));
assert(desk.includes("method-agreement-summary"));
assert(desk.includes("method-direction-star"));
assert(desk.includes('directions coincide'));
console.log('PASS eight colour identities, fail-closed directions, genuine multi-method overlap, no faux Alpha/Bottleneck/Compare/place vote');
