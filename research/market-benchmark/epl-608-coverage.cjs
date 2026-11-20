'use strict';
// EPL retrospective coverage gate. Research-only: no bookmaker or model scoring.
// Input: JSON array of replay-eligible matches: [{date:"2025-08-16",home:"...",away:"...",result:"H|D|A"}].
// Odds: manually obtained, rights-cleared Football-Data season CSV(s), combined into one file,
// with Date,HomeTeam,AwayTeam,FTR and one complete SAME-source closing 1X2 family.
// No raw odds or fixture identities are emitted to the aggregate report.
const fs = require('node:fs');
const path = require('node:path');
const FAMILIES = {
  AvgC:['AvgCH','AvgCD','AvgCA'], B365C:['B365CH','B365CD','B365CA'],
  PSC:['PSCH','PSCD','PSCA'], MaxC:['MaxCH','MaxCD','MaxCA']
};
const norm = x => typeof x==='string' ? x.normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ') : '';
function parseCsv(s) {
  if(typeof s!=='string' || s.length>35_000_000) throw Error('CSV input missing or too large');
  let rows=[], row=[], cell='', quoted=false;
  for(let i=0;i<s.length;i++){
    const c=s[i];
    if(quoted){if(c==='"'&&s[i+1]==='"'){cell+='"';i++;}else if(c==='"'){quoted=false;}else cell+=c;}
    else if(c==='"'){if(cell!=='')throw Error('Malformed CSV quote');quoted=true;}
    else if(c===','){row.push(cell);cell='';}
    else if(c==='\n'||c==='\r'){if(c==='\r'&&s[i+1]==='\n')i++;row.push(cell);cell='';if(row.some(v=>v!==''))rows.push(row);row=[];}
    else cell+=c;
  }
  if(quoted)throw Error('Unclosed CSV quote');
  if(cell!==''||row.length){row.push(cell);rows.push(row);}
  return rows;
}
function isoDate(s) {
  if(typeof s!=='string')return null;
  const x=s.trim();let yyyy,mm,dd;
  let m=x.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(m){[,yyyy,mm,dd]=m;}
  else {m=x.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);if(!m)return null;[,dd,mm,yyyy]=m;}
  const iso=yyyy+'-'+mm+'-'+dd;
  const d=new Date(iso+'T00:00:00Z');
  return !Number.isNaN(d.valueOf())&&d.toISOString().slice(0,10)===iso?iso:null;
}
const key=(date,home,away)=>{const d=isoDate(date),h=norm(home),a=norm(away);return d&&h&&a&&h!==a?JSON.stringify([d,h,a]):null;};
function audit(replay, csv, family='AvgC'){
  if(!Array.isArray(replay)||replay.length>2000)throw Error('Expected replay JSON array (max 2000)');
  if(!Object.hasOwn(FAMILIES,family))throw Error('Unsupported odds family');
  const rows=parseCsv(csv), headers=rows.shift()?.map(x=>x.trim().replace(/^\uFEFF/,''));
  if(!headers||new Set(headers).size!==headers.length)throw Error('Missing or duplicate CSV headers');
  const required=['Date','HomeTeam','AwayTeam','FTR',...FAMILIES[family]];
  for(const x of required)if(!headers.includes(x))throw Error('Missing CSV column: '+x);
  const ix=Object.fromEntries(headers.map((x,i)=>[x,i]));
  const get=(r,n)=>r[ix[n]]??'';
  const odds=new Map();let invalidOddsRows=0,duplicateOddsKeys=0;
  for(const r of rows){
    if(r.length!==headers.length){invalidOddsRows++;continue;}
    const k=key(get(r,'Date'),get(r,'HomeTeam'),get(r,'AwayTeam'));
    if(!k){invalidOddsRows++;continue;}
    if(odds.has(k)){duplicateOddsKeys++;odds.set(k,null);}else odds.set(k,r);
  }
  const counts={replay_input_rows:replay.length,unique_replay_fixtures:0,invalid_replay_identity:0,
    duplicate_replay_fixtures:0,external_csv_rows:rows.length,invalid_odds_rows:invalidOddsRows,
    duplicate_odds_identity_keys:duplicateOddsKeys,unmatched_fixture:0,ambiguous_odds_identity:0,
    outcome_disagreement:0,missing_or_invalid_complete_odds:0,matched_complete_odds:0,
    timestamp_verified_pre_event_quotes:0,verified_original_pre_event_model_predictions:0,
    eligible_prospective_model_market_pairs:0};
  const seen=new Set();
  for(const r of replay){
    const k=key(r?.date,r?.home,r?.away);
    if(!k||!['H','D','A'].includes(r?.result)){counts.invalid_replay_identity++;continue;}
    if(seen.has(k)){counts.duplicate_replay_fixtures++;continue;}
    seen.add(k);counts.unique_replay_fixtures++;
    if(!odds.has(k)){counts.unmatched_fixture++;continue;}
    const o=odds.get(k);if(!o){counts.ambiguous_odds_identity++;continue;}
    if(get(o,'FTR')!==r.result){counts.outcome_disagreement++;continue;}
    const raw=FAMILIES[family].map(c=>get(o,c).trim());
    const values=raw.map(Number);
    if(raw.some(v=>v==='')||!values.every(v=>Number.isFinite(v)&&v>1)){
      counts.missing_or_invalid_complete_odds++;continue;
    }
    counts.matched_complete_odds++;
  }
  return {research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED',
    status:'DESCRIPTIVE_FIXTURE_COVERAGE_ONLY',odds_family:family,counts,
    limitations:[
      'Strict exact calendar date and normalized home/away identity; aliases are not inferred.',
      'A matching Football-Data row is not an independently timestamped historical quote.',
      'Closing odds are not a guaranteed executable price or necessarily known at an earlier model decision time.',
      'Input replay row identities/probabilities must be independently reconstructed; aggregate 608 report is not sufficient.',
      'No market-vs-model scores, value, profit or validation claims are computed.'
    ]};
}
function main(args){
  if(args.length!==4||args[2]!=='--family')throw Error('Usage: node epl-608-coverage.cjs replay-fixtures.json football-data.csv --family AvgC|B365C|PSC|MaxC');
  const [replayPath,csvPath,,family]=args;
  const result=audit(JSON.parse(fs.readFileSync(replayPath,'utf8')),fs.readFileSync(csvPath,'utf8'),family);
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
}
if(require.main===module){try{main(process.argv.slice(2));}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={audit,parseCsv,isoDate,key};
