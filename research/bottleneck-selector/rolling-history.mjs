import assert from 'node:assert/strict';

const utcDay=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&
  Number.isFinite(Date.parse(x+'T00:00:00Z'))&&
  new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
const instant=x=>typeof x==='string'&&/T/.test(x)&&
  /(Z|[+-]\d\d:\d\d)$/.test(x)&&Number.isFinite(Date.parse(x));
const positive=x=>Number.isInteger(x)&&x>=0&&x<=99;
const name=x=>typeof x==='string'&&x.trim().length>0&&x.length<=250;
const dayAfter=day=>new Date(Date.parse(day+'T00:00:00Z')+86400000).toISOString();
const isoDay=instant=>instant.slice(0,10);
const guard=x=>x?.research_only===true&&x.model_validation==='UNVALIDATED'&&
  x.publication_gate==='BLOCKED';

/**
 * Read-only unified view over current-season and older results, NOT a new competing
 * database. Exact source identities are retained; no automatic cross-source join.
 * Every DATE-ONLY final is available only from midnight the FOLLOWING UTC day.
 * Do not treat reconstructed forecasts as real pre-event recorded forecasts.
 */
export function buildRollingHistoryView({currentFootball,reconstructedFootball,darts,
  ledger,refreshWorkflowText,asOfUTC}){
  assert(instant(asOfUTC),'Invalid as-of time');
  assert(guard(currentFootball)&&currentFootball.source_verification==='SINGLE_SOURCE_UNVERIFIED'&&
    currentFootball.coverage_season==='2026/27'&&Array.isArray(currentFootball.results),
    'Current-season history source contract invalid');
  assert(reconstructedFootball?.meta?.research_only===true&&
    reconstructedFootball.meta.validated===false&&
    reconstructedFootball.meta.model_publication_gate==='BLOCKED'&&
    Array.isArray(reconstructedFootball.rows)&&
    /RECONSTRUCTED/.test(reconstructedFootball.meta.name),
    'Reconstructed historical archive contract invalid');
  assert(guard(darts)&&Array.isArray(darts.results),'Darts historical source invalid');
  assert(ledger?.schemaVersion===1&&ledger.kind==='PROSPECTIVE_PREDICTION_LEDGER'&&
    ledger.modelValidated===false&&Array.isArray(ledger.records),
    'Frozen forecast source invalid');
  assert(typeof refreshWorkflowText==='string'&&
    refreshWorkflowText.includes("cron: '15 2,14 * * *'")&&
    refreshWorkflowText.includes('python scripts/collect_reliability_history.py')&&
    refreshWorkflowText.includes('historical-reliability-data.json'),
    'Existing current-season refresh contract not detected');
  const events=[],keys=new Set(),quarantined=[];
  const add=(source,sport,key,day,details)=>{
    if(!utcDay(day)||!name(key))throw Error('Malformed historical event date or identity');
    const identity=JSON.stringify([source,sport,key]);
    assert(!keys.has(identity),'Duplicate source-specific historical result identity');
    keys.add(identity);
    const available=dayAfter(day);
    const entry={source_dataset:source,sport,source_specific_identity:key,
      result_day_utc:day,training_available_after_utc:available,
      time_precision:'DATE_ONLY_SAFE_NEXT_DAY',...details};
    if(Date.parse(available)<=Date.parse(asOfUTC))events.push(entry);
    else quarantined.push({source_dataset:source,sport,source_specific_identity:key,
      reason:'NOT_YET_SAFE_AT_AS_OF_CUTOFF'});
  };
  for(const r of currentFootball.results){
    assert(name(r.competition)&&name(r.home)&&name(r.away)&&
      r.home!==r.away&&r.time_precision==='DATE_ONLY_END_OF_DAY'&&
      instant(r.kickoff_utc)&&r.kickoff_utc.endsWith('T23:59:59Z')&&
      positive(r.score_home)&&positive(r.score_away)&&
      ['H','D','A'].includes(r.actual_outcome)&&
      r.actual_outcome===(r.score_home>r.score_away?'H':
        r.score_home===r.score_away?'D':'A')&&
      typeof r.source_url==='string'&&r.source_url.startsWith(
        'https://raw.githubusercontent.com/oladeeayo/open-matchday/'),
      'Invalid current-season historical result');
    const day=isoDay(r.kickoff_utc);
    add('historical-reliability-data.json','football',
      JSON.stringify([r.competition,day,r.home,r.away]),day,{
        competition:r.competition,home:r.home,away:r.away,
        score_home:r.score_home,score_away:r.score_away,
        outcome:r.actual_outcome,source_url:r.source_url,
        evidence_tier:'SOURCE_REPORTED_UNVERIFIED',history_season:'2026/27'
      });
  }
  for(const r of reconstructedFootball.rows){
    assert(name(r.id)&&name(r.season)&&utcDay(r.date)&&
      name(r.home)&&name(r.away)&&Array.isArray(r.ft)&&r.ft.length===2&&
      positive(r.ft[0])&&positive(r.ft[1])&&
      r.winner_index===(r.ft[0]>r.ft[1]?0:r.ft[0]===r.ft[1]?1:2),
      'Invalid reconstructed historical final');
    add('research/football-baseline-v1/608-reconstructed-forecasts.json',
      'football',r.id,r.date,{
        competition:null,home:r.home,away:r.away,
        score_home:r.ft[0],score_away:r.ft[1],
        outcome:['H','D','A'][r.winner_index],
        history_season:r.season,
        evidence_tier:'RETROSPECTIVE_RECONSTRUCTED_NOT_AS_ISSUED'
      });
  }
  for(const r of darts.results){
    assert(name(r.id)&&instant(r.played_at)&&r.status==='FINAL'&&
      r.timestamp_is_carrier===true&&r.source_date_precision==='DAY_ONLY'&&
      name(r.player_a?.id)&&name(r.player_b?.id)&&r.player_a.id!==r.player_b.id&&
      [r.player_a.id,r.player_b.id].includes(r.winner_id),
      'Invalid date-only darts final');
    const day=isoDay(r.played_at);
    add('darts/feed.json','darts',r.id,day,{
      competition:null,participants:[r.player_a.id,r.player_b.id],
      winner_id:r.winner_id,
      evidence_tier:'PROVIDER_OBSERVED_UNCORROBORATED'
    });
  }
  const sorted=events.sort((a,b)=>a.result_day_utc.localeCompare(b.result_day_utc)||
    a.sport.localeCompare(b.sport)||a.source_specific_identity.localeCompare(b.source_specific_identity));
  const dayMs=Date.parse(isoDay(asOfUTC)+'T00:00:00Z');
  const latest7=sorted.filter(r=>{
    const n=(dayMs-Date.parse(r.result_day_utc+'T00:00:00Z'))/86400000;
    return n>=1&&n<=7;
  });
  const countBy=rows=>Object.fromEntries([...new Set(rows.map(x=>x.sport))].sort()
    .map(x=>[x,rows.filter(y=>y.sport===x).length]));
  const sourceCounts=Object.fromEntries([...new Set(sorted.map(x=>x.source_dataset))].sort()
    .map(x=>[x,sorted.filter(y=>y.source_dataset===x).length]));
  return {
    schema_version:1,kind:'BOTTLENECK_SHARED_ROLLING_HISTORY_V1',
    research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED',
    as_of_utc:asOfUTC,
    source_of_truth:'EXISTING_EXTERNAL_SOURCE_ARCHIVES_NOT_REPLACED',
    events:sorted,quarantined_future_or_same_day:quarantined,
    historical_results_by_sport:countBy(sorted),
    source_counts:sourceCounts,
    recent_completed_last_7_full_days:latest7.length,
    recent_completed_by_sport:countBy(latest7),
    frozen_forecast_receipts:ledger.records.length,
    refresh:{existing_workflow:'.github/workflows/reliability-results-refresh.yml',
      declared_cron_utc:'15 2,14 * * *',operational_status:'NOT_ATTESTED_BY_CODE_ONLY'},
    safeguards:[
      'Current-season results are historical immediately after completion and safe as-of cutoff.',
      'Date-only carrier results cannot be used for same-day model training.',
      'This view reads all included sources afresh; it does not clone them into competing databases.',
      'Source-specific keys avoid silently merging different provider identities.',
      'A source-reported result and a reconstructed model are not independently certified prospective evidence.',
      'Other sport histories and racing archives require identity-aware adapters before event-level union.',
      'No model is selected, score promoted or bet published.'
    ],
    selected_method:null,betting_eligible:false
  };
}
