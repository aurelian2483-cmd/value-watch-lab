'use strict';
// Uses the production normalizer. Counts describe the default upcoming view,
// with no search or competition filter; pagination is reported separately.
const fs = require('node:fs');
const path = require('node:path');
const E = require('../paper-lab/engine.js');
const root = path.resolve(__dirname, '..');
const specs = [['football','research-dashboard-data.json'], ['football','football-expanded-data.json'],
  ['football','international-football-data.json'], ['racing','racing-research-data.json'],
  ['racing-future','racing-future-data.json'], ['other','other-sports-data.json']];
function report(from, to, now = Date.now()) {
  E.range(from, to);
  const snapshots = specs.filter(([,p]) => fs.existsSync(path.join(root,p))).map(([kind,p]) => ({kind,path:p,data:JSON.parse(fs.readFileSync(path.join(root,p),'utf8'))}));
  const events = E.normalizeFeeds(snapshots.map(s=>({...s,document:s.data})), now);
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
    days.push(row);
  }
  return {generated_at_utc:new Date(now).toISOString(),from,to,research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED',
    interpretation:'Default upcoming filters per sport, empty search, all competitions. First page is capped at 24 with Show more. Saved counts can include duplicate football observations; normalized counts deduplicate. Meeting fixtures are separate from races.',
    snapshots:snapshots.map(s=>({path:s.path,generated_at_utc:s.data.generated_at_utc})),normalizer_diagnostics:events.diagnostics,
    source_diagnostics:{tennis:other?.sports?.tennis?.schedule_source_diagnostics||[],nfl:other?.sports?.nfl?.schedule_week_coverage||[],racing_index:future?.days||[],racing_meetings:future?.meeting_card_results||[]},days};
}
module.exports={report};
if(require.main===module){const from=process.argv[2]||E.day(new Date().toISOString());const to=process.argv[3]||new Date(Date.parse(from+'T12:00Z')+6*86400000).toISOString().slice(0,10);console.log(JSON.stringify(report(from,to),null,2));}
