'use strict';
// Uses the production normalizer. Counts describe the default upcoming view,
// with no search or competition filter; pagination is reported separately.
const fs = require('node:fs');
const path = require('node:path');
const E = require('../paper-lab/engine.js');
const vm=require('node:vm');
const root = path.resolve(__dirname, '..');
const evidenceContext={window:{},URL,Date};vm.runInNewContext(fs.readFileSync(path.join(root,'paper-lab/evidence-v3.js'),'utf8'),evidenceContext);
const evidence=evidenceContext.window.ValueWatchEvidenceV3;
vm.runInNewContext(fs.readFileSync(path.join(root,'paper-lab/community-evidence.js'),'utf8'),evidenceContext);
const community=evidenceContext.window.CommunityEvidence;
const specs = [['football','research-dashboard-data.json'], ['football','football-expanded-data.json'],
  ['football','international-football-data.json'], ['racing','racing-research-data.json'],
  ['racing-future','racing-future-data.json'], ['other','other-sports-data.json']];
function report(from, to, now = Date.now()) {
  E.range(from, to);
  const snapshots = specs.filter(([,p]) => fs.existsSync(path.join(root,p))).map(([kind,p]) => ({kind,path:p,data:JSON.parse(fs.readFileSync(path.join(root,p),'utf8'))}));
  const events = E.normalizeFeeds(snapshots.map(s=>({...s,document:s.data})), now);
  const archive=JSON.parse(fs.readFileSync(path.join(root,'racing-research/source-observations.json'),'utf8'));
  // Mirror the browser's single community eligibility boundary, not a looser
  // approximation that can overcount racing candidates in CI diagnostics.
  for(const event of events.filter(e=>e.sport==='racing'))event.communityTips=(archive.entries||[])
    .filter(entry=>community.eligible(entry,event)&&entry.stance==='support')
    .map(entry=>({
      choiceId:event.choices.find(c=>c.label.trim().toLowerCase()===String(entry.horse).trim().toLowerCase()).id,
      type:entry.group,sourceUrl:entry.url,observedAt:entry.observed_at_utc,
      sourceSelectionObserved:entry.extraction_method==='RANKED_RACECARD_VERDICT_V1'?false:entry.verification!=='PRIMARY_POST_CAPTURED',
      ...evidence.selectionAvailability(entry,event,now),
      publisher:entry.publisher,sourceIdentity:entry.source_identity,author:entry.author,
      publishedAt:entry.published_at_utc||entry.publication_date,
      ...evidence.communityEvidence(entry,event,now)
    }));
  // Metadata-only racing meeting fixtures are not runner-level races. Some
  // source files also omit optional event arrays; never crash the whole report.
  const saved = snapshots.flatMap(snapshot => {
    const data=snapshot.data;
    if(snapshot.kind==='other')return Object.entries(data.sports||{}).flatMap(([sport,entry])=>
      (Array.isArray(entry.events)?entry.events:[]).map(event=>({sport,start:event.startUTC})));
    if(snapshot.kind==='football')return (Array.isArray(data.upcoming_fixtures)?data.upcoming_fixtures:[])
      .map(event=>({sport:'football',start:event.kickoff_utc}));
    if(snapshot.kind==='racing')return (Array.isArray(data.races)?data.races:[])
      .map(event=>({sport:'racing',start:event.startUTC}));
    return [];
  }).filter(event=>typeof event.start==='string'&&Number.isFinite(Date.parse(event.start)));
  const future = snapshots.find(s=>s.kind==='racing-future')?.data;
  const other = snapshots.find(s=>s.kind==='other')?.data;
  const days=[];
  for(let d=from;d<=to;d=new Date(Date.parse(d+'T12:00:00Z')+86400000).toISOString().slice(0,10)) {
    const row={date:d};
    for(const sport of Object.keys(E.SPORTS)) {
      const normalized=events.filter(e=>e.sport===sport&&E.day(e.startUTC)===d);
      const upcoming=normalized.filter(e=>Date.parse(e.startUTC)>now+300000);
      row[sport]={saved:saved.filter(e=>e.sport===sport&&E.day(e.start)===d).length,normalized:normalized.length,
        upcoming:upcoming.length,first_page:Math.min(24,upcoming.length),selectable:upcoming.filter(e=>E.statusOf(e,now).selectable).length};
    }
    row.racing.meeting_fixtures=(future?.fixture_meetings||[]).filter(m=>m.date===d).length;
    const greens=events.filter(e=>e.sport==='racing'&&E.day(e.startUTC)===d).flatMap(e=>e.choices.map(c=>evidence.evaluate(e,c,now))).filter(g=>g.green==='PROVISIONAL');
    row.racing.green_publisher_forecast=greens.filter(g=>g.greenBasis==='PUBLISHER_BETTING_FORECAST').length;
    row.racing.green_observed_market=greens.filter(g=>g.greenBasis==='BOOKMAKER_SOURCE_OBSERVATION').length;
    const colourGates=events.filter(e=>e.sport==='racing'&&E.day(e.startUTC)===d).flatMap(e=>e.choices.map(c=>evidence.evaluate(e,c,now)));
    row.racing.blue_source_selections=colourGates.filter(g=>['VERIFIED','EXPERIMENTAL'].includes(g.blue)).length;
    row.racing.yellow_agreements=colourGates.filter(g=>['MULTI_USER_CONSENSUS','EXPERIMENTAL_AGREEMENT'].includes(g.yellow)).length;
    days.push(row);
  }
  // Use the same production eligibility and shortlist code as the research desk.
  // This is diagnostic evidence coverage, never verified EV or a betting recommendation.
  const plan=E.createPlan({from,to,createdAt:new Date(now).toISOString()});
  const eligibility=E.paperEligibilityAudit(plan,events,now);
  const generated=E.generateResearch(plan,events,now);
  const sportCoverage=eligibility.map(row=>{
    const sportEvents=events.filter(event=>event.sport===row.sport);
    const withinRange=sportEvents.filter(event=>E.day(event.startUTC)>=from&&E.day(event.startUTC)<=to);
    const selectable=withinRange.filter(event=>E.statusOf(event,now).selectable);
    return {
      sport:row.sport,normalized:sportEvents.length,inRange:withinRange.length,
      selectable:selectable.length,eligible:row.eligible,excluded:row.excluded,
      diagnostic:withinRange.length===0?'NO_NORMALIZED_EVENTS_IN_RANGE':
        selectable.length===0?'NO_SELECTABLE_EVENTS_IN_RANGE':
        row.eligible===0?'SELECTABLE_BUT_NOT_EVIDENCE_ELIGIBLE':'ELIGIBLE_CANDIDATES_AVAILABLE',
      exclusionReasons:row.reasons
    };
  });
  const selectedSports=new Set(generated.slots.flatMap(slot=>slot.legs.map(leg=>leg.sport)));
  for(const row of sportCoverage){
    row.selectedInAnySlip=selectedSports.has(row.sport);
    row.selectionDiagnostic=row.eligible===0?'NO_ELIGIBLE_CANDIDATES':
      row.selectedInAnySlip?'REPRESENTED_IN_SLIPS':'ELIGIBLE_BUT_NOT_SELECTED';
  }
  const shortlist={coverage:sportCoverage,sports:eligibility,slips:generated.slots.map(slot=>({
    approach:slot.id,status:slot.generation?.status||'NO_GENERATION_STATUS',
    selections:slot.legs.length,
    sports:slot.legs.reduce((counts,leg)=>(counts[leg.sport]=(counts[leg.sport]||0)+1,counts),{}),
    reason:slot.generation?.reason||null
  }))};
  return {generated_at_utc:new Date(now).toISOString(),from,to,research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED',
    interpretation:'Default upcoming filters per sport, empty search, all competitions. First page is capped at 24 with Show more. Saved counts can include duplicate football observations; normalized counts deduplicate. Meeting fixtures are separate from races.',
    snapshots:snapshots.map(snapshot=>{
      const generated=snapshot.data.generated_at_utc;
      const timestamp=Date.parse(generated);
      return {path:snapshot.path,generated_at_utc:generated||null,
        age_minutes:Number.isFinite(timestamp)?Math.round((now-timestamp)/60000):null,
        status:!Number.isFinite(timestamp)?'MISSING_OR_INVALID_TIMESTAMP':
          timestamp>now?'FUTURE_TIMESTAMP':
          now-timestamp> (snapshot.kind==='racing'?1800000:129600000)?'OLDER_THAN_EVENT_TTL':'WITHIN_EVENT_TTL',
        note:'Source-level age only; individual event receipts and statuses may impose stricter gates'};
    }),normalizer_diagnostics:events.diagnostics,shortlist_diagnostics:shortlist,
    source_diagnostics:{tennis:other?.sports?.tennis?.schedule_source_diagnostics||[],nfl:other?.sports?.nfl?.schedule_week_coverage||[],racing_index:future?.days||[],racing_meetings:future?.meeting_card_results||[]},days};
}
module.exports={report};
if(require.main===module){const from=process.argv[2]||E.day(new Date().toISOString());const to=process.argv[3]||new Date(Date.parse(from+'T12:00Z')+6*86400000).toISOString().slice(0,10);console.log(JSON.stringify(report(from,to),null,2));}
