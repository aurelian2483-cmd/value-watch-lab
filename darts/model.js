/* Value Watch darts research model. No odds, no betting recommendations. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.ValueWatchDarts=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const VERSION='DARTS_ELO_K24_RESEARCH_V1', K=24, MIN_MATCHES=8;
 const iso=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(s)&&Number.isFinite(Date.parse(s));
 const id=s=>typeof s==='string'&&s.length>0&&s.length<=100&&/^[a-zA-Z0-9_:.-]+$/.test(s);
 const str=s=>typeof s==='string'&&s.trim().length>0&&s.trim().length<=160;
 const prob=(a,b)=>1/(1+10**((b-a)/400));
 function validateResults(input){
  if(!Array.isArray(input)||input.length>50000)throw Error('Results must be an array of at most 50,000 records');
  const seen=new Set(),list=[];
  for(const row of input){
   if(!row||!id(row.id)||!iso(row.played_at)||!row.player_a||!row.player_b||!id(row.player_a.id)||!id(row.player_b.id)||!str(row.player_a.name)||!str(row.player_b.name)||row.player_a.id===row.player_b.id||!id(row.winner_id)||![row.player_a.id,row.player_b.id].includes(row.winner_id)||seen.has(row.id)||row.status!=='FINAL')throw Error('Invalid or duplicated final result');
   seen.add(row.id);list.push(row);
  }
  return list.sort((a,b)=>Date.parse(a.played_at)-Date.parse(b.played_at)||a.id.localeCompare(b.id));
 }
 function validateFixtures(input,cutoff){
  if(!Array.isArray(input)||input.length>1000)throw Error('Fixtures must be an array of at most 1,000 records');
  const seen=new Set();
  return input.map(row=>{
   if(!row||!id(row.id)||!iso(row.start_utc)||Date.parse(row.start_utc)<=cutoff+300000||row.status!=='SCHEDULED'||!row.player_a||!row.player_b||!id(row.player_a.id)||!id(row.player_b.id)||row.player_a.id===row.player_b.id||!str(row.player_a.name)||!str(row.player_b.name)||!str(row.competition)||seen.has(row.id))throw Error('Invalid, duplicated or non-upcoming fixture');
   seen.add(row.id);return row;
  });
 }
 // Conservative: date-only historical results are withheld to avoid ordering leakage.
 // All matches in one UTC day receive ratings from strictly earlier UTC dates.
 function model(results,fixtures,generatedAt){
  if(!iso(generatedAt))throw Error('Explicit UTC snapshot timestamp required');
  const cutoff=Date.parse(generatedAt),history=validateResults(results),schedule=validateFixtures(fixtures,cutoff);
  if(history.some(r=>Date.parse(r.played_at)>=cutoff))throw Error('Historical match occurs after model snapshot cutoff');
  const ratings=new Map(),count=new Map(),get=x=>ratings.get(x)??1500;
  const groups=new Map();
  for(const r of history){const day=r.played_at.slice(0,10);if(!groups.has(day))groups.set(day,[]);groups.get(day).push(r)}
  for(const day of [...groups.keys()].sort()){
   const rows=groups.get(day),changes=new Map();
   for(const r of rows){
    const a=r.player_a.id,b=r.player_b.id,expected=prob(get(a),get(b)),actual=r.winner_id===a?1:0;
    const delta=K*(actual-expected);changes.set(a,(changes.get(a)||0)+delta);changes.set(b,(changes.get(b)||0)-delta);
    count.set(a,(count.get(a)||0)+1);count.set(b,(count.get(b)||0)+1);
   }
   for(const [player,delta] of changes)ratings.set(player,get(player)+delta);
  }
  const output=schedule.map(f=>{
   const a=f.player_a,b=f.player_b,na=count.get(a.id)||0,nb=count.get(b.id)||0;
   const pa=na>=MIN_MATCHES&&nb>=MIN_MATCHES?prob(get(a.id),get(b.id)):null;
   return {id:f.id,competition:f.competition,start_utc:f.start_utc,player_a:a,player_b:b,
    rating_a:na?get(a.id):null,rating_b:nb?get(b.id):null,prior_a:na,prior_b:nb,
    prob_a:pa,prob_b:pa===null?null:1-pa,
    status:pa===null?'INSUFFICIENT_HISTORY':'EXPERIMENTAL_UNCALIBRATED'};
  });
  return {model:VERSION,generated_at_utc:generatedAt,training_matches:history.length,
   research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED',
   odds:null,expected_value:null,betting_eligible:false,fixtures:output};
 }
 return Object.freeze({VERSION,K,MIN_MATCHES,prob,validateResults,validateFixtures,model});
});
