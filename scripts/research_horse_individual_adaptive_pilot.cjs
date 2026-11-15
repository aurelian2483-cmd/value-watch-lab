#!/usr/bin/env node
'use strict';
// Research-only; read-only evaluation. Run: node scripts/research_horse_individual_adaptive_pilot.cjs
// Does NOT alter forecast archives, market odds or production selections.
const fs=require('node:fs'),path=require('node:path');
const dataset=JSON.parse(fs.readFileSync(path.join(__dirname,'../research/horse-challenger/features-v1.json'),'utf8'));
const EXPECTED_SHA='303ba6e48be444373004173cad83c12b2b6cd43de50a9d806ce1d75d496d2b5e';
if(dataset.dataset_sha256!==EXPECTED_SHA)throw Error('Unexpected frozen dataset');
if(dataset.features[4]!=='surface_form'||dataset.features[5]!=='distance_form'||dataset.features[2]!=='shrunk_form')throw Error('Feature schema mismatch');
const clip=(x,a,b)=>Math.max(a,Math.min(b,x));
const variants={
  baseline:r=>0,
  fixed:r=>2*0.15*(r[5]+r[4]),
  adaptive_signal:r=>2*0.15*(r[5]*Math.abs(r[5])/(0.05+Math.abs(r[5]))+r[4]*Math.abs(r[4])/(0.05+Math.abs(r[4]))),
  adaptive_form:r=>2*0.15*(r[5]+r[4])*clip(0.5+r[2],0,1)
};
function normalize(z){let top=Math.max(...z),exp=z.map(v=>Math.exp(v-top)),s=exp.reduce((a,b)=>a+b,0);return exp.map(v=>v/s)}
function score(r,adjust){
 if(!Array.isArray(r.baseline)||r.baseline.length!==r.features.length||r.winner_index<0||r.winner_index>=r.baseline.length)throw Error('Bad race');
 if(Math.abs(r.baseline.reduce((a,b)=>a+b,0)-1)>1e-7)throw Error('Non-normal baseline');
 const p=normalize(r.baseline.map((v,i)=>Math.log(v)+adjust(r.features[i])));
 return {logLoss:-Math.log(p[r.winner_index]),brier:p.reduce((s,v,i)=>s+(v-(i===r.winner_index?1:0))**2,0)};
}
const groups={train:[],validation:[],test:[]};
for(const r of dataset.races){
 const bucket=r.date<'2026-10-01'?'train':r.date<'2026-10-16'?'validation':'test';
 groups[bucket].push(r);
}
const means={};
for(const [variant,adjust] of Object.entries(variants)){
 means[variant]={};
 for(const [name,items] of Object.entries(groups)){
  const scores=items.map(r=>score(r,adjust));
  means[variant][name]={races:items.length,meanLogLoss:scores.reduce((s,x)=>s+x.logLoss,0)/items.length,meanBrier:scores.reduce((s,x)=>s+x.brier,0)/items.length};
 }
}
if(Math.abs(means.baseline.test.meanLogLoss-2.34638406877737)>1e-10)throw Error('Baseline does not reproduce frozen challenger comparison');
console.log(JSON.stringify({study:'POSTHOC_EXPLORATORY_NOT_UNTOUCHED_VALIDATION',dataset_sha256:EXPECTED_SHA,variants:Object.keys(variants),means,publication_gate:'BLOCKED',model_validation:'UNVALIDATED'},null,2));
