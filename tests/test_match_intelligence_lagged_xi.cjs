'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {buildSeason,replay,summarise,run,pairedDateBootstrap,ALPHAS}=require('../research/match-intelligence/lagged-xi-diagnostic.js');
test('unmapped club archive cannot silently fabricate a complete league',()=>{
 assert.throws(()=>buildSeason({matches:[]},[]),/380-match/);
 assert.throws(()=>buildSeason({matches:Array(380).fill({})},[]),/20 retrospective/);
});
test('alpha grid contains zero baseline control and is fixed',()=>{
 assert.ok(ALPHAS.includes(0));
 assert.deepEqual(ALPHAS,[-.2,-.1,-.05,0,.05,.1,.2]);
});
test('synthetic dated team histories exclude current match lineup',()=>{
 const teams=['a','b','c','d'];const games=[];
 // Repeat enough dated matches to establish rolling same-season baseline.
 for(let day=1;day<=72;day++){
   const date='2025-'+String(1+Math.floor((day-1)/28)).padStart(2,'0')+'-'+String(1+(day-1)%28).padStart(2,'0');
   const home=teams[(day-1)%4],away=teams[day%4];
   games.push({date,round:1,home,away,hg:day%4,ag:day%3,
     homeLineup:Array.from({length:11},(_,i)=>i+1),awayLineup:Array.from({length:11},(_,i)=>i+21)});
 }
 const before=replay(games,.1);
 const altered=games.map(x=>({...x,homeLineup:[...x.homeLineup],awayLineup:[...x.awayLineup]}));
 altered.at(-1).homeLineup=Array.from({length:11},(_,i)=>100+i);
 altered.at(-1).awayLineup=Array.from({length:11},(_,i)=>200+i);
 const after=replay(altered,.1);
 assert.ok(before.length>0);
 assert.deepEqual(before,after);
});
test('alpha zero is exactly the original same-fixture Poisson result',()=>{
 const games=[];
 for(let d=0;d<100;d++){
   games.push({date:'2025-'+String(1+Math.floor(d/28)).padStart(2,'0')+'-'+String(1+d%28).padStart(2,'0'),
   home:['a','b','c','d'][d%4],away:['a','b','c','d'][(d+1)%4],hg:d%3,ag:(d+2)%3,
   homeLineup:Array.from({length:11},(_,i)=>i+1),
   awayLineup:Array.from({length:11},(_,i)=>i+100)});
 }
 const r=replay(games,0);
 assert.ok(r.length>0);
 for(const x of r){
   assert.equal(x.baseline.log_loss,x.challenger.log_loss);
   assert.equal(x.baseline.brier,x.challenger.brier);
 }
});

test('paired date bootstrap uses same fixtures and same-date clusters',()=>{
 const rows=[
  {date:'2025-01-01',baseline:{log_loss:.8},challenger:{log_loss:.9}},
  {date:'2025-01-01',baseline:{log_loss:1.1},challenger:{log_loss:1.2}},
  {date:'2025-01-03',baseline:{log_loss:.6},challenger:{log_loss:.7}}
 ];
 const r=pairedDateBootstrap(rows,{iterations:200,seed:12});
 assert.equal(r.groups,2);
 assert.ok(Math.abs(r.mean_challenger_minus_baseline-.1)<1e-12);
 assert.ok(r.p025>0&&r.p975>0);
});
