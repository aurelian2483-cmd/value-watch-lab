'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {implied,parseBookmakerSeason,predictionsForSeason,run,bins}=require('../research/match-intelligence/stage12-market-calibration.cjs');
const {readSeason}=require('../scripts/match_intelligence_backtest.cjs');
function makeCsv(count=100){
 let lines=['Date,HomeTeam,AwayTeam,FTHG,FTAG,PSH,PSD,PSA,PSCH,PSCD,PSCA'];
 const clubs=['Arsenal','Chelsea','Leeds','Liverpool','Man City','Everton'];
 for(let i=0;i<count;i++){
 const date=String(1+i%28).padStart(2,'0')+'/'+String(1+Math.floor(i/28)).padStart(2,'0')+'/2024';
 const home=clubs[i%6],away=clubs[(i+1)%6];
 lines.push([date,home,away,i%4,i%3,2.2,3.4,3.3,2.1,3.3,3.5].join(','));
 }
 return lines.join('\n')+'\n';
}
test('margin-adjusted probabilities are normalized and the overround retained',()=>{
 const m=implied([2,3,4]);
 assert.ok(Math.abs(m.probabilities.reduce((a,b)=>a+b,0)-1)<1e-12);
 assert.ok(Math.abs(m.overround-(1/2+1/3+1/4-1))<1e-12);
});
test('missing, nonsensical or stale price fields are not converted into valid odds',()=>{
 assert.equal(implied([2,NaN,3]),null);
 assert.equal(implied([1,2,3]),null);
 assert.equal(implied([2,0,3]),null);
});
test('market data joins original fixtures and flags timestamp as unknown',()=>{
 const d=parseBookmakerSeason(makeCsv(8));
 assert.equal(d.results.length,8);
 assert.equal(d.market.size,8);
 const first=[...d.market.values()][0];
 assert.equal(first.source_timestamp_verified,false);
 assert.equal(first.opening_available_at,null);
 assert.equal(first.closing_available_at,null);
});
test('replayed probabilities never contain an early-season future-fixture forecast',()=>{
 const p=predictionsForSeason(readSeason(makeCsv(100)));
 assert.equal(p.size,0); // all teams have too few unique prior home/away opponents for baseline?
});
test('all historical comparisons remain publication-blocked regardless of scores',()=>{
 const r=run([makeCsv(130)]);
 assert.equal(r.publication_gate,'BLOCKED');
 assert.equal(r.realized_bet_roi_verified,false);
 assert.equal(r.no_verified_price_timestamps,true);
 assert.equal(r.fresh_holdout,false);
});
test('confidence bins include only actual scored observations',()=>{
 const b=bins([{form:{confidence:.72,correct:1}},{form:{confidence:.72,correct:0}},{form:null}], 'form');
 assert.equal(b.length,1);
 assert.equal(b[0].n,2);
 assert.equal(b[0].observed_accuracy,.5);
});
