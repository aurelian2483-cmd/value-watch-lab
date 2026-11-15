#!/usr/bin/env node
'use strict';
// Historical comparison ONLY. All outcomes were known before the models were evaluated.
// No API writes, market odds, production selectors, or model promotion.
const fs=require('node:fs'),path=require('node:path');
const {historySignals}=require('./horse_v3_history_reliability.cjs');
const read=p=>JSON.parse(fs.readFileSync(path.join(__dirname,'..',p),'utf8'));
const old=read('research/horse-v3/individual-history-recovery-overlay-2026-11-15.json');
const yards=s=>[...s.matchAll(/(\d+)\s*([mfy])/g)].reduce((total,m)=>total+Number(m[1])*({m:1760,f:220,y:1}[m[2]]),0);
const rows=[
 ...read('research/horse-v3/published-results-rechecked-2026-11-15.json').rows,
 ...read('research/horse-v3/remaining-11-results-rechecked-2026-11-15.json').rows,
 ...read('research/horse-v3/remaining-seven-horses-21-linked-history-2026-11-15.json').rows,
 ...read('research/horse-v3/additional-36-prior-flat-runs-profile-linked-2026-11-15.json').rows,
 ...old.publisher_verified_prior_performances.filter(x=>x.target_race_id==='877820'&&x.horse_id==='1105875').map(x=>({target_race_id:'890908',horse_id:x.horse_id,horse_name:x.horse_name,date:x.previous_date,race_id:x.previous_race_id,position:x.previous_position,runner_count:x.previous_field_size,distance_yards:yards(x.previous_distance),going:x.previous_going,run_type:'FLAT'}))
];
const targets=[
 {race:'890908',date:'2025-11-24',distance:1765,field:8,winner:'1105875'},
 {race:'894962',date:'2025-12-22',distance:1121,field:5,winner:'1184423'}
];
function softmax(z){const mx=Math.max(...z),ex=z.map(v=>Math.exp(v-mx)),s=ex.reduce((x,y)=>x+y,0);return ex.map(v=>v/s)}
function execute(exclusions=[]){
 const out=[];
 for(const t of targets){
  const byID=new Map();
  for(const row of rows.filter(x=>x.target_race_id===t.race&&!exclusions.includes(x.race_id))){
   if(!byID.has(row.horse_id))byID.set(row.horse_id,[]);
   byID.get(row.horse_id).push(row);
  }
  const ids=[...byID.keys()].sort();
  if(ids.length!==t.field||!ids.includes(t.winner))throw Error('Field mismatch '+t.race);
  const horses=ids.map(id=>{
   const past=byID.get(id),unique=new Set(past.map(x=>x.race_id));
   if(unique.size!==past.length||past.some(x=>x.date>=t.date))throw Error('Duplicate/future '+id);
   const result=historySignals({targetDate:t.date,targetDistanceYards:t.distance,targetGoing:'Standard',previousResults:past});
   if(!result.eligible)throw Error('Ineligible '+id);
   return {id,history_count:past.length,used_history_count:Math.min(6,past.length),result};
  });
  const logits={
   reconstructed_v1:horses.map(x=>2*x.result.formStrength),
   reconstructed_fixed_v3:horses.map(x=>2*(x.result.formStrength+0.15*(x.result.distance.signal+x.result.surface.signal))),
   reconstructed_individual_adaptive_v3:horses.map(x=>2*x.result.formStrength+x.result.deltaLogit)
  };
  const metrics={};for(const [k,z] of Object.entries(logits)){
   const p=softmax(z),win=ids.indexOf(t.winner);
   metrics[k]={winner_probability:p[win],winner_rank:[...ids.keys()].sort((i,j)=>p[j]-p[i]).indexOf(win)+1,log_loss:-Math.log(p[win]),brier:p.reduce((s,q,i)=>s+(q-(i===win?1:0))**2,0)};
  }
  out.push({race_id:t.race,field_size:ids.length,horses:horses.map(({id,history_count,used_history_count})=>({id,history_count,used_history_count})),metrics});
 }
 return out;
}
const result={research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED',study:'POST_HOC_RECONSTRUCTED_FULL_AVAILABLE_HISTORY_NOT_FROZEN_PROSPECTIVE_V1',regular:execute(),exclude_unavailable_result_page:execute(['800734'])};
console.log(JSON.stringify(result,null,2));
