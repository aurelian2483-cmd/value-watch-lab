'use strict';

(() => {
  const panel = document.getElementById('vw-markets');
  const chooser = document.getElementById('vw-race');
  const status = document.getElementById('vw-market-status');
  const output = document.getElementById('vw-market-output');
  const rows = output.querySelector('tbody');
  const provenance = output.querySelector('p');
  const source = output.querySelector('a');
  const ukDate = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London', dateStyle: 'medium', timeStyle: 'short'
  });
  let choices = [];
  let loading = false;

  function render() {
    const race = choices[Number(chooser.value)];
    const market = RaceCards.market(race);
    const favourites = new Set(market.favourites.map(runner => String(runner.horse_id)));
    const runners = new Map(race.runners.map(runner => [String(runner.horse_id), runner.name]));
    provenance.textContent = 'Sky Bet via Sporting Life · Win · Complete observed field · ' +
      ukDate.format(new Date(market.observed)) + ' UK · ' + market.label + '.';
    source.href = market.source;
    rows.replaceChildren();
    for (const quote of market.quotes) {
      const id = String(quote.horse_id);
      const move = RaceCards.priceMovement(race, id);
      const row = rows.insertRow();
      const runner = document.createElement('th');
      runner.scope = 'row';
      runner.textContent = runners.get(id);
      row.append(runner);
      row.insertCell().textContent = String(quote.decimal);
      row.insertCell().textContent = quote.fractional || 'Unavailable';
      row.insertCell().textContent = favourites.has(id) ? (favourites.size > 1 ? 'Joint favourite' : 'Favourite') : '—';
      row.insertCell().textContent = move ?
        move.previous.decimal + ' → ' + move.current.decimal + ' · ' +
        ukDate.format(new Date(move.observedFrom)) + ' UK' : 'Unavailable';
    }
    output.hidden = false;
  }

  async function load() {
    chooser.disabled = true;
    output.hidden = true;
    status.textContent = 'Loading source observations…';
    try {
      const response = await fetch('../racing-research-data.json', {
        cache: 'no-cache', signal: AbortSignal.timeout(8000)
      });
      if (!response.ok) throw new Error('Market snapshot unavailable');
      const data = await response.json();
      if (data.schema_version !== 1 || data.research_only !== true ||
          data.model_validation !== 'UNVALIDATED' || data.publication_gate !== 'BLOCKED' ||
          !Array.isArray(data.races)) throw new Error('Market snapshot failed validation');
      choices = data.races.filter(race => {
        if (!race || !Array.isArray(race.runners) || !Number.isFinite(Date.parse(race.startUTC))) return false;
        const market = RaceCards.market(race);
        if (!market.valid || !URL.canParse(market.source)) return false;
        const url = new URL(market.source);
        return url.origin === 'https://www.sportinglife.com' && !url.username && !url.password;
      });
      chooser.replaceChildren();
      choices.forEach((race, index) => chooser.add(new Option(race.racecourse + ' · ' + race.name, index)));
      chooser.disabled = !choices.length;
      status.textContent = choices.length ?
        'Historical source snapshots. Prices are unverified and non-executable.' :
        'This snapshot contains no complete, source-matched win market.';
      if (choices.length) render();
    } catch {
      status.textContent = 'Racing market observations are unavailable.';
    }
  }

  chooser.addEventListener('change', render);
  panel.addEventListener('toggle', () => {
    if (panel.open && !choices.length && !loading) {
      loading = true;
      load().finally(() => { loading = false; });
    }
  });
  if (location.hash === '#vw-markets') panel.open = true;
})();
