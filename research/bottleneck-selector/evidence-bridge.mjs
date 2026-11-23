import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {assessBottleneck, METHODS} from './selector.mjs';

const finite=n=>typeof n==='number'&&Number.isFinite(n);
const time=x=>typeof x==='string'&&/T.*(?:Z|[+-]\d\d:\d\d)$/.test(x)&&Number.isFinite(Date.parse(x));
const equal=(a,b,tol=1e-8)=>Math.abs(a-b)<tol;
const digest=txt=>createHash('sha256').update(txt).digest('hex');
function vector(p){assert(Array.isArray(p)&&p.length===3&&p.every(x=>finite(x)&&x>=0&&x<=1)&&equal(p.reduce((a,b)=>a+b,0),1,1e-6),'Invalid 1X2 vector')}
function scores(rows,k){let ll=0,br=0,hit=0;for(const r of rows){const p=r[k],y=r.winner_index;ll-=Math.log(Math.max(p[y],Number.EPSILON));br+=p.reduce((a,x,i)=>a+(x-(i===y?1:0))**2,0);hit+=+(p.indexOf(Math.max(...p))===y)}return{n:rows.length,log_loss:ll/rows.length,multiclass_brier:br/rows.length,top1_accuracy:hit/rows.length}}
function historical(h){
 assert(h?.meta?.research_only===true&&h.meta.validated===false&&h.meta.model_publication_gate==='BLOCKED'&&/RECONSTRUCTED/.test(h.meta.name),'Unsafe historical archive');
 assert.deepEqual(h.meta.outcomes_order,['home','draw','away']);assert(Array.isArray(h.rows)&&h.rows.length,'No historical matches');
 const seen=new Set(),seasons={};for(const r of h.rows){
   assert(typeof r.id==='string'&&r.id&&!seen.has(r.id),'Duplicate historical event');seen.add(r.id);
   assert(typeof r.date==='string'&&r.id.includes(r.date),'Historical identity mismatch');
   assert(Array.isArray(r.ft)&&r.ft.length===2&&r.ft.every(n=>Number.isInteger(n)&&n>=0),'Invalid result');
   assert.equal(r.winner_index,r.ft[0]>r.ft[1]?0:r.ft[0]===r.ft[1]?1:2,'Result contradiction');
   vector(r.p_unadjusted);vector(r.p_recent_form_alpha_0_025);seasons[r.season]=(seasons[r.season]||0)+1;
 }
 assert.deepEqual(Object.keys(seasons).sort(),Object.keys(h.counts||{}).sort(),'Historical season mismatch');
 for(const [s,n] of Object.entries(seasons))assert.equal(h.counts[s].eligible,n,'Historical count mismatch');
 const base=scores(h.rows,'p_unadjusted'),form=scores(h.rows,'p_recent_form_alpha_0_025');
 for(const [actual,stored] of [[base,h.metrics?.unadjusted],[form,h.metrics?.form]]){
  assert(stored&&stored.n===actual.n,'Historical metric count mismatch');
  for(const k of ['log_loss','multiclass_brier','top1_accuracy'])assert(finite(stored[k])&&equal(stored[k],actual[k]),'Historical metric mismatch '+k);
 }
 return{evidence_tier:'RETROSPECTIVE_RECONSTRUCTION_NOT_PREMATCH_ATTESTED',events:seen.size,seasons,
   reconstructed_variants:[{id:'p_unadjusted',identity:'NOT_CURRENT_ENGINE_2_5',...base},{id:'p_recent_form_alpha_0_025',identity:'NOT_EXPERIMENTAL_ENGINE_3_0',...form}],
   form_minus_baseline_log_loss:form.log_loss-base.log_loss,eligible_for_engine_selection:false};
}
function prospective(ledger,results){
 assert(ledger?.schemaVersion===1&&ledger.kind==='PROSPECTIVE_PREDICTION_LEDGER'&&ledger.modelValidated===false&&Array.isArray(ledger.records),'Invalid forecast ledger');
 assert(results?.schemaVersion===1&&results.kind==='VERIFIED_OUTCOME_FEED'&&Array.isArray(results.records),'Invalid outcome feed');
 const ids=new Set(),sports={},models={};for(const p of ledger.records){
  assert(typeof p.prediction_id==='string'&&p.prediction_id&&!ids.has(p.prediction_id),'Duplicate or missing forecast receipt');ids.add(p.prediction_id);
  assert(p.research_only===true&&p.model_validated===false,'Forecast is not research-only');
  assert(time(p.recorded_at_utc)&&time(p.event_start_utc)&&Date.parse(p.recorded_at_utc)<Date.parse(p.event_start_utc),'Forecast not frozen before event');
  assert(time(p.source_observed_at_utc)&&Date.parse(p.source_observed_at_utc)<=Date.parse(p.recorded_at_utc),'Source not available by forecast cutoff');
  const v=Object.values(p.probabilities||{});assert(v.length>=2&&v.every(x=>finite(x)&&x>=0&&x<=1)&&equal(v.reduce((a,b)=>a+b,0),1,1e-6),'Invalid forecast probability');
  sports[p.sport]=(sports[p.sport]||0)+1;models[p.model_version]=(models[p.model_version]||0)+1;
 }
 return{forecasts:ledger.records.length,outcome_archive_rows:results.records.length,by_sport:sports,by_model:models,
  independent_result_attestations_in_this_bridge:0,pairing_status:results.records.length?'EXTERNAL_RESULT_REVIEW_REQUIRED':'NO_RESULTS_TO_PAIR',eligible_for_engine_selection:false};
}
export function buildEvidenceSnapshot({history,ledger,results,report,progress,sourceTexts={}}){
 const h=historical(history),p=prospective(ledger,results);
 assert(progress?.target===1000&&Number.isInteger(progress.registered)&&progress.registered>=0&&progress.remaining===Math.max(0,1000-progress.registered)&&Number.isInteger(progress.qualified)&&progress.qualified>=0,'Invalid catalogue progress');
 assert(report?.schema_version===1&&report.kind==='INDEPENDENT_RESEARCH_PERFORMANCE_V1'&&report.research_only===true&&report.model_validation==='UNVALIDATED'&&report.publication_gate==='BLOCKED'&&report.verified_betting_value===false&&report.verified_roi===false,'Unsafe report');
 assert(report.forecast_records===p.forecasts&&report.outcome_archive_records===p.outcome_archive_rows,'Published report/ledger count mismatch');
 assert(Number.isInteger(report.contract_matched_pairs)&&report.contract_matched_pairs>=0&&report.contract_matched_pairs<=p.outcome_archive_rows,'Unsupported paired result count');
 assert(Array.isArray(report.paired_model_comparisons),'Invalid paired model archive');
 return{schema_version:1,kind:'BOTTLENECK_EVIDENCE_BRIDGE_V1',research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED',
  selected_method:null,betting_eligible:false,selection_eligible:false,
  catalogue:{target:1000,registered:progress.registered,remaining:progress.remaining,qualified:progress.qualified,reviewed_and_approved:false},
  historical:h,prospective:p,
  weekly_report:{verdict:report.verdict,scored_pairs:report.contract_matched_pairs,pairwise_comparisons:report.paired_model_comparisons.length},
  flat_options:METHODS.map(m=>({id:m.id,kind:m.kind,label:m.label})),
  input_hashes:Object.fromEntries(Object.entries(sourceTexts).map(([k,text])=>[k,digest(text)])),
  decision:'ABSTAIN_NO_ATTESTED_ENGINE_MAPPING_OR_INDEPENDENT_PROSPECTIVE_COMPARISON'};
}
export function screenEvent(snapshot,event,nowUTC){
 assert(snapshot?.kind==='BOTTLENECK_EVIDENCE_BRIDGE_V1'&&snapshot.research_only===true&&snapshot.selection_eligible===false,'Unsafe bridge snapshot');
 return assessBottleneck({event,nowUTC,assessments:[],controls:{catalogue_registered:snapshot.catalogue.registered,
  catalogue_provenance_reviewed:false,user_approved_tournament:false}});
}
const me=process.argv[1]&&resolve(process.argv[1]);
if(me&&me===fileURLToPath(import.meta.url)){
 try{const root=resolve(dirname(me),'../..');const locations={history:'research/football-baseline-v1/608-reconstructed-forecasts.json',
  ledger:'prediction-ledger.json',results:'results-feed.json',report:'research/performance-report-latest.json',progress:'research/mathematical-library/progress.v1.json'};
  const sourceTexts=Object.fromEntries(Object.entries(locations).map(([key,path])=>[key,readFileSync(resolve(root,path),'utf8')]));
  const parsed=Object.fromEntries(Object.entries(sourceTexts).map(([key,text])=>[key,JSON.parse(text)]));
  process.stdout.write(JSON.stringify(buildEvidenceSnapshot({...parsed,sourceTexts}),null,2)+'\n');
 }catch(error){console.error('Bottleneck evidence fail-closed:',error.message);process.exitCode=1}
}
