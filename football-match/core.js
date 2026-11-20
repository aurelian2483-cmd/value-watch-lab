'use strict';

(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FootballMatchEvidence = factory();
})(globalThis, function () {
  const outcomes = ['home', 'draw', 'away'];
  const minute = 60000;
  const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value);
  const instant = value => typeof value === 'string' && /T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? Date.parse(value) : NaN;
  const text = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 200;
  const gated = value => value?.research_only === true && value.model_validation === 'UNVALIDATED' && value.publication_gate === 'BLOCKED';
  const aliases = new Map(Object.entries({
    'fc cologne':'fc koln', '1 fc union berlin':'union berlin', 'sv 07 elversberg':'sv elversberg',
    'sc freiburg':'freiburg', 'vfb stuttgart':'stuttgart', 'fc augsburg':'augsburg', 'hamburger sv':'hamburg sv'
  }));
  function teamKey(name) {
    const key = String(name ?? '').normalize('NFKD').replace(/[^\x00-\x7f]/g, '').toLowerCase().match(/[a-z0-9]+/g)?.join(' ') ?? '';
    return aliases.get(key) ?? key;
  }
  function receiptURL(value) {
    if (typeof value !== 'string' || !URL.canParse(value)) return null;
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port ? url : null;
  }
  function tuple(row) {
    if (![row?.home, row?.away].every(text) || row.home === row.away) return null;
    const league = row.league ?? 'PL';
    return typeof league === 'string' && /^[A-Z0-9]{1,12}$/.test(league) ? [league, row.home, row.away] : null;
  }
  function exactKey(identity, start) {
    return JSON.stringify([...identity, new Date(start).toISOString()]);
  }
  function fixtureIndex(feeds, asOf = Date.now()) {
    const groups = new Map();
    const models = new Map();
    const exactOwners = new Map();
    const conflicts = new Set();
    for (const feed of feeds) {
      const observed = instant(feed?.generated_at_utc);
      if (!gated(feed) || feed.schema_version !== 1 || !(observed <= asOf)) continue;
      for (const row of Array.isArray(feed.upcoming_fixtures) ? feed.upcoming_fixtures : []) {
        const identity = tuple(row);
        const start = instant(row?.kickoff_utc);
        if (!identity || !Number.isFinite(start)) continue;
        const exact = exactKey(identity, start);
        const providerId = typeof row.espn_event_id === 'string' && /^\d{1,20}$/.test(row.espn_event_id) ? row.espn_event_id : null;
        const id = providerId ? 'espn:' + providerId : 'fixture:' + exact;
        if (!groups.has(id)) groups.set(id, []);
        groups.get(id).push({ id, providerId, exact, identity, start, observed, row });
        if (providerId) {
          if (!exactOwners.has(exact)) exactOwners.set(exact, new Set());
          exactOwners.get(exact).add(id);
        }
      }
      for (const row of Array.isArray(feed.experimental_model_forecasts) ? feed.experimental_model_forecasts : []) {
        const identity = tuple(row);
        const start = instant(row?.kickoff_utc);
        if (!gated(row) || !identity || !Number.isFinite(start) || observed >= start ||
            (row.cutoff_utc != null && !(instant(row.cutoff_utc) <= start))) continue;
        const exact = exactKey(identity, start);
        if (!models.has(exact)) models.set(exact, []);
        models.get(exact).push({ row, observed });
      }
    }
    for (const [id, rows] of groups) {
      if (rows.some(row => JSON.stringify(row.identity) !== JSON.stringify(rows[0].identity) ||
          (exactOwners.get(row.exact)?.size ?? 0) > 1)) conflicts.add(id);
      const starts = new Map();
      for (const row of rows) {
        if (starts.has(row.observed) && starts.get(row.observed) !== row.start) conflicts.add(id);
        starts.set(row.observed, row.start);
      }
    }
    const events = [];
    const byExact = new Map();
    const espn = new Map();
    for (const [id, rows] of groups) {
      if (conflicts.has(id)) continue;
      rows.sort((a, b) => b.observed - a.observed);
      const event = rows[0];
      if (!event.providerId && exactOwners.has(event.exact)) continue;
      event.kickoffs = [...new Set(rows.map(row => row.start))].sort((a, b) => a - b);
      event.marketCutoff = event.kickoffs[0];
      event.models = (models.get(event.exact) ?? []).filter(model =>
        model.observed < event.marketCutoff &&
        (model.row.espn_event_id == null || model.row.espn_event_id === event.providerId));
      events.push(event);
      byExact.set(event.exact, event);
      if (event.providerId) espn.set(event.providerId, id);
    }
    return { events, byExact, espn, conflicts };
  }

  function marketFixture(record, index) {
    if (record?.market !== 'FOOTBALL_90_MINUTE_1X2') return null;
    try {
      const eventId = JSON.parse(record.event_id);
      const identity = JSON.parse(eventId[1]);
      const start = instant(record.start_utc);
      if (eventId.length !== 3 || eventId[0] !== 'football' || identity.length !== 3 ||
          !Array.isArray(identity) || !identity.every(text) || !Number.isFinite(start) || instant(eventId[2]) !== start) return null;
      return index.byExact.get(exactKey(identity, start)) ?? null;
    } catch {
      return null;
    }
  }

  const price = value => Number.isFinite(value) && value > 1 && value <= 10000 && /^\d+(?:\.\d{1,6})?$/.test(String(value));
  function marketSource(source, key, record, fixture, snapshot, asOf) {
    const benchmark = key === 'benchmark';
    const expectedSource = benchmark ? 'PINNACLE_VIA_GOLDEDGE' : 'SKY_BET';
    const observed = instant(source?.observed_at_utc);
    const captured = instant(source?.captured_at_utc);
    const url = receiptURL(source?.source);
    const serverTime = instant(source?.http_date_utc);
    const id = source?.source_event_id;
    if (source?.source_id !== expectedSource || source.verified !== true || !hash(source.source_sha256) ||
        !url || typeof id !== 'string' ||
        !(observed <= captured && captured <= snapshot && snapshot <= asOf &&
          snapshot < fixture.marketCutoff - 5 * minute && snapshot - observed <= 30 * minute && serverTime <= captured + minute && captured - serverTime <= 5 * minute) ||
        (source.market != null && source.market !== record.market) ||
        (source.settlement_period != null && source.settlement_period !== 'REGULATION_TIME') ||
        (source.start_utc != null && instant(source.start_utc) !== fixture.start) ||
        Object.keys(source.prices ?? {}).length !== outcomes.length || !outcomes.every(side => price(source.prices?.[side]))) return null;
    const expectedTeams = fixture.identity.slice(1).map(teamKey);
    const names = source.source_team_names;
    const matchedNames = Array.isArray(names) && names.length === 2 && names.every((team, i) => teamKey(team) === expectedTeams[i]);
    if (benchmark) {
      if (url.hostname !== 'www.goldedge.net' || !url.pathname.startsWith('/odds/football/') ||
          !/^[a-z0-9]{5,24}$/.test(id) || !url.pathname.endsWith('-' + id) ||
          source.timestamp_basis !== 'GOLDEDGE_PINNACLE_1X2_OBSERVATION_TIME' || !matchedNames) return null;
    } else {
      const match = /^\/football\/[^/]+\/([^/]+)-v-([^/]+)\/e-(\d+)$/.exec(url.pathname);
      if (!['skybet.com', 'www.skybet.com'].includes(url.hostname) || match?.[3] !== id ||
          !match.slice(1, 3).every((team, i) => teamKey(team) === expectedTeams[i]) ||
          (names != null && !matchedNames) || !/^ppb:sbkMarket:[\d.]+$/.test(source.source_market_id ?? '') ||
          source.executable_verified !== false || observed !== captured ||
          source.timestamp_basis !== 'DIRECT_SKY_BET_HTTP_OBSERVATION_TIME') return null;
    }
    return { key: expectedSource + ':' + id, id, name: benchmark ? 'Pinnacle via GoldEdge' : 'Sky Bet',
      url, observed, captured, hash: source.source_sha256, prices: source.prices };
  }

  function frozenModel(record, fixture, snapshot) {
    const model = record.frozen_model?.comparison;
    const observed = instant(record.frozen_model?.observed_at_utc);
    if (model?.method !== 'CURRENT_SEASON_POISSON_COMPARISON_V1' || model.unvalidated !== true ||
        model.research_only !== true || model.publication_gate !== 'BLOCKED' ||
        (model.model_validation != null && model.model_validation !== 'UNVALIDATED') || instant(model.cutoff_utc) !== fixture.start ||
        !(observed <= snapshot && observed < fixture.marketCutoff) || !hash(model.training_sha256) ||
        !Array.isArray(model.source_receipts) || !model.source_receipts.length ||
        !model.source_receipts.every(receipt => receiptURL(receipt?.url) && hash(receipt.sha256) && instant(receipt.observed_at_utc) <= observed) ||
        !probabilities(outcomes.map(side => model['prob_' + side]))) return null;
    return { row: { ...model, model: model.method }, observed };
  }

  function verifyMarkets(document, index, asOf = Date.now()) {
    const matches = new Map();
    const owners = new Map();
    const conflicts = new Set();
    let withheld = 0;
    for (const record of document?.schema_version === 1 && Array.isArray(document.records) ? document.records : []) {
      const fixture = marketFixture(record, index);
      const snapshot = instant(record?.snapshot_at_utc);
      if (!fixture) { withheld++; continue; }
      if (!matches.has(fixture.id)) matches.set(fixture.id, { fixture, sources: new Map() });
      const match = matches.get(fixture.id);
      if (snapshot <= asOf && snapshot < fixture.marketCutoff - 5 * minute) {
        const model = frozenModel(record, fixture, snapshot);
        if (model && (!match.model || model.observed > match.model.observed)) match.model = model;
      }
      for (const key of ['benchmark', 'sky_bet']) {
        if (record[key] == null) continue;
        const source = marketSource(record[key], key, record, fixture, snapshot, asOf);
        if (!source) { withheld++; continue; }
        if (owners.has(source.key) && owners.get(source.key) !== fixture.id) conflicts.add(source.key);
        owners.set(source.key, fixture.id);
        const previous = match.sources.get(key);
        if (previous && (previous.key !== source.key ||
            (previous.observed === source.observed && (previous.hash !== source.hash ||
              outcomes.some(side => previous.prices[side] !== source.prices[side]))))) {
          conflicts.add(previous.key);
          conflicts.add(source.key);
        }
        if (!previous || previous.observed < source.observed) match.sources.set(key, source);
      }
    }
    return { withheld: withheld + conflicts.size, matches: [...matches.values()].map(match => ({
      fixture: match.fixture, model: match.model, sources: [...match.sources.values()].filter(source => !conflicts.has(source.key))
    })).filter(match => match.sources.length) };
  }

  function probabilities(values) {
    return Array.isArray(values) && values.length === 3 && values.every(p => Number.isFinite(p) && p >= 0 && p <= 1) &&
      Math.abs(values.reduce((sum, p) => sum + p, 0) - 1) < 0.0001 ? values : null;
  }

  function historicalRows(archive) {
    if (archive?.meta?.name !== 'RECONSTRUCTED_POISSON_RESEARCH_V1' || archive.meta.validated !== false ||
        archive.meta.research_only !== true || archive.meta.model_publication_gate !== 'BLOCKED' || !Array.isArray(archive.rows)) return [];
    const rows = new Map();
    for (const row of archive.rows) {
      if (!/^(?:2024-25|2025-26)$/.test(row?.season) || !/^\d{4}-\d{2}-\d{2}$/.test(row.date) ||
          !Number.isFinite(Date.parse(row.date)) || ![row.home, row.away].every(text) ||
          row.id !== [row.season, row.date, row.home, row.away].join('|') ||
          !probabilities(row.p_unadjusted) || !probabilities(row.p_recent_form_alpha_0_025)) continue;
      const id = 'archive:' + row.id;
      rows.set(id, rows.has(id) ? null : { ...row, id });
    }
    return [...rows.values()].filter(Boolean);
  }

  return { fixtureIndex, verifyMarkets, probabilities, historicalRows, receiptURL, hash, instant, outcomes };
});
