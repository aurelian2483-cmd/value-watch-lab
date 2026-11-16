'use strict';
// Research-only hindsight audit of originally captured probabilities against
// existing two-publisher result corroboration. No forecast attestation is implied.
const Audit=require('../../research-audit-core.js');
const Market=require('../market-benchmark/core.js');
const G=Object.freeze({research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED'});
const norm=x=>typeof x==='string'?x.trim().toLowerCase().replace(/\s+/g,' '):'';
const key=(home,away,kickoff)=>JSON.stringify([norm(home),norm(away),Date.parse(kickoff)]);
function compare(receipt,settled,now=Date.now()){
  if(receipt?.status!=='REPOSITORY_SNAPSHOT_RECEIPT_NOT_INDEPENDENT_ATTESTATION'||
     receipt?.publication_gate!=='BLOCKED'||!Array.isArray(receipt.records)||receipt.records.length>20000)
    throw Error('Invalid research forecast receipt');
  const results=Audit.normalizeFootballResults(settled,now);
  const byKey=new Map();
  for(const r of results){
    const k=key(r.home,r.away,r.startUTC);
    if(byKey.has(k))byKey.set(k,null);else byKey.set(k,r);
  }
  const counts={captured:receipt.records.length,matched_results:0,unmatched:0,ambiguous:0,
    no_same_model:0,invalid:0,scored_exploratory:0,attested_eligible:0};
  let loss=0,brier=0;
  for(const f of receipt.records){
    if(!f||f.publication_gate!=='BLOCKED'||f.timestamp_independently_attested!==false||
       !f.model_version||!Array.isArray(f.probabilities)||!f.home||!f.away||
       !Number.isFinite(Date.parse(f.kickoff_utc))||
       !Number.isFinite(Date.parse(f.capture_at_utc))||
       Date.parse(f.capture_at_utc)>=Date.parse(f.kickoff_utc)){counts.invalid++;continue;}
    const k=key(f.home,f.away,f.kickoff_utc);
    if(!byKey.has(k)){counts.unmatched++;continue;}
    const result=byKey.get(k);
    if(!result){counts.ambiguous++;continue;}
    if(result.model!==f.model_version){counts.no_same_model++;continue;}
    counts.matched_results++;
    const winner=result.score_home>result.score_away?0:result.score_home===result.score_away?1:2;
    const score=Market.score(f.probabilities,winner);
    if(!score){counts.invalid++;continue;}
    counts.scored_exploratory++;loss+=score.logLoss;brier+=score.brier;
  }
  return {...G,status:counts.scored_exploratory?'UNATTESTED_PAIRED_EXPLORATORY_ERRORS':'NO_USABLE_SETTLED_PAIR',
    counts,metrics:{unattested_model_log_loss:counts.scored_exploratory?loss/counts.scored_exploratory:null,
      unattested_model_multiclass_brier:counts.scored_exploratory?brier/counts.scored_exploratory:null},
    limitations:['Source two-publisher agreement supports result corroboration but not independent forecast timestamp attestation.',
      'Exact team/UTC matching is not full event identity or league proof.',
      'No paired closing bookmaker quotes are present in this comparison.',
      'Exploratory errors cannot be used for official model selection, verified EV, profit or betting publication.']};
}
module.exports={compare};
