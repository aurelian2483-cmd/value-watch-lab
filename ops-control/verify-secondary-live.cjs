'use strict';
// Live parser compatibility test, using the same public page as scheduled monitoring.
const {SOURCE,extract,reconcile}=require('./racing-secondary.cjs');
const fs=require('node:fs');
(async()=>{
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),15000);
 try{
  const now=new Date(),date=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
  const response=await fetch(SOURCE,{signal:ctrl.signal,redirect:'error',headers:{'user-agent':'ValueWatchOps/1.0 public research check'}});
  if(!response.ok)throw Error('Secondary source HTTP '+response.status);
  const html=await response.text();
  const result=extract(html,date);
  console.log('LIVE SECONDARY PARSER',JSON.stringify({date,status:result.status,venues:result.meetings?.map(x=>({name:x.name,country:x.country,races:x.races,status:x.status})),diagnostics:result.diagnostics||null}));
  if(result.status!=='SOURCE_OBSERVED'||!result.meetings?.length)throw Error('Live secondary HTML not independently parsed');
  const primary=JSON.parse(fs.readFileSync('racing-research-data.json','utf8'));
  if(primary.race_date_uk===date){
   const comparison=reconcile(primary,result,now.toISOString());
   console.log('LIVE PRIMARY/SECONDARY RECONCILIATION',JSON.stringify({status:comparison.status,missing:comparison.missing,unexpected:comparison.unexpected,raceCountMismatches:comparison.raceCountMismatches,decision:comparison.decision}));
   if(comparison.status!=='MEETING_LIST_MATCHED_NOT_CERTIFIED')throw Error('Real main-branch source and secondary meeting lists do not match');
  }else console.log('Primary source date differs from live UK date; end-to-end comparison requires a same-date main snapshot');
 }finally{clearTimeout(timer)}
})().catch(e=>{console.error(e.message);process.exitCode=1});
