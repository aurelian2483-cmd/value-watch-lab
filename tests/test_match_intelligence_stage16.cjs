'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {train,choose,score}=require('../research/match-intelligence/stage16-chronological-selection-correction.cjs');
const rows=[
 {id:'a',date:'2023-10-01',market:[.4,.25,.35],model:[.4,.25,.35],odds:[3,3.6,3],actual:2},
 {id:'b',date:'2023-10-02',market:[.4,.25,.35],model:[.4,.25,.35],odds:[3,3.6,3],actual:1},
 {id:'c',date:'2023-10-03',market:[.4,.25,.35],model:[.4,.25,.35],odds:[3,3.6,3],actual:0}
];
test('training cannot use an unknown model weight or odd cap',()=>{
 assert.throws(()=>train(rows,{share:.23,cap:5}));assert.throws(()=>train(rows,{share:.5,cap:7}));
});
test('adjustment is trained without touching later results',()=>{
 const learned=train(rows,{share:1,cap:5});
 const testA={...rows[0],id:'future',actual:0},testB={...testA,actual:2};
 assert.deepEqual(choose(testA,learned,{applyCorrection:true}).selection,
  choose(testB,learned,{applyCorrection:true}).selection);
 assert.deepEqual(learned.adjustments,train(rows,{share:1,cap:5}).adjustments);
});
test('learned optimism deduction cannot be negative and is smaller with prior',()=>{
 const trained=train(rows,{share:1,cap:5});
 assert.equal(trained.adjustments.length,3);
 for(const x of trained.adjustments)assert.ok(x>=0&&x<=1);
 assert.ok(trained.adjustments[0]<1);
});
test('reconciles priced fixtures to passes, selections, profit',()=>{
 const t=train(rows,{share:1,cap:5});
 const v=score(rows,t,true);
 assert.equal(v.bets+v.passes,3);
 assert.equal(v.bets,v.wins+v.losses);
 assert.equal(v.bets,Object.values(v.by_outcome).reduce((a,x)=>a+x.bets,0));
 assert.equal(v.ledger.length,3);
});
test('correction reduces nominal EV for the same candidate, never increases it',()=>{
 const t={share:1,cap:5,adjustments:[.1,0,0]};
 const x={id:'case',model:[.6,.2,.2],market:[.6,.2,.2],odds:[2,3,3],actual:0};
 const a=choose(x,t,{applyCorrection:false}),b=choose(x,t,{applyCorrection:true});
 assert.equal(a.selection,'HOME');
 assert.equal(b.selection,'PASS');
});
