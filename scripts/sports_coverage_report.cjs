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
const specs = [['football','research-dashboard-data.json'], ['football','football-expanded-data.json'],
  ['football','international-football-data.json'], ['racing','racing-research-data.json'],
  ['racing-future','racing-future-data.json'], ['other','other-sports-data.json']];
function report(from, to, now = Date.now()) {
  E.range(from, to);
  const snapshots = specs.filter(([,p]) => fs.existsSync(path.join(root,p))).map(([kind,p]) => ({kind,path:p,data:JSON.parse(fs.readFileSync(path.join(root,p),'utf8'))}));
  const events = E.normalizeFeeds(snapshots.map(s=>({...s,document:s.data})), now);
  const archive=JSON.parse(fs.readFileSync(path.join(root,'racing-research/source-observations.json'),'utf8'));
  for(const event of events.filter(e=>e.sport==='racing'))event.communityTips=(archive.entries||[]).filter(entry=>
    String(entry.race_id)===String(event.providerEventId)&&Date.parse(entry.startUTC)===Date.parse(event.startUTC)&&entry.stance==='support'&&
    ['forum','social_forum','blog','tipster'].includes(entry.group)&&['PRIMARY_POST_CAPTURED','PUBLIC_SELECTION_OBSERVED','POST_OBSERVED_OPINION_UNVERIFIED','PUBLICATION_OBSERVED_OPINION_UNVERIFIED','RSS_EXPLICIT_HEADLINE_UNVERIFIED'].includes(entry.verification)&&
    event.choices.some(c=>c.label.trim().toLowerCase()===String(entry.horse).trim().toLowerCase())
  ).map(entry=>({choiceId:event.choices.find(c=>c.label.trim().toLowerCase()===String(entry.horse).trim().toLowerCase()).id,
    type:entry.group,sourceUrl:entry.url,observedAt:entry.observed_at_utc,publishedAt:entry.published_at_utc||entry.publication_date,
    author:entry.author,publisher:entry.publisher,sourceSelectionObserved:entry.verification!=='PRIMARY_POST_CAPTURED',...evidence.communityEvidence(entry,event,now)}));
  const saved = snapshots.flatMap(s => s.kind === 'other' ? Object.entries(s.data.sports).flatMap(([sport,p]) => p.events.map(e=>({sport,start:e.startUTC}))) : s.kind === 'football' ? s.data.upcoming_fixtures.map(e=>({sport:'football',start:e.kickoff_utc})) : s.data.races.map(e=>({sport:'racing',start:e.startUTC})));
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
  return {generated_at_utc:new Date(now).toISOString(),from,to,research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED',
    interpretation:'Default upcoming filters per sport, empty search, all competitions. First page is capped at 24 with Show more. Saved counts can include duplicate football observations; normalized counts deduplicate. Meeting fixtures are separate from races.',
    snapshots:snapshots.map(s=>({path:s.path,generated_at_utc:s.data.generated_at_utc})),normalizer_diagnostics:events.diagnostics,
    source_diagnostics:{tennis:other?.sports?.tennis?.schedule_source_diagnostics||[],nfl:other?.sports?.nfl?.schedule_week_coverage||[],racing_index:future?.days||[],racing_meetings:future?.meeting_card_results||[]},days};
}
module.exports={report};
if(require.main===module){const from=process.argv[2]||E.day(new Date().toISOString());const to=process.argv[3]||new Date(Date.parse(from+'T12:00Z')+6*86400000).toISOString().slice(0,10);console.log(JSON.stringify(report(from,to),null,2));}
