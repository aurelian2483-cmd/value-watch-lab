'use strict';

const evidence = FootballMatchEvidence;
const { outcomes } = evidence;
const timeInLondon = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  dateStyle: 'medium',
  timeStyle: 'short',
});
const selector = document.getElementById('match');
const sourceFilter = document.getElementById('source-filter');
const status = document.getElementById('market-status');
const rows = document.getElementById('market-rows');
const modelStatus = document.getElementById('model-leader');
const withheld = document.getElementById('market-withheld');
const details = document.getElementById('market-source-details');
let globalWithheldMessage = '';

function fractional(decimal) {
  const digits = String(decimal).split('.')[1]?.length || 0;
  const denominator = 10 ** digits;
  const numerator = Math.round((decimal - 1) * denominator);
  let a = numerator;
  let b = denominator;
  while (b) [a, b] = [b, a % b];
  return `${numerator / a}/${denominator / a}`;
}

function render(match) {
  rows.replaceChildren();
  details.replaceChildren();
  if (!match) return;
  const [, home, away] = match.fixture.identity;
  const labels = [home, 'Draw', away];
  const eligible = [...(match.fixture.models ?? []), ...(match.model ? [match.model] : [])]
    .find(estimate => estimate?.cutoffReason === null &&
      evidence.probabilities(outcomes.map(side => estimate.row?.['prob_' + side])));
  const model = eligible?.row;
  const probabilities = model && evidence.probabilities(outcomes.map(side => model['prob_' + side]));
  const histories = (match.sourceHistories ?? []).filter(history =>
    !sourceFilter.value || history.sourceId === sourceFilter.value);
  document.getElementById('event-preview').href = '../football-match/?event=' + encodeURIComponent(match.fixture.id);
  status.textContent = `Kickoff ${timeInLondon.format(match.fixture.start)} UK · recorded historical observations · ${histories.length} source(s) shown`;
  modelStatus.textContent = probabilities ?
    'Eligible experimental model available for research-only probability comparison. No expected value or betting signal is calculated.' :
    'No model passes the explicit training-cutoff and source-receipt rules. Model-to-market comparison is withheld.';
  for (const history of histories) {
    const latest = history.latest;
    const reference = latest.metrics.proportionalNoVig;
    for (const [i, side] of outcomes.entries()) {
      const row = rows.insertRow();
      const sourceCell = row.insertCell();
      const link = document.createElement('a');
      link.href = latest.url.href;
      link.rel = 'noopener noreferrer';
      link.textContent = history.name;
      sourceCell.append(link);
      const selection = row.insertCell();
      selection.textContent = labels[i];
      row.insertCell().textContent = latest.prices[side].toFixed(3);
      row.insertCell().textContent = fractional(latest.prices[side]);
      row.insertCell().textContent = (latest.metrics.implied[side] * 100).toFixed(2) + '%';
      row.insertCell().textContent = (reference[side] * 100).toFixed(2) + '%';
      row.insertCell().textContent = (latest.metrics.overround * 100 >= 0 ? '+' : '') +
        (latest.metrics.overround * 100).toFixed(2) + '%';
      if (probabilities) {
        const difference = (probabilities[i] - reference[side]) * 100;
        row.insertCell().textContent = (difference >= 0 ? '+' : '') + difference.toFixed(2) + ' pp';
      } else row.insertCell().textContent = 'Withheld';
      row.insertCell().textContent = timeInLondon.format(latest.observed);
      row.insertCell().textContent = timeInLondon.format(latest.captured);
      if (history.movementAvailable) {
        const movement = history.movement[side];
        row.insertCell().textContent = `${history.observationCount} captures · ${movement.decimal >= 0 ? '+' : ''}${movement.decimal.toFixed(3)} (${movement.percentage >= 0 ? '+' : ''}${movement.percentage.toFixed(2)}%)`;
      } else row.insertCell().textContent = '1 capture · movement unavailable';
    }
    const disclosure = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = history.name + ' · source provenance';
    disclosure.append(summary);
    const paragraph = text => {
      const p = document.createElement('p');
      p.textContent = text;
      disclosure.append(p);
    };
    paragraph('Provider event ID ' + latest.id + ' · market ' + history.market +
      ' · settlement ' + history.settlementPeriod + (history.marketId ? ' · market ID ' + history.marketId : '') + '.');
    paragraph('Earliest recorded observation: ' + timeInLondon.format(history.earliest.observed) +
      '. Latest recorded observation: ' + timeInLondon.format(latest.observed) + '.');
    paragraph('Opening price is not explicitly recorded. The earliest captured observation is not assumed to be the market opening.');
    paragraph('Latest source SHA-256: ' + latest.hash);
    const sourceLink = document.createElement('a');
    sourceLink.href = latest.url.href;
    sourceLink.rel = 'noopener noreferrer';
    sourceLink.textContent = 'Open original source';
    disclosure.append(sourceLink);
    if (!history.movementAvailable) paragraph('Only one comparable observation exists. No price movement can be calculated.');
    else {
      paragraph('Price changes compare only observations sharing the same fixture, source event, 90-minute 1X2 market, settlement period and source market ID.');
      for (const side of outcomes) {
        const change = history.movement[side];
        paragraph(labels[outcomes.indexOf(side)] + ': ' + history.earliest.prices[side].toFixed(3) +
          ' → ' + latest.prices[side].toFixed(3) + ' (' + (change.percentage >= 0 ? '+' : '') +
          change.percentage.toFixed(2) + '%).');
      }
    }
    details.append(disclosure);
  }
  if (!histories.length) status.textContent = 'No verified source observations match this filter for the selected fixture.';
  const messages = globalWithheldMessage ? [globalWithheldMessage] : [];
  for (const source of match.missingSources ?? []) messages.push('No recorded quote for ' + source + '.');
  for (const item of match.withheldReasons ?? []) messages.push((item.source || 'Source') + ': ' + item.reason);
  withheld.textContent = messages.join(' ');
}

async function load() {
  try {
    const read = async path => {
      const response = await fetch(path, { cache:'no-cache', signal:AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error('Snapshot unavailable');
      return response.json();
    };
    const [snapshot, dashboard, expanded] = await Promise.allSettled([
      read('../paper-lab/hybrid-market-data.json'), read('../research-dashboard-data.json'), read('../football-expanded-data.json')
    ]);
    if (snapshot.status !== 'fulfilled' || snapshot.value?.schema_version !== 1 ||
        !Array.isArray(snapshot.value.records) ||
        (dashboard.status !== 'fulfilled' && expanded.status !== 'fulfilled'))
      throw new Error('Unsupported snapshot');
    const feeds = [dashboard, expanded].filter(feed => feed.status === 'fulfilled').map(feed => feed.value);
    const index = evidence.fixtureIndex(feeds);
    const result = evidence.verifyMarkets(snapshot.value, index);
    const matches = result.matches.sort((a, b) => b.fixture.start - a.fixture.start);
    globalWithheldMessage = result.withheld ?
      result.withheld + ' observation(s) were withheld because fixture, source or receipt evidence did not match. Fixture-specific reasons are shown when available.' : '';
    if (!matches.length) {
      status.textContent = 'No source-backed pre-kickoff captures are available.';
      return;
    }
    const sourceIds = [...new Set(matches.flatMap(match => match.sourceHistories.map(history => history.sourceId)))].sort();
    for (const sourceId of sourceIds) {
      const option = new Option(sourceId === 'SKY_BET' ? 'Sky Bet' : 'Pinnacle via GoldEdge', sourceId);
      sourceFilter.add(option);
    }
    sourceFilter.disabled = false;
    for (const [index, match] of matches.entries()) {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = `${match.fixture.identity[1]} v ${match.fixture.identity[2]} · ${timeInLondon.format(match.fixture.start)}`;
      selector.append(option);
    }
    selector.disabled = false;
    selector.addEventListener('change', () => render(matches[Number(selector.value)]));
    sourceFilter.addEventListener('change', () => render(matches[Number(selector.value)]));
    render(matches[0]);
    document.getElementById('event-preview').hidden = false;
  } catch {
    status.textContent = 'The recorded market feed is unavailable.';
  }
}

load();
