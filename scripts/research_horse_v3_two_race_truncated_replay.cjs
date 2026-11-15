#!/usr/bin/env node
'use strict';
// Post-hoc, deliberately truncated historical replay. No predictions or live changes.
// Re-run: node scripts/research_horse_v3_two_race_truncated_replay.cjs
const fs=require('node:fs'),path=require('node:path');
const {historySignals}=require('./horse_v3_history_reliability.cjs');
const load=p=>JSON.parse(fs.readFileSync(path.join(__dirname,'..',p),'utf8'));
const a=load('research/horse-v3/published-results-rechecked-2026-11-15.json').rows;
const b=load('research/horse-v3/remaining-11-results-rechecked-2026-11-15.json').rows;
const c=load('research/horse-v3/remaining-seven-horses-21-linked-history-2026-11-15.json').rows;
const prior=load('research/horse-v3/individual-history-recovery-overlay-2026-11-15.json').publisher_verified_prior_performances;
const yards=s=>[...s.matchAll(/(\d+)\s*([mfy])/g)].reduce((v,m)=>v+Number(m[1])*({m:1760,f:220,y:1}[m[2]]),0);
const extra=prior.filter(x=>x.horse_id==='1105875'&&x.target_race_id==='877820').map(x=>({
 target_race_id:'890908',target_date:'2025-11-24',horse_id:x.horse_id,horse_name:x.horse_name,
 race_id:x.previous_race_id,date:x.previous_date,position:x.previous_position,
 runner_count:x.previous_field_size,distance_yards:yards(x.previous_distance),going:x.previous_going,run_type:'FLAT'
}));
const rows=[...a,...b,...c,...extra];
const targets=[
 {race:'890908',date:'2025-11-24',distance:1765,going:'Standard',field:8,winner:'1105875'},
 {race:'894962',date:'2025-12-22',distance:1121,going:'Standard',field:5,winner:'1184423'}
];
const softmax=z=>{let max=Math.max(...z),v=z.map(x=>Math.exp(x-max)),sum=v.reduce((a,b)=>a+b,0);return v.map(x=>x/sum)};
const output=[];
for(const t of targets){
 const ids=[...new Set(rows.filter(x=>x.target_race_id===t.race).map(x=>x.horse_id))].sort();
 if(ids.length!==t.field||!ids.includes(t.winner))throw Error('Target full field mismatch');
 const h=ids.map(id=>{
  const past=rows.filter(x=>x.target_race_id===t.race&&x.horse_id===id);
  if(past.length<3||new Set(past.map(x=>x.race_id)).size!==past.length)throw Error('Insufficient or duplicated history '+id);
  if(past.some(x=>x.date>=t.date))throw Error('Future result in inputs');
  const signal=historySignals({targetDate:t.date,targetDistanceYards:t.distance,targetGoing:t.going,previousResults:past});
  if(!signal.eligible)throw Error('Insufficient history for '+id);
  return {id,prior_runs:past.length,signal};
 });
 const scores={
  truncated_baseline:h.map(x=>2*x.signal.formStrength),
  truncated_fixed:h.map(x=>2*(x.signal.formStrength+0.15*(x.signal.distance.signal+x.signal.surface.signal))),
  truncated_adaptive:h.map(x=>2*x.signal.formStrength+x.signal.deltaLogit)
 };
 const metrics={};
 for(const [key,z] of Object.entries(scores)){
  const p=softmax(z),winner=ids.indexOf(t.winner);
  metrics[key]={winner_probability:p[winner],winner_rank:[...ids.keys()].sort((i,j)=>p[j]-p[i]).indexOf(winner)+1,log_loss:-Math.log(p[winner]),brier:p.reduce((s,q,i)=>s+(q-(i===winner?1:0))**2,0)};
 }
 output.push({target_race:t.race,runner_count:ids.length,history_runs:h.map(x=>({horse_id:x.id,count:x.prior_runs})),metrics});
}
console.log(JSON.stringify({experiment:'RETROSPECTIVE_TRUNCATED_HISTORY_REPLAY_NOT_FROZEN_V1',model_validation:'UNVALIDATED',publication_gate:'BLOCKED',results:output},null,2));
