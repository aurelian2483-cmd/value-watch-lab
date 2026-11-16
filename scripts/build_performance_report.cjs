#!/usr/bin/env node
'use strict';
/** Weekly research report; does not fetch providers or certify any betting result. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const P=require('../validation-centre/performance-core.js');
const root=path.resolve(__dirname,'..');
const read=(name,missing)=>{try{return JSON.parse(fs.readFileSync(path.join(root,name),'utf8'))}catch(e){if(e.code==='ENOENT'&&missing!==undefined)return missing;throw e}};
const stable=o=>crypto.createHash('sha256').update(JSON.stringify(o)).digest('hex');
const ledger=read('prediction-ledger.json'),results=read('results-feed.json'),review=read('research/result-review-status.json',null);
const generated=new Date();
const model=P.build(ledger,results,review,+generated);
if(model.status==='INVALID_ARCHIVE')throw Error('Invalid scored archive; no report emitted');
const weekStart=new Date(Date.UTC(generated.getUTCFullYear(),generated.getUTCMonth(),generated.getUTCDate()));
const day=(weekStart.getUTCDay()+6)%7;weekStart.setUTCDate(weekStart.getUTCDate()-day);
const key=weekStart.toISOString().slice(0,10),periodEnd=new Date(+weekStart+7*86400000).toISOString().slice(0,10);
const feedPaths={'football':'research-dashboard-data.json','racing':'horse-research-status.json','tennis':'other-sports-data.json','nfl':'other-sports-data.json','darts':'darts/feed.json','rugby_union':'rugby-research-data.json','rugby_league':'rugby-research-data.json'};
const sources={};for(const name of Object.values(feedPaths))if(!Object.hasOwn(sources,name))sources[name]=read(name,null);
const health=P.SPORTS.map(s=>{
 const file=feedPaths[s.id],data=sources[file];
 const t=data?.generated_at_utc||data?.report_generated_at_utc,ms=Date.parse(t);
 const fresh=Number.isFinite(ms)&&ms<=+generated+300000&&+generated-ms<=48*3600000;
 return {sport:s.id,source:file,sourceStatus:!data?'MISSING':!fresh?'STALE_OR_UNDATED':'RECENT',
  upstreamResearchOnly:data?.research_only===true,modelValidated:false,
  captureSupport:['tennis','nfl'].includes(s.id)?'PROSPECTIVE_CAPTURE_ENABLED':'NO_UNIFIED_PROSPECTIVE_ADAPTER',
  secondaryResultSupport:s.id==='nfl'?'UNVERIFIED_SECOND_PROVIDER_PILOT':'NOT_ESTABLISHED'};
});
const metrics={};for(const s of P.SPORTS)metrics[s.id]=model.metrics[s.id];
const inputHash=stable({predictions:ledger.records,results:results.records,review:review?.status_counts,reviewTime:review?.generated_at_utc});
const report={schema_version:1,kind:'INDEPENDENT_RESEARCH_PERFORMANCE_V1',research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED',
 generated_at_utc:generated.toISOString(),week_start_utc:key,week_end_exclusive_utc:periodEnd,
 evidence_sha256:inputHash,verified_betting_value:false,verified_roi:false,
 forecast_records:ledger.records.length,outcome_archive_records:results.records.length,contract_matched_pairs:model.totalScored??0,
 verdict:model.status,review:model.review,integrity:model.evidence,source_health:health,performance_by_sport:metrics,paired_model_comparisons:P.compareModels(ledger,results),
 notes:['This is a rolling weekly research report, not a historical weekly backtest.',
 'No score is shown where no independently contract-matched prospective result exists.',
 'Provider status and receipt metadata are not external attestation of authenticity.',
 'Uniform-probability reference is not a bookmaker baseline, market benchmark or positive expected value proof.',
 'Calibration reliability curves and intervals require sufficient independent observations.',
 'Seven sport divisions are listed for coverage; unified capture currently supports only Tennis and NFL.',
 'Tennis lacks a confirmed independent second result provider; NFL second-provider claims are review-only.']};
const out=path.join(root,'research','performance-reports','week-'+key+'.json');
fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
fs.writeFileSync(path.join(root,'research','performance-report-latest.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({week:key,forecastRecords:report.forecast_records,paired:report.contract_matched_pairs,verdict:report.verdict,review:report.review.status,sourceCoverage:health.map(h=>h.sport+':'+h.captureSupport)},null,2));
