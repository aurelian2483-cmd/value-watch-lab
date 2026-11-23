import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildEvidenceSnapshot} from './evidence-bridge.mjs';
import {buildMethodIdentityReport} from './method-identity.mjs';
import {buildReviewWorklist} from './result-review.mjs';
import {buildSourceVerificationDossier} from './source-verification.mjs';
import {auditRawSourceEvidence} from './raw-source-evidence.mjs';
import {loadLocalOriginalEvidence} from './raw-source-evidence-cli.mjs';
import {buildReviewJournalReport} from './review-journal.mjs';
import {buildRollingHistoryView} from './rolling-history.mjs';

const repoRoot=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const read=(root,path)=>readFileSync(resolve(root,path),'utf8');
const json=(root,path)=>JSON.parse(read(root,path));
const codePaths=[
  'paper-lab/engine.js','paper-lab/experimental.js','paper-lab/hybrid.js',
  'paper-lab/desk-compact-20261116.js','paper-lab/reliability-core.js',
  'paper-lab/sport-methods.js'
];
const sourcePaths={
  history:'research/football-baseline-v1/608-reconstructed-forecasts.json',
  ledger:'prediction-ledger.json',results:'results-feed.json',
  report:'research/performance-report-latest.json',
  progress:'research/mathematical-library/progress.v1.json'
};

export function buildCompletionReport({bridge,identity,worklist,source,raw,journal,rolling}){
  assert(rolling?.kind==='BOTTLENECK_SHARED_ROLLING_HISTORY_V1'&&
    rolling.publication_gate==='BLOCKED'&&rolling.selected_method===null&&
    rolling.frozen_forecast_receipts===bridge.prospective.forecasts&&
    rolling.source_counts['historical-reliability-data.json']>=0,
    'Unified rolling history not connected');
  assert(bridge?.kind==='BOTTLENECK_EVIDENCE_BRIDGE_V1'&&bridge.publication_gate==='BLOCKED'&&
    bridge.selected_method===null&&bridge.selection_eligible===false,'Invalid evidence bridge');
  assert(identity?.kind==='BOTTLENECK_METHOD_IDENTITY_V1'&&identity.selected_method===null&&
    identity.selection_eligible===false&&identity.dropdown_methods?.length===6,'Invalid method identity');
  assert(worklist?.kind==='BOTTLENECK_RESULT_REVIEW_WORKLIST_V1'&&
    worklist.review_packets===worklist.packets.length&&
    worklist.publication_gate==='BLOCKED','Invalid human review worklist');
  assert(source?.kind==='BOTTLENECK_SOURCE_VERIFICATION_DOSSIER_V1'&&
    source.inspectable_packets===worklist.review_packets&&
    source.total_ready_claims===worklist.ready_claims&&
    source.publication_gate==='BLOCKED','Source review/worklist mismatch');
  assert(raw?.kind==='BOTTLENECK_RAW_SOURCE_EVIDENCE_AUDIT_V1'&&
    raw.inspected_review_packets===source.inspectable_packets&&
    raw.raw_sources_missing+raw.hash_consistent_raw_sources+
      raw.hash_mismatched_raw_sources+raw.source_metadata_conflicts===raw.source_receipts_expected&&
    raw.source_receipts_expected===2*source.inspectable_packets&&
    raw.independently_verified_results_added===0&&
    raw.selected_method===null,'Raw-source evidence audit mismatch');
  assert(journal?.kind==='BOTTLENECK_MANUAL_REVIEW_REGISTER_V1'&&
    journal.total_packets===source.inspectable_packets&&
    journal.publication_gate==='BLOCKED'&&
    journal.independent_outcomes_certified===0&&
    journal.selected_method===null&&
    journal.scoring_authorised===false,'Invalid human review journal');
  assert(bridge.prospective.forecasts===worklist.frozen_forecasts&&
    bridge.prospective.outcome_archive_rows===worklist.verified_outcome_archive_rows&&
    bridge.prospective.outcome_archive_rows===source.archived_verified_outcome_records&&
    identity.independent_outcome_rows===bridge.prospective.outcome_archive_rows,
    'Outcome/forecast source drift');
  assert(identity.dropdown_methods.every(x=>x.selection_eligible===false&&
    x.verified_engine_version===null)&&
    identity.source_ledger_groups.every(x=>x.linked_dropdown_method===null),
    'Unverified model affiliation changed unexpectedly');
  assert(journal.queue.length===raw.inspected_review_packets&&
    Object.values(journal.review_status_counts).reduce((a,b)=>a+b,0)===journal.total_packets,
    'Review queue count mismatch');

  const gates=[
    {
      id:'CATALOGUE_1000_QUALITY_GATE',
      passed:bridge.catalogue.registered>=1000&&bridge.catalogue.reviewed_and_approved===true,
      observed:{registered:bridge.catalogue.registered,target:bridge.catalogue.target,
        qualified:bridge.catalogue.qualified,outstanding:bridge.catalogue.remaining},
      need:'Complete the quality-controlled 1,000-entry library and a separate provenance/approval review.'
    },{
      id:'ORIGINAL_RESULT_RESPONSE_BYTES',
      passed:raw.raw_sources_missing===0&&raw.hash_mismatched_raw_sources===0&&
        raw.source_metadata_conflicts===0&&raw.source_receipts_expected>0,
      observed:{expected:raw.source_receipts_expected,matched:raw.hash_consistent_raw_sources,
        missing:raw.raw_sources_missing,hash_mismatches:raw.hash_mismatched_raw_sources},
      need:'Find and permission-check actual first and second source bytes from their original capture time.'
    },{
      id:'INDEPENDENT_RESULT_AUTHENTICATION',
      passed:false,
      observed:{officially_verified_outcomes:bridge.prospective.outcome_archive_rows,
        pending_review_packets:worklist.review_packets,external_source_authentications:0},
      need:'Independent upstream publisher authentication, event-level result checks and documented settlement review.'
    },{
      id:'CANONICAL_ENGINE_VERSION_MAPPING',
      passed:false,
      observed:{website_options:identity.dropdown_methods.length,
        confirmed_ledger_engine_mappings:0},
      need:'Demonstrate exact deployed dropdown model-version, code hash and issued forecast identity.'
    },{
      id:'PROSPECTIVE_PAIRED_COMPARISONS',
      passed:false,
      observed:{verified_scored_pairs:bridge.weekly_report.scored_pairs,
        reviewed_comparator_winners:0},
      need:'Collect fair as-issued same-event model forecasts, independent finals and fresh holdout statistics.'
    },{
      id:'RELEASE_AND_BETTING_AUTHORISATION',
      passed:false,
      observed:{independent_source_certifications:0,
        verified_betting_edge:false,publication_gate:'BLOCKED'},
      need:'Complete research review and separately authorise any deployment or betting feature.'
    }
  ];
  return {
    schema_version:1,kind:'BOTTLENECK_END_TO_END_COMPLETION_AUDIT_V1',
    research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED',
    all_software_stages_chain_verified:true,
    generated_from_snapshot_utc:worklist.generated_from_snapshot_utc,
    private_review_as_of_utc:journal.review_as_of_utc,
    six_method_ids:identity.dropdown_methods.map(x=>x.method_id),
    raw_original_responses_expected:raw.source_receipts_expected,
    raw_original_responses_hash_consistent:raw.hash_consistent_raw_sources,
    raw_original_responses_missing:raw.raw_sources_missing,
    forecast_ledger_records:bridge.prospective.forecasts,
    rolling_history:{
      results_by_sport:rolling.historical_results_by_sport,
      results_by_source:rolling.source_counts,
      previous_7_full_days:rolling.recent_completed_last_7_full_days,
      previous_7_full_days_by_sport:rolling.recent_completed_by_sport,
      refresh_existing_workflow:rolling.refresh.existing_workflow,
      refresh_declared_cron:rolling.refresh.declared_cron_utc,
      source_time_policy:'DATE_ONLY_NEXT_DAY_NO_LOOKAHEAD'
    },
    verified_outcome_records:bridge.prospective.outcome_archive_rows,
    review_packets:worklist.review_packets,
    private_review_decisions:journal.private_decision_entries,
    certified_outcomes_added:0,
    selected_method:null,model_winner_validated:false,
    scoring_authorised:false,betting_eligible:false,
    gates,blockers:gates.filter(x=>!x.passed).map(x=>x.id),
    readiness:'RESEARCH_INFRASTRUCTURE_CONNECTED_EXTERNAL_EVIDENCE_BLOCKED',
    message:'All currently installed research evidence stages are linked, but credible model selection remains unavailable.',
    no_claims:[
      'An in-repository source hash does not authenticate archived original response bytes.',
      'Two agreeing web domains do not prove independent result verification.',
      'A journal review or prospective counter alone does not certify a model.',
      'No odds or positive expected value is claimed.'
    ]
  };
}

/** End-to-end read-only orchestration. No hidden input or network fetches. */
export function runCompletionAudit({
  root=repoRoot,privateManifest=null,privateJournal=null,
  asOfUTC=new Date().toISOString()
}={}){
  const texts=Object.fromEntries(Object.entries(sourcePaths).map(([key,path])=>[key,read(root,path)]));
  const parsed=Object.fromEntries(Object.entries(texts).map(([k,s])=>[k,JSON.parse(s)]));
  const bridge=buildEvidenceSnapshot({...parsed,sourceTexts:texts});
  const codeTexts=Object.fromEntries(codePaths.map(path=>[path,read(root,path)]));
  const identity=buildMethodIdentityReport({
    bridge,ledger:parsed.ledger,football:json(root,'research-dashboard-data.json'),
    racing:json(root,'horse-predictions-data.json'),sourceTexts:codeTexts
  });
  const reviewFiles={review:'research/result-review-status.json',
    primary:'research/provider-result-observations.json',
    secondary:'research/secondary-result-evidence.json'};
  const evidenceTexts=Object.fromEntries(Object.entries(reviewFiles)
    .map(([k,p])=>[k,read(root,p)]));
  const evidenceDocs=Object.fromEntries(Object.entries(evidenceTexts)
    .map(([k,s])=>[k,JSON.parse(s)]));
  const worklist=buildReviewWorklist({
    bridge,identity,ledger:parsed.ledger,results:parsed.results,...evidenceDocs,
    sourceTexts:{...texts,...evidenceTexts,...codeTexts}
  });
  const source=buildSourceVerificationDossier(worklist);
  const privateBytes=privateManifest?loadLocalOriginalEvidence(privateManifest):[];
  const raw=auditRawSourceEvidence(source,privateBytes);
  const review=privateJournal?JSON.parse(readFileSync(resolve(privateJournal),'utf8')):null;
  const journal=buildReviewJournalReport(raw,review,asOfUTC);
  const rolling=buildRollingHistoryView({
    currentFootball:json(root,'historical-reliability-data.json'),
    reconstructedFootball:parsed.history,
    darts:json(root,'darts/feed.json'),
    ledger:parsed.ledger,
    refreshWorkflowText:read(root,'.github/workflows/reliability-results-refresh.yml'),
    asOfUTC
  });
  return buildCompletionReport({bridge,identity,worklist,source,raw,journal,rolling});
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    // Private files, when used, remain local. No public repo path or body emitted.
    const args=process.argv.slice(2);
    assert(args.length===0||args.length===2||args.length===4,
      'Usage: node completion-audit.mjs [--private-manifest PATH] [--private-journal PATH]');
    let privateManifest=null,privateJournal=null;
    const seen=new Set();
    for(let i=0;i<args.length;i+=2){
      assert(['--private-manifest','--private-journal'].includes(args[i])&&
        !seen.has(args[i])&&typeof args[i+1]==='string'&&args[i+1],
        'Invalid private audit option');
      seen.add(args[i]);
      if(args[i]==='--private-manifest')privateManifest=args[i+1];
      if(args[i]==='--private-journal')privateJournal=args[i+1];
    }
    process.stdout.write(JSON.stringify(runCompletionAudit({privateManifest,privateJournal}),null,2)+'\n');
  }catch(error){
    console.error('Bottleneck completion audit failed closed:',error.message);
    process.exitCode=1;
  }
}
