'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {implied,parseBookmakerSeason,predictionsForSeason,quoteOnlyPaperAudit,pairedDateUncertainty,run,bins}=require('../research/match-intelligence/stage12-market-calibration.cjs');
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
 assert.ok(p.size>0);
 assert.equal(p.has('2024-01-01|Arsenal|Chelsea'),false);
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

test('paper market comparison is explicitly non-executable and selects at most one choice per fixture',()=>{
 const r=run([makeCsv(130)]);
 assert.equal(r.paired_market_sample,r.sample);
 assert.equal(r.paired_scores.form.n,r.paired_scores.market_open.n);
 assert.equal(r.paired_scores.baseline.n,r.paired_scores.market_close.n);
 const result=r.retrospective_quote_only_paper.form;
 assert.equal(result.executable_historically,false);
 assert.equal(result.verified_market_edge,false);
 assert.ok(result.quote_only_decisions<=r.sample);
});
test('missing archived opening odds do not create a historical paper position',()=>{
 const input=[{date:'2024-01-01',fixture_id:'a',actual:0,odds_open:null,form_probs:[.8,.1,.1]}];
 const x=quoteOnlyPaperAudit(input,'form');
 assert.equal(x.quote_only_decisions,0);
 assert.equal(x.paper_roi,null);
});
test('hypothetical market calculations return explicit arithmetic with 1-unit staking',()=>{
 const input=[{date:'2024-01-01',fixture_id:'a',actual:0,odds_open:[2.5,3.3,3.0],form_probs:[.5,.3,.2]},
 {date:'2024-01-02',fixture_id:'b',actual:2,odds_open:[2.5,3.3,3.0],form_probs:[.5,.3,.2]}];
 const x=quoteOnlyPaperAudit(input,'form');
 assert.equal(x.quote_only_decisions,2);
 assert.equal(x.wins,1);
 assert.equal(x.retrospective_profit_units,.5);
 assert.equal(x.paper_roi,.25);
 assert.equal(x.executable_historically,false);
});

test('clustered paired comparison reports direction correctly and excludes missing rows',()=>{
 const rows=Array.from({length:40},(_,i)=>({date:'2024-01-'+String(i%20+1).padStart(2,'0'),
   baseline:{loss:1.2},form:{loss:1.1},market_open:i===0?null:{loss:1.0}}));
 const r=pairedDateUncertainty(rows,'form','baseline',{draws:200,seed:7});
 assert.equal(r.paired_matches,40);
 assert.equal(r.date_clusters,20);
 assert.ok(Math.abs(r.first_minus_second_mean_log_loss+0.1)<1e-12);
 assert.ok(r.upper_95<0);
 const m=pairedDateUncertainty(rows,'form','market_open',{draws:200});
 assert.equal(m.paired_matches,39);
 assert.ok(m.lower_95>0);
});
