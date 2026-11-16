'use strict';
// Research snapshot receipts. Records what the repository already published;
// does not recompute forecasts or certify that the forecast was independently witnessed.
const fs=require('node:fs'),crypto=require('node:crypto'),path=require('node:path');
const G=Object.freeze({research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED'});
const parse=x=>typeof x==='string'&&/(Z|[+-]\d{2}:\d{2})$/.test(x)&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
const vector=p=>Array.isArray(p)&&p.length===3&&p.every(x=>typeof x==='number'&&Number.isFinite(x)&&x>0&&x<1)&&Math.abs(p.reduce((a,b)=>a+b,0)-1)<1e-8;
function capture(feed,{captured_at_utc,source_sha256,repository_commit}={}){
  const captureTime=parse(captured_at_utc);
  if(captureTime===null||!(/^[0-9a-f]{64}$/i).test(source_sha256||'')||!(/^[0-9a-f]{40}$/i).test(repository_commit||''))
    throw Error('Capture requires actual UTC offset-aware timestamp, source SHA-256, and repository commit');
  if(!feed||feed.research_only!==true||feed.model_validation!=='UNVALIDATED'||feed.publication_gate!=='BLOCKED'||
     !Array.isArray(feed.experimental_model_forecasts)||feed.experimental_model_forecasts.length>20000)
    throw Error('Incorrect source snapshot or safety gates');
  const generated=parse(feed.generated_at_utc);
  if(generated===null||generated>captureTime||captureTime-generated>48*3600*1000)
    throw Error('Stale or future-dated published source');
  const records=[],excluded={started_or_within_cutoff:0,invalid_event_or_vector:0,duplicate_identity:0};
  const seen=new Set();
  for(const f of feed.experimental_model_forecasts){
    const start=parse(f?.kickoff_utc),p=[f?.prob_home,f?.prob_draw,f?.prob_away];
    const key=JSON.stringify([f?.home,f?.away,f?.kickoff_utc,f?.model]);
    if(seen.has(key)){excluded.duplicate_identity++;continue;}
    seen.add(key);
    if(!f||!f.home||!f.away||!f.model||start===null||!vector(p)){excluded.invalid_event_or_vector++;continue;}
    // The lag prevents treating an in-progress refresh as a confirmed future forecast.
    if(start<=captureTime+5*60*1000){excluded.started_or_within_cutoff++;continue;}
    records.push({home:f.home,away:f.away,kickoff_utc:f.kickoff_utc,market_id:'REGULATION_TIME_1X2',
      model_version:f.model,probabilities:p,source_generated_at_utc:feed.generated_at_utc,
      capture_at_utc:captured_at_utc,source_sha256,repository_commit,
      timestamp_independently_attested:false,challenge_eligible:0,...G});
  }
  records.sort((a,b)=>a.kickoff_utc.localeCompare(b.kickoff_utc)||a.home.localeCompare(b.home)||a.model_version.localeCompare(b.model_version));
  return {schema_version:1,...G,status:'REPOSITORY_SNAPSHOT_RECEIPT_NOT_INDEPENDENT_ATTESTATION',
    captured_at_utc,source_sha256,repository_commit,count:records.length,excluded,records,
    limitations:['Capture time is the processing clock; externally independently attested publication is not established.',
      'Source-generated timestamp is metadata, not proof of immutable pre-event publication.',
      'Future corrections must produce new receipts rather than changing this original artifact.',
      'Model selection and betting publication remain blocked until an independent evidence audit.']};
}
function main(args){
  if(args.length!==2)throw Error('Usage: node research/forecast-receipts/capture.cjs SOURCE.json NEW_RECEIPT.json');
  const [input,out]=args;if(path.resolve(input)===path.resolve(out))throw Error('Output may not overwrite source');
  const buf=fs.readFileSync(input),source_sha256=crypto.createHash('sha256').update(buf).digest('hex');
  const timestamp=new Date().toISOString();
  const repository_commit=process.env.GITHUB_SHA;
  const receipt=capture(JSON.parse(buf.toString('utf8')),{captured_at_utc:timestamp,source_sha256,repository_commit});
  fs.writeFileSync(out,JSON.stringify(receipt,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log('Forecast snapshot receipt:',receipt.count,'future research estimates; not independently attested');
}
if(require.main===module){try{main(process.argv.slice(2));}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={capture};
