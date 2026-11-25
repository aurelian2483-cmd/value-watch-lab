'use strict';

const sides = ['home', 'draw', 'away'];
const market = 'PL:1X2:90_MINUTES_PLUS_STOPPAGE:NO_EXTRA_TIME';
const exchange = /betfair(?!_sportsbook$)|exchange|betdaq|matchbook|smarkets|betopenly|prophetx|polymarket/;
const maxAge = 30 * 60 * 1000;
const aliases = new Map([
  ['man utd', 'manchester united'], ['man united', 'manchester united'],
  ['man city', 'manchester city'], ['spurs', 'tottenham hotspur'],
  ["nott'm forest", 'nottingham forest'], ['wolves', 'wolverhampton wanderers']
]);
function team(name) {
  if (typeof name !== 'string') return '';
  const text = name.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
  return aliases.get(text) || text;
}
function numberTime(value) {
  return typeof value === 'string' && /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? Date.parse(value) : NaN;
}
function signature(home, away, start) {
  return JSON.stringify([team(home), team(away), start]);
}
function complete(prices) {
  return prices && Object.keys(prices).length === 3 &&
    sides.every(side => Number.isFinite(prices[side]) && prices[side] > 1 && prices[side] <= 10000);
}
function metrics(prices) {
  if (!complete(prices)) return null;
  const total = sides.reduce((sum, side) => sum + 1 / prices[side], 0);
  return {overround: total - 1, outcomes: Object.fromEntries(sides.map(side => [
    side, {implied: 1 / prices[side], probability: 1 / (prices[side] * total), fairOdds: prices[side] * total}
  ]))};
}
function fixtures(rows) {
  return rows.filter(row => (row.league || 'PL') === 'PL' && team(row.home) &&
    team(row.away) && team(row.home) !== team(row.away) && Number.isFinite(numberTime(row.kickoff_utc)))
    .map(row => {
      const start = numberTime(row.kickoff_utc);
      return {id: JSON.stringify([market, row.home, row.away, start]), home: row.home, away: row.away, start,
        signature: signature(row.home, row.away, start)};
    });
}
function matchPoll(rows, records, asOf, allowedBooks) {
  const candidates = fixtures(rows);
  const rejects = {};
  const rejected = [];
  const accepted = [];
  const providerEvents = new Map();
  const seen = new Set();
  const duplicates = new Set();
  const providerFixtures = new Map();
  for (const record of records) {
    const providerKey = JSON.stringify([record.event_id, record.bookmaker]);
    if (seen.has(providerKey)) duplicates.add(providerKey);
    seen.add(providerKey);
    const key = signature(record.home, record.away, numberTime(record.start_utc));
    if (!providerEvents.has(key)) providerEvents.set(key, new Set());
    providerEvents.get(key).add(record.event_id);
    if (!providerFixtures.has(record.event_id)) providerFixtures.set(record.event_id, new Set());
    providerFixtures.get(record.event_id).add(key);
  }
  for (const record of records) {
    const start = numberTime(record.start_utc);
    const key = signature(record.home, record.away, start);
    const matches = candidates.filter(fixture => fixture.signature === key);
    const observed = numberTime(record.observed_at_utc);
    const checked = numberTime(record.checked_at_utc);
    const review = allowedBooks.get(record.bookmaker);
    let reason;
    if (!review || review.settlement !== market || record.review_sha256 !== review.review_sha256 ||
      !(asOf < review.review_expires) || exchange.test(record.bookmaker)) reason = 'bookmaker_review_unavailable';
    else if (record.sport_key !== 'soccer_epl' || record.market !== review.market_key || record.settlement !== review.settlement ||
      !/^[a-z0-9]{16,64}$/.test(record.event_id || '') ||
      !/^[a-f0-9]{64}$/.test(record.receipt_sha256 || '') || !complete(record.prices)) reason = 'no_market';
    else if (matches.length !== 1 || providerEvents.get(key).size !== 1 || providerFixtures.get(record.event_id).size !== 1 ||
      duplicates.has(JSON.stringify([record.event_id, record.bookmaker]))) reason = 'no_match';
    else if (!(observed <= checked && checked <= asOf && checked < start && asOf - observed < maxAge)) reason = 'expired';
    if (reason) {
      rejects[reason] = (rejects[reason] || 0) + 1;
      rejected.push({reason, event: record.event_id, bookmaker: record.bookmaker, candidateCount: matches.length});
      continue;
    }
    accepted.push({fixture: matches[0], source: 'THE_ODDS_API', event: record.event_id,
      bookmaker: record.bookmaker, market, period: 'REGULATION', line: null,
      observed, checked, review: review.review_sha256, receipt: record.receipt_sha256, prices: record.prices});
  }
  return {accepted, rejects, rejected};
}
function movement(observations, start, asOf) {
  const comparable = new Set(observations.map(row => JSON.stringify([row.fixture.id, row.source, row.event, row.bookmaker, row.market])));
  if (comparable.size !== 1) return null;
  const rows = observations.filter(row => row.checked <= asOf && row.checked < start).sort((a, b) => a.checked - b.checked);
  if (!rows.length) return null;
  const earliest = rows[0], latest = rows.at(-1);
  // Take the last verifiable observation within 30 minutes before kickoff.
  // Finalise only after the scheduled kickoff so a future poll cannot replace it.
  const close = asOf >= start ? rows.filter(row => row.checked < start &&
    row.checked >= start - maxAge && row.observed >= start - maxAge).at(-1) : null;
  return {earliest, latest, close: close || null, outcomes: Object.fromEntries(sides.map(side => {
    const opening = earliest.prices[side], last = latest.prices[side];
    return [side, {oddsDelta: last - opening, impliedDelta: 1 / last - 1 / opening,
      closingComparison: close && close.checked > earliest.checked ? opening / close.prices[side] - 1 : null}];
  }))};
}
function comparison(observations, asOf) {
  const latest = new Map();
  for (const row of observations) {
    if (row.checked <= asOf && (!latest.has(row.bookmaker) || latest.get(row.bookmaker).checked < row.checked))
      latest.set(row.bookmaker, row);
  }
  const current = [...latest.values()].filter(row => row.fixture.start > asOf && asOf - row.observed < maxAge);
  return {books: current.length, best: Object.fromEntries(sides.map(side =>
    [side, current.filter((row) => row.prices[side] === Math.max(...current.map(x => x.prices[side])))])), current};
}
module.exports = {market, sides, maxAge, fixtures, metrics, matchPoll, movement, comparison};
