'use strict';

(() => {
  const evidence = FootballMatchEvidence;
  const historical = FootballMatchHistory;
  const discovery = FootballFixtureDiscovery;
  const favourites = discovery.readFavourites();
  const dayLabel = new Intl.DateTimeFormat('en-GB', {dateStyle:'full', timeZone:'Europe/London'});
  const timeLabel = new Intl.DateTimeFormat('en-GB', {timeStyle:'short', timeZone:'Europe/London'});
  const displayDay = day => dayLabel.format(new Date(day + 'T12:00:00Z'));
  const statusOf = event => discovery.status(event, Date.now(), finals, archive);
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
    if (id !== url.searchParams.get('event')) url.searchParams.delete('overview');
    for (const [key, value] of [['event', id], ['competition', $('competition').value], ['q', $('search').value],
      ['date', $('fixture-day').value], ['status', $('match-status').value], ['favourites', $('favourites-only').checked ? '1' : '']]) {
      if (value) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    }
    return url;
  };
  let index = new Map();
  let exactFixtures = new Map();
  let overviewKeys = new Set();
  let markets = new Map();
  let feedMessage = '';
  let archiveMetrics = null;
  let records = [];
  let finals = new Map();
  let leagues = new Map();
  let renderedEvent;
  let renderedStatus;
  const archive = new URLSearchParams(location.search).get('mode') === 'archive';

  function meterRow(parent, label, value, maximum, display) {
    const row = node(parent, 'div');
    row.className = 'chart-row';
    node(row, 'span', label);
    const meter = node(row, 'meter');
    meter.max = maximum;
    meter.value = value;
    meter.setAttribute('aria-label', label);
    node(row, 'span', display);
  }

  function selectControl(parent, label, id, options) {
    const title = node(parent, 'label', label);
    title.htmlFor = id;
    const control = node(parent, 'select');
    control.id = id;
    options.forEach(([name,value]) => control.add(new Option(name,value)));
    return control;
  }

  function chart(parent, models) {
    if (!models.length) {
      node(parent, 'p', 'No cutoff-eligible experimental model is available for this fixture.');
      return;
    }
    const selector = selectControl(parent, 'Probability model', 'chart-model', models.map((model,i) => [model.name,i]));
    const compare = models.length > 1 ? selectControl(parent, 'Compare with', 'chart-compare',
      [['Single model',''],...models.map((model,i) => [model.name,i])]) : null;
    const graph = node(parent, 'div');
    graph.className = 'chart';
    graph.setAttribute('aria-live', 'polite');
    function draw() {
      const model = models[Number(selector.value)];
      const other = compare?.value && compare.value !== selector.value ? models[Number(compare.value)] : null;
      graph.replaceChildren();
      const columns = node(graph, 'div');
      columns.className = 'team-grid';
      for (const entry of other ? [model,other] : [model]) {
        const column = node(columns, 'div');
        node(column, 'h3', entry.name);
        ['Home', 'Draw', 'Away'].forEach((outcome,i) =>
          meterRow(column, outcome + ' probability', entry.values[i], 1, (entry.values[i] * 100).toFixed(1) + '%'));
        node(column, 'p', entry.note);
      }
      if (other) {
        const spread = Math.max(...model.values.map((probability,i) => Math.abs(probability - other.values[i])));
        node(graph, 'p', 'Largest outcome disagreement: ' + (spread * 100).toFixed(1) +
          ' percentage points. This measures the gap between estimates.');
      }
    }
    selector.addEventListener('change', draw);
    compare?.addEventListener('change', draw);
    draw();
  }

  function renderHistory(parent, event) {
    const history = historical.matchHistory(event, records);
    node(parent, 'h3', 'Form and venue comparison');
    const source = event.identity[0] === 'PL' ? 'the retrospective Premier League archive' : 'the published two-source final records';
    if (!history.home.length && !history.away.length) {
      node(parent, 'p', 'No prior results for either team were matched in ' + source + '.');
      return;
    }
    node(parent, 'p', 'Prior-date results from ' + source + '. This sample may omit fixtures.');
    const controls = node(parent, 'div');
    controls.className = 'stats-controls';
    const windowSize = selectControl(controls, 'Results per team', 'form-window', [['Last five','5'],['Last ten','10']]);
    const venue = selectControl(controls, 'Venue filter', 'form-venue', [['All results','all'],['Home team at home / away team away','venue']]);
    const results = node(parent, 'div');
    results.className = 'team-grid';
    results.setAttribute('aria-live','polite');
    function draw() {
      results.replaceChildren();
      const series = venue.value === 'all' ? [history.home,history.away] : [history.homeVenue,history.awayVenue];
      const samples = series.map(team => team.slice(0, Number(windowSize.value)));
      const average = (sample,key) => sample.length ? sample.reduce((sum,row) => sum + row[key],0) / sample.length : 0;
      const scale = Math.max(1,...samples.flatMap(sample => [average(sample,'scored'),average(sample,'conceded')]));
      const trendScale = Math.max(1,...samples.flatMap(sample => sample.flatMap(row => [row.scored,row.conceded])));
      samples.forEach((sample,i) => {
        const column = node(results,'div');
        node(column,'h3',event.identity[i+1]);
        if (!sample.length) {
          node(column,'p','No matching results for this venue filter.');
          return;
        }
        const strip = node(column,'div');
        strip.className = 'form-row';
        strip.setAttribute('aria-label','Form, newest first');
        for (const row of sample) {
          const outcome = node(strip,'span',row.outcome);
          outcome.className = row.outcome === 'W' ? 'win' : row.outcome === 'L' ? 'loss' : 'draw';
          outcome.title = row.day + ' · ' + row.opponent + ' · ' + row.scored + '–' + row.conceded;
        }
        node(column,'p',sample.length + ' recorded matches · newest first');
        for (const [key,label] of [['scored','Scored per match'],['conceded','Conceded per match']]) {
          const value = average(sample,key);
          meterRow(column,label,value,scale,value.toFixed(2));
        }
        const timeline = node(column,'details');
        node(timeline,'summary','Goal trend and result timeline');
        const list = node(timeline,'ol');
        for (const row of sample) {
          const item = node(list,'li');
          node(item,'strong',row.day + ' · ' + row.opponent + ' (' + row.venue + ')');
          meterRow(item,'Scored',row.scored,trendScale,String(row.scored));
          meterRow(item,'Conceded',row.conceded,trendScale,String(row.conceded));
        }
      });
    }
    windowSize.addEventListener('change',draw);
    venue.addEventListener('change',draw);
    draw();
    node(parent,'p','Competition sample before this fixture: ' + history.count + ' recorded matches · ' +
      (history.goals / history.count).toFixed(2) + ' goals per match.');
    if (history.meetings.length) {
      const meetings = node(parent,'details');
      node(meetings,'summary','Recorded head-to-head results (' + history.meetings.length + ')');
      const list = node(meetings,'ol');
      for (const row of history.meetings.slice(0,10))
        node(list,'li',row.day + ' · ' + row.home + ' ' + row.goals.join('–') + ' ' + row.away);
    }
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

  function renderMarketMatrix(parent, market, estimates) {
    node(parent,'p','Recorded historical 90-minute Home/Draw/Away prices. These are not live quotes.');
    if (market?.collectionStatus?.state)
      node(parent,'p','Market collection status: ' + market.collectionStatus.state +
        '. Existing observations are historical captures; no live bookmaker prices are requested.');
    node(parent,'p','An opening price is not supplied by this archive. The earliest recorded observation must not be treated as the market opening.');
    if (!market?.sourceHistories?.length) {
      node(parent,'p','No complete source-verified 90-minute 1X2 observation is available for this fixture.');
      if (market?.withheldReasons?.length) {
        const rejected = node(parent,'details');
        node(rejected,'summary','Withheld market evidence (' + market.withheldReasons.length + ')');
        for (const item of market.withheldReasons)
          node(rejected,'p',(item.source || 'Source') + ': ' + item.reason);
      }
      return;
    }
    const wrap = node(parent,'div');
    wrap.className = 'market-matrix-wrap';
    wrap.setAttribute('role','region');
    wrap.setAttribute('aria-label','Verified fixture market matrix');
    wrap.tabIndex = 0;
    const table = node(wrap,'table');
    table.className = 'market-matrix';
    const head = node(table,'thead');
    const header = node(head,'tr');
    for (const label of ['Source','Home','Draw','Away','Overround','Observed (UK)','Captured (UK)','Snapshot age','History']) {
      const cell = node(header,'th',label);
      cell.scope = 'col';
    }
    const body = node(table,'tbody');
    for (const history of market.sourceHistories) {
      const latest = history.latest;
      const row = node(body,'tr');
      const sourceCell = node(row,'td');
      const sourceLink = node(sourceCell,'a',history.name);
      sourceLink.href = latest.url.href;
      sourceLink.rel = 'noopener noreferrer';
      node(sourceCell,'small',history.marketId ? 'Market ' + history.marketId : '90-minute 1X2');
      for (const side of evidence.outcomes) {
        const cell = node(row,'td');
        const price = node(cell,'strong',latest.prices[side].toFixed(3));
        price.className = 'market-decimal';
        const implied = latest.metrics.implied[side] * 100;
        const noVig = latest.metrics.proportionalNoVig[side] * 100;
        node(cell,'small',implied.toFixed(1) + '% implied · ' + noVig.toFixed(1) + '% proportional no-vig');
      }
      node(row,'td',(latest.metrics.overround * 100 >= 0 ? '+' : '') +
        (latest.metrics.overround * 100).toFixed(2) + '%');
      node(row,'td',format(latest.observed));
      node(row,'td',format(latest.captured));
      const ageHours = Math.max(0,Math.floor((Date.now() - latest.snapshot) / 3600000));
      node(row,'td',(ageHours >= 24 ? 'Historical · ' : '') + ageHours + ' h');
      node(row,'td',history.observationCount + (history.observationCount === 1 ? ' capture' : ' captures'));
      const details = node(parent,'details');
      node(details,'summary',history.name + ' · provenance and price history');
      node(details,'p','Provider event ID ' + latest.id + ' · ' + history.market + ' · ' + history.settlementPeriod + '.');
      node(details,'p','Latest recorded observation ' + format(latest.observed) + ' · captured ' + format(latest.captured) + '.');
      const snapshotAge = Math.max(0,Math.floor((Date.now() - latest.snapshot) / 3600000));
      node(details,'p','Source snapshot ' + format(latest.snapshot) + ' · HTTP Date ' + format(latest.httpDate) +
        ' · age at review ' + snapshotAge + ' hours. Age is descriptive; no freshness expiry is inferred.');
      const link = node(details,'a',latest.url.hostname + ' · open source receipt');
      link.href = latest.url.href;
      link.rel = 'noopener noreferrer';
      node(details,'p','SHA-256 ' + latest.hash);
      if (history.movementAvailable) {
        node(details,'p','Comparable repeated captures: ' + history.observationCount +
          '. Earliest recorded observation ' + format(history.earliest.observed) +
          '; latest recorded observation ' + format(latest.observed) + '.');
        for (const side of evidence.outcomes) {
          const change = history.movement[side];
          node(details,'p',side[0].toUpperCase() + side.slice(1) + ': ' +
            history.earliest.prices[side].toFixed(3) + ' → ' + latest.prices[side].toFixed(3) +
            ' · change ' + (change.decimal >= 0 ? '+' : '') + change.decimal.toFixed(3) +
            ' (' + (change.percentage >= 0 ? '+' : '') + change.percentage.toFixed(2) + '%).');
        }
      } else {
        node(details,'p','Only one comparable capture exists. Price movement and opening-to-latest comparison are unavailable.');
      }
      node(details,'p','Recorded source hash is provenance metadata; the browser does not independently retrieve or re-hash the provider payload.');
    }
    node(parent,'p','Overround is the sum of the three raw implied probabilities minus 100%. Proportional no-vig values are a simple normalization for comparison, not validated true probabilities.');
    if (market.missingSources?.length)
      node(parent,'p','No recorded quote in this fixture snapshot for: ' + market.missingSources.join(', ') + '.');
    if (market.withheldReasons?.length) {
      const rejected = node(parent,'details');
      node(rejected,'summary','Withheld observations (' + market.withheldReasons.length + ')');
      for (const item of market.withheldReasons)
        node(rejected,'p',(item.source || 'Source') + ': ' + item.reason);
    }
    const eligible = estimates.find(entry => entry.cutoffReason === null);
    const comparison = node(parent,'section');
    node(comparison,'h3','Model versus market reference');
    if (!eligible) {
      node(comparison,'p','No model passes the explicit training-cutoff and source-receipt rules for this fixture. Model-to-market comparison is withheld.');
    } else {
      node(comparison,'p','Research-only probability differences against the latest proportional no-vig market reference. This is not expected value, a betting recommendation or a validated edge.');
      for (const history of market.sourceHistories) {
        const reference = history.latest.metrics.proportionalNoVig;
        const block = node(comparison,'details');
        node(block,'summary',history.name + ' · model minus market (percentage points)');
        for (const side of evidence.outcomes) {
          const difference = (eligible.values[evidence.outcomes.indexOf(side)] - reference[side]) * 100;
          node(block,'p',side[0].toUpperCase() + side.slice(1) + ': model ' +
            (eligible.values[evidence.outcomes.indexOf(side)] * 100).toFixed(2) + '% · market reference ' +
            (reference[side] * 100).toFixed(2) + '% · difference ' +
            (difference >= 0 ? '+' : '') + difference.toFixed(2) + ' pp.');
        }
      }
    }
  }

  function renderEvent(event) {
    $('event').hidden = !event;
    if (!event) return;
    $('event-competition').textContent = competition(event);
    $('event-title').replaceChildren(document.createTextNode(event.identity[1] + ' '));
    node($('event-title'), 'span', 'v').className = 'match-versus';
    $('event-title').append(' ' + event.identity[2]);
    const [overview, facts, models, marketsPanel, sources] = ['overview', 'facts', 'models', 'markets', 'sources'].map(name => $(name + '-content'));
    [overview, facts, models, marketsPanel, sources].forEach(section => section.replaceChildren());
    if (archive) {
      const row = event.row;
      $('event-time').textContent = row.date + ' · Historical reconstruction';
      node(overview, 'p', 'Retrospective Premier League research · ' + row.season + ' season.');
      if (Array.isArray(row.ft) && row.ft.length === 2 && row.ft.every(value => Number.isSafeInteger(value) && value >= 0))
        node(facts, 'p', 'Archived full-time score ' + row.ft.join('–') + '.');
      renderHistory(facts, {...event,archived:true});
      node(facts, 'p', 'Player statistics, lineups and timeline are unavailable in this archive.');
      chart(models, [
        { name:'Reconstructed Poisson baseline V1', values:row.p_unadjusted, note:'Training cutoff excludes the match date. Earlier league matches: ' + row.prior_league_matches + '.' },
        { name:'Reconstructed recent-form variant', values:row.p_recent_form_alpha_0_025, note:'Same match and earlier-date cutoff. Retrospective approximation with form weight α = 0.025.' }
      ]);
      if (archiveMetrics) {
        const comparison = node(models, 'details');
        node(comparison, 'summary', 'Same-sample historical scores');
        for (const [name, metrics] of [['Poisson baseline',archiveMetrics.unadjusted],['Recent-form variant',archiveMetrics.form]]) {
          meterRow(comparison, name + ' Brier', metrics.multiclass_brier, Math.max(1, archiveMetrics.unadjusted.multiclass_brier, archiveMetrics.form.multiclass_brier), metrics.multiclass_brier.toFixed(3));
          node(comparison, 'p', name + ' · ' + metrics.n + ' matches · Brier ' +
            metrics.multiclass_brier.toFixed(3) + ' · log loss ' + metrics.log_loss.toFixed(3) + '.');
        }
        node(comparison, 'p', 'These are retrospective reconstruction scores. Prospective calibration and independent validation are unavailable.');
      }
      const link = node(models, 'a', 'Method and historical comparison documentation');
      link.href = '../research/football-baseline-v1/README.md';
      node(sources, 'p', 'Frozen reconstruction archive. Original forecast, source capture time and independent outcome verification are unavailable.');
      node(marketsPanel,'p','The retrospective archive does not contain contemporaneous, fixture-matched bookmaker market observations.');
      return;
    }
    const row = event.row;
    const market = markets.get(event.id);
    const available = [...event.models, ...(market?.model ? [market.model] : [])];
    const entries = available.flatMap(({row: model, observed, cutoffReason}) => {
      const values = evidence.probabilities(evidence.outcomes.map(side => model['prob_' + side]));
      if (!values || typeof model.model !== 'string') return [];
      const cutoff = evidence.instant(model.cutoff_utc);
      return [{ name:model.model, values, cutoffReason, note:'Experimental estimate · observed ' + format(observed) +
        (Number.isFinite(cutoff) ? ' · recorded cutoff ' + format(cutoff) : ' · explicit model cutoff unavailable') +
        (Number.isInteger(model.training_matches) ? ' · ' + model.training_matches + ' training matches' : '') +
        (model.small_sample === true ? ' · small sample' : '') + '.' }];
    });
    const estimates = entries.filter(entry => entry.cutoffReason === null);
    const unverified = entries.filter(entry => entry.cutoffReason !== null);
    const final = statusOf(event) === 'final' ? finals.get(event.exact) : null;
    $('event-time').textContent = format(event.start) + ' · ' + discovery.statusLabels[statusOf(event)] +
      (final ? ' · ' + final.goals.join('–') : '');
    node(overview, 'p', row.verification === 'SCHEDULE_CROSS_CHECK' ? 'Schedule cross-check recorded.' : 'Schedule observed. Independent corroboration is unavailable.');
    const marketCount = market?.sources.length ?? 0;
    node(overview, 'p', estimates.length + ' eligible model ' + (estimates.length === 1 ? 'estimate' : 'estimates') +
      ' · ' + marketCount + ' complete market ' + (marketCount === 1 ? 'observation.' : 'observations.'));
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
      const bars = node(facts,'div');
      for (const [name,value] of [['Home wins',h2h.home_team_wins],['Draws',h2h.draws],['Away wins',h2h.away_team_wins]])
        meterRow(bars,name,value,h2h.sample_size,String(value));
      node(facts, 'p', 'Descriptive historical sample. Coverage may be incomplete.');
    } else node(facts, 'p', 'The published fixture has no cutoff-eligible head-to-head summary.');
    const comparison = available.find(item => item.cutoffReason === null && Number.isSafeInteger(item.row.home_venue_matches) && Number.isSafeInteger(item.row.away_venue_matches));
    if (comparison) node(facts, 'p', 'Team performance inputs: ' + comparison.row.home_venue_matches + ' home venue matches and ' +
      comparison.row.away_venue_matches + ' away venue matches in the model sample.');
    renderHistory(facts, event);
    node(facts, 'p', 'Player statistics, verified lineups and match timeline are unavailable from these snapshots.');
    chart(models, estimates);
    renderMarketMatrix(marketsPanel, market, estimates);
    if (unverified.length) {
      const disclosures = node(models, 'section');
      const heading = node(disclosures, 'h3', 'UNVERIFIED EXPERIMENTAL ESTIMATES');
      heading.id = 'unverified-estimates-title';
      disclosures.setAttribute('aria-labelledby', heading.id);
      node(disclosures, 'p', 'These recorded estimates are excluded from eligible comparisons, market-value calculations and performance measurements.');
      for (const entry of unverified) {
        node(disclosures, 'h4', entry.name);
        node(disclosures, 'p', entry.values.map((value, i) => ['Home', 'Draw', 'Away'][i] + ' ' + (value * 100).toFixed(1) + '%').join(' · '));
        node(disclosures, 'p', entry.note);
        node(disclosures, 'p', entry.cutoffReason);
      }
    }
    node(models, 'p', 'Probabilities are uncalibrated research estimates. Confidence intervals are unavailable for this fixture.');
    const history = node(models, 'a', 'Browse the separate historical reconstruction');
    history.href = '?mode=archive';
    const ageHours = Math.max(0,Math.floor((Date.now() - event.observed) / 3600000));
    node(sources, 'p', (ageHours === 0 ? 'Snapshot observed within the last hour' : 'Snapshot age: ' + ageHours + ' hours') +
      (ageHours >= 24 ? ' · historical snapshot' : '')).className = 'evidence-state';
    node(sources, 'p', 'Fixture snapshot observed ' + format(event.observed) + '.');
    if (event.providerId) node(sources, 'p', 'ESPN event ID ' + event.providerId + '.');
    else node(sources, 'p', 'Provider event ID unavailable. This fixture uses an exact schedule key.');
    if (Array.isArray(row.schedule_source_receipts)) for (const receipt of row.schedule_source_receipts) {
      const observed = evidence.instant(receipt?.observed_at_utc);
      if (observed <= event.observed) addReceipt(sources, { url:receipt.url, observed, hash:receipt.sha256 }, 'Fixture source receipt');
    }
    for (const history of market?.sourceHistories ?? []) for (const observation of history.observations) {
      addReceipt(sources, { ...observation, url:observation.url.href }, history.name + ' · event ' + observation.id +
        ' · ' + format(observation.observed) + ' · 90-minute 1X2');
    }
    for (const {row: model, observed} of available) if (Array.isArray(model.source_receipts)) for (const receipt of model.source_receipts) {
      const timestamp = evidence.instant(receipt?.observed_at_utc);
      if (timestamp <= observed) addReceipt(sources, { url:receipt.url, observed:timestamp, hash:receipt.sha256 }, 'Model input receipt');
    }
    const historySource = node(sources, 'a', event.identity[0] === 'PL' ? 'Premier League reconstruction methodology' : 'Expanded football evidence snapshot');
    historySource.href = event.identity[0] === 'PL' ? '../research/football-baseline-v1/README.md' : '../football-expanded-data.json';
    if (!sources.querySelector('details')) node(sources, 'p', 'No matching detailed receipt is available for this fixture.');
  }

  function browseLink(link, event) {
    link.href = stateURL(event.id).href;
    link.onclick = click => {
      if (click.button || click.ctrlKey || click.shiftKey || click.altKey || click.metaKey) return;
      click.preventDefault();
      navigate(event.id);
      (document.getElementById(location.hash.slice(1)) ?? $('match')).focus();
    };
  }

  function renderPins(event) {
    const active = $('competition').value;
    const target = active || event?.identity[0];
    const button = $('toggle-favourite');
    const selected = favourites.has(target);
    button.disabled = !target;
    button.setAttribute('aria-pressed',String(selected));
    button.textContent = target ? (selected ? 'Remove ' : 'Favourite ') + leagues.get(target) : 'Select a competition to favourite';
    button.onclick = () => {
      if (selected) favourites.delete(target);
      else favourites.add(target);
      const saved = discovery.saveFavourites(favourites);
      $('favourite-feedback').textContent = saved ? '' : 'Storage unavailable. Favourites apply for this session.';
      render();
    };
    const list = $('pinned-list');
    list.replaceChildren();
    for (const [code,name] of leagues) {
      if (!favourites.has(code)) continue;
      const pin = node(node(list,'li'),'button',name);
      pin.type = 'button';
      pin.setAttribute('aria-pressed',String(active === code));
      pin.onclick = () => {
        $('competition').value = active === code ? '' : code;
        navigate(new URLSearchParams(location.search).get('event'));
        $('competition').focus();
      };
    }
    $('pinned-competitions').hidden = !list.children.length;
  }

  function render() {
    const params = new URLSearchParams(location.search);
    const requested = params.get('event');
    for (const [id,key] of [['competition','competition'],['fixture-day','date'],['match-status','status']]) {
      const control = $(id);
      control.value = params.get(key) ?? '';
      if (control.selectedIndex < 0) control.value = '';
    }
    $('favourites-only').checked = params.get('favourites') === '1';
    $('search').value = (params.get('q') ?? '').slice(0,80);
    const query = $('search').value.trim().toLowerCase();
    const fixtures = [...index.values()].filter(event =>
      (!$('competition').value || event.identity[0] === $('competition').value) &&
      (!$('fixture-day').value || discovery.day(event,archive) === $('fixture-day').value) &&
      (!$('match-status').value || statusOf(event) === $('match-status').value) &&
      (!$('favourites-only').checked || favourites.has(event.identity[0])) &&
      label(event).toLowerCase().includes(query));
    const exact = !archive && requested?.startsWith('fixture:') ? requested.slice('fixture:'.length) : null;
    const candidate = requested ? (exact === null ? index.get(requested) : exactFixtures.get(exact)) : fixtures[0];
    const overview = params.get('overview') === '1' && exact !== null;
    const event = overview && (!overviewKeys.has(exact) || !(candidate?.start > Date.now())) ? null : candidate;
    const outside = Boolean(event && !fixtures.includes(event));
    $('feed-status').textContent = requested && !event ? 'This fixture is unavailable or its identity is ambiguous.' : feedMessage;
    $('fixture-count').textContent = fixtures.length + ' matching fixture' + (fixtures.length === 1 ? '' : 's');
    $('fixture-empty').hidden = fixtures.length > 0 && !outside;
    $('fixture-empty').textContent = outside ? 'Selected fixture is outside these filters.' : 'No fixtures match these filters.';
    $('fixture').replaceChildren(new Option('Choose a fixture', ''));
    if (outside) $('fixture').add(new Option(label(event) + ' · outside filters',event.id));
    $('fixture-rail').replaceChildren();
    const groups = discovery.groupFixtures(fixtures,archive);
    for (const [day, matches] of groups) {
      const options = node($('fixture'),'optgroup');
      options.label = displayDay(day);
      const section = node($('fixture-rail'),'li');
      node(section,'h3',displayDay(day)).className = 'fixture-date-heading';
      const list = node(section,'ul');
      for (const fixture of matches) {
        const state = discovery.statusLabels[statusOf(fixture)];
        options.append(new Option(label(fixture) + ' · ' + (archive ? state : timeLabel.format(fixture.start) + ' · ' + state), fixture.id));
        const link = node(node(list,'li'),'a',label(fixture));
        browseLink(link,fixture);
        if (fixture === event) link.setAttribute('aria-current','page');
        node(link,'small',competition(fixture) + ' · ' + (archive ? state : timeLabel.format(fixture.start) + ' · ' + state));
      }
    }
    $('fixture').value = event?.id ?? '';
    renderPins(event);
    const ordered = [...groups.values()].flat();
    const current = ordered.indexOf(event);
    const stepper = $('fixture-position').parentElement;
    stepper.hidden = current < 0 || fixtures.length < 2;
    $('fixture-position').textContent = current + 1 + ' of ' + fixtures.length;
    for (const [id, index] of [['previous-fixture',current - 1],['next-fixture',current + 1]]) {
      const link = $(id);
      const neighbour = current >= 0 && ordered[index];
      link.hidden = !neighbour;
      if (neighbour) browseLink(link,neighbour);
      else link.removeAttribute('href');
    }
    const currentStatus = event ? statusOf(event) : null;
    if (renderedEvent !== event || renderedStatus !== currentStatus) {
      renderEvent(event);
      renderedEvent = event;
      renderedStatus = currentStatus;
    }
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
    const archivePath = '../research/football-baseline-v1/608-reconstructed-forecasts.json';
    if (archive) {
      $('mode').href = './';
      $('mode').textContent = 'Published fixture snapshots';
      const document = await read(archivePath);
      records = historical.archiveMatches(document);
      for (const row of evidence.historicalRows(document).reverse()) index.set(row.id, {id:row.id, row, identity:['PL', row.home, row.away]});
      if (index.size && [document.metrics?.unadjusted, document.metrics?.form].every(metrics =>
        metrics?.n === index.size && [metrics.multiclass_brier, metrics.log_loss].every(value => Number.isFinite(value) && value >= 0))) {
        archiveMetrics = document.metrics;
      }
      if (!index.size) feedMessage = 'Historical reconstruction unavailable.';
    } else {
      const now = Date.now();
      const [dashboard, expanded, market, reconstructed] = await Promise.allSettled([
        read('../research-dashboard-data.json'), read('../football-expanded-data.json'), read('../paper-lab/hybrid-market-data.json'), read(archivePath)
      ]);
      const feeds = [dashboard, expanded].filter(item => item.status === 'fulfilled').map(item => item.value);
      const recordedFinals = historical.competitionMatches(expanded.value);
      finals = new Map(recordedFinals.map(final => [final.exact,final]));
      records = [...historical.archiveMatches(reconstructed.value),...recordedFinals];
      const snapshot = evidence.fixtureIndex(feeds, now);
      exactFixtures = snapshot.byExact;
      const dash = dashboard.value;
      const stamp = evidence.instant(dash?.generated_at_utc);
      if(now-stamp>=-300000 && now-stamp<=86400000)
        overviewKeys = new Set(evidence.fixtureIndex([dash], now).byExact.keys());
      markets = new Map(evidence.verifyMarkets(market.value, snapshot, now).matches.map(match => [match.fixture.id, match]));
      snapshot.events.sort((a,b) => (a.start < now) - (b.start < now) || a.start - b.start);
      index = new Map(snapshot.events.map(event => [event.id, event]));
      if (!index.size) feedMessage = 'No usable fixture snapshots are available.';
      else if (feeds.length < 2 || market.status !== 'fulfilled' || snapshot.conflicts.size)
        feedMessage = 'Some source evidence is unavailable or conflicting. Review the sources for this fixture.';
    }
    leagues = new Map([...index.values()].map(event => [event.identity[0], competition(event)]));
    [...leagues].sort((a,b) => a[1].localeCompare(b[1])).forEach(([code, name]) => $('competition').add(new Option(name, code)));
    $('fixture').addEventListener('change', () => navigate($('fixture').value));
    const days = [...new Set([...index.values()].map(event => discovery.day(event,archive)))].sort();
    for (const day of (archive ? days.reverse() : days)) $('fixture-day').add(new Option(displayDay(day),day));
    for (const key of (archive ? ['archived'] : ['scheduled','elapsed','final']))
      $('match-status').add(new Option(discovery.statusLabels[key],key));
    for (const filter of ['competition','fixture-day','match-status','favourites-only'])
      $(filter).addEventListener('change', () => navigate(new URLSearchParams(location.search).get('event')));
    $('search').addEventListener('input', () => {
      const caret = $('search').selectionStart;
      navigate(new URLSearchParams(location.search).get('event'), true);
      if (caret != null) $('search').setSelectionRange(caret, caret);
    });
    addEventListener('popstate', render);
    render();
  }
  function markSection() {
    const active = ['#overview','#facts','#models','#markets','#sources'].includes(location.hash) ? location.hash : '#overview';
    for (const link of document.querySelectorAll('.sections a')) {
      if (link.hash === active) link.setAttribute('aria-current','location');
      else link.removeAttribute('aria-current');
    }
  }
  addEventListener('hashchange',markSection);
  addEventListener('popstate',markSection);
  addEventListener('pageshow', event => {
    if (event.persisted && new URLSearchParams(location.search).get('overview') === '1') {
      $('event').hidden = true;
      $('feed-status').textContent = 'Checking published fixture identity…';
      location.reload();
    }
  });
  markSection();
  load().catch(() => { $('feed-status').textContent = 'Published football evidence is unavailable.'; });
})();
