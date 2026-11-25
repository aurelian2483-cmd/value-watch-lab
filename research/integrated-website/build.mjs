// Reconcile approved aggregate receipts and reuse the original Phase 1/3 contract verifiers.
// No dataset access, execution, repair, dispatch, external requests or write to input state.
import {readFileSync,writeFileSync,lstatSync,realpathSync,readdirSync} from 'node:fs'
import {resolve,join} from 'node:path'
import {createHash} from 'node:crypto'
import {pathToFileURL} from 'node:url'
import {digest} from '../scientific-reference/digest.mjs'
import {verifySnapshot} from '../unified-control-centre/overview.mjs'
import {inspect} from '../unified-orchestration/registry.mjs'
import {inspectQueue} from '../unified-orchestration/producer-queue.mjs'
import {supervise} from '../unified-orchestration/operational-review.mjs'
import {render} from './render.mjs'
const pins=JSON.parse(readFileSync(new URL('./source-pins.json',import.meta.url)))
const sha=b=>createHash('sha256').update(b).digest('hex')
const need=(x,m)=>{if(!x)throw Error(m)}
const nat=x=>Number.isSafeInteger(x)&&x>=0
const hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x)
const gate=r=>need(r?.researchOnly===true&&r.modelValidation==='UNVALIDATED'&&r.publicationGate==='BLOCKED'&&r.executionAuthorized===false&&r.validationAuthorized===false,'Unsafe research evidence')
const methodNames={bisection:'Bisection','composite-trapezoid':'Composite trapezoid','composite-simpson':'Composite Simpson','power-iteration-eigenvector':'Power iteration',brier:'Multiclass Brier score','log-loss':'Categorical log loss',rps:'Ranked probability score','auc-roc':'ROC area',ece:'Expected calibration error',pinball:'Pinball quantile loss','interval-score':'Prediction interval score','calibration-in-large':'Calibration-in-the-large'}
const historicalNames={uniform:'Uniform reference',expanding_frequency:'Historical frequencies',league_poisson:'League Poisson',venue_poisson:'Venue-specific Poisson',venue_poisson_form:'Venue Poisson + recent form'}
function safeRead(root,path){
 const p=join(root,path),s=lstatSync(p)
 need(realpathSync(p)===p&&s.isFile()&&s.size>0&&s.size<=4*1024*1024,'Unsafe prepared evidence')
 const raw=readFileSync(p)
 need(raw.length===s.size,'Changed prepared evidence')
 return raw
}
export function project(root){
 root=resolve(root)
 need(realpathSync(root)===root&&lstatSync(root).isDirectory(),'Unsafe prepared directory')
 const raw=p=>safeRead(root,p),json=p=>JSON.parse(raw(p))
 const receipts=json('member-receipts.json')
 const expected=[...pins.artifacts.flatMap(p=>p.members.map(member=>({id:p.id,member}))),{id:'catalogue',member:'catalogue.json'},{id:'hardware',member:'hardware.json'}]
 need(receipts.length===expected.length,'Receipt coverage mismatch')
 for(const {id,member} of expected){
  const a=receipts.filter(x=>x.id===id&&x.member===member)
  need(a.length===1&&hex(a[0].sha256)&&nat(a[0].bytes),'Invalid receipt')
  const b=raw(['catalogue','hardware'].includes(id)?member:id+'/'+member)
  need(sha(b)===a[0].sha256&&b.length===a[0].bytes,'Prepared receipt changed')
 }
 const c=json('catalogue.json')
 const cbytes=raw('catalogue.json')
 need(createHash('sha1').update('blob '+cbytes.length+'\0').update(cbytes).digest('hex')===pins.catalogue.blob,'Catalogue Git blob mismatch')
 need(c.target===1000&&nat(c.registered)&&c.registered+c.remaining===c.target&&c.qualified===0,'Invalid catalogue')
 for(const field of ['byClassification','byStatus','byFamily','byBatch'])
  need(Object.values(c[field]).every(nat)&&Object.values(c[field]).reduce((a,b)=>a+b,0)===c.registered,'Catalogue counts do not reconcile')
 const state=json('preview/evidence/current.json'),r=json('preview/registry/registry.json'),control=json('preview/registry/control.json'),queue=json('preview/queue/queue.json')
 const original=json('phase3/operational-supervisor.json'),release=json('phase3/phase3-release-receipt.json'),resource=json('phase3/synthetic-resource-qa.json')
 gate(original);gate(resource);gate(state)
 need(release.archiveSha256===pins.phase3PreviewSha256&&release.filesVerified===19&&release.tamperRejected===true,'Phase 3 release mismatch')
 verifySnapshot(state.snapshot)
 need(state.snapshot.counts.available===6&&state.stateSha256===original.evidenceStateSha256&&state.authentication===null,'Pinned state mismatch')
 const evidence=join(root,'preview/evidence'),registry=join(root,'preview/registry'),op=join(root,'preview/orchestration-plan.json'),qdir=join(root,'preview/queue'),qp=join(root,'preview/queue-plan.json')
 const args=[evidence,registry,op,sha(raw('preview/orchestration-plan.json')),qdir,qp,sha(raw('preview/queue-plan.json'))]
 const anchors={registrySha256:r.registrySha256,controlSha256:control.controlSha256,queueSha256:queue.queueSha256}
 need(Object.keys(anchors).every(k=>anchors[k]===original[k]),'Original external anchors mismatch')
 const now=original.observedAt
 const status=inspect(...args.slice(0,4),{now,trustedRegistrySha256:anchors.registrySha256,trustedControlSha256:anchors.controlSha256})
 const q=inspectQueue(...args,{now,trustedQueueSha256:anchors.queueSha256})
 const supervisor=supervise(args,anchors,{now})
 need(status.reviewed===7&&status.total===7&&q.reviewed===6&&q.pending===0&&q.cancelled===0&&q.dispatchAuthorized===false,'Operational review mismatch')
 need(supervisor.status==='OPERATIONAL_READINESS_BLOCKED'&&supervisor.metadataReviews===7&&supervisor.queue.reviewed===6,'Supervisor reconciliation failed')
 need(resource.passed===4&&resource.checks.length===4&&resource.checks.every(x=>x.status==='PASS'),'Resource QA mismatch')
 const h=json('hardware.json');gate(h)
 need(h.kind==='LOCAL_FIXED_HARDWARE_EVIDENCE_REVIEW'&&h.scope==='USER_SUPPLIED_UNSIGNED_LOCAL_FIXED_TEST_EVIDENCE'&&h.hardwareIndependentlyVerified===false&&h.productionHardwareAccepted===false&&h.previewStateSha256===state.stateSha256,'Local hardware scope mismatch')
 need(h.review.localFixedChecks==='PASS'&&h.review.benchmarkChecks===64&&h.review.maximumObservedAbsoluteError===0&&['receiptCanonicalHashesMatched','nestedReportHashesMatched','originalReceiptContractVerifierPassed','packageManifestMatched','previewStateMatched'].every(k=>h.review[k]===true),'Local hardware review incomplete')
 const cam=json('campaign/campaign-reconciliation.json');gate(cam)
 need(cam.kind==='SYNTHETIC_CAMPAIGN_RECONCILIATION'&&cam.totalCases===500&&cam.passedCases===500&&cam.failedCases===0&&cam.distinctMethods===12,'Campaign count mismatch')
 const paths=['numerical-campaign.json','numerical-reference.json','forecast-campaign.json','forecast-reference.json']
 need(cam.files.length===4&&paths.every(p=>cam.files.filter(x=>x.path===p&&x.sha256===sha(raw('campaign/'+p))).length===1),'Campaign evidence binding mismatch')
 for(const [name,expectedMethods] of [['numerical',4],['forecast',8]]){
  const ref=json('campaign/'+name+'-reference.json'),source=json('campaign/'+name+'-campaign.json')
  need(ref.counts.total===250&&ref.counts.passed===250&&ref.counts.failed===0&&ref.counts.distinctMethods===expectedMethods&&ref.campaignSha256===source.campaignSha256&&ref.declaredCodeRevision===cam.declaredCodeRevision,'Reference result mismatch')
 }
 const methods=Object.entries({...cam.numericalByMethod,...cam.forecastByMethod}).map(([id,v])=>{
  need(Object.hasOwn(methodNames,id)&&nat(v.total)&&v.passed===v.total&&v.failed===0,'Invalid method summary')
  return {id,name:methodNames[id],...v}
 })
 need(methods.length===12&&methods.reduce((a,b)=>a+b.total,0)===500,'Method totals mismatch')
 const d=json('readiness/readiness.json'),t=json('readiness/synthetic-temporal.json');gate(d);gate(t)
 need(d.kind==='HISTORICAL_EVALUATION_READINESS'&&d.realEvaluationEligibleRows===0&&d.sourceGitMetadataMatches===9&&d.sourceClaimsRecorded===0&&d.archivedOutcomeFeedRows===0&&d.historicalStructurallyAccepted===782&&d.prospectiveStructurallyAccepted===80,'Historical readiness mismatch')
 need(Object.values(d.archivedReviewStates).every(nat)&&Object.values(d.archivedReviewStates).reduce((a,b)=>a+b,0)===80&&t.realEvaluationEligibleRows===0,'Historical review counts mismatch')
 const pilot=json('pilot/pilot-summary.json')
 need(pilot.kind==='OPENLIGADB_SINGLE_MATCHDAY_PILOT'&&pilot.research_only===true&&pilot.model_validation==='UNVALIDATED'&&pilot.publication_gate==='BLOCKED'&&pilot.execution_authorized===false&&pilot.validation_authorized===false&&pilot.protected_evaluation_authorized===false&&pilot.fixture_count===9&&pilot.final_result_shape_accepted_count===9&&pilot.independently_verified_outcomes===0&&pilot.raw_records_published===false,'Pilot scope mismatch')
 const study=json('historical/summary.json');gate(study)
 need(study.kind==='SINGLE_SOURCE_HISTORICAL_DEVELOPMENT_STUDY'&&study.independently_certified_rows===0&&study.cross_source_agreement_established===false&&study.protectedEvaluationAuthorized===false&&study.raw_records_published===false&&study.source_structure_accepted===306&&study.quarantined_adjudication===1&&study.development_cohort===305,'Historical study scope mismatch')
 const b=study.comparison
 need(b.status==='RETROSPECTIVE_DEVELOPMENT_COMPARISON_COMPLETED'&&b.paired_targets===215&&b.empirically_qualified_methods===0&&b.protected_holdout_opened===false&&b.parameter_tuning_performed===false&&b.paired_targets+Object.values(b.excluded_before_scoring).reduce((x,y)=>x+y,0)===305,'Historical comparison mismatch')
 need(Object.keys(b.metrics).length===5&&Object.keys(historicalNames).every(k=>Object.hasOwn(b.metrics,k)),'Historical method identities mismatch')
 const historicalMethods=Object.keys(historicalNames).map(id=>{
  const v=b.metrics[id]
  need(v.n===b.paired_targets&&[v.mean_log_loss,v.mean_multiclass_brier,v.tie_adjusted_top1].every(Number.isFinite)&&v.mean_log_loss>=0&&v.mean_multiclass_brier>=0&&v.mean_multiclass_brier<=2&&v.tie_adjusted_top1>=0&&v.tie_adjusted_top1<=1,'Invalid historical metric')
  return {id,name:historicalNames[id],n:v.n,logLoss:v.mean_log_loss,brier:v.mean_multiclass_brier,accuracy:v.tie_adjusted_top1}
 })
 const result={kind:'INTEGRATED_RESEARCH_WEBSITE_SNAPSHOT',schemaVersion:1,scope:'READ_ONLY_PINNED_EVIDENCE',status:'RESEARCH_NOT_READY',...pins.flags,measurementFreshness:'UNKNOWN',
  catalogue:{...Object.fromEntries(['registered','remaining','target','qualified','byFamily','byClassification','byStatus'].map(k=>[k,c[k]])),revision:pins.catalogue.head},
  originalModules:state.snapshot.modules,
  hardware:{observedAt:h.observedAt,status:h.review.localFixedChecks,benchmarkChecks:h.review.benchmarkChecks,maximumObservedAbsoluteError:h.review.maximumObservedAbsoluteError,hardwareIndependentlyVerified:false,productionHardwareAccepted:false,receiptFingerprints:h.sourceFiles.map(x=>({role:x.role,sha256:x.sha256}))},
  campaign:{total:cam.totalCases,passed:cam.passedCases,failed:cam.failedCases,distinctMethods:cam.distinctMethods,methods},
  data:{historicalRecords:d.historicalStructurallyAccepted,prospectiveRecords:d.prospectiveStructurallyAccepted,outcomeFeedRows:d.archivedOutcomeFeedRows,certifiedRows:0,sourceFiles:d.sourceGitMetadataMatches,reviewStates:d.archivedReviewStates,blockers:d.blockers},
  pilot:{observedAt:pilot.captured_at_utc,fixtureCount:pilot.fixture_count,checkedFinalResults:pilot.final_result_shape_accepted_count,source:pilot.source,attribution:pilot.attribution.notice,certifiedRows:0},
  historical:{observedAt:study.observedAt,season:study.season,sourceRows:study.source_structure_accepted,excludedAdjudication:study.quarantined_adjudication,cohort:study.development_cohort,pairedTargets:b.paired_targets,warmup:b.excluded_before_scoring.warmup,methods:historicalMethods,source:study.source.url,historyPolicy:study.history_policy,certifiedRows:0,qualifiedMethods:0},
  operations:{observedAt:now,status:supervisor.status,metadataReviews:status.reviewed,totalReviews:status.total,contractReviews:q.reviewed,totalContracts:q.requests.length,controlEvents:status.control.events,tasks:status.tasks,queue:q.requests.map(x=>({producerId:x.producerId,status:x.status})),fixedResourceChecks:resource.passed,liveMonitor:false,liveProducersConnected:false,dispatchAuthorized:false,anchors,evidenceStateSha256:state.stateSha256,originalReasons:original.reasons},
  sources:[{id:'catalogue',...pins.catalogue},{id:'hardware',...pins.hardware},...pins.artifacts],
  receipts,limitations:['Independent snapshots at different revisions, not synchronized live measurements.','Original hardware receipt review is unsigned; not independent hardware attestation or production readiness.','Synthetic tests do not establish prediction quality. Single-source historical study is retrospective development only.','Existing two-source study failed its initial alias reconciliation and was not retried; no independent certification.','No live producers, GPU scheduling, data acquisition, protected evaluation, execution or publication.'] }
 return {...result,snapshotSha256:digest(result)}
}
export function verifyProjection(s){
 const {snapshotSha256,...p}=s
 need(hex(snapshotSha256)&&digest(p)===snapshotSha256,'Website snapshot fingerprint mismatch')
 need(s.kind==='INTEGRATED_RESEARCH_WEBSITE_SNAPSHOT'&&Object.entries(pins.flags).every(([k,v])=>s[k]===v)&&s.measurementFreshness==='UNKNOWN'&&s.status==='RESEARCH_NOT_READY','Unsafe website state')
 return true
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{
  need(process.argv.length===4,'Usage: build.mjs <prepared-dir> <empty-output-dir>')
  const root=resolve(process.argv[2]),out=resolve(process.argv[3])
  need(realpathSync(out)===out&&lstatSync(out).isDirectory()&&readdirSync(out).length===0&&out!==root&&!out.startsWith(root+'/')&&!root.startsWith(out+'/'),'Separate empty output directory required')
  const s=project(root);verifyProjection(s)
  need(digest(project(root))===digest(s),'Unstable or non-deterministic evidence projection')
  writeFileSync(join(out,'status.json'),JSON.stringify(s,null,2)+'\n',{flag:'wx'})
  writeFileSync(join(out,'index.html'),render(s),{flag:'wx'})
  console.log('PASS integrated verified evidence projection; all six original modules and newer aggregate research checkpoints')
 }catch(e){console.error(e.message);process.exitCode=1}
}
