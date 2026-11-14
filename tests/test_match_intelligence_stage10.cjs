'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {priorPlayerSignal,rollingReplay,ALPHAS}=require('../research/match-intelligence/stage10-player-residuals.cjs');
function games(){
 const teams=['A','B','C','D'],out=[];
 for(let d=0;d<110;d++){
  const home=teams[d%4],away=teams[(d+1)%4];
  out.push({date:'2024-'+String(1+Math.floor(d/28)).padStart(2,'0')+'-'+String(d%28+1).padStart(2,'0'),
    home,away,hg:d%3,ag:(d+2)%3,
    homeLineup:Array.from({length:11},(_,i)=>i+1),
    awayLineup:Array.from({length:11},(_,i)=>i+101)});
 }
 return out;
}
test('unknown player history gives null signal rather than fabricated impact',()=>{
 assert.equal(priorPlayerSignal('A',[]),null);
});
test('team-centered prior residuals cancel uniform player signals',()=>{
 const h=[{residual:.2,lineup:[1,2,3]},{residual:.2,lineup:[1,2,3]}];
 const x=priorPlayerSignal('A',h);
 assert.ok(Math.abs(x.signal)<1e-12);
});
test('different prior player combinations can produce positive or negative associations',()=>{
 const h=[{residual:-.5,lineup:[1,2]},{residual:+.5,lineup:[2,3]}];
 const x=priorPlayerSignal('A',h);
 assert.ok(x.signal>0);
});
test('alpha zero retains exact baseline on identical scored matches',()=>{
 const r=rollingReplay(games(),0);
 assert.ok(r.rows.length>0);
 for(const row of r.rows){
   assert.equal(row.baseline.log_loss,row.candidate.log_loss);
   assert.equal(row.baseline.brier,row.candidate.brier);
 }
});
test('altering current fixture lineup cannot influence its own forecast',()=>{
 const g=games(),a=rollingReplay(g,.3);
 const variant=structuredClone(g);
 variant.at(-1).homeLineup=Array.from({length:11},(_,i)=>1000+i);
 variant.at(-1).awayLineup=Array.from({length:11},(_,i)=>2000+i);
 const b=rollingReplay(variant,.3);
 assert.deepEqual(a.rows,b.rows);
});
test('changing a same-calendar-day XI cannot influence another same-day forecast',()=>{
 const g=games();
 const other={...structuredClone(g.at(-1)),home:'C',away:'D',homeLineup:Array.from({length:11},(_,i)=>i+401),
 awayLineup:Array.from({length:11},(_,i)=>i+501)};
 g.push(other);
 const a=rollingReplay(g,.3);
 const modified=structuredClone(g);modified.at(-1).homeLineup=Array.from({length:11},(_,i)=>i+701);
 const b=rollingReplay(modified,.3);
 assert.deepEqual(a.rows,b.rows);
});
test('malformed XI or invalid coefficient is rejected',()=>{
 const g=games();
 assert.throws(()=>rollingReplay(g,7),/grid/);
 g[0].homeLineup=[1,1,...Array.from({length:9},(_,i)=>i+2)];
 assert.throws(()=>rollingReplay(g,.3),/11 unique/);
});
