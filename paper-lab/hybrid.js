'use strict';

(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports
    ? require('../research/market-benchmark/core.js') : root.ValueWatchMarketBenchmark);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ValueWatchHybrid = api;
})(globalThis, function (benchmarkCore) {
  const model = 'CURRENT_SEASON_POISSON_COMPARISON_V1';
  const market = 'FOOTBALL_90_MINUTE_1X2';
  const maxQuoteAge = 30 * 60 * 1000;
  const outcomes = ['home', 'draw', 'away'];
  const instant = value => typeof value === 'string' && /T.*(?:Z|[+-]\d\d:\d\d)$/.test(value) ? Date.parse(value) : NaN;
  const source = value => {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && !url.username && !url.password ? url : null;
    } catch { return null; }
  };

  function evaluate(event, evidence, now = Date.now()) {
    const result = { probabilities: null, selection: null, reason: '', ...benchmarkCore.GATES };
    if (event?.sport !== 'football') return { ...result, reason: 'Football regulation-time result only.' };
    const start = instant(event.startUTC);
    if (!(start > now + 300000)) return { ...result, reason: 'No eligible pre-kickoff fixture for this saved selection.' };
    const raw = event.seasonComparison;
    const modelAt = instant(event.observedAt);
    if (raw?.method !== model || raw.research_only !== true || raw.unvalidated !== true ||
        raw.publication_gate !== 'BLOCKED' || raw.odds !== null || raw.expected_value !== null ||
        !(modelAt <= now && modelAt < start - 300000 && now - modelAt <= 172800000) ||
        !(raw.home_venue_matches >= 4 && raw.away_venue_matches >= 4) ||
        instant(raw.cutoff_utc) !== start || !/^[a-f0-9]{64}$/.test(raw.training_sha256 || '') ||
        !Array.isArray(raw.source_receipts) || !raw.source_receipts.length ||
        raw.source_receipts.some(receipt => !source(receipt?.url) || !/^[a-f0-9]{64}$/.test(receipt?.sha256 || '') ||
          !(instant(receipt?.observed_at_utc) <= modelAt))) {
      return { ...result, reason: 'Fresh current-season model with enough venue history is missing.' };
    }
    const matches = evidence?.schema_version === 1 && Array.isArray(evidence.records)
      ? evidence.records.filter(row => row?.event_id === event.id && row.start_utc === event.startUTC && row.market === market) : [];
    const record = matches.length === 1 ? matches[0] : null;
    const observation = record?.benchmark;
    const benchmarkSource = source(observation?.source);
    const fresh = timestamp => {
      const time = instant(timestamp);
      return time <= now && now - time <= maxQuoteAge && time < start - 300000;
    };
    const prices = observation?.prices;
    const fair = outcomes.every(id => Number.isFinite(prices?.[id]) && prices[id] > 1)
      ? benchmarkCore.deVig(outcomes.map(id => prices[id])) : null;
    if (!benchmarkSource || typeof observation.source_id !== 'string' || !observation.source_id.trim() || /^sky[ _-]*bet$/i.test(observation.source_id.trim()) ||
        /(^|\.)skybet\.com$/i.test(benchmarkSource.hostname) || observation.verified !== true ||
        !fresh(observation.observed_at_utc) || !fair) {
      return { ...result, reason: 'Verified, fresh home/draw/away benchmark prices are missing.' };
    }

    const probabilities = benchmarkCore.blend([raw.prob_home, raw.prob_draw, raw.prob_away], fair.probabilities, 0.5);
    if (!probabilities) return { ...result, reason: 'Current-season model probabilities failed validation.' };
    const quote = record.sky_bet;
    const quoteSource = source(quote?.source);
    const quoteAt = instant(quote?.observed_at_utc);
    if (quote?.source_id !== 'SKY_BET' || quote.verified !== true || !quoteSource ||
        !/(^|\.)skybet\.com$/i.test(quoteSource.hostname) ||
        !fresh(quote.observed_at_utc) || quoteAt < Math.max(instant(observation.observed_at_utc), modelAt) ||
        !outcomes.every(id => Number.isFinite(quote.prices?.[id]) && quote.prices[id] > 1)) {
      return { ...result, probabilities, reason: 'A separate verified Sky Bet market is needed for the price check.' };
    }

    const candidates = outcomes.map((id, i) => ({
      id, decimal: quote.prices[id], estimatedEV: probabilities[i] * quote.prices[id] - 1
    })).filter(row => row.decimal <= 5 && row.estimatedEV >= 0.05)
      .sort((a, b) => b.estimatedEV - a.estimatedEV);
    return { ...result, probabilities, selection: candidates[0] || null,
      reason: candidates.length ? 'Experimental paper candidate.' : 'No outcome meets the research price and estimated-value thresholds.' };
  }
  return { evaluate };
});
