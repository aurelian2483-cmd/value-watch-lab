'use strict';
// Candidate link audit only: exact kickoff + exact normalised teams, NEVER fuzzy matching.
// External source track record is not a complete fixture census.
const fs=require('node:fs');
const {parseCSV}=require('./import-football-csv.cjs');
const G=Object.freeze({research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED'});
const clean=x=>typeof x==='string'?x.normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' '):'';
const instant=x=>typeof x==='string'&&/(Z|[+-]\d{2}:\d{2})$/.test(x)&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
const indexKey=(time,home,away)=>{
  const ms=instant(time);
  if(ms===null||!clean(home)||!clean(away))return null;
  return JSON.stringify([ms,clean(home),clean(away)]);
};
function audit(archive,csv){
  if(!archive||!Array.isArray(archive.entries)||archive.entries.length>100000)throw Error('Invalid Value Watch history');
  const rows=parseCSV(csv),cols=rows.shift().map(c=>c.trim());
  for(const field of ['kickoff_utc','home','away','result','void_reason','pin_close_home','pin_close_draw','pin_close_away'])if(!cols.includes(field))throw Error('External CSV missing '+field);
  if(new Set(cols).size!==cols.length)throw Error('Duplicated CSV header');
  const index=Object.fromEntries(cols.map((x,i)=>[x,i]));
  const ext=new Map();let invalidExternal=0,externalDuplicateKeys=0;
  for(const row of rows){
    if(row.length!==cols.length){invalidExternal++;continue;}
    const get=x=>row[index[x]];
    const k=indexKey(get('kickoff_utc'),get('home'),get('away'));
    if(!k){invalidExternal++;continue;}
    if(ext.has(k)){externalDuplicateKeys++;ext.set(k,null);}
    else ext.set(k,row);
  }
  const counts={value_watch_archive_entries:archive.entries.length,external_rows:rows.length,
    external_invalid_identity:invalidExternal,external_duplicate_identity_keys:externalDuplicateKeys,
    possible_exact_fixture_matches:0,matched_usable_markets:0,
    independently_attested_frozen_forecasts:0,eligible_paired_scores:0,
    missing_exact_fixture:0,ambiguous_external_identity:0,
    incomplete_market_or_result:0,unattested_forecast_timestamp:0,
    duplicate_archive_fixture:0,unmatched_archive_identity:0};
  const seen=new Set();
  for(const r of archive.entries){
    const k=indexKey(r?.kickoff_utc,r?.home,r?.away);
    if(!k){counts.unmatched_archive_identity++;continue;}
    if(seen.has(k)){counts.duplicate_archive_fixture++;continue;}
    seen.add(k);
    if(!ext.has(k)){counts.missing_exact_fixture++;continue;}
    const row=ext.get(k);
    if(!row){counts.ambiguous_external_identity++;continue;}
    counts.possible_exact_fixture_matches++;
    const get=x=>row[index[x]];
    const odds=['pin_close_home','pin_close_draw','pin_close_away'].map(x=>Number(get(x)));
    const outcome={H:'1',D:'X',A:'2'}[r.actual_outcome];
    if(get('void_reason')||!['1','X','2'].includes(get('result'))||
       get('result')!==outcome||
       ['pin_close_home','pin_close_draw','pin_close_away'].some(x=>get(x).trim()==='')||
       !odds.every(x=>Number.isFinite(x)&&x>1)){
      counts.incomplete_market_or_result++;continue;
    }
    counts.matched_usable_markets++;
    // Never promote a coincidentally matching pair: this archive has expressly
    // declared non-attested records. No numeric probability vector is available here.
    if(r.timestamp_independently_attested!==true||
       r.challenge_eligible!==1||!Array.isArray(r.model_probabilities)||r.model_probabilities.length!==3||
       !r.model_frozen_at_utc||instant(r.model_frozen_at_utc)===null||
       instant(r.model_frozen_at_utc)>=instant(r.kickoff_utc)){
      counts.unattested_forecast_timestamp++;continue;
    }
    counts.independently_attested_frozen_forecasts++;
    // Deliberately NOT scored here: rights, quote provenance and settlement
    // require independent operator evidence before evaluate-file.cjs.
  }
  return {...G,status:'MATCH_AUDIT_ONLY_NO_PERFORMANCE_CLAIM',counts,
    limitations:[
      'Exact kickoff and exact normalised home/away text only; no fuzzy aliases or inferred match identity.',
      'External prediction track record is incomplete fixture coverage, so non-matches do not prove missing fixtures.',
      'A matched result/market does not independently certify source, closing timestamp, settlement or archived forecast.',
      'This audit intentionally calculates zero model-versus-market scores or bookmaker expected value.',
      'No outcomes or quotes from the external data source enter Value Watch model selection.'
    ]};
}
function main(args){
  if(args.length!==3)throw Error('Usage: node research/market-benchmark/football-pair-audit.cjs research-history.json external.csv new-summary.json');
  const [a,b,c]=args;
  const path=require('node:path');
  if([a,b].some(p=>path.resolve(p)===path.resolve(c)))throw Error('Output must differ from inputs');
  const result=audit(JSON.parse(fs.readFileSync(a,'utf8')),fs.readFileSync(b,'utf8'));
  fs.writeFileSync(c,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log('Exact fixture research audit: '+result.counts.possible_exact_fixture_matches+' possible pairs; no model-vs-market scoring');
}
if(require.main===module){try{main(process.argv.slice(2));}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={audit,indexKey};
