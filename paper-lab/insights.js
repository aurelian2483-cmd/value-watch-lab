(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ResearchInsights = factory();
})(globalThis, function () {
  'use strict';
  const utc = value => typeof value === 'string' && /T.*(?:Z|[+]00:00)$/.test(value) ? Date.parse(value) : NaN;
  const safeURL = value => { try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password ? u.href : null; } catch { return null; } };
  const sourceValid = (source, cutoff) => Boolean(safeURL(source?.url) && Number.isFinite(utc(source.observedAtUTC)) && utc(source.observedAtUTC) <= cutoff);
  const numeric = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
  const methodologies = new Set(['SECTIONALS', 'CLASS_DROP', 'WEIGHT_ADVANTAGE', 'BREEDING', 'FORM_ANALYSIS', 'STATISTICAL_MODEL', 'UNVERIFIED_HEARSAY', 'OTHER']);

  function classifyClaim(reasoning, methodology, urls = []) {
    if (typeof reasoning !== 'string' || !reasoning.trim() || reasoning.length > 3000) throw Error('A claim of up to 3,000 characters is required.');
    const matches = reasoning.match(/\binsid(?:e|er)\s+(?:info(?:rmation)?|knowledge)|\bjockey(?:[’']s)?\s+friend|\bfriend\s+of\s+(?:a\s+|the\s+)?jockey|\bstable\s+secret|\bguaranteed\s+(?:winner|profit|return)|\bcertain\s+profit|\brisk[ -]?free\s+(?:profit|bet|return)/gi) || [];
    const sources = [...new Set((Array.isArray(urls) ? urls : []).slice(0, 10).map(safeURL).filter(Boolean))];
    return { classification: matches.length ? 'HIGH_RISK_CLAIM' : sources.length ? 'SOURCE_LINK_SUPPLIED_NOT_VERIFIED' : 'UNVERIFIED_CLAIM', highRisk: matches.length > 0, flaggedPhrases: matches, methodology: methodologies.has(methodology) ? methodology : 'UNVERIFIED_HEARSAY', sources, verifiedROI: null, winRate: null, trustScore: null, verifiedSettlements: 0, methodologyVersion: 'CLAIM_EVIDENCE_V1' };
  }

  function playerTrend(input, now = Date.now()) {
    const unavailable = reason => ({ status: 'INSUFFICIENT_DATA', reason, recentAverage: null, baselineAverage: null, samples: 0, sparkline: [], streak: null, drought: null, rosterFlags: { is_new_signing: null, is_debutant: null }, evidence: [] });
    if (!input || typeof input.metric !== 'string' || !input.metric || !Number.isFinite(utc(input.eventStartUTC))) return unavailable('Event identity and a valid metric are required.');
    const cutoff = Math.min(now, utc(input.eventStartUTC) - 1), baseline = input.baseline;
    const perMinutes = input.perMinutes;
    if (!baseline || baseline.metric !== input.metric || !numeric(baseline.value) || !Number.isSafeInteger(baseline.sampleSize) || baseline.sampleSize < 5 || !sourceValid(baseline.source, cutoff) || !Number.isFinite(utc(baseline.asOfUTC)) || utc(baseline.asOfUTC) > cutoff || (perMinutes !== undefined && (!numeric(perMinutes) || perMinutes === 0 || baseline.perMinutes !== perMinutes))) return unavailable('A sourced comparable season baseline is missing or not pre-event.');
    const appearances = Array.isArray(input.appearances) ? input.appearances : [];
    const rows = appearances.filter(row => row?.completed === true && typeof row.eventId === 'string' && row.eventId && Number.isFinite(utc(row.startUTC)) && Number.isFinite(utc(row.completedAtUTC)) && utc(row.startUTC) < utc(row.completedAtUTC) && utc(row.completedAtUTC) <= cutoff && sourceValid(row.source, cutoff) && numeric(row.metrics?.[input.metric]) && (perMinutes === undefined || numeric(row.minutes) && row.minutes > 0));
    const seen = new Map();
    for (const row of rows) {
      const previous = seen.get(row.eventId);
      if (previous && (previous.metrics[input.metric] !== row.metrics[input.metric] || previous.minutes !== row.minutes || previous.startUTC !== row.startUTC)) return unavailable('Conflicting appearance records require review.');
      seen.set(row.eventId, row);
    }
    const latest = [...seen.values()].sort((a, b) => utc(b.startUTC) - utc(a.startUTC)).slice(0, 5);
    if (latest.length < 5) return unavailable('Five unique completed, sourced pre-event appearances are required.');
    const total = latest.reduce((sum, row) => sum + row.metrics[input.metric], 0);
    const average = perMinutes === undefined ? total / 5 : total / latest.reduce((sum, row) => sum + row.minutes, 0) * perMinutes;
    const relative = input.thresholds?.relative ?? .15, absolute = input.thresholds?.absolute ?? .05;
    if (!numeric(relative) || relative > 10 || !numeric(absolute)) return unavailable('Trend thresholds are invalid.');
    const difference = average - baseline.value, threshold = Math.max(absolute, baseline.value * relative);
    const status = difference > threshold ? 'IMPROVING' : difference < -threshold ? 'DECLINING' : 'STABLE';
    const scoringMetric = /^(goals|touchdowns|aces|points_scored)$/.test(input.metric);
    let streak = null, drought = null;
    if (scoringMetric) {
      let consecutiveScoring = 0, consecutiveZero = 0;
      for (const row of latest) { if (row.metrics[input.metric] > 0) consecutiveScoring++; else break; }
      for (const row of latest) { if (row.metrics[input.metric] === 0) consecutiveZero++; else break; }
      streak = { consecutiveScoringAppearances: consecutiveScoring, window: 5 };
      drought = { consecutiveZeroAppearances: consecutiveZero, noDueOutcomeInference: true };
    }
    const roster = input.roster;
    const rosterFlags = roster?.verified === true && sourceValid(roster.source, cutoff) ? { is_new_signing: roster.is_new_signing === true, is_debutant: roster.is_debutant === true } : { is_new_signing: null, is_debutant: null };
    return { status, reason: 'Descriptive comparison only; thresholds are configurable and not a validated predictive model.', recentAverage: average, baselineAverage: baseline.value, samples: 5, difference, threshold, metric: input.metric, perMinutes: perMinutes ?? null, sparkline: [...latest].reverse().map(row => ({ eventId: row.eventId, startUTC: row.startUTC, value: perMinutes === undefined ? row.metrics[input.metric] : row.metrics[input.metric] / row.minutes * perMinutes })), streak, drought, rosterFlags, evidence: [baseline.source, ...latest.map(row => row.source)], validation: 'UNVALIDATED' };
  }

  function createStatisticsCache({ loader, maxEntries = 150, ttlMs = 300000, clock = Date.now }) {
    if (typeof loader !== 'function' || !Number.isSafeInteger(maxEntries) || maxEntries < 1 || maxEntries > 1000 || !Number.isFinite(ttlMs) || ttlMs < 0) throw Error('A bounded statistics loader is required.');
    const cache = new Map(), flights = new Map(); let generation = 0, disposed = false;
    const keyOf = query => {
      if (!query || ['eventId', 'sport', 'season', 'source', 'tab'].some(k => typeof query[k] !== 'string' || !query[k] || query[k].length > 4000)) throw Error('Statistics require event, sport, season, source version and tab.');
      return JSON.stringify([query.eventId, query.sport, query.season, query.source, query.tab]);
    };
    const abortError = () => new DOMException('Statistics request cancelled', 'AbortError');
    function attach(promise, signal) {
      if (!signal) return promise;
      if (signal.aborted) return Promise.reject(abortError());
      return new Promise((resolve, reject) => {
        const abort = () => reject(abortError()); signal.addEventListener('abort', abort, { once: true });
        promise.then(value => { signal.removeEventListener('abort', abort); if (!signal.aborted) resolve(value); }, error => { signal.removeEventListener('abort', abort); reject(error); });
      });
    }
    function load(query, { force = false, signal } = {}) {
      if (disposed) return Promise.reject(abortError());
      const key = keyOf(query), cached = cache.get(key);
      if (!force && cached && clock() - cached.at <= ttlMs) { cache.delete(key); cache.set(key, cached); return attach(Promise.resolve(cached.value), signal); }
      if (flights.has(key)) return attach(flights.get(key).promise, signal);
      const controller = new AbortController(), epoch = generation;
      const promise = Promise.resolve().then(() => loader(query, { signal: controller.signal })).then(value => {
        if (disposed || epoch !== generation || controller.signal.aborted) throw abortError();
        cache.delete(key); cache.set(key, { at: clock(), value });
        while (cache.size > maxEntries) cache.delete(cache.keys().next().value);
        return value;
      }).finally(() => { if (flights.get(key)?.promise === promise) flights.delete(key); });
      flights.set(key, { promise, controller }); return attach(promise, signal);
    }
    function invalidate() { generation++; cache.clear(); for (const flight of flights.values()) flight.controller.abort(); flights.clear(); }
    function dispose() { disposed = true; invalidate(); }
    return { load, invalidate, dispose, get size() { return cache.size; } };
  }
  return { classifyClaim, playerTrend, createStatisticsCache };
});
