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
  const day = value => calendarDate(value, 'Europe/London');
  const url = value => { try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password ? u.href : null; } catch { return null; } };
  const links = rows => [...new Set(list(rows).map(row => url(typeof row === 'string' ? row : row?.url)).filter(Boolean))];
  function validAnalysis(doc, now) {
    const age = now - Date.parse(doc?.generated_at_utc), coverage = doc?.coverage;
    if (doc?.schema_version !== 1 || doc.model !== Darts.VERSION || doc.research_only !== true || doc.model_validation !== 'UNVALIDATED' || doc.publication_gate !== 'BLOCKED' || doc.betting_eligible !== false || doc.odds !== null || doc.expected_value !== null || doc.raw_history_published !== false || doc.source_verification !== 'PROVIDER_OBSERVED_UNCORROBORATED' || !iso(doc.generated_at_utc) || age < 0 || age > 48*3600000) return false;
    const excluded = coverage?.non_final_result_rows_excluded === undefined ? 0 : coverage.non_final_result_rows_excluded;
    if (!Number.isInteger(doc.training_matches) || doc.training_matches < 0 || doc.training_matches > 50000 ||
        coverage?.pagination_complete !== true || coverage.usable_result_rows !== doc.training_matches ||
        !Number.isInteger(excluded) || excluded < 0 || coverage.returned_result_rows !== doc.training_matches + excluded ||
        coverage.returned_result_rows > 50000) return false;
    const period = coverage.history_period;
    if (!Array.isArray(period) || period.length !== 2 || !period.every(date) || Date.parse(period[1])-Date.parse(period[0]) !== 27*86400000 || Date.parse(period[1]) >= Date.parse(doc.generated_at_utc.slice(0,10))) return false;
    if (doc.training_matches && (!date(doc.history_latest_date) || doc.history_latest_date < period[0] || doc.history_latest_date > period[1])) return false;
    if (!Array.isArray(doc.source_receipts) || doc.source_receipts.length < 5 || doc.source_receipts.length > 100 || doc.source_receipts.some(r => !['/v1/results','/v1/fixtures'].includes(r?.endpoint) || !/^[a-f0-9]{64}$/.test(r.sha256))) return false;
    if (!Array.isArray(doc.fixtures) || doc.fixtures.length > 12 || new Set(doc.fixtures.map(f=>f?.id)).size !== doc.fixtures.length) return false;
    return doc.fixtures.every(f => {
      if (!f || !iso(f.start_utc) || ![f.prior_a,f.prior_b].every(n=>Number.isInteger(n)&&n>=0&&n<=doc.training_matches)) return false;
      const enough = f.prior_a >= Darts.MIN_MATCHES && f.prior_b >= Darts.MIN_MATCHES;
      if (!enough) return f.status === 'INSUFFICIENT_HISTORY' && f.prob_a === null && f.prob_b === null;
      return f.status === 'EXPERIMENTAL_UNCALIBRATED' && [f.rating_a,f.rating_b,f.prob_a,f.prob_b].every(Number.isFinite) && f.prob_a > 0 && f.prob_b > 0 && Math.abs(f.prob_a+f.prob_b-1)<1e-10 && Math.abs(f.prob_a-Darts.prob(f.rating_a,f.rating_b))<1e-10;
    });
  }
  function matchingDartsAnalysis(analysis, fixture) {
    return analysis.fixtures.find(row => row.id === fixture.id && row.start_utc === fixture.start_utc &&
      row.competition === fixture.competition && ['player_a','player_b'].every(k =>
        row[k]?.id === fixture[k]?.id && row[k]?.name === fixture[k]?.name));
  }
  function observedMarkets(document, row, now) {
    if (document?.schema_version !== 1 || document.research_only !== true || document.publication_gate !== 'BLOCKED' ||
        row.timeConflict || !row.official) return null;
    const candidates = list(document.records).filter(record => record?.code === row.code &&
      name(record.competition).toLowerCase() === row.competition.toLowerCase() &&
      Array.isArray(record.participants) && record.participants.length === 2 &&
      row.participants.every((player, i) => player.toLowerCase() === name(record.participants[i]).toLowerCase()) &&
      iso(record.start_utc) && day(record.start_utc) === row.date &&
      (!row.start || Date.parse(row.start) === Date.parse(record.start_utc)));
    if (candidates.length !== 1) return null;
    const record = candidates[0], start = Date.parse(record.start_utc), darts = row.code === 'DARTS';
    if (record.market !== (darts ? 'MATCH_WINNER' : 'THREE_WAY_MATCH_RESULT')) return null;
    const labels = darts ? row.participants : [row.participants[0], 'Draw', row.participants[1]];
    const priceRow = side => {
      const address = url(side?.source), captured = Date.parse(side?.captured_at_utc);
      if (!address || !name(side.bookmaker) || !/^[a-f0-9]{64}$/.test(side.sha256 || '') ||
          !iso(side.captured_at_utc) || captured > now || captured >= start || !Array.isArray(side.prices) ||
          side.prices.length !== labels.length || side.prices.some(price => !Number.isFinite(price) || price <= 1)) return null;
      return {source:address, bookmaker:name(side.bookmaker), at:side.captured_at_utc, prices:side.prices};
    };
    const benchmark = priceRow(record.benchmark), sky = priceRow(record.sky_bet);
    if (!benchmark || !sky || /^sky[ -]*bet/i.test(benchmark.bookmaker) || !/^sky[ -]*bet/i.test(sky.bookmaker)) return null;
    return {listedStart:record.start_utc, labels, benchmark, sky, directSource:url(record.direct_bookmaker_page)};
  }
  function calendarDate(now, zone) {
    return new Intl.DateTimeFormat('sv-SE', {timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));
  }
  function normalize(sport, doc, official = [], now = Date.now(), analysis = null, markets = null) {
    const valid = doc?.schema_version === 1 && doc.research_only === true && doc.model_validation === 'UNVALIDATED' && doc.publication_gate === 'BLOCKED' && iso(doc.generated_at_utc);
    const age = now - Date.parse(doc?.generated_at_utc);
    const current = valid && age >= 0 && age <= 48 * 3600000;
    const analysisCurrent = sport === 'darts' && validAnalysis(analysis, now);
    const records = [], history = valid && sport === 'darts' ? list(doc.results) : [];
    const add = row => {
      if (!date(row.date) || row.participants.length !== 2 || row.participants.some(x => !name(x)) || row.participants[0] === row.participants[1]) return;
      records.push({...row, sport, name:row.participants.join(' vs '), odds:null, selectable:false});
    };
    for (const row of official) add({...row, participants:list(row.participants).map(name), official:true, start:sport === 'rugby' && iso(row.start) && day(row.start) === row.date ? row.start : null,
      venue:name(row.venue), venueZone:row.code === 'RL' && row.venueZone === 'America/Los_Angeles' ? row.venueZone : null,
      session:iso(row.session) && day(row.session) === row.date ? row.session : null,
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
    const pairing = row => JSON.stringify([row.competition.toLocaleLowerCase('en-GB'),
      row.participants.map(player => player.toLocaleLowerCase('en-GB')).sort()]);
    const officialDarts = new Map();
    for (const row of records) {
      if (sport === 'darts' && row.official) {
        const key = pairing(row);
        officialDarts.set(key, [...(officialDarts.get(key) || []), row]);
      }
    }
    const rowKey = row => [sport,row.code || (sport === 'darts' ? 'DARTS' : 'RU'),row.date,
      row.participants.map(x => x.toLocaleLowerCase('en-GB')).sort().join('|')].join(':');
    const merged = new Map();
    for (const row of records) {
      const officialDates = officialDarts.get(pairing(row));
      if (!row.official && !row.start && officialDates?.length === 1 &&
          Math.abs(Date.parse(row.date) - Date.parse(officialDates[0].date)) === 86400000) {
        merged.get(rowKey(officialDates[0])).providerDateConflict = row.date;
        continue;
      }
      const key = rowKey(row);
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
      row.sourceStatus = row.official ? (row.start && sport === 'darts' ? 'Official schedule date · provider match time unverified' : 'Official schedule snapshot') : current ? 'Provider observation · independently unverified' : 'Provider snapshot stale or unconfirmed';
      row.model = null;
      row.reason = sport === 'rugby' ? 'No rugby prediction model or team-result history is connected.' : 'D1 needs a confirmed match time and matched player IDs.';
      if (sport === 'darts' && row.provider && current && row.start && Date.parse(row.start) > now + 300000 && !row.timeConflict) {
        try {
          const report = Darts.model(history, [row.provider], new Date(now).toISOString());
          row.model = report.fixtures[0];
          const aggregate = analysisCurrent && matchingDartsAnalysis(analysis, row.provider);
          if (aggregate) {
            row.model = {...aggregate};
            row.analysisObservedAt = analysis.generated_at_utc;
            row.analysisHistory = analysis.training_matches;
            row.analysisPeriod = analysis.coverage.history_period;
          }
          if (row.participants[0].toLocaleLowerCase('en-GB') !== row.model.player_a.name.toLocaleLowerCase('en-GB')) {
            const m = row.model;
            row.model = {...m,player_a:m.player_b,player_b:m.player_a,prior_a:m.prior_b,prior_b:m.prior_a,prob_a:m.prob_b,prob_b:m.prob_a,rating_a:m.rating_b,rating_b:m.rating_a};
          }
          row.reason = row.model.prob_a === null
            ? 'Insufficient history: ' + row.model.prior_a + ' / ' + row.model.prior_b + ' earlier matches; D1 requires 8 per player.'
            : 'D1 experimental estimate · uncalibrated; no verified betting edge.';
          if (aggregate) row.reason += ' Based on ' + analysis.training_matches + ' results from ' + analysis.coverage.history_period.join(' to ') + '; recent results are delayed.';
        } catch { row.reason = 'Historical records or fixture identity failed the D1 input checks.'; }
      }
      if (!current && row.provider) row.reason = 'Provider data is stale or unconfirmed; refresh required before analysis.';
      if (row.timeConflict) { row.start = null; row.model = null; row.reason = 'Conflicting start times in the source feed; prediction withheld.'; }
      if (sport === 'darts' && !row.start && !row.timeConflict && (row.official || current)) {
        row.reason = 'Individual start time is unconfirmed. D1 also requires matched player IDs and enough earlier results.';
      }
      row.marketEvidence = observedMarkets(markets, row, now);
      if (sport === 'darts' && row.marketEvidence && !row.model && !row.start) {
        row.reason = 'D1 estimate withheld. The sources give a market-listed time and the PDC session, and D1 still needs independently matched timing and sufficient player history.';
      }
      row.blockers = [row.reason, row.marketEvidence ? 'Dated market observations only.' : 'No captured bookmaker prices for this match.'];
    }
    return {fixtures, valid, current, historyCount:history.length, observedAt:valid ? doc.generated_at_utc : null,
      analysisHistoryCount:analysisCurrent ? analysis.training_matches : null,
      sourceHealth:valid ? doc.source_health : null};
  }
  function matching(snapshot, state, now = Date.now()) {
    const today = day(new Date(now).toISOString());
    return list(snapshot?.fixtures).filter(row => {
      const past = row.start ? Date.parse(row.start) <= now : row.date < (row.venueZone ? calendarDate(now,row.venueZone) : today);
      return row.date >= state.plan.from && row.date <= state.plan.to &&
        (state.eventView === 'all' || (state.eventView === 'history' ? past : !past)) &&
        (state.competition === 'all' || row.competition === state.competition) &&
        (!state.query || (row.name + ' ' + row.competition).toLocaleLowerCase('en-GB').includes(state.query.toLocaleLowerCase('en-GB')));
    });
  }
  return {normalize, matching, validAnalysis, matchingDartsAnalysis};
});
