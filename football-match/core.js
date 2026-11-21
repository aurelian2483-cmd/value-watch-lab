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
  function trainingTimestamp(value) {
    const calendar = typeof value === 'string' &&
      /^(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}:\d{2}(?:\.(\d{1,6}))?(?:Z|[+-]\d{2}:\d{2})$/.exec(value);
    if (!calendar) return null;
    const time = instant(value);
    const day = Date.parse(calendar[1]);
    if (!Number.isFinite(time) || !Number.isFinite(day) ||
        new Date(day).toISOString().slice(0, 10) !== calendar[1] || Number(value.slice(11, 13)) >= 24) return null;
    return { time, micros: Number((calendar[2] ?? '').padEnd(6, '0').slice(3)) };
  }

  function modelCutoffReason({ row, observed }, fixture) {
    if (row.cutoff_utc == null || row.cutoff_utc === '') return 'Explicit training cutoff is missing.';
    const timestamp = trainingTimestamp(row.cutoff_utc);
    if (!timestamp) return 'Explicit training cutoff is invalid.';
    const { time: cutoff, micros } = timestamp;
    if (cutoff > fixture.marketCutoff || (cutoff === fixture.marketCutoff && micros)) return 'Training cutoff is later than the earliest known kickoff.';
    if (!(observed < fixture.marketCutoff)) return 'Model was observed at or after the earliest known kickoff.';
    if (cutoff > observed || (cutoff === observed && micros)) return 'Training cutoff is later than the recorded model observation.';
    if (!Array.isArray(row.source_receipts) || !row.source_receipts.length)
      return 'Training source receipts are missing.';
    for (const [index, receipt] of row.source_receipts.entries()) {
      const label = 'Training source receipt ' + (index + 1);
      if (receipt?.observed_at_utc == null || receipt.observed_at_utc === '') return label + ' is missing its observation timestamp.';
      const observedAt = trainingTimestamp(receipt.observed_at_utc);
      if (!observedAt) return label + ' has an invalid observation timestamp.';
      if (!receiptURL(receipt.url) || !hash(receipt.sha256)) return label + ' has an invalid source URL or hash.';
      if (observedAt.time > cutoff || (observedAt.time === cutoff && observedAt.micros > micros))
        return label + ' was observed after the explicit training cutoff.';
    }
    return null;
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
        if (!gated(row) || !identity || !Number.isFinite(start)) continue;
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
        model.row.espn_event_id == null || model.row.espn_event_id === event.providerId
      ).map(model => ({ ...model, cutoffReason: modelCutoffReason(model, event) }));
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
  function marketMetrics(prices) {
    const implied = Object.fromEntries(outcomes.map(side => [side, 1 / prices[side]]));
    const total = outcomes.reduce((sum, side) => sum + implied[side], 0);
    if (!Number.isFinite(total) || total <= 0) return null;
    return {
      implied,
      overround: total - 1,
      proportionalNoVig: Object.fromEntries(outcomes.map(side => [side, implied[side] / total]))
    };
  }

  function marketSource(source, key, record, fixture, snapshot, asOf) {
    const benchmark = key === 'benchmark';
    const expectedSource = benchmark ? 'PINNACLE_VIA_GOLDEDGE' : 'SKY_BET';
    const reject = reason => ({ source:null, reason });
    if (!source || typeof source !== 'object') return reject('Source observation is missing.');
    if (source.source_id !== expectedSource) return reject('Source identity is missing or does not match the expected provider.');
    if (source.verified !== true) return reject('Source observation is not marked verified.');
    if (!hash(source.source_sha256)) return reject('Source receipt SHA-256 is missing or invalid.');
    const url = receiptURL(source.source);
    if (!url) return reject('Source URL is missing or unsafe.');
    const observed = instant(source.observed_at_utc);
    const captured = instant(source.captured_at_utc);
    const serverTime = instant(source.http_date_utc);
    const id = source.source_event_id;
    if (!Number.isFinite(observed) || !Number.isFinite(captured) || !Number.isFinite(serverTime) ||
        !Number.isFinite(snapshot) || typeof id !== 'string')
      return reject('Source event identity or timestamp is missing or invalid.');
    if (!(observed <= captured && captured <= snapshot && snapshot <= asOf &&
        snapshot < fixture.marketCutoff - 5 * minute && snapshot - observed <= 30 * minute &&
        serverTime <= captured + minute && captured - serverTime <= 5 * minute))
      return reject('Observation, capture, HTTP date, snapshot or pre-kickoff chronology is inconsistent.');
    if (source.market != null && source.market !== record.market)
      return reject('Source market does not match the recorded fixture market.');
    if (source.settlement_period != null && source.settlement_period !== 'REGULATION_TIME')
      return reject('Settlement period is not regulation time.');
    if (source.start_utc != null && instant(source.start_utc) !== fixture.start)
      return reject('Source kickoff does not match the exact fixture kickoff.');
    if (Object.keys(source.prices ?? {}).length !== outcomes.length ||
        !outcomes.every(side => price(source.prices?.[side])))
      return reject('Complete Home/Draw/Away prices are unavailable or invalid.');
    const expectedTeams = fixture.identity.slice(1).map(teamKey);
    const names = source.source_team_names;
    const matchedNames = Array.isArray(names) && names.length === 2 &&
      names.every((team, i) => teamKey(team) === expectedTeams[i]);
    if (benchmark) {
      if (url.hostname !== 'www.goldedge.net' || !url.pathname.startsWith('/odds/football/') ||
          !/^[a-z0-9]{5,24}$/.test(id) || !url.pathname.endsWith('-' + id) ||
          source.timestamp_basis !== 'GOLDEDGE_PINNACLE_1X2_OBSERVATION_TIME' || !matchedNames)
        return reject('GoldEdge event, participants or timestamp basis do not match this fixture.');
    } else {
      const match = /^\/football\/[^/]+\/([^/]+)-v-([^/]+)\/e-(\d+)$/.exec(url.pathname);
      if (!['skybet.com', 'www.skybet.com'].includes(url.hostname) || match?.[3] !== id ||
          !match.slice(1, 3).every((team, i) => teamKey(team) === expectedTeams[i]) ||
          (names != null && !matchedNames) || !/^ppb:sbkMarket:[\d.]+$/.test(source.source_market_id ?? '') ||
          source.executable_verified !== false || observed !== captured ||
          source.timestamp_basis !== 'DIRECT_SKY_BET_HTTP_OBSERVATION_TIME')
        return reject('Sky Bet event, participants, market ID or timestamp basis do not match this fixture.');
    }
    const marketId = benchmark ? record.market : source.source_market_id;
    const metrics = marketMetrics(source.prices);
    const comparableKey = [expectedSource, id, record.market, 'REGULATION_TIME', marketId ?? '',
      source.timestamp_basis, url.hostname, url.pathname].join('|');
    return {
      source: {
        key: expectedSource + ':' + id, id, sourceId:expectedSource,
        name:benchmark ? 'Pinnacle via GoldEdge' : 'Sky Bet',
        market:record.market, settlementPeriod:'REGULATION_TIME', marketId,
        timestampBasis:source.timestamp_basis, url, observed, captured, snapshot, httpDate:serverTime,
        hash:source.source_sha256, prices:{home:source.prices.home,draw:source.prices.draw,away:source.prices.away},
        metrics, comparableKey
      },
      reason:null
    };
  }

  function frozenModel(record, fixture, snapshot) {
    const model = record.frozen_model?.comparison;
    const observed = instant(record.frozen_model?.observed_at_utc);
    if (model?.method !== 'CURRENT_SEASON_POISSON_COMPARISON_V1' || model.unvalidated !== true ||
        model.research_only !== true || model.publication_gate !== 'BLOCKED' ||
        (model.model_validation != null && model.model_validation !== 'UNVALIDATED') ||
        !(observed <= snapshot) ||
        !probabilities(outcomes.map(side => model['prob_' + side]))) return null;
    const estimate = { row: { ...model, model: model.method }, observed };
    return { ...estimate, cutoffReason: modelCutoffReason(estimate, fixture) ??
      (hash(model.training_sha256) ? null : 'Training fingerprint is missing or invalid.') };
  }

  function sameMarketObservation(a, b) {
    return a.observed === b.observed && a.hash === b.hash &&
      a.marketId === b.marketId && outcomes.every(side => a.prices[side] === b.prices[side]);
  }

  function verifyMarkets(document, index, asOf = Date.now()) {
    const matches = new Map();
    const owners = new Map();
    const conflicts = new Set();
    const withheldReasons = [];
    let withheld = 0;
    const records = document?.schema_version === 1 && Array.isArray(document.records) ? document.records : [];
    for (const record of records) {
      const fixture = marketFixture(record, index);
      const snapshot = instant(record?.snapshot_at_utc);
      if (!fixture) {
        withheld++;
        withheldReasons.push({ source:'fixture', reason:'Fixture identity, kickoff or 90-minute 1X2 market did not match a published fixture.' });
        continue;
      }
      if (!matches.has(fixture.id)) matches.set(fixture.id, {
        fixture, sources:new Map(), histories:new Map(), missing:new Set(), reasons:[]
      });
      const match = matches.get(fixture.id);
      if (snapshot <= asOf && snapshot < fixture.marketCutoff - 5 * minute) {
        const model = frozenModel(record, fixture, snapshot);
        if (model && (!match.model ||
            (model.cutoffReason === null && match.model.cutoffReason !== null) ||
            ((model.cutoffReason === null) === (match.model.cutoffReason === null) && model.observed > match.model.observed))) {
          match.model = model;
        }
      }
      for (const key of ['benchmark', 'sky_bet']) {
        if (record[key] == null) {
          match.missing.add(key);
          continue;
        }
        const checked = marketSource(record[key], key, record, fixture, snapshot, asOf);
        if (!checked.source) {
          withheld++;
          const item = { source:key === 'benchmark' ? 'Pinnacle via GoldEdge' : 'Sky Bet', reason:checked.reason };
          match.reasons.push(item);
          withheldReasons.push({ fixture:match.fixture.id, ...item });
          continue;
        }
        const source = checked.source;
        if (owners.has(source.key) && owners.get(source.key) !== fixture.id) {
          conflicts.add(source.key);
          const item = { source:source.name, reason:'The same provider event ID is bound to more than one fixture.' };
          match.reasons.push(item);
          withheldReasons.push({ fixture:match.fixture.id, ...item });
        }
        owners.set(source.key, fixture.id);
        const history = match.histories.get(source.key) ?? [];
        const prior = history[history.length - 1];
        if (prior && prior.comparableKey !== source.comparableKey) {
          conflicts.add(source.key);
          const item = { source:source.name, reason:'Provider event, market, settlement period or source market identity changed between observations.' };
          match.reasons.push(item);
          withheldReasons.push({ fixture:match.fixture.id, ...item });
          continue;
        }
        const sameTime = history.find(item => item.observed === source.observed);
        if (sameTime) {
          if (!sameMarketObservation(sameTime, source)) {
            conflicts.add(source.key);
            const item = { source:source.name, reason:'Conflicting prices or receipts share the same observation timestamp.' };
            match.reasons.push(item);
            withheldReasons.push({ fixture:match.fixture.id, ...item });
          }
          continue;
        }
        history.push(source);
        history.sort((a,b) => a.observed - b.observed || a.captured - b.captured);
        match.histories.set(source.key, history);
      }
    }
    const output = [...matches.values()].map(match => {
      const sourceHistories = [];
      const sources = [];
      for (const [key, observations] of match.histories) {
        if (conflicts.has(key) || !observations.length) continue;
        const first = observations[0];
        const latest = observations[observations.length - 1];
        const movementAvailable = observations.length >= 2;
        const movement = movementAvailable ? Object.fromEntries(outcomes.map(side => [side, {
          decimal:latest.prices[side] - first.prices[side],
          percentage:((latest.prices[side] / first.prices[side]) - 1) * 100
        }])) : null;
        const history = {
          key, name:latest.name, sourceId:latest.sourceId, market:latest.market,
          settlementPeriod:latest.settlementPeriod, marketId:latest.marketId,
          observations, earliest:first, latest, observationCount:observations.length,
          movementAvailable, movement,
          openingPriceAvailable:false
        };
        sourceHistories.push(history);
        sources.push(latest);
      }
      const missingSources = ['benchmark','sky_bet'].filter(key =>
        match.missing.has(key) && ![...match.histories.keys()].some(sourceKey =>
          sourceKey.startsWith((key === 'benchmark' ? 'PINNACLE_VIA_GOLDEDGE' : 'SKY_BET') + ':')))
        .map(key => key === 'benchmark' ? 'Pinnacle via GoldEdge' : 'Sky Bet');
      return {
        fixture:match.fixture, model:match.model, sources, sourceHistories,
        missingSources, withheldReasons:match.reasons
      };
    }).filter(match => match.sources.length || match.withheldReasons.length);
    const collectionStatus = document?.collection_status ?? null;
    return {
      withheld:withheld + conflicts.size,
      withheldReasons,
      collectionStatus,
      matches:output.map(match => ({...match, collectionStatus}))
    };
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
