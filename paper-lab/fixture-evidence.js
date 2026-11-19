/* Main-desk evidence adapters. Calendar records never become betting selections. */
(function(root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('../darts/model.js') : root.ValueWatchDarts);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ResearchFixtureEvidence = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(Darts) {
  'use strict';
  const list = value => Array.isArray(value) ? value : [];
  const name = value => typeof value === 'string' ? value.trim().slice(0, 200) : '';
  const iso = value => typeof value === 'string' && /T.*(?:Z|[+-]\d\d:\d\d)$/.test(value) && Number.isFinite(Date.parse(value));
  const date = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value + 'T12:00:00Z')) && new Date(value + 'T12:00:00Z').toISOString().slice(0,10) === value;
  const day = value => new Intl.DateTimeFormat('sv-SE', {timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
  const url = value => { try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password ? u.href : null; } catch { return null; } };
  const links = rows => [...new Set(list(rows).map(row => url(typeof row === 'string' ? row : row?.url)).filter(Boolean))];
  function normalize(sport, doc, official = [], now = Date.now()) {
    const valid = doc?.schema_version === 1 && doc.research_only === true && doc.model_validation === 'UNVALIDATED' && doc.publication_gate === 'BLOCKED' && iso(doc.generated_at_utc);
    const age = now - Date.parse(doc?.generated_at_utc);
    const current = valid && age >= 0 && age <= 48 * 3600000;
    const records = [], history = valid && sport === 'darts' ? list(doc.results) : [];
    const add = row => {
      if (!date(row.date) || row.participants.length !== 2 || row.participants.some(x => !name(x)) || row.participants[0] === row.participants[1]) return;
      records.push({...row, sport, name:row.participants.join(' vs '), odds:null, selectable:false});
    };
    for (const row of official) add({...row, participants:list(row.participants).map(name), official:true, start:null,
      competition:name(row.competition) || (sport === 'darts' ? 'PDC schedule' : 'Rugby schedule'), sources:links(row.sources)});
    if (valid && sport === 'darts') {
      for (const row of [...list(doc.fixtures), ...list(doc.tentative_fixtures)]) {
        const timed = row?.status === 'SCHEDULED' && iso(row.start_utc);
        if (!timed && row?.status !== 'DATE_ONLY_UNCONFIRMED') continue;
        add({date:timed ? day(row.start_utc) : row.date_utc, start:timed ? row.start_utc : null, provider:row,
          participants:[name(row.player_a?.name),name(row.player_b?.name)], competition:name(row.competition),
          sources:links(doc.source_receipts), official:false, code:'DARTS'});
      }
    }
    if (valid && sport === 'rugby') for (const row of list(doc.upcoming_fixtures)) {
      if (!['RU','RL'].includes(row?.code) || !iso(row.kickoff_utc) || /CANCEL|POSTPON|ABANDON|FINAL|FINISH/i.test(row.status || '')) continue;
      add({date:day(row.kickoff_utc),start:row.kickoff_utc,provider:row,participants:[name(row.home),name(row.away)],
        competition:name(row.competition_name),code:row.code,sources:links(row.source_receipts),official:false});
    }
    const merged = new Map();
    for (const row of records) {
      const pair = row.participants.map(x => x.toLocaleLowerCase('en-GB')).sort().join('|');
      const key = [sport,row.code || (sport === 'darts' ? 'DARTS' : 'RU'),row.date,pair].join(':');
      const prior = merged.get(key);
      if (!prior) merged.set(key, {...row, id:key});
      else {
        if (prior.start && row.start && prior.start !== row.start) prior.timeConflict = true;
        prior.start = prior.start || row.start;
        prior.provider = prior.provider || row.provider;
        prior.official = prior.official || row.official;
        prior.sources = links([...prior.sources, ...row.sources]);
      }
    }
    const fixtures = [...merged.values()].sort((a,b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
    for (const row of fixtures) {
      row.observedAt = row.provider && valid ? doc.generated_at_utc : null;
      row.sourceStatus = row.official ? (row.start ? 'Official schedule date · provider match time unverified' : 'Official schedule snapshot') : current ? 'Provider observation · independently unverified' : 'Provider snapshot stale or unconfirmed';
      row.model = null;
      row.reason = sport === 'rugby' ? 'No rugby prediction model or team-result history is connected.' : 'D1 needs a confirmed match time and matched player IDs.';
      if (sport === 'darts' && row.provider && current && row.start && Date.parse(row.start) > now + 300000 && !row.timeConflict) {
        try {
          const report = Darts.model(history, [row.provider], new Date(now).toISOString());
          row.model = report.fixtures[0];
          if (row.participants[0].toLocaleLowerCase('en-GB') !== row.model.player_a.name.toLocaleLowerCase('en-GB')) {
            const m = row.model;
            row.model = {...m,player_a:m.player_b,player_b:m.player_a,prior_a:m.prior_b,prior_b:m.prior_a,prob_a:m.prob_b,prob_b:m.prob_a,rating_a:m.rating_b,rating_b:m.rating_a};
          }
          row.reason = row.model.prob_a === null
            ? 'Insufficient history: ' + row.model.prior_a + ' / ' + row.model.prior_b + ' earlier matches; D1 requires 8 per player.'
            : 'D1 experimental estimate · uncalibrated; no verified betting edge.';
        } catch { row.reason = 'Historical records or fixture identity failed the D1 input checks.'; }
      }
      if (!current && row.provider) row.reason = 'Provider data is stale or unconfirmed; refresh required before analysis.';
      if (row.timeConflict) { row.start = null; row.model = null; row.reason = 'Conflicting start times in the source feed; prediction withheld.'; }
      row.blockers = [row.reason, 'No bookmaker odds supplied for this match.'];
    }
    return {fixtures, valid, current, historyCount:history.length, observedAt:valid ? doc.generated_at_utc : null,
      sourceHealth:valid ? doc.source_health : null};
  }
  function matching(snapshot, state, now = Date.now()) {
    const today = day(new Date(now).toISOString());
    return list(snapshot?.fixtures).filter(row => {
      const past = row.start ? Date.parse(row.start) <= now : row.date < today;
      return row.date >= state.plan.from && row.date <= state.plan.to &&
        (state.eventView === 'all' || (state.eventView === 'history' ? past : !past)) &&
        (state.competition === 'all' || row.competition === state.competition) &&
        (!state.query || (row.name + ' ' + row.competition).toLocaleLowerCase('en-GB').includes(state.query.toLocaleLowerCase('en-GB')));
    });
  }
  return {normalize, matching};
});
