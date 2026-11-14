'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {replay,run,HALF}=require('../scripts/match_intelligence_stage3.cjs');
function season() {
  const names=['Chelsea','Arsenal','Liverpool','Everton','Brighton','Newcastle'];
  const rows=[];
  for(let d=0;d<110;d++){
    const y=2025,month=1+Math.floor(d/28),day=1+d%28;
    const date=y+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0');
    const h=names[d%6],a=names[(d+1+(Math.floor(d/6)%4))%6];
    if(h===a)continue;
    rows.push({date,home:h,away:a,hg:d%4,ag:(d*3+1)%3});
  }
  return rows;
}
test('gamma zero reproduces unmodified Poisson exactly',()=>{
 const x=replay(season(),0);assert.ok(x.eligible>5);
 for(const r of x.rows){
   assert.ok(Math.abs(r.baseline.log_loss-r.candidate.log_loss)<1e-12);
   assert.ok(Math.abs(r.baseline.brier-r.candidate.brier)<1e-12);
 }
});
test('opponent strength challenger never uses a same-day result as training',()=>{
 const original=season();const first=replay(original,.5);
 const changed=original.map(x=>({...x}));changed[changed.length-1].hg=13;
 const second=replay(changed,.5);
 assert.deepEqual(first.rows.filter(x=>x.date<changed.at(-1).date),
   second.rows.filter(x=>x.date<changed.at(-1).date));
});
test('invalid weights rejected',()=>{
 for(const w of [-.01,1.01,NaN,Infinity])assert.throws(()=>replay(season(),w));
});
test('six seasons are required and all settings are explicit',()=>{
 assert.deepEqual(HALF,[0,.25,.5,.75,1]);
 assert.throws(()=>run([]),/six seasons/);
});
