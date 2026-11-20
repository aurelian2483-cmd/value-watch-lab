'use strict';

(() => {
  const evidence = FootballMatchEvidence;
  const $ = id => document.getElementById(id);
  const date = new Intl.DateTimeFormat('en-GB', { dateStyle:'medium', timeStyle:'short', timeZone:'Europe/London' });
  const format = value => date.format(value) + ' UK';
  const node = (parent, tag, value) => {
    const element = document.createElement(tag);
    if (value != null) element.textContent = value;
    parent.append(element);
    return element;
  };
  const competition = event => event.row.league_name || (event.identity[0] === 'PL' ? 'Premier League' : event.identity[0]);
  const label = event => event.identity.slice(1).join(' v ');
  const stateURL = id => {
    const url = new URL(location.href);
    url.hash = '';
    for (const [key, value] of [['event', id], ['competition', $('competition').value], ['q', $('search').value]]) {
      if (value) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    }
    return url;
  };
  let index = new Map();
  let markets = new Map();
  let feedMessage = '';
  let archiveMetrics = null;
  const archive = new URLSearchParams(location.search).get('mode') === 'archive';

  function chart(parent, models) {
    if (!models.length) {
      node(parent, 'p', 'No cutoff-eligible experimental model is available for this fixture.');
      return;
    }
    const title = node(parent, 'label', 'Probability model');
    title.htmlFor = 'chart-model';
    const selector = node(parent, 'select');
    selector.id = title.htmlFor;
    models.forEach((model, i) => selector.add(new Option(model.name, i)));
    const graph = node(parent, 'div');
    graph.className = 'chart';
    graph.setAttribute('aria-live', 'polite');
    function draw() {
      const model = models[Number(selector.value)];
      graph.replaceChildren();
      ['Home', 'Draw', 'Away'].forEach((label, i) => {
        const row = node(graph, 'div');
        row.className = 'chart-row';
        node(row, 'span', label);
        const meter = node(row, 'meter');
        meter.max = 1;
        meter.value = model.values[i];
        meter.setAttribute('aria-label', label + ' probability');
        node(row, 'span', (model.values[i] * 100).toFixed(1) + '%');
      });
      node(graph, 'p', model.note);
    }
    selector.addEventListener('change', draw);
    draw();
  }

  function addReceipt(target, receipt, heading) {
    const url = evidence.receiptURL(receipt.url);
    if (!url || !evidence.hash(receipt.hash) || !Number.isFinite(receipt.observed)) return;
    const details = node(target, 'details');
    node(details, 'summary', heading);
    const link = node(details, 'a', url.hostname);
    link.href = url.href;
    node(details, 'p', 'Observed ' + format(receipt.observed));
    if (Number.isFinite(receipt.captured)) node(details, 'p', 'Captured ' + format(receipt.captured));
    node(details, 'p', 'Recorded SHA-256 ' + receipt.hash);
    node(details, 'p', 'Source receipt recorded. Independent verification is unavailable.');
  }

  function renderEvent(event) {
    $('event').hidden = !event;
    if (!event) return;
    $('event-competition').textContent = competition(event);
    $('event-title').textContent = label(event);
    const [overview, facts, models, sources] = ['overview', 'facts', 'models', 'sources'].map(name => $(name + '-content'));
    [overview, facts, models, sources].forEach(section => section.replaceChildren());
    if (archive) {
      const row = event.row;
      $('event-time').textContent = row.date + ' · Historical reconstruction';
      node(overview, 'p', 'Retrospective Premier League research · ' + row.season + ' season.');
      if (Array.isArray(row.ft) && row.ft.length === 2 && row.ft.every(value => Number.isSafeInteger(value) && value >= 0))
        node(facts, 'p', 'Archived full-time score ' + row.ft.join('–') + '.');
      node(facts, 'p', 'Player statistics, lineups and timeline are unavailable in this archive.');
      chart(models, [
        { name:'Reconstructed Poisson baseline V1', values:row.p_unadjusted, note:'Training cutoff excludes the match date. Earlier league matches: ' + row.prior_league_matches + '.' },
        { name:'Reconstructed recent-form variant', values:row.p_recent_form_alpha_0_025, note:'Same match and earlier-date cutoff. Retrospective approximation with form weight α = 0.025.' }
      ]);
      if (archiveMetrics) {
        const comparison = node(models, 'details');
        node(comparison, 'summary', 'Same-sample historical scores');
        for (const [name, metrics] of [['Poisson baseline',archiveMetrics.unadjusted],['Recent-form variant',archiveMetrics.form]]) {
          node(comparison, 'p', name + ' · ' + metrics.n + ' matches · Brier ' +
            metrics.multiclass_brier.toFixed(3) + ' · log loss ' + metrics.log_loss.toFixed(3) + '.');
        }
        node(comparison, 'p', 'These are retrospective reconstruction scores. Prospective calibration and independent validation are unavailable.');
      }
      const link = node(models, 'a', 'Method and historical comparison documentation');
      link.href = '../research/football-baseline-v1/README.md';
      node(sources, 'p', 'Frozen reconstruction archive. Original forecast, source capture time and independent outcome verification are unavailable.');
      return;
    }
    const row = event.row;
    const market = markets.get(event.id);
    const available = [...event.models, ...(market?.model ? [market.model] : [])];
    const estimates = available.flatMap(({row: model, observed}) => {
      const values = evidence.probabilities(evidence.outcomes.map(side => model['prob_' + side]));
      if (!values || typeof model.model !== 'string') return [];
      const cutoff = evidence.instant(model.cutoff_utc);
      return [{ name:model.model, values, note:'Experimental estimate · observed ' + format(observed) +
        (Number.isFinite(cutoff) ? ' · model cutoff ' + format(cutoff) : ' · explicit model cutoff unavailable') +
        (Number.isInteger(model.training_matches) ? ' · ' + model.training_matches + ' training matches' : '') +
        (model.small_sample === true ? ' · small sample' : '') + '.' }];
    });
    const status = row.status || row.provider_status;
    const knownStatus = typeof status === 'string' && /^[A-Z_]{2,32}$/.test(status) ? status.replaceAll('_', ' ') :
      event.start > Date.now() ? 'Scheduled' : 'Kickoff elapsed · final status unavailable';
    $('event-time').textContent = format(event.start) + ' · ' + knownStatus;
    node(overview, 'p', row.verification === 'SCHEDULE_CROSS_CHECK' ? 'Schedule cross-check recorded.' : 'Schedule observed. Independent corroboration is unavailable.');
    node(overview, 'p', estimates.length + ' eligible model estimates · ' + (market?.sources.length ?? 0) + ' complete market observations.');
    if (event.kickoffs.length > 1) node(overview, 'p', 'Kickoff revised by the same provider. Other known schedule times: ' +
      event.kickoffs.filter(time => time !== event.start).map(format).join(', ') + '.');
    const h2h = row.head_to_head_research;
    if (Number.isSafeInteger(h2h?.sample_size) && h2h.sample_size > 0 &&
        [h2h.home_team_wins, h2h.draws, h2h.away_team_wins].every(n => Number.isSafeInteger(n) && n >= 0) &&
        h2h.home_team_wins + h2h.draws + h2h.away_team_wins === h2h.sample_size &&
        evidence.instant(h2h.history_data_observed_at_utc) <= event.observed &&
        /^\d{4}-\d{2}-\d{2}$/.test(h2h.most_recent_match_date) &&
        h2h.most_recent_match_date < new Date(event.marketCutoff).toISOString().slice(0,10)) {
      node(facts, 'h3', 'Head-to-head');
      node(facts, 'p', h2h.sample_size + ' recorded meetings · ' + h2h.home_team_wins + ' home wins · ' + h2h.draws +
        ' draws · ' + h2h.away_team_wins + ' away wins. Most recent ' + h2h.most_recent_match_date + '.');
      node(facts, 'p', 'Descriptive historical sample. Coverage may be incomplete.');
    } else node(facts, 'p', 'Cutoff-eligible head-to-head evidence is unavailable.');
    const comparison = available.find(item => Number.isSafeInteger(item.row.home_venue_matches) && Number.isSafeInteger(item.row.away_venue_matches));
    if (comparison) node(facts, 'p', 'Team performance inputs: ' + comparison.row.home_venue_matches + ' home venue matches and ' +
      comparison.row.away_venue_matches + ' away venue matches in the model sample.');
    node(facts, 'p', 'Player statistics, verified lineups and match timeline are unavailable from these snapshots.');
    chart(models, estimates);
    node(models, 'p', 'Probabilities are uncalibrated research estimates. Confidence intervals are unavailable for this fixture.');
    const history = node(models, 'a', 'Browse the separate historical reconstruction');
    history.href = '?mode=archive';
    node(sources, 'p', 'Fixture snapshot observed ' + format(event.observed) + '.');
    if (event.providerId) node(sources, 'p', 'ESPN event ID ' + event.providerId + '.');
    else node(sources, 'p', 'Provider event ID unavailable. This fixture uses an exact schedule key.');
    if (Array.isArray(row.schedule_source_receipts)) for (const receipt of row.schedule_source_receipts) {
      const observed = evidence.instant(receipt?.observed_at_utc);
      if (observed <= event.observed) addReceipt(sources, { url:receipt.url, observed, hash:receipt.sha256 }, 'Fixture source receipt');
    }
    for (const observation of market?.sources ?? []) {
      addReceipt(sources, observation, observation.name + ' · event ' + observation.id + ' · 90-minute 1X2');
    }
    for (const {row: model, observed} of available) if (Array.isArray(model.source_receipts)) for (const receipt of model.source_receipts) {
      const timestamp = evidence.instant(receipt?.observed_at_utc);
      if (timestamp <= observed) addReceipt(sources, { url:receipt.url, observed:timestamp, hash:receipt.sha256 }, 'Model input receipt');
    }
    if (!sources.querySelector('details')) node(sources, 'p', 'No matching detailed receipt is available for this fixture.');
  }

  function render() {
    const params = new URLSearchParams(location.search);
    const requested = params.get('event');
    const league = params.get('competition') ?? '';
    $('competition').value = [...$('competition').options].some(option => option.value === league) ? league : '';
    $('search').value = (params.get('q') ?? '').slice(0,80);
    const query = $('search').value.trim().toLowerCase();
    const fixtures = [...index.values()].filter(event => (!$('competition').value || event.identity[0] === $('competition').value) &&
      label(event).toLowerCase().includes(query));
    const event = requested ? index.get(requested) : fixtures[0];
    $('feed-status').textContent = requested && !event ? 'This fixture is unavailable or its identity is ambiguous.' : feedMessage;
    $('fixture-count').textContent = fixtures.length + ' matching fixtures';
    $('fixture').replaceChildren(new Option('Choose a fixture', ''));
    const visibleOptions = event && !fixtures.includes(event) ? [event, ...fixtures] : fixtures;
    for (const fixture of visibleOptions) $('fixture').add(new Option(label(fixture) + ' · ' + (archive ? fixture.row.date : format(fixture.start)), fixture.id));
    $('fixture').value = event?.id ?? '';
    $('fixture-rail').replaceChildren();
    for (const fixture of fixtures) {
      const link = node(node($('fixture-rail'), 'li'), 'a', label(fixture));
      link.href = stateURL(fixture.id).href;
      if (fixture === event) link.setAttribute('aria-current', 'page');
      node(link, 'small', competition(fixture) + ' · ' + (archive ? fixture.row.date : format(fixture.start)));
      link.addEventListener('click', click => {
        if (click.button || click.ctrlKey || click.shiftKey || click.altKey || click.metaKey) return;
        click.preventDefault();
        navigate(fixture.id);
        $('match').focus();
      });
    }
    renderEvent(event);
  }

  function navigate(id, replace = false) {
    const url = stateURL(id);
    if (url.href !== location.href) history[replace ? 'replaceState' : 'pushState'](null, '', url);
    render();
  }

  async function read(path) {
    const response = await fetch(path, { cache:'no-cache', signal:AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error('Snapshot unavailable');
    return response.json();
  }
  async function load() {
    if (archive) {
      $('mode').href = './';
      $('mode').textContent = 'Published fixture snapshots';
      const document = await read('../research/football-baseline-v1/608-reconstructed-forecasts.json');
      for (const row of evidence.historicalRows(document).reverse()) index.set(row.id, {id:row.id, row, identity:['PL', row.home, row.away]});
      if (index.size && [document.metrics?.unadjusted, document.metrics?.form].every(metrics =>
        metrics?.n === index.size && [metrics.multiclass_brier, metrics.log_loss].every(value => Number.isFinite(value) && value >= 0))) {
        archiveMetrics = document.metrics;
      }
      if (!index.size) feedMessage = 'Historical reconstruction unavailable.';
    } else {
      const now = Date.now();
      const [dashboard, expanded, market] = await Promise.allSettled([
        read('../research-dashboard-data.json'), read('../football-expanded-data.json'), read('../paper-lab/hybrid-market-data.json')
      ]);
      const feeds = [dashboard, expanded].filter(item => item.status === 'fulfilled').map(item => item.value);
      const snapshot = evidence.fixtureIndex(feeds, now);
      markets = new Map(evidence.verifyMarkets(market.value, snapshot, now).matches.map(match => [match.fixture.id, match]));
      snapshot.events.sort((a,b) => (a.start < now) - (b.start < now) || a.start - b.start);
      index = new Map(snapshot.events.map(event => [event.id, event]));
      if (!index.size) feedMessage = 'No usable fixture snapshots are available.';
      else if (feeds.length < 2 || market.status !== 'fulfilled' || snapshot.conflicts.size)
        feedMessage = 'Some source evidence is unavailable or conflicting. Review the sources for this fixture.';
    }
    const leagues = new Map([...index.values()].map(event => [event.identity[0], competition(event)]));
    [...leagues].sort((a,b) => a[1].localeCompare(b[1])).forEach(([code, name]) => $('competition').add(new Option(name, code)));
    $('fixture').addEventListener('change', () => navigate($('fixture').value));
    $('competition').addEventListener('change', () => navigate(null));
    $('search').addEventListener('input', () => {
      const caret = $('search').selectionStart;
      navigate(null, true);
      if (caret != null) $('search').setSelectionRange(caret, caret);
    });
    addEventListener('popstate', render);
    render();
  }
  load().catch(() => { $('feed-status').textContent = 'Published football evidence is unavailable.'; });
})();
