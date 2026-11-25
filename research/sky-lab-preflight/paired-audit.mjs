import assert from 'node:assert/strict';

// Research-only, read-only paired comparison. No fitting, picks or promotion.
const KEYS = ['p_unadjusted','p_recent_form_alpha_0_025'];

function checkVector(p, id) {
  assert(Array.isArray(p) && p.length===3, id+': expected 1X2 vector');
  assert(p.every(x=>typeof x==='number' && Number.isFinite(x) && x>=0 && x<=1), id+': invalid probability');
  assert(Math.abs(p.reduce((a,b)=>a+b,0)-1)<1e-6, id+': probability sum');
}
export function auditDataset(data) {
  assert.equal(data?.meta?.research_only,true);
  assert.equal(data.meta.validated,false);
  assert.equal(data.meta.model_publication_gate,'BLOCKED');
  assert.match(data.meta.name,/RECONSTRUCTED/i);
  assert.deepEqual(data.meta.outcomes_order,['home','draw','away']);
  assert(Array.isArray(data.rows) && data.rows.length>0,'Missing rows');
  const ids=new Set(), seasons=new Map();
  for(const r of data.rows){
    assert(typeof r.id==='string' && r.id && !ids.has(r.id),'Missing or duplicate event ID');
    ids.add(r.id);
    assert(typeof r.season==='string' && r.season,'Missing season');
    assert(typeof r.date==='string' && /^\d{4}-\d{2}-\d{2}$/.test(r.date) && Number.isFinite(Date.parse(r.date)), 'Invalid date');
    assert(r.id.includes(r.date),'Event ID/date mismatch');
    assert(Array.isArray(r.ft) && r.ft.length===2 && r.ft.every(x=>Number.isInteger(x)&&x>=0),'Invalid full-time score');
    const outcome=r.ft[0]>r.ft[1]?0:r.ft[0]===r.ft[1]?1:2;
    assert.equal(r.winner_index,outcome,'Final goals/outcome mismatch');
    for(const k of KEYS)checkVector(r[k],r.id+' '+k);
    seasons.set(r.season,(seasons.get(r.season)||0)+1);
  }
  for(const [s,n] of seasons)assert.equal(data.counts?.[s]?.eligible,n,'Season count mismatch');
  assert.equal(Object.keys(data.counts||{}).length,seasons.size,'Undeclared/unmatched season');
  return {records:data.rows.length,unique_events:ids.size,seasons:Object.fromEntries([...seasons].sort())};
}
function score(rows,key){
  let ll=0,brier=0,hits=0;
  for(const r of rows){
    const p=r[key],w=r.winner_index;
    ll-=Math.log(Math.max(Number.EPSILON,p[w]));
    brier+=p.reduce((v,x,i)=>v+(x-(i===w?1:0))**2,0);
    hits+=Number(p.indexOf(Math.max(...p))===w);
  }
  return {n:rows.length,log_loss:ll/rows.length,multiclass_brier:brier/rows.length,top1_accuracy:hits/rows.length};
}
export function pairedScores(rows){
  assert(Array.isArray(rows)&&rows.length,'No matched events');
  const baseline=score(rows,KEYS[0]),challenger=score(rows,KEYS[1]);
  return {baseline,challenger,challenger_minus_baseline:{
    log_loss:challenger.log_loss-baseline.log_loss,
    multiclass_brier:challenger.multiclass_brier-baseline.multiclass_brier,
    top1_accuracy:challenger.top1_accuracy-baseline.top1_accuracy
  }};
}
function random(seed){
  assert(Number.isInteger(seed)&&seed>=0&&seed<=0xffffffff,'Invalid seed');
  let state=seed>>>0;
  return ()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
}
function percentile(a,q){
  const x=(a.length-1)*q,l=Math.floor(x),h=Math.ceil(x);
  return a[l]+(a[h]-a[l])*(x-l);
}
export function dateClusterIntervals(rows,{replicates=2000,seed=20261123}={}){
  assert(Number.isInteger(replicates)&&replicates>=100&&replicates<=10000,'Invalid replicate count');
  const bySeason=new Map();
  for(const r of rows){
    const dates=bySeason.get(r.season)||new Map(),group=dates.get(r.date)||[];
    group.push(r);dates.set(r.date,group);bySeason.set(r.season,dates);
  }
  const seasons=[...bySeason.values()].map(d=>[...d.values()]);
  assert(seasons.length && seasons.every(d=>d.length>=2),'Insufficient date clusters');
  const rng=random(seed),series={log_loss:[],multiclass_brier:[],top1_accuracy:[]};
  for(let i=0;i<replicates;i++){
    const sample=[];
    for(const dates of seasons)for(let j=0;j<dates.length;j++){
      sample.push(...dates[Math.floor(rng()*dates.length)]);
    }
    const d=pairedScores(sample).challenger_minus_baseline;
    for(const key of Object.keys(series))series[key].push(d[key]);
  }
  const ci={};
  for(const [key,values] of Object.entries(series)){
    values.sort((a,b)=>a-b);ci[key]=[percentile(values,.025),percentile(values,.975)];
  }
  return {method:'SEASON_STRATIFIED_MATCH_DATE_CLUSTER_BOOTSTRAP_EXPLORATORY',
    replicates,seed,unique_date_clusters:seasons.reduce((n,d)=>n+d.length,0),interval_95:ci,
    limitations:'Exploratory only; repeated-team dependence, retrospective reconstruction and previously exposed evaluation data remain unresolved.'};
}
export function readinessGate(registered,qualified){
  assert(Number.isInteger(registered)&&registered>=0&&Number.isInteger(qualified)&&qualified>=0&&qualified<=registered);
  return {target:1000,registered,outstanding:Math.max(0,1000-registered),
    empirically_qualified:qualified,experiment_tournament:'BLOCKED',
    reason:registered<1000?'CATALOGUE_BELOW_AGREED_THRESHOLD':'REQUIRES_SCHEMA_PROVENANCE_REVIEW_AND_USER_APPROVAL',
    bookmaker_odds_verified:false,verified_positive_ev:false,live_betting_publication:'BLOCKED'};
}
