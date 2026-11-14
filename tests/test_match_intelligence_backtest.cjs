'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {readSeason,baseline,metrics,evaluateSeason,researchReport,ALPHAS}=require('../scripts/match_intelligence_backtest.cjs');
test('CSV parser handles quoted team names, goals and chronological ordering',()=>{
 const csv='Date,HomeTeam,AwayTeam,FTHG,FTAG\n02/01/2025,"Team, Home",Arsenal,2,1\n01/01/2025,Arsenal,Chelsea,1,1\n';
 const rows=readSeason(csv);
 assert.equal(rows.length,2);assert.equal(rows[0].date,'2025-01-01');
 assert.equal(rows[1].home,'Team, Home');
});
test('duplicate historical fixtures are rejected',()=>{
 assert.throws(()=>readSeason('Date,HomeTeam,AwayTeam,FTHG,FTAG\n01/01/2025,Arsenal,Chelsea,1,1\n01/01/2025,Arsenal,Chelsea,1,1\n'),/Duplicate/);
});
test('normalized Poisson 1X2 scoring stays finite',()=>{
 for(const y of [0,1,2]){const x=metrics(1.4,1.1,y);assert.ok(Number.isFinite(x.log_loss)&&Number.isFinite(x.brier));assert.ok(x.brier>=0);}
});
test('future same-date score cannot alter the first prior-day-only forecast',()=>{
 // Three teams need a minimum of 3 home/away appearances and 30 earlier league fixtures.
 const teams=['Arsenal','Chelsea','Liverpool','Everton'],rows=[];
 for(let d=1;d<=40;d++){
   const date='2025-01-'+String(d<=31?d:d-31).padStart(2,'0');
   // For chronology test, use two distinct dates with a minimum of 30 fixtures.
   const day=d<=31?'2025-01-'+String(d).padStart(2,'0'):'2025-02-'+String(d-31).padStart(2,'0');
   const h=teams[d%4],a=teams[(d+1)%4];
   rows.push({date:day,home:h,away:a,hg:d%3,ag:(d+1)%3});
 }
 const original=evaluateSeason(rows);
 const later=rows.map(x=>({...x}));
 later[later.length-1].hg=7;later[later.length-1].ag=0;
 const modified=evaluateSeason(later);
 const prev=original.rows.filter(x=>x.date<later[later.length-1].date);
 const prev2=modified.rows.filter(x=>x.date<later[later.length-1].date);
 assert.deepEqual(prev,prev2);
});
test('alpha=0 is identical to baseline when form coverage is sufficient',()=>{
 const teams=['Arsenal','Chelsea','Liverpool','Everton'],rows=[];
 for(let d=1;d<=80;d++){
   const month=d<=28?'02':d<=59?'03':'04',day=d<=28?d:d<=59?d-28:d-59;
   rows.push({date:'2025-'+month+'-'+String(day).padStart(2,'0'),home:teams[d%4],away:teams[(d+1)%4],hg:d%3,ag:(d+2)%3});
 }
 const e=evaluateSeason(rows);assert.ok(e.eligible>0);
 for(const row of e.rows){
   assert.deepEqual(row.scores['raw:0'],row.scores.baseline);
   assert.deepEqual(row.scores['adjusted:0'],row.scores.baseline);
 }
});
test('report refuses too few seasons',()=>assert.throws(()=>researchReport([]),/six/));
assert.ok(ALPHAS.includes(0));
