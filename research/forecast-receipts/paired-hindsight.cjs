'use strict';
// Paired hindsight diagnostic ONLY. Neither external closing quotes nor forecast
// original publication timestamps are independently certified for tradability.
const fs=require('node:fs');
const path=require('node:path');
const Audit=require('../../research-audit-core.js');
const M=require('../market-benchmark/core.js');
const {parseCSV}=require('../market-benchmark/import-football-csv.cjs');
const G=Object.freeze({research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED'});
const clean=x=>typeof x==='string'?x.normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' '):'';
const ts=x=>typeof x==='string'&&/(Z|[+-]\d{2}:\d{2})$/.test(x)&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
function id(home,away,kickoff){
  const time=ts(kickoff);
  return time===null||!clean(home)||!clean(away)?null:JSON.stringify([time,clean(home),clean(away)]);
}
function compare(receipt,settlement,externalCSV,now=Date.now()){
  if(receipt?.status!=='REPOSITORY_SNAPSHOT_RECEIPT_NOT_INDEPENDENT_ATTESTATION'||
     receipt?.publication_gate!=='BLOCKED'||receipt?.model_validation!=='UNVALIDATED'||
     !Array.isArray(receipt.records)||receipt.records.length>20000)throw Error('Invalid captured forecast receipt');
  const official=Audit.normalizeFootballResults(settlement,now);
  const settlementMap=new Map();
  for(const r of official){const k=id(r.home,r.away,r.startUTC);
    if(!k)continue;
    if(settlementMap.has(k))settlementMap.set(k,null);
    else settlementMap.set(k,r);
  }
  const all=parseCSV(externalCSV),head=all.shift().map(x=>x.trim());
  const required=['kickoff_utc','home','away','result','void_reason','pin_close_home','pin_close_draw','pin_close_away','teams_reversed_after_logging'];
  if(new Set(head).size!==head.length||required.some(x=>!head.includes(x)))throw Error('External closing-market fields missing or ambiguous');
  const index=Object.fromEntries(head.map((x,i)=>[x,i]));
  const oddsMap=new Map();let malformedExternal=0,duplicateExternal=0;
  for(const r of all){
    if(r.length!==head.length){malformedExternal++;continue;}
    const x=k=>r[index[k]].trim(),k=id(x('home'),x('away'),x('kickoff_utc'));
    if(!k){malformedExternal++;continue;}
    if(oddsMap.has(k)){oddsMap.set(k,null);duplicateExternal++;}else oddsMap.set(k,r);
  }
  const digest=/^[a-f0-9]{64}$/i,commit=/^[a-f0-9]{40}$/i;
  const receiptTime=ts(receipt.captured_at_utc);
  const receiptValid=receiptTime!==null && digest.test(receipt.source_sha256||'') &&
    commit.test(receipt.repository_commit||'');
  // Reject metadata mismatches, rather than silently repairing history.
  // A syntactically sound receipt still does not independently attest when the
  // original probability estimate was created.
  const counts={forecast_records:receipt.records.length,corroborated_settlements:official.length,external_records:all.length,
    examined:0,paired_hindsight:0,no_corrob_final:0,no_external_market:0,ambiguous_identity:0,
    reversed_teams:0,disputed_result:0,missing_market:0,missing_prestart_receipt:0,
    mismatched_model:0,duplicate_forecast:0,not_independently_attested:0,
    invalid_record:0,malformed_external_rows:malformedExternal,duplicate_external_rows:duplicateExternal,
    independently_verified_tradable_pairs:0};
  let modelLoss=0,marketLoss=0,modelBrier=0,marketBrier=0;
  const seen=new Set();
  for(const f of receipt.records){
    const key=id(f?.home,f?.away,f?.kickoff_utc);
    if(!key||f?.publication_gate!=='BLOCKED'||f?.timestamp_independently_attested!==false||
       !f?.model_version||!Array.isArray(f?.probabilities)){counts.invalid_record++;continue;}
    const versionKey=JSON.stringify([key,f.model_version]);
    if(seen.has(versionKey)){counts.duplicate_forecast++;continue;}
    seen.add(versionKey);counts.examined++;
    if(!receiptValid||f.capture_at_utc!==receipt.captured_at_utc ||
       f.source_sha256!==receipt.source_sha256 || f.repository_commit!==receipt.repository_commit ||
       !digest.test(f.source_sha256||'')||!commit.test(f.repository_commit||'') ||
       ts(f.source_generated_at_utc)===null || ts(f.source_generated_at_utc)>receiptTime ||
       ts(f.capture_at_utc)===null || ts(f.capture_at_utc)>=ts(f.kickoff_utc)){
      counts.missing_prestart_receipt++;continue;
    }
    if(!settlementMap.has(key)){counts.no_corrob_final++;continue;}
    const final=settlementMap.get(key);
    if(!final){counts.ambiguous_identity++;continue;}
    if(final.model!==f.model_version){counts.mismatched_model++;continue;}
    if(!oddsMap.has(key)){counts.no_external_market++;continue;}
    const row=oddsMap.get(key);
    if(!row){counts.ambiguous_identity++;continue;}
    const x=k=>row[index[k]].trim();
    if(x('teams_reversed_after_logging')!=='0'){counts.reversed_teams++;continue;}
    if(x('void_reason')!==''){counts.disputed_result++;continue;}
    const win=final.score_home>final.score_away?0:final.score_home===final.score_away?1:2;
    if(['1','X','2'].indexOf(x('result'))!==win){counts.disputed_result++;continue;}
    const columns=['pin_close_home','pin_close_draw','pin_close_away'];
    if(columns.some(c=>!x(c))){counts.missing_market++;continue;}
    const market=M.deVig(columns.map(c=>Number(x(c))));
    const own=M.score(f.probabilities,win),baseline=market&&M.score(market.probabilities,win);
    if(!own||!baseline){counts.missing_market++;continue;}
    counts.paired_hindsight++;
    counts.not_independently_attested++;
    modelLoss+=own.logLoss;marketLoss+=baseline.logLoss;
    modelBrier+=own.brier;marketBrier+=baseline.brier;
  }
  const n=counts.paired_hindsight;
  return {...G,status:n?'PAIRED_HINDSIGHT_NOT_TRADABLE_OR_ATTESTED':'NO_ELIGIBLE_HINDSIGHT_PAIRS',
    counts,metrics:{
      model_log_loss:n?modelLoss/n:null,closing_market_log_loss:n?marketLoss/n:null,
      model_multiclass_brier:n?modelBrier/n:null,closing_market_multiclass_brier:n?marketBrier/n:null,
      paired_delta_log_loss:n?(modelLoss-marketLoss)/n:null,
      paired_delta_brier:n?(modelBrier-marketBrier)/n:null},
    limitations:[
      'Paired hindsight diagnostic only; exact fixture text/UTC is not a unique provider event identifier.',
      'Forecast capture timestamp and original publication are not independently attested.',
      'External closing odds lack independently verifiable quote time and execution evidence.',
      'Two-publisher corroborated final does not establish model forecast integrity.',
      'Closing prices are hindsight-only, never available as inputs to archived forecasts.',
      'Results cannot validate tradable EV, profitability, automatic selections or official betting grades.',
      'No raw source odds, event identities or source provider rows are included in the aggregate output.']};
}
function main(args){
  if(args.length!==4)throw Error('Usage: node research/forecast-receipts/paired-hindsight.cjs receipt.json football-expanded.json external.csv NEW-summary.json');
  const [a,b,c,out]=args;
  if([a,b,c].some(x=>path.resolve(x)===path.resolve(out)))throw Error('Output must differ from all input files');
  const summary=compare(JSON.parse(fs.readFileSync(a,'utf8')),JSON.parse(fs.readFileSync(b,'utf8')),fs.readFileSync(c,'utf8'));
  fs.writeFileSync(out,JSON.stringify(summary,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log('Paired hindsight-only matches:',summary.counts.paired_hindsight,'; independently verified tradable pairs: 0');
}
if(require.main===module){try{main(process.argv.slice(2));}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={compare,id};
