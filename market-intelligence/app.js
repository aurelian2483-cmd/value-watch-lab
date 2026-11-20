'use strict';

const evidence = FootballMatchEvidence;
const { outcomes } = evidence;
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

const selector = document.getElementById('match');
const status = document.getElementById('market-status');
const rows = document.getElementById('market-rows');
const modelLeader = document.getElementById('model-leader');

function render(match) {
  rows.replaceChildren();
  if (!match) return;
  const [, home, away] = match.fixture.identity;
  const labels = [home, 'Draw', away];
  const model = [match.model, ...match.fixture.models].find(estimate => estimate?.cutoffReason === null)?.row;
  const probabilities = evidence.probabilities(outcomes.map(side => model?.['prob_' + side]));
  document.getElementById('event-preview').href = '../football-match/?event=' + encodeURIComponent(match.fixture.id);
  status.textContent = `Kickoff ${timeInLondon.format(match.fixture.start)} UK · historical source observations`;
  const leaders = probabilities && labels.filter((_, i) =>
    probabilities[i] === Math.max(...probabilities));
  modelLeader.textContent = 'Experimental model leader · ' + (leaders?.join(', ') || 'Unavailable');
  for (const source of match.sources) {
    const prices = outcomes.map(side => source.prices?.[side]);
    for (const [i, decimal] of prices.entries()) {
      const row = rows.insertRow();
      const link = document.createElement('a');
      link.href = source.url.href;
      link.textContent = source.name;
      row.insertCell().append(link);
      for (const value of [labels[i], String(decimal), fractional(decimal),
        timeInLondon.format(source.observed), timeInLondon.format(source.captured), 'Complete 1X2',
        decimal === Math.min(...prices) ? 'Yes' : '—']) {
        row.insertCell().textContent = value;
      }
    }
  }
}

async function load() {
  try {
    const read = async path => {
      const response = await fetch(path, { cache:'no-cache', signal:AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error('Snapshot unavailable');
      return response.json();
    };
    const [snapshot, ...feeds] = await Promise.allSettled([
      read('../paper-lab/hybrid-market-data.json'), read('../research-dashboard-data.json'), read('../football-expanded-data.json')
    ]);
    if (snapshot.status !== 'fulfilled' || snapshot.value?.schema_version !== 1 || !Array.isArray(snapshot.value.records) ||
        feeds.every(feed => feed.status !== 'fulfilled')) throw new Error('Unsupported snapshot');
    const index = evidence.fixtureIndex(feeds.filter(feed => feed.status === 'fulfilled').map(feed => feed.value));
    const result = evidence.verifyMarkets(snapshot.value, index);
    document.getElementById('market-withheld').textContent = result.withheld ?
      'Some observations were withheld because fixture, market or receipt evidence did not match.' : '';
    const matches = result.matches.sort((a, b) => b.fixture.start - a.fixture.start);
    if (!matches.length) {
      status.textContent = 'No source-backed pre-kickoff captures are available.';
      return;
    }
    for (const [index, match] of matches.entries()) {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = `${match.fixture.identity[1]} v ${match.fixture.identity[2]} · ${timeInLondon.format(match.fixture.start)}`;
      selector.append(option);
    }
    selector.disabled = false;
    selector.addEventListener('change', () => render(matches[Number(selector.value)]));
    render(matches[0]);
    document.getElementById('event-preview').hidden = false;
  } catch {
    status.textContent = 'The recorded market feed is unavailable.';
  }
}

load();
