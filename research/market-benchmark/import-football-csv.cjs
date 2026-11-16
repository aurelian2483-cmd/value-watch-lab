'use strict';
/**
 * Private manually-downloaded football CSV market baseline.
 * No network, model forecasts, public snapshots, or invented quote timestamps.
 */
const fs=require('node:fs');
const path=require('node:path');
const M=require('./core.js');
const GATES=Object.freeze({research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED'});
const FIELDS=Object.freeze({
  'AvgC':['AvgCH','AvgCD','AvgCA'],
  'B365C':['B365CH','B365CD','B365CA'],
  'PSC':['PSCH','PSCD','PSCA'],
  'MaxC':['MaxCH','MaxCD','MaxCA']
});
function parseCSV(raw){
  if(typeof raw!=='string'||raw.length>15_000_000)throw Error('Invalid or oversized CSV input');
  const rows=[];let row=[],field='',quoted=false;
  raw=raw.replace(/^\uFEFF/,'');
  for(let i=0;i<raw.length;i++){
    const c=raw[i];
    if(quoted){
      if(c==='"'&&raw[i+1]==='"'){field+='"';i++;continue;}
      if(c==='"'){quoted=false;continue;}
      field+=c;continue;
    }
    if(c==='"'){
      if(field!=='')throw Error('Invalid quoted CSV field');
      quoted=true;
    }else if(c===','){row.push(field);field='';}
    else if(c==='\n'||c==='\r'){
      if(c==='\r'&&raw[i+1]==='\n')i++;
      row.push(field);field='';
      if(row.some(x=>x.trim()))rows.push(row);
      row=[];
    }else field+=c;
  }
  if(quoted)throw Error('Unclosed CSV quotation');
  if(field||row.length){row.push(field);if(row.some(x=>x.trim()))rows.push(row);}
  if(!rows.length||rows.length>50001)throw Error('Invalid CSV row count');
  return rows;
}
function privateMarketSummary(raw,{pricePrefix='AvgC',personalUseConfirmed=false}={}){
  if(personalUseConfirmed!==true)throw Error('Confirm permitted private/personal research use; do not publish source data');
  if(!Object.hasOwn(FIELDS,pricePrefix))throw Error('Unsupported or non-closing odds column family');
  const rows=parseCSV(raw);
  const headings=rows.shift().map(x=>x.trim());
  if(new Set(headings).size!==headings.length)throw Error('Duplicate CSV column headers');
  const needed=['FTR',...FIELDS[pricePrefix]];
  const indices=needed.map(x=>headings.indexOf(x));
  if(indices.some(x=>x<0))throw Error('Required complete closing-market columns unavailable');
  const minLength=headings.length;
  const counts={total:0,scored:0,missing_outcome:0,invalid_prices:0,invalid_rows:0};
  let logSum=0,brierSum=0,marginSum=0;
  for(const line of rows){
    counts.total++;
    if(line.length!==minLength){counts.invalid_rows++;continue;}
    const result=line[indices[0]].trim();
    if(!['H','D','A'].includes(result)){counts.missing_outcome++;continue;}
    const odds=indices.slice(1).map(i=>Number(line[i]));
    const market=M.deVig(odds);
    if(!market){counts.invalid_prices++;continue;}
    const score=M.score(market.probabilities,['H','D','A'].indexOf(result));
    if(!score){counts.invalid_rows++;continue;}
    counts.scored++;logSum+=score.logLoss;brierSum+=score.brier;marginSum+=market.overround;
  }
  return {...GATES,status:counts.scored?'HISTORICAL_MARKET_ONLY_UNATTESTED':'NO_ELIGIBLE_MARKETS',
    source_family:'FOOTBALL_DATA_MANUAL_CSV',data_scope:'PRIVATE_PERSONAL_RESEARCH',
    quote_family:pricePrefix,counts,
    market_only:{mean_log_loss:counts.scored?logSum/counts.scored:null,
      mean_multiclass_brier:counts.scored?brierSum/counts.scored:null,
      mean_overround:counts.scored?marginSum/counts.scored:null},
    limitations:[
      'Manual historical CSV import only; no licensed real-time API connection.',
      'Closing price timestamps are not present or independently established: no pre-event market entry or closing-line value claim.',
      'CSV settlement was not independently verified against a second publisher.',
      'No event-level match to archived model forecasts has been established.',
      'CSV may contain missing or incomplete markets; results are on scored subset only.',
      'Market-only retrospective descriptive scoring is not model superiority, expected value or profit.',
      'No raw match records, odds, team identities or source files published.'
    ]};
}
function main(args){
  if(args.length!==4||args[2]!=='--prefix'||!Object.hasOwn(FIELDS,args[3]))
    throw Error('Usage: node research/market-benchmark/import-football-csv.cjs PRIVATE.csv PRIVATE-summary.json --prefix AvgC|B365C|PSC|MaxC');
  const [input,output,,prefix]=args;
  if(path.resolve(input)===path.resolve(output))throw Error('Input and output must differ');
  // Explicit opt-in is required; no automatic download or licensing inference.
  if(process.env.VALUEWATCH_PRIVATE_PERSONAL_RESEARCH!=='YES')
    throw Error('Set VALUEWATCH_PRIVATE_PERSONAL_RESEARCH=YES only when source conditions are met');
  const result=privateMarketSummary(fs.readFileSync(input,'utf8'),{pricePrefix:prefix,personalUseConfirmed:true});
  fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{encoding:'utf8',flag:'wx',mode:0o600});
  console.log('Private football closing-market summary: '+result.counts.scored+' scored rows; betting BLOCKED');
}
if(require.main===module){try{main(process.argv.slice(2));}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={privateMarketSummary,parseCSV,FIELDS};
