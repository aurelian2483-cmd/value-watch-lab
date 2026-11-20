'use strict';

const outcomes = ['home', 'draw', 'away'];
const timeInLondon = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  dateStyle: 'medium',
  timeStyle: 'short',
});

function fractional(decimal) {
  const digits = String(decimal).split('.')[1]?.length || 0;
  const denominator = 10 ** digits;
  const numerator = Math.round((decimal - 1) * denominator);
  let a = numerator;
  let b = denominator;
  while (b) [a, b] = [b, a % b];
  return `${numerator / a}/${denominator / a}`;
}

function readSource(source, start, domain) {
  if (source?.verified !== true || !/^[a-f0-9]{64}$/i.test(source.source_sha256)) return null;
  const observed = Date.parse(source.observed_at_utc);
  if (!Number.isFinite(observed) || observed >= start) return null;
  try {
    const url = new URL(source.source);
    if (url.protocol !== 'https:' || url.username || url.password ||
        (url.hostname !== domain && !url.hostname.endsWith('.' + domain))) return null;
    return { url, observed, prices: source.prices };
  } catch {
    return null;
  }
}

function readMatch(record) {
  const start = Date.parse(record?.start_utc);
  if (record?.market !== 'FOOTBALL_90_MINUTE_1X2' || !Number.isFinite(start)) return null;
  try {
    const [sport, matchKey, kickoff] = JSON.parse(record.event_id);
    const [, home, away] = JSON.parse(matchKey);
    if (sport !== 'football' || Date.parse(kickoff) !== start ||
      ![home, away].every(team => typeof team === 'string' && team.trim())) return null;
    const sources = [
      ['Pinnacle via GoldEdge', record.benchmark, 'PINNACLE_VIA_GOLDEDGE', 'goldedge.net'],
      ['Sky Bet', record.sky_bet, 'SKY_BET', 'skybet.com'],
    ].flatMap(([name, source, id, domain]) => {
      const parsed = source?.source_id === id && readSource(source, start, domain);
      return parsed ? [{ name, ...parsed }] : [];
    });
    const frozen = record.frozen_model;
    const model = frozen?.comparison;
    const modelTime = Date.parse(frozen?.observed_at_utc);
    const probabilities = outcomes.map(side => model?.['prob_' + side]);
    const usableModel = Number.isFinite(modelTime) && modelTime < start &&
      Date.parse(model?.cutoff_utc) === start && model?.method === 'CURRENT_SEASON_POISSON_COMPARISON_V1' &&
      model.unvalidated === true &&
      model.research_only === true && model.publication_gate === 'BLOCKED' &&
      probabilities.every(p => Number.isFinite(p) && p >= 0 && p <= 1) &&
      Math.abs(probabilities.reduce((sum, p) => sum + p, 0) - 1) < 0.0001;
    return { start, home, away, sources, probabilities: usableModel ? probabilities : null };
  } catch {
    return null;
  }
}

function price(value) {
  return Number.isFinite(value) && value > 1 && value <= 10000 && /^\d+(?:\.\d{1,6})?$/.test(String(value));
}

const selector = document.getElementById('match');
const status = document.getElementById('market-status');
const rows = document.getElementById('market-rows');
const modelLeader = document.getElementById('model-leader');

function render(match) {
  rows.replaceChildren();
  if (!match) return;
  const labels = [match.home, 'Draw', match.away];
  status.textContent = `Kickoff ${timeInLondon.format(match.start)} UK · historical source observations`;
  const leaders = match.probabilities && labels.filter((_, i) =>
    match.probabilities[i] === Math.max(...match.probabilities));
  modelLeader.textContent = 'Experimental model leader · ' + (leaders?.join(', ') || 'Unavailable');
  for (const source of match.sources) {
    const prices = outcomes.map(side => source.prices?.[side]);
    const complete = prices.every(price);
    for (const [i, decimal] of prices.entries()) {
      const row = rows.insertRow();
      const link = document.createElement('a');
      link.href = source.url.href;
      link.textContent = source.name;
      row.insertCell().append(link);
      const favourite = complete ? (decimal === Math.min(...prices) ? 'Yes' : '—') : 'Unavailable';
      for (const value of [labels[i], price(decimal) ? String(decimal) : 'Unavailable',
        price(decimal) ? fractional(decimal) : '—', timeInLondon.format(source.observed),
        complete ? 'Complete 1X2' : 'Partial 1X2', favourite]) {
        row.insertCell().textContent = value;
      }
    }
  }
}

async function load() {
  try {
    const response = await fetch('../paper-lab/hybrid-market-data.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error('Snapshot unavailable');
    const snapshot = await response.json();
    if (snapshot.schema_version !== 1 || !Array.isArray(snapshot.records)) throw new Error('Unsupported snapshot');
    const matches = snapshot.records.map(readMatch).filter(match => match?.sources.length)
      .sort((a, b) => b.start - a.start);
    if (!matches.length) {
      status.textContent = 'No source-backed pre-kickoff captures are available.';
      return;
    }
    for (const [index, match] of matches.entries()) {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = `${match.home} v ${match.away} · ${timeInLondon.format(match.start)}`;
      selector.append(option);
    }
    selector.disabled = false;
    selector.addEventListener('change', () => render(matches[Number(selector.value)]));
    render(matches[0]);
  } catch {
    status.textContent = 'The recorded market feed is unavailable.';
  }
}

load();
