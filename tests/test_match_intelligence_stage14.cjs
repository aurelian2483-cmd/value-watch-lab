'use strict';
const t=require('node:test'),a=require('node:assert/strict');
const {anchor,select,audit}=require('../research/match-intelligence/stage14-market-anchored-ev.cjs');
t('market-only always equals market probs',()=>a.deepEqual(anchor([.8,.1,.1],[.55,.25,.2],0),[.55,.25,.2]));
t('model-only equals model probs',()=>a.deepEqual(anchor([.8,.1,.1],[.55,.25,.2],1),[.8,.1,.1]));
t('market anchoring reduces exaggerated outsider probabilities',()=>{
 const b=anchor([.68236,.17977,.13787],[.75,.16,.09],.25);
 a.ok(b[2]<.13787);a.ok(b[2]>.09);a.ok(Math.abs(b.reduce((s,x)=>s+x,0)-1)<1e-6);
});
t('odds cap rejects longshot while leaving valid low odds alternative eligible',()=>{
 const p=[.6,.2,.2],odds=[2.1,5,20];
 const unfiltered=select(p,odds,2,null);
 a.equal(unfiltered.selection,'AWAY');
 const capped=select(p,odds,0,5);
 a.equal(capped.selection,'HOME');
});
t('market-only with positive overround cannot generate claimed +5% EV',()=>{
 const odds=[1.5,4.5,7];
 const sum=odds.reduce((s,o)=>s+1/o,0);
 const m=odds.map(o=>1/o/sum);
 a.equal(select(m,odds,0,null).selection,'PASS');
});
t('invalid probability vector, weight and cap rejected',()=>{
 a.throws(()=>anchor([1,0],[.4,.3,.3],.25));
 a.throws(()=>anchor([.7,.2,.1],[.4,.3,.3],.33));
 a.throws(()=>select([.7,.2,.1],[2,3,4],0,7));
});
t('sample group reports proper losses and no fabricated return',()=>{
 const x=[{date:'2024-10-01',id:'x',score:'0-1',actual:2,model:[.7,.2,.1],market:[.6,.25,.15],odds:[1.5,3.8,7]}];
 const q=audit(x,1,null);
 a.equal(q.matches,1);a.ok(Number.isFinite(q.mean_logloss));a.ok(Number.isFinite(q.mean_brier));
 a.equal(q.bets,0);
});
