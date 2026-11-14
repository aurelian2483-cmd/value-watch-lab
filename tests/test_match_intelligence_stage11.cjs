'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {solveRidge,fittedReplacementSignal,replay,ALPHAS}=require('../research/match-intelligence/stage11-replacement-proxy.cjs');
const eleven=(offset=0)=>Array.from({length:11},(_,i)=>i+offset+1);
const history=()=>Array.from({length:18},(_,i)=>({
 residual:i%2===0?.5:-.5,
 lineup:i%2===0?eleven(0):eleven(1)
}));
const games=()=>{
 const teams=['A','B','C','D'],out=[];
 for(let i=0;i<170;i++)out.push({
   date:'2024-'+String(1+Math.floor(i/28)).padStart(2,'0')+'-'+String(1+i%28).padStart(2,'0'),
   home:teams[i%4],away:teams[(i+1)%4],hg:i%3,ag:(i+2)%3,
   homeLineup:i%3===0?eleven(1):eleven(0),
   awayLineup:i%2===0?eleven(101):eleven(102)
 });
 return out;
};
test('ridge solves known small linear problem',()=>{
 const x=solveRidge([[2,0],[0,4]],[2,8],2);
 assert.ok(Math.abs(x[0]-.5)<1e-12);
 assert.ok(Math.abs(x[1]-4/3)<1e-12);
});
test('no player history or inadequate sample yields no inferred player effect',()=>{
 assert.equal(fittedReplacementSignal([]),null);
 assert.equal(fittedReplacementSignal(history().slice(0,11)),null);
});
test('uniform full XI and performance cannot manufacture a player effect',()=>{
 const fixed=Array.from({length:20},()=>({residual:.2,lineup:eleven()}));
 const x=fittedReplacementSignal(fixed);
 assert.equal(x.signal,0);
 assert.equal(x.replacement_quality_identified,false);
});
test('rotating XIs allow a bounded signed player-composition contrast',()=>{
 const h=history();
 const x=fittedReplacementSignal(h);
 assert.ok(Number.isFinite(x.signal));
 assert.ok(x.signal<0,'most recent lower-performing lineup has negative relative association');
 assert.equal(x.coefficients_are_causal,false);
});
test('current lineup cannot change its own forecast',()=>{
 const a=games(),v1=replay(a,.3);
 const b=structuredClone(a);
 b.at(-1).homeLineup=eleven(9000);
 b.at(-1).awayLineup=eleven(10000);
 const v2=replay(b,.3);
 assert.ok(v1.length>0);
 assert.deepEqual(v1,v2);
});
test('zero coefficient exactly preserves baseline log loss and Brier',()=>{
 const x=replay(games(),0);
 assert.ok(x.length>0);
 for(const r of x){assert.equal(r.baseline.log_loss,r.candidate.log_loss);assert.equal(r.baseline.brier,r.candidate.brier);}
});
test('lineup identity conflicts and invalid alpha are rejected',()=>{
 const x=games();
 assert.throws(()=>replay(x,1),/locked/);
 x[0].homeLineup=Array(11).fill(1);
 assert.throws(()=>replay(x,.3),/Invalid actual XI/);
});
test('research comparison includes positive, negative and zero coefficients',()=>{
 assert.deepEqual(ALPHAS,[-.6,-.3,0,.3,.6]);
});
