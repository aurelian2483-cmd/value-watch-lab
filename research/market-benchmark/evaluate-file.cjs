'use strict';
// Operator-supplied, permitted historical odds; no fetching, scraping, or publishing raw quotes.
const fs=require('node:fs');
const M=require('./core.js');
const gates=Object.freeze({research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED'});
function compile(payload){
  if(!payload||payload.schema_version!==1||!Array.isArray(payload.events)||payload.events.length>100000)
    throw Error('Invalid historical odds evaluation envelope');
  if(payload.data_rights_confirmed!==true||payload.use_scope!=='PRIVATE_RESEARCH')
    throw Error('Permitted private research data rights are not attested');
  const seen=new Set(),errors={},accepted=[];
  const reject=reason=>{errors[reason]=(errors[reason]||0)+1;};
  for(const event of payload.events){
    if(!event||typeof event!=='object'){reject('INVALID_EVENT');continue;}
    const key=JSON.stringify([event.event_id,event.market_id,event.model_version]);
    if(seen.has(key)){reject('DUPLICATE_EVENT_MARKET_MODEL');continue;}
    seen.add(key);
    if(typeof event.model_version!=='string'||!event.model_version.trim()){reject('MISSING_MODEL_VERSION');continue;}
    if(event.outcome_verified!==true||event.event_identity_verified!==true||event.market_identity_verified!==true||
       event.quote_source_verified!==true||event.model_forecast_archive_verified!==true){
      reject('INDEPENDENT_EVIDENCE_NOT_ATTESTED');continue;
    }
    const out=M.evaluate(event);
    if(out.status!=='RETROSPECTIVE_RESEARCH'){reject(out.reason||'INELIGIBLE');continue;}
    accepted.push(out);
  }
  const count=accepted.length;
  const mean=(key,which)=>count?accepted.reduce((sum,r)=>sum+r[which][key],0)/count:null;
  const delta=(key)=>count?accepted.reduce((sum,r)=>sum+r['delta_'+key],0)/count:null;
  return {...gates,source_use_scope:'PRIVATE_RESEARCH',status:count?'RETROSPECTIVE_AGGREGATE_UNVALIDATED':'NO_ELIGIBLE_COMPARISONS',
    counts:{submitted:payload.events.length,paired_eligible:count,excluded:payload.events.length-count,reasons:errors},
    scores:{model_log_loss:mean('logLoss','model'),closing_market_log_loss:mean('logLoss','market'),
      model_brier:mean('brier','model'),closing_market_brier:mean('brier','market'),
      delta_log_loss:delta('log_loss'),delta_brier:delta('brier')},
    limitations:['Operator evidence flags are assertions, not independently checked by this script.',
      'Closing market is hindsight-only, not a pre-forecast input.',
      'Retrospective aggregate does not establish calibration, executable value or profit.',
      'No raw odds, identities, selections or source URLs included in this output.']};
}
function main(argv){
  if(argv.length!==2)throw Error('Usage: node research/market-benchmark/evaluate-file.cjs PRIVATE_INPUT.json PRIVATE_SUMMARY.json');
  const [input,output]=argv;
  if(require('node:path').resolve(input)===require('node:path').resolve(output))
    throw Error('Input and output paths must differ');
  const data=JSON.parse(fs.readFileSync(input,'utf8'));
  const result=compile(data);
  // Fail closed against unsupported numeric values and prevent accidental raw-data publication.
  fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{encoding:'utf8',flag:'wx',mode:0o600});
  process.stdout.write('Private benchmark aggregate: '+result.counts.paired_eligible+' paired observations; publication BLOCKED\n');
}
if(require.main===module){try{main(process.argv.slice(2));}catch(err){console.error(err.message);process.exitCode=1;}}
module.exports={compile};
