'use strict';
// Source-specific, retrospective closing-market benchmark only.
// TipsAudit CC BY 4.0: https://github.com/tipsaudit/track-record-public
const fs=require('node:fs');
const M=require('./core.js');
const {parseCSV}=require('./import-football-csv.cjs');
const GATES=Object.freeze({research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED'});
const required=['id','kickoff_utc','league','result','void_reason','pin_close_home','pin_close_draw','pin_close_away'];
function summarize(raw,{source_sha=null}={}){
  const rows=parseCSV(raw),headers=rows.shift().map(x=>x.trim());
  if(!headers.length||new Set(headers).size!==headers.length||required.some(x=>!headers.includes(x)))
    throw Error('Unrecognised or incomplete TipsAudit source schema');
  const h=Object.fromEntries(headers.map((x,i)=>[x,i]));
  const reasons={void:0,missing_result:0,missing_or_invalid_market:0,invalid_rows:0,duplicate_id:0};
  const seen=new Set(), leagues=new Set();
  let logLoss=0,brier=0,overround=0,scored=0;
  for(const row of rows){
    if(row.length!==headers.length){reasons.invalid_rows++;continue;}
    const get=k=>row[h[k]].trim();
    if(!get('id')){reasons.invalid_rows++;continue;}
    if(seen.has(get('id'))){reasons.duplicate_id++;continue;}
    seen.add(get('id'));
    if(get('void_reason')){reasons.void++;continue;}
    const result={'1':0,'X':1,'2':2}[get('result')];
    if(result===undefined){reasons.missing_result++;continue;}
    const odds=['pin_close_home','pin_close_draw','pin_close_away'].map(k=>Number(get(k)));
    if(['pin_close_home','pin_close_draw','pin_close_away'].some(k=>get(k)==='')||
       !odds.every(x=>Number.isFinite(x)&&x>1)){reasons.missing_or_invalid_market++;continue;}
    const market=M.deVig(odds),score=market&&M.score(market.probabilities,result);
    if(!market||!score){reasons.missing_or_invalid_market++;continue;}
    scored++;logLoss+=score.logLoss;brier+=score.brier;overround+=market.overround;leagues.add(get('league'));
  }
  return {...GATES,status:scored?'EXTERNAL_MARKET_BENCHMARK_UNVALIDATED':'NO_SCORABLE_MARKETS',
    source:'TipsAudit public football prediction dataset',
    attribution:'TipsAudit (https://tipsaudit.com), CC BY 4.0',
    source_repository:'https://github.com/tipsaudit/track-record-public',
    source_file:'datasets/tipsaudit-predictions-all.csv',
    source_blob_sha:source_sha,
    benchmark_kind:'RETROSPECTIVE_PINNACLE_CLOSING_1X2',
    method:'PROPORTIONAL_DE_VIG',
    counts:{submitted:rows.length,scored,excluded:rows.length-scored,reasons,leagues_on_scored_rows:leagues.size},
    metrics:{closing_market_log_loss:scored?logLoss/scored:null,
      closing_market_multiclass_brier:scored?brier/scored:null,
      mean_closing_overround:scored?overround/scored:null},
    limitations:[
      'External source-reported results and odds, not independently attested by Value Watch.',
      'This is a market-only benchmark and contains no Value Watch model forecasts.',
      'Source CSV alone does not attest exact closing quote timestamps or tradable liquidity.',
      'Public source may contain later data amendments; preserve the source SHA for reproduction.',
      'The dataset consists of an external prediction track record and is not an unbiased complete fixture census.',
      'No expected value, closing-line trading advantage, profitability or betting picks can be inferred.'
    ]};
}
function main(args){
  if(args.length!==2)throw Error('Usage: node research/market-benchmark/tipsaudit-benchmark.cjs DOWNLOADED.csv PRIVATE_OUTPUT.json');
  const [input,output]=args;
  if(require('node:path').resolve(input)===require('node:path').resolve(output))throw Error('Same input/output file');
  const result=summarize(fs.readFileSync(input,'utf8'));
  fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{encoding:'utf8',flag:'wx',mode:0o600});
  process.stdout.write('Source-scored historical markets: '+result.counts.scored+'; model validation BLOCKED\n');
}
if(require.main===module){try{main(process.argv.slice(2));}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={summarize};
