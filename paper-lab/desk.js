'use strict';

(() => {
  const E = ResearchEngine, S = ResearchStore, I = ResearchInsights;
  const $ = id => document.getElementById(id);
  const rootURL = new URL('../', document.currentScript.src);
  const sports = { all: 'All sports', football: 'Football', racing: 'Horse racing', tennis: 'Tennis', nfl: 'NFL' };
  const symbols = { football: '⚽', racing: '♞', tennis: '◉', nfl: '◆' };
  const sources = { 'research-dashboard-data.json': ['football', 'Premier League'], 'football-expanded-data.json': ['football', 'Football leagues'], 'racing-research-data.json': ['racing', 'Racecards & source prices'], 'other-sports-data.json': ['other', 'Tennis & NFL'], 'research-history.json': ['history', 'Historical results'] };
  const specs = Object.entries(sources).map(([file, [kind]]) => ({ kind, path: new URL(file, rootURL).pathname }));
  const key = 'value-watch-research-desk-v4';
  const day = E.day, today = () => day(new Date().toISOString());
  const plusDays = (date, count) => new Date(Date.parse(date + 'T12:00:00Z') + count * 86400000).toISOString().slice(0, 10);
  const dateText = value => Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : 'Time not supplied';
  const money = value => value === null || value === undefined ? '—' : new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value / 100);
  const pct = value => typeof value === 'number' && Number.isFinite(value) ? (value * 100).toFixed(1) + '%' : '—';
  const make = (parent, tag, text, className) => {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = String(text);
    if (className) element.className = className;
    if (parent) parent.append(element);
    return element;
  };
  const write = (element, value) => { if (element.textContent !== String(value)) element.textContent = String(value); };
  function report(error) { $('page-status').hidden = false; write($('page-status'), error?.message || 'This view could not update. Your saved research is retained.'); }
  function safely(action) { try { const value = action(); if (value?.catch) value.catch(report); } catch (error) { report(error); } }
  const notice = message => write($('notice'), message);
  function button(parent, text, action, className = 'button button-quiet') {
    const element = make(parent, 'button', text, className); element.type = 'button';
    element.addEventListener('click', () => safely(action)); return element;
  }
  function link(parent, text, address) {
    const safe = PaperLab.url(address); if (!safe) return;
    const element = make(parent, 'a', text, 'text-link'); element.href = safe; element.target = '_blank'; element.rel = 'noopener noreferrer'; return element;
  }
  function empty(parent, title, explanation, action) {
    const box = make(parent, 'div', undefined, 'empty-state'); make(box, 'span', '◈', 'empty-symbol'); make(box, 'h3', title); make(box, 'p', explanation);
    if (action) button(box, action.label, action.run, 'button button-secondary'); return box;
  }
  function details(parent, title, className = 'evidence-details') { const element = make(parent, 'details', undefined, className); make(element, 'summary', title); return element; }
  function provenance(parent, rows) {
    for (const source of rows || []) {
      const row = make(parent, 'div', undefined, 'source-row');
      if (source.url) link(row, source.label || new URL(source.url).hostname, source.url);
      else make(row, 'span', 'Published snapshot · event receipt unavailable', 'muted');
      make(row, 'small', 'Observed ' + dateText(source.observedAt), 'muted');
      if (source.sha256) make(row, 'code', source.sha256, 'source-digest');
    }
  }
  function validateWorkspace(value) {
    if (!value || value.version !== 4 || !Array.isArray(value.history) || value.history.length > 200 || !Array.isArray(value.claims) || value.claims.length > 100) throw Error('Saved workspace is invalid.');
    E.restore(JSON.stringify(value.plan));
    for (const record of value.history) { if (!record?.snapshot || record.independentlyAttested !== false) throw Error('Saved history is invalid.'); E.restore(JSON.stringify(record.snapshot)); }
    for (const claim of value.claims) if (!claim || typeof claim.reasoning !== 'string' || claim.reasoning.length > 3000 || typeof claim.createdAt !== 'string') throw Error('Saved claim is invalid.');
    return value;
  }
  let storage;
  try { storage = window.localStorage; }
  catch { storage = { getItem() { throw Error(); }, setItem() { throw Error(); } }; }
  const persistence = S.createPersistence(storage, key, validateWorkspace, message => write($('storage'), message));
  const restored = persistence.read();
  const initial = restored || { version: 4, plan: E.createPlan({ from: today(), to: plusDays(today(), 6) }), history: [], claims: [] };
  const store = S.createStore({ ...initial, events: [], eventVersion: 0, snapshotState: null, slot: 0, sport: 'all', competition: 'all', query: '', eventView: 'upcoming', view: 'events', limit: 24, replacing: null, clockTick: 0 });
  let legacy = [];
  try { const raw = storage.getItem('value-watch-paper-lab-v3'); legacy = Object.values(raw ? JSON.parse(raw) : {}).map(plan => PaperLab.restore(JSON.stringify(plan))); }
  catch { notice('Earlier research could not be read; its original storage is untouched.'); }
  const cards = new Map(), legs = new Map(), statsRequests = new Map();
  const statistics = I.createStatisticsCache({ maxEntries: 150, ttlMs: 300000, loader: async ({ eventId, tab }, { signal } = {}) => {
    await Promise.resolve(); if (signal?.aborted) throw new DOMException('Selection changed', 'AbortError');
    const event = store.get().events.find(event => event.id === eventId); return { event, data: event?.stats?.[tab] ?? null };
  } });
  function savePlan(plan) {
    E.restore(E.serialize(plan)); store.update(state => ({ ...state, plan, replacing: null }));
    const state = store.get(); if (persistence.write({ version: 4, plan, history: state.history, claims: state.claims })) write($('storage'), 'Saved on this device · export a backup');
  }
  function saveEnvelope(changes) {
    const state = store.get(), next = { version: 4, plan: state.plan, history: state.history, claims: state.claims, ...changes };
    if (!persistence.write(next)) throw Error('The change could not be saved. Export your research before continuing.');
    store.update(current => ({ ...current, ...changes }));
  }
  function exportJSON(value, name) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
  function setRange(from, to, preset) {
    savePlan(E.updateRange(store.get().plan, from, to)); store.update(state => ({ ...state, limit: 24 }));
    $('date-from').value = from; $('date-to').value = to;
    document.querySelectorAll('[data-range]').forEach(element => { const active = element.dataset.range === preset; element.classList.toggle('active', active); element.setAttribute('aria-pressed', String(active)); });
  }
  function preset(value) { const from = value === 'tomorrow' ? plusDays(today(), 1) : today(); setRange(from, plusDays(from, ['today', 'tomorrow'].includes(value) ? 0 : Number(value) - 1), value); }
  function filtered(state, includePast = false) {
    return state.events.filter(event => {
      const date = day(event.startUTC), started = Date.parse(event.startUTC) <= Date.now() + 300000;
      return date >= state.plan.from && date <= state.plan.to && (state.sport === 'all' || event.sport === state.sport) && (state.competition === 'all' || event.competition === state.competition) && (!state.query || (event.name + ' ' + event.competition + ' ' + event.participants.map(p => p.name).join(' ')).toLocaleLowerCase('en-GB').includes(state.query)) && (includePast || state.eventView === 'all' || (state.eventView === 'history' ? started : !started));
    });
  }
  function select(eventId, choiceId) {
    const state = store.get(), event = state.events.find(event => event.id === eventId); if (!event) throw Error('The event is absent from the current snapshot.');
    const existing = state.plan.slots[state.slot].legs.find(leg => leg.eventId === eventId);
    const next = state.replacing ? E.replaceSelection(state.plan, state.slot + 1, state.replacing, event, choiceId) : existing?.choiceId === choiceId ? E.removeSelection(state.plan, state.slot + 1, existing.id) : existing ? E.replaceSelection(state.plan, state.slot + 1, existing.id, event, choiceId) : E.addSelection(state.plan, state.slot + 1, event, choiceId);
    savePlan(next); notice('Selection recorded in ' + next.slots[state.slot].name + '. Original source evidence is preserved.');
  }
  function createCard(id) {
    const article = make(null, 'article', undefined, 'event-card'); article.dataset.eventId = id;
    const header = make(article, 'div', undefined, 'event-card-header');
    const meta = make(header, 'span', '', 'event-meta'), time = make(header, 'time', '', 'event-time'), title = make(article, 'h3', '', 'event-title');
    const status = make(article, 'span', '', 'event-status'), conditions = make(article, 'p', '', 'event-conditions');
    const market = make(article, 'div', undefined, 'market-grid'), explanation = make(article, 'p', '', 'market-explanation');
    const evidence = details(article, 'Statistics & evidence');
    const tabs = make(evidence, 'div', undefined, 'stats-tabs'), panel = make(evidence, 'div', undefined, 'stats-panel'), buttons = new Map();
    tabs.setAttribute('role', 'group'); tabs.setAttribute('aria-label', 'Event statistics'); panel.setAttribute('aria-live', 'polite');
    for (const [tab, label] of [['h2h', 'H2H'], ['recent', 'Recent form'], ['rankings', 'Rankings'], ['sources', 'Sources']]) {
      const b = button(tabs, label, () => loadStats(id, tab, panel, buttons)); b.dataset.statsTab = tab; b.setAttribute('aria-pressed', 'false'); buttons.set(tab, b);
    }
    evidence.addEventListener('toggle', () => { if (evidence.open && !panel.dataset.loaded) safely(() => loadStats(id, 'h2h', panel, buttons)); else if (!evidence.open) statsRequests.get(id)?.abort(); });
    return { node: article, meta, time, title, status, conditions, market, explanation, evidence, panel, buttons, choices: new Map(), structural: '' };
  }
  function patchCard(record, event) {
    const state = store.get(), status = E.statusOf(event), selected = state.plan.slots[state.slot].legs;
    write(record.meta, symbols[event.sport] + ' ' + event.competition); write(record.time, dateText(event.startUTC)); record.time.dateTime = event.startUTC; write(record.title, event.name);
    write(record.status, status.label); record.status.className = 'event-status ' + (status.selectable ? 'is-current' : status.code === 'STARTED' ? '' : 'is-warning');
    const conditions = event.stats?.conditions; write(record.conditions, conditions ? [conditions.distance, conditions.going, conditions.raceClass && 'Class ' + conditions.raceClass].filter(Boolean).join(' · ') : event.choices[0]?.market || 'Research outcome');
    const structural = JSON.stringify([status.code === 'STARTED', event.choices.map(choice => [choice.id, choice.label])]);
    if (record.structural !== structural) {
      record.structural = structural; record.market.replaceChildren(); record.choices.clear();
      if (status.code === 'STARTED') make(record.market, 'span', event.score?.label ? 'Recorded final: ' + event.score.label : 'Event has started or finished · additions closed', 'archived-status');
      else {
        const shown = event.sport === 'racing' && event.choices.length > 6 ? event.choices.slice(0, 5) : event.choices;
        const append = (parent, choice) => { const b = button(parent, '', () => select(event.id, choice.id), 'selection-button'); b.dataset.choiceId = choice.id; const name = make(b, 'span', choice.label, 'selection-name'), price = make(b, 'strong', '—', 'selection-price'), caption = make(b, 'small', '', 'selection-caption'); record.choices.set(choice.id, { element: b, name, price, caption, previous: null }); };
        for (const choice of shown) append(record.market, choice);
        if (shown.length < event.choices.length) { const rest = details(record.market, 'Show all ' + event.choices.length + ' runners', 'runner-disclosure'); const grid = make(rest, 'div', undefined, 'market-grid'); for (const choice of event.choices.slice(shown.length)) append(grid, choice); }
      }
    }
    for (const choice of event.choices) {
      const view = record.choices.get(choice.id); if (!view) continue;
      const chosen = selected.some(leg => leg.eventId === event.id && leg.choiceId === choice.id), priced = typeof choice.quote?.decimal === 'number';
      const value = priced ? choice.quote.decimal.toFixed(2) : choice.probability !== null ? pct(choice.probability) : 'Unpriced';
      write(view.price, value); write(view.caption, chosen ? 'IN THIS SLIP' : priced ? 'SOURCE PRICE · UNVERIFIED' : choice.probability !== null ? 'EXPERIMENTAL ESTIMATE' : 'PAPER HYPOTHESIS');
      view.element.classList.toggle('is-selected', chosen); view.element.setAttribute('aria-pressed', String(chosen)); view.element.disabled = !status.selectable;
      view.element.setAttribute('aria-label', choice.label + ' · ' + value + ' · ' + (chosen ? 'remove from ' : 'add to ') + state.plan.slots[state.slot].name);
      if (priced && view.previous !== null && view.previous !== choice.quote.decimal) { view.element.classList.remove('odds-up', 'odds-down'); view.element.classList.add(choice.quote.decimal > view.previous ? 'odds-up' : 'odds-down'); }
      view.previous = priced ? choice.quote.decimal : null;
    }
    write(record.explanation, event.model ? 'Experimental estimate · uncertainty unquantified · no verified EV' : event.sources.some(source => source.url) ? 'Source-observed event · no supported model estimate' : 'Paper hypothesis · event-level receipt unavailable');
  }
  async function loadStats(id, tab, panel, buttons) {
    statsRequests.get(id)?.abort(); const controller = new AbortController(); statsRequests.set(id, controller);
    for (const [name, b] of buttons) { b.classList.toggle('active', name === tab); b.setAttribute('aria-pressed', String(name === tab)); }
    panel.dataset.loaded = tab; panel.replaceChildren(); make(panel, 'p', 'Loading source-backed research…', 'muted');
    const event = store.get().events.find(event => event.id === id); if (!event) return;
    try {
      const result = await statistics.load({ eventId: id, sport: event.sport_type, season: day(event.startUTC).slice(0, 4), source: event.observedAt, tab }, { signal: controller.signal });
      if (controller.signal.aborted || statsRequests.get(id) !== controller) return; panel.replaceChildren();
      const data = result.data;
      if (tab === 'sources') {
        provenance(panel, event.sources); make(panel, 'p', 'Snapshot ' + dateText(event.observedAt) + (event.model ? ' · model ' + event.model.name : '') + '. No executable price or independently calibrated edge is asserted.', 'small');
        make(panel, 'p', 'Player insights require sourced appearances, participation and a comparable season baseline. Those records are not present for this event.', 'muted');
      } else if (tab === 'h2h' && data) {
        for (const [label, value] of [['Recorded meetings', data.sample_size], ['Home-team wins', data.home_team_wins], ['Draws', data.draws], ['Away-team wins', data.away_team_wins], ['Latest meeting', data.most_recent_match_date]]) if (value !== undefined && value !== null) { const row = make(panel, 'div', undefined, 'stat-row'); make(row, 'span', label); make(row, 'strong', value); }
        make(panel, 'p', 'Descriptive history · possible source gaps · no probability adjustment. Observed ' + dateText(data.history_data_observed_at_utc || event.observedAt) + '.', 'small');
      } else if (tab === 'recent' && Array.isArray(data) && data.length) {
        for (const runner of data) {
          const group = make(panel, 'div', undefined, 'runner-form'); make(group, 'strong', runner.name); const sequence = make(group, 'div', undefined, 'form-sequence');
          for (const run of runner.runs.slice(0, 5)) { const b = make(sequence, 'span', run.finishStatus !== 'FINISHED' ? run.finishStatus || '—' : run.position ?? '—', 'form-badge' + (run.position === 1 ? ' form-win' : '')); b.title = [run.date, run.course, run.position && 'Position ' + run.position + '/' + run.runnerCount, run.going, run.distance].filter(Boolean).join(' · '); }
          make(group, 'small', runner.runs.slice(0, 5).map(run => run.date + ' · ' + run.course).join(' / '), 'muted');
        }
        make(panel, 'p', 'Source-observed prior runs. Descriptive results do not mean a runner is due a win.', 'small');
      } else empty(panel, tab === 'rankings' ? 'Rankings not supplied' : tab === 'h2h' ? 'No sourced H2H record' : 'Recent form unavailable', 'This feed does not contain the records needed for this view. No statistics have been inferred.');
    } catch (error) { if (error.name !== 'AbortError' && !controller.signal.aborted) { panel.replaceChildren(); make(panel, 'p', 'Statistics unavailable. Your event and selections are preserved.', 'warning-line'); } }
  }
  function renderEvents() {
    const state = store.get(), rows = filtered(state), visible = rows.slice(0, state.limit), root = $('events'); root.setAttribute('aria-busy', 'false');
    if (!cards.size) root.replaceChildren(); root.querySelectorAll('.event-empty, .load-more').forEach(element => element.remove());
    S.reconcile(root, visible.map(event => event.id), cards, createCard, (record, id) => patchCard(record, visible.find(event => event.id === id)));
    if (!visible.length) { const box = empty(root, state.snapshotState?.status === 'unavailable' ? 'Research sources unavailable' : 'No events match this view', 'Try another sport or a wider date range. Saved research remains available; no events are invented to fill the board.', { label: 'Show next 14 days', run: () => preset('14') }); box.classList.add('event-empty'); }
    if (rows.length > visible.length) button(root, 'Show more events (' + (rows.length - visible.length) + ')', () => store.update(state => ({ ...state, limit: state.limit + 24 })), 'button button-secondary load-more');
    write($('event-summary'), rows.length + ' ' + (state.eventView === 'upcoming' ? 'upcoming' : 'recorded') + ' events · ' + state.plan.from + ' → ' + state.plan.to + ' · UK time');
  }
  function renderNavigation() {
    const state = store.get(); $('sport').value = state.sport;
    document.querySelectorAll('[data-sport]').forEach(element => { const active = element.dataset.sport === state.sport; element.classList.toggle('active', active); element.setAttribute('aria-pressed', String(active)); });
    document.querySelectorAll('[data-count]').forEach(element => write(element, state.events.filter(event => (element.dataset.count === 'all' || event.sport === element.dataset.count) && day(event.startUTC) >= state.plan.from && day(event.startUTC) <= state.plan.to && Date.parse(event.startUTC) > Date.now() + 300000).length));
    const competitions = [...new Set(state.events.filter(event => state.sport === 'all' || state.sport === event.sport).map(event => event.competition))].sort(), signature = JSON.stringify(competitions);
    if ($('competition').dataset.signature !== signature) {
      $('competition').dataset.signature = signature; $('competition').replaceChildren(); const all = make($('competition'), 'option', 'All competitions'); all.value = 'all';
      for (const name of competitions) { const option = make($('competition'), 'option', name); option.value = name; }
      $('competition-nav').replaceChildren(); button($('competition-nav'), 'All competitions', () => store.update(state => ({ ...state, competition: 'all', limit: 24 })), 'competition-button');
      for (const name of competitions.slice(0, 16)) button($('competition-nav'), name, () => store.update(state => ({ ...state, competition: name, limit: 24 })), 'competition-button');
    }
    $('competition').value = competitions.includes(state.competition) ? state.competition : 'all';
  }
  let trackerSignature = '';
  function renderTracker() {
    const rows = filtered(store.get(), true), signature = JSON.stringify(rows.map(event => [event.id, event.score, E.statusOf(event).code])); if (signature === trackerSignature) return; trackerSignature = signature;
    const root = $('tracker'), opened = new Set([...root.querySelectorAll('details[open]')].map(element => element.dataset.key)); root.replaceChildren();
    for (const sport of Object.keys(sports).filter(name => name !== 'all')) {
      const matches = rows.filter(event => event.sport === sport); if (!matches.length) continue;
      const sportBox = details(root, symbols[sport] + ' ' + sports[sport] + ' · ' + matches.length, 'tracker-sport'); sportBox.dataset.key = sport;
      for (const competition of [...new Set(matches.map(event => event.competition))]) {
        const league = details(sportBox, competition, 'tracker-competition'); league.dataset.key = sport + ':' + competition;
        for (const event of matches.filter(event => event.competition === competition).slice(0, 20)) {
          const game = details(league, event.name, 'tracker-event'); game.dataset.key = event.id;
          make(game, 'p', dateText(event.startUTC), 'small'); make(game, 'strong', event.score?.label ? 'Final · ' + event.score.label : E.statusOf(event).label); make(game, 'p', 'Snapshot ' + dateText(event.observedAt) + ' · no live connection', 'small'); if (event.score) provenance(game, event.score.sources);
        }
      }
    }
    if (!root.children.length) make(root, 'p', 'No tracked events in this range.', 'rail-empty');
    root.querySelectorAll('details').forEach(element => { element.open = opened.has(element.dataset.key); });
  }
  function patchLeg(record, leg, position, slot) {
    const signature = JSON.stringify([leg, position, slot.id, slot.legs.length, store.get().replacing]); if (record.signature === signature) return;
    const opened = record.node.querySelector('details')?.open; record.signature = signature; record.node.replaceChildren();
    const top = make(record.node, 'div', undefined, 'slip-selection-top'); make(top, 'strong', leg.label);
    button(top, '×', () => savePlan(E.removeSelection(store.get().plan, slot.id, leg.id)), 'remove-button').setAttribute('aria-label', 'Remove ' + leg.label);
    make(record.node, 'p', symbols[leg.sport] + ' ' + leg.event, 'slip-selection-meta'); make(record.node, 'p', dateText(leg.startUTC) + ' · ' + leg.market, 'slip-selection-meta');
    const state = E.statusOf(store.get().events.find(event => event.id === leg.eventId));
    make(record.node, 'span', !leg.currentStatus?.selectable ? leg.currentStatus?.label || state.label : leg.quote?.decimal ? leg.quote.decimal.toFixed(2) + ' · unverified source price' : 'Unpriced · paper hypothesis', 'leg-state' + (!leg.currentStatus?.selectable ? ' is-warning' : ''));
    const actions = make(record.node, 'div', undefined, 'selection-actions');
    const up = button(actions, '↑', () => savePlan(E.moveSelection(store.get().plan, slot.id, leg.id, position - 1)), 'move-button'); up.disabled = position === 0; up.setAttribute('aria-label', 'Move ' + leg.label + ' up');
    const down = button(actions, '↓', () => savePlan(E.moveSelection(store.get().plan, slot.id, leg.id, position + 1)), 'move-button'); down.disabled = position === slot.legs.length - 1; down.setAttribute('aria-label', 'Move ' + leg.label + ' down');
    button(actions, store.get().replacing === leg.id ? 'Cancel replace' : 'Replace', () => { store.update(state => ({ ...state, view: 'events', replacing: state.replacing === leg.id ? null : leg.id })); closeSlip(); notice('Choose a board outcome to replace ' + leg.label + '.'); });
    const evidence = details(record.node, 'Captured evidence & price', 'leg-evidence'); evidence.open = Boolean(opened);
    make(evidence, 'p', 'Captured ' + dateText(leg.capturedAt) + ' · estimate ' + pct(leg.probability) + ' · uncertainty unquantified', 'small'); provenance(evidence, leg.sources);
    if (leg.quote) { link(evidence, 'Original price source', leg.quote.source); make(evidence, 'p', 'Observed ' + dateText(leg.quote.observedAt) + ' · not independently verified', 'small'); }
    if (leg.quoteState === 'PRICE_CHANGED') make(evidence, 'p', 'The source price changed. Replace this outcome explicitly to capture the current observation.', 'warning-line');
    if (state.selectable) {
      const form = make(evidence, 'form', undefined, 'record-price-form');
      const field = (label, type, value) => { const wrap = make(form, 'label', label), input = make(wrap, 'input'); input.type = type; input.value = value; input.required = true; return input; };
      const price = field('Observed decimal price', 'number', leg.quote?.decimal || ''); price.min = '1.00000001'; price.max = '100000'; price.step = 'any';
      const source = field('Evidence source URL', 'url', leg.quote?.source || '');
      const seen = field('Observation time (UTC)', 'datetime-local', new Date().toISOString().slice(0, 16));
      const submit = make(form, 'button', 'Record unverified source price', 'button button-secondary'); submit.type = 'submit'; make(form, 'p', 'User-recorded evidence only. Source, market and availability require independent checking.', 'small');
      form.addEventListener('submit', event => { event.preventDefault(); safely(() => savePlan(E.setRecordedQuote(store.get().plan, slot.id, leg.id, { decimal: Number(price.value), source: source.value, observedAt: new Date(seen.value + 'Z').toISOString(), bookmaker: 'User-recorded source' }))); });
    }
  }
  let slipSignature = '';
  function renderSlip() {
    const state = store.get(), slot = state.plan.slots[state.slot], evaluation = E.evaluateSlot(slot, state.events);
    write($('slip-title'), slot.name); write($('slip-subtitle'), slot.description); write($('slip-count'), slot.legs.length + ' / 15'); write($('mobile-count'), state.plan.slots.reduce((sum, slot) => sum + slot.legs.length, 0));
    document.querySelectorAll('[data-slot]').forEach(element => { const active = Number(element.dataset.slot) === state.slot + 1; element.classList.toggle('active', active); element.setAttribute('aria-pressed', String(active)); });
    if (document.activeElement !== $('stake')) $('stake').value = (slot.stakeMinor / 100).toFixed(2); $('slip-structure').value = slot.structure;
    const signature = JSON.stringify([state.slot, evaluation, state.replacing]); if (slipSignature === signature) return; slipSignature = signature;
    const root = $('slip-content'); if (!legs.size) root.replaceChildren(); root.querySelectorAll('.slip-empty, .generation-note').forEach(element => element.remove());
    S.reconcile(root, evaluation.legs.map(leg => leg.id), legs, id => { const row = make(null, 'article', undefined, 'slip-selection'); row.dataset.legId = id; return { node: row, signature: '' }; }, (record, id) => { const position = evaluation.legs.findIndex(leg => leg.id === id); patchLeg(record, evaluation.legs[position], position, slot); });
    if (!slot.legs.length) empty(root, 'Your perspective starts here.', 'Choose an outcome or build a research shortlist. Empty slips are valid.').classList.add('slip-empty');
    if (slot.generation) make(root, 'p', slot.generation.reason, 'generation-note small');
    const metrics = $('slip-metrics'); metrics.replaceChildren();
    const metric = (label, value, primary = false) => { const row = make(metrics, 'div', undefined, primary ? 'metric-primary' : 'metric-row'); make(row, 'span', label); make(row, 'strong', value); };
    metric('Lines × stake per line', evaluation.lineCount + ' × ' + money(slot.stakeMinor)); metric('Total hypothetical stake', money(evaluation.totalStakeMinor)); metric('Illustrative odds product', evaluation.combinedDecimal ? evaluation.combinedDecimal.toFixed(2) : '—'); metric('Gross if every leg wins', money(evaluation.grossReturnMinor), true); metric('Net if every leg wins', money(evaluation.netReturnMinor));
    const compare = details(metrics, 'Compare structures', 'structure-comparison');
    for (const structure of ['singles', 'doubles', 'trebles', 'accumulator']) { const result = E.evaluateSlot({ ...slot, structure }, state.events), row = make(compare, 'div', undefined, 'metric-row'); make(row, 'span', structure + ' · ' + result.lineCount + ' lines'); make(row, 'strong', result.grossReturnMinor === null ? 'Needs prices' : money(result.grossReturnMinor)); }
    $('slip-warnings').replaceChildren();
    if (state.replacing) make($('slip-warnings'), 'p', 'Replacement mode: choose an outcome on the board.', 'warning-line');
    for (const warning of evaluation.warnings) make($('slip-warnings'), 'p', warning, 'warning-line');
    if (slot.legs.some(leg => day(leg.startUTC) < state.plan.from || day(leg.startUTC) > state.plan.to)) make($('slip-warnings'), 'p', 'Captured events outside the current date filter have been retained.', 'warning-line');
    $('freeze').disabled = !state.plan.slots.some(slot => slot.legs.length) || persistence.locked; $('clear-slip').disabled = !slot.legs.length;
  }
  function renderResults() {
    const root = $('results'), state = store.get(); root.replaceChildren();
    const rows = state.events.filter(event => event.score && (state.sport === 'all' || state.sport === event.sport));
    if (!rows.length) empty(root, 'No corroborated finals in this feed', 'A missing result is not a loss and does not settle your slip. Finals appear only with source-backed evidence.');
    for (const event of rows.sort((a, b) => Date.parse(b.startUTC) - Date.parse(a.startUTC))) { const card = make(root, 'article', undefined, 'result-card'); make(card, 'span', event.competition + ' · ' + dateText(event.startUTC), 'event-meta'); make(card, 'h3', event.name); make(card, 'strong', event.score.label, 'result-score'); make(card, 'span', 'Two-publisher final · no slip settlement inferred', 'event-status'); provenance(details(card, 'Result sources'), event.score.sources); }
  }
  function renderHistory() {
    const root = $('history'), state = store.get(); root.replaceChildren();
    if (!state.history.length && !legacy.length) empty(root, 'Keep the original evidence.', 'Save a research snapshot to preserve selections, source prices and model versions. Captures are read-only and exportable.');
    for (const [index, record] of [...state.history].reverse().entries()) {
      const snapshot = record.snapshot, card = make(root, 'article', undefined, 'history-card'); make(card, 'span', 'Saved ' + dateText(snapshot.savedAt), 'event-meta'); make(card, 'h3', snapshot.from + ' → ' + snapshot.to); make(card, 'p', snapshot.slots.reduce((sum, slot) => sum + slot.legs.length, 0) + ' selections · original evidence retained · settlement unavailable', 'muted');
      const evidence = details(card, 'Original slips & source observations');
      for (const slot of snapshot.slots) { make(evidence, 'h4', slot.name + ' · ' + slot.legs.length + ' legs'); for (const leg of slot.legs) { const row = make(evidence, 'div', undefined, 'history-leg'); make(row, 'strong', leg.label); make(row, 'p', leg.event + ' · ' + dateText(leg.startUTC), 'small'); make(row, 'p', 'Estimate ' + pct(leg.probability) + ' · observed price ' + (leg.quote?.decimal ?? 'not supplied'), 'small'); provenance(row, leg.sources); } }
      const integrity = make(card, 'p', record.sha256 ? 'Checking local integrity…' : 'Local hash unavailable · not independently attested', 'small');
      if (record.sha256) S.verify(record).then(valid => { if (integrity.isConnected) write(integrity, valid ? 'Local SHA-256 matches · not independently attested' : 'Integrity mismatch · do not rely on this record'); }).catch(() => write(integrity, 'Integrity verification unavailable'));
      button(card, 'Export original snapshot', () => exportJSON(record, 'research-snapshot-' + snapshot.from + '-' + index + '.json'));
    }
    for (const plan of legacy) { const card = make(root, 'article', undefined, 'history-card'); make(card, 'h3', 'Earlier paper workspace · ' + plan.date); make(card, 'p', 'Original storage has not been modified.', 'small'); for (const slot of plan.slots) for (const leg of slot.legs) make(card, 'p', leg.label + ' · ' + leg.event); button(card, 'Export earlier plan', () => exportJSON(plan, 'earlier-paper-plan-' + plan.date + '.json')); }
    if (state.claims.length) { const notes = details(root, 'Private community research notes · ' + state.claims.length); for (const claim of state.claims) { const card = make(notes, 'article', undefined, 'history-card'); make(card, 'h4', claim.classification.replaceAll('_', ' ').toLowerCase()); make(card, 'p', claim.reasoning); make(card, 'small', dateText(claim.createdAt), 'muted'); } }
  }
  function renderView() {
    const state = store.get(); for (const view of ['events', 'results', 'history', 'community']) $(view + '-view').hidden = state.view !== view;
    document.querySelectorAll('[data-view]').forEach(element => { const active = element.dataset.view === state.view; element.classList.toggle('active', active); if (active) element.setAttribute('aria-current', 'page'); else element.removeAttribute('aria-current'); });
    if (state.view === 'results') renderResults(); if (state.view === 'history') renderHistory();
  }
  function renderSources(result) {
    $('feeds').replaceChildren();
    for (const spec of specs) { const file = new URL(spec.path, rootURL).pathname.split('/').pop(), snapshot = result.snapshots.find(item => item.path === spec.path), error = result.errors.find(item => item.path === spec.path), row = make($('feeds'), 'div', undefined, 'source-row'); make(row, 'strong', sources[file][1], 'source-name'); make(row, 'span', error ? error.retained ? 'Refresh failed · last good snapshot retained' : 'Unavailable' : 'Snapshot ' + dateText(snapshot?.document.generated_at_utc), 'source-status'); const technical = details(row, 'Technical details', 'source-debug'); make(technical, 'code', file); if (snapshot) make(technical, 'p', snapshot.document.generated_at_utc, 'small'); if (error) make(technical, 'p', error.message, 'warning-line'); }
    write($('source-summary'), result.errors.length ? 'Sources · ' + result.errors.length + ' need attention' : 'Sources · ' + result.snapshots.length + ' snapshots');
  }
  const transport = ResearchTransport.createSnapshotClient({ fetch: window.fetch.bind(window), onStatus(status) { $('refresh').disabled = status.status === 'loading'; $('events').setAttribute('aria-busy', String(status.status === 'loading' && !store.get().events.length)); }, onUpdate(result) { safely(() => { const events = E.normalizeFeeds(result.snapshots); store.update(state => ({ ...state, events, eventVersion: state.eventVersion + 1, snapshotState: result })); renderSources(result); notice((result.errors.length ? 'Some sources need attention · ' : '') + events.filter(event => E.statusOf(event).selectable).length + ' events available for paper research · checked ' + dateText(result.checkedAt)); }); } });
  const refresh = () => transport.refresh(specs);
  let opener = null;
  function openSlip() { opener = document.activeElement; document.body.classList.add('paper-open'); $('paper-backdrop').hidden = false; $('paper-open').setAttribute('aria-expanded', 'true'); $('slip-panel').setAttribute('aria-modal', 'true'); $('slip-panel').setAttribute('role', 'dialog'); $('paper-close').focus(); }
  function closeSlip() { document.body.classList.remove('paper-open'); $('paper-backdrop').hidden = true; $('paper-open').setAttribute('aria-expanded', 'false'); $('slip-panel').removeAttribute('aria-modal'); $('slip-panel').removeAttribute('role'); opener?.focus(); }
  $('paper-open').addEventListener('click', openSlip); $('paper-close').addEventListener('click', closeSlip); $('paper-backdrop').addEventListener('click', closeSlip);
  document.addEventListener('keydown', event => { if (!document.body.classList.contains('paper-open')) return; if (event.key === 'Escape') closeSlip(); if (event.key === 'Tab') { const items = [...$('slip-panel').querySelectorAll('button:not([disabled]),input,select,summary,a[href]')].filter(element => element.getClientRects().length); if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1)?.focus(); } else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0]?.focus(); } } });
  $('date-from').value = initial.plan.from; $('date-to').value = initial.plan.to;
  document.querySelectorAll('[data-range]').forEach(element => { element.addEventListener('click', () => safely(() => preset(element.dataset.range))); const active = !restored && element.dataset.range === '7'; element.classList.toggle('active', active); element.setAttribute('aria-pressed', String(active)); });
  document.querySelectorAll('[data-sport]').forEach(element => element.addEventListener('click', () => store.update(state => ({ ...state, sport: element.dataset.sport, competition: 'all', limit: 24 }))));
  document.querySelectorAll('[data-view]').forEach(element => element.addEventListener('click', () => store.update(state => ({ ...state, view: element.dataset.view }))));
  document.querySelectorAll('[data-slot]').forEach(element => element.addEventListener('click', () => store.update(state => ({ ...state, slot: Number(element.dataset.slot) - 1, replacing: null }))));
  for (const id of ['date-from', 'date-to']) $(id).addEventListener('change', () => safely(() => setRange($('date-from').value, $('date-to').value)));
  $('sport').addEventListener('change', event => store.update(state => ({ ...state, sport: event.target.value, competition: 'all', limit: 24 })));
  $('competition').addEventListener('change', event => store.update(state => ({ ...state, competition: event.target.value, limit: 24 })));
  $('event-view').addEventListener('change', event => store.update(state => ({ ...state, eventView: event.target.value, limit: 24 })));
  let searchTimer; $('search').addEventListener('input', event => { clearTimeout(searchTimer); const query = event.target.value.trim().toLocaleLowerCase('en-GB'); searchTimer = setTimeout(() => store.update(state => ({ ...state, query, limit: 24 })), 100); });
  $('refresh').addEventListener('click', () => safely(refresh));
  $('generate').addEventListener('click', () => safely(() => { const state = store.get(); savePlan(E.generateResearch(state.plan, filtered(state))); notice('Distinct research shortlists created where supported. Non-empty slips are retained. This is an evidence-coverage comparison, not verified value.'); }));
  $('slip-structure').addEventListener('change', event => safely(() => savePlan(E.setStructure(store.get().plan, store.get().slot + 1, event.target.value))));
  $('stake').addEventListener('input', event => { try { savePlan(E.setStake(store.get().plan, store.get().slot + 1, event.target.value)); event.target.removeAttribute('aria-invalid'); } catch { event.target.setAttribute('aria-invalid', 'true'); } });
  $('stake').addEventListener('blur', () => { $('stake').value = (store.get().plan.slots[store.get().slot].stakeMinor / 100).toFixed(2); $('stake').removeAttribute('aria-invalid'); });
  $('clear-slip').addEventListener('click', () => safely(() => savePlan(E.clearSlot(store.get().plan, store.get().slot + 1))));
  $('export').addEventListener('click', () => safely(() => { const state = store.get(); exportJSON({ ...E.freeze(state.plan, Date.now(), state.events), savedHistory: state.history, privateNotes: state.claims }, 'value-watch-research-' + state.plan.from + '.json'); }));
  let saving = false;
  $('freeze').addEventListener('click', () => safely(async () => { if (saving) return; saving = true; $('freeze').disabled = true; try { const state = store.get(); if (state.history.length >= 200) throw Error('Local journal limit reached. Export your research.'); const record = await S.seal(E.freeze(state.plan, Date.now(), state.events)); saveEnvelope({ history: [...store.get().history, record] }); notice('Original research saved with local integrity evidence; not independently timestamped or settled.'); } finally { saving = false; $('freeze').disabled = false; } }));
  $('community').addEventListener('submit', event => { event.preventDefault(); safely(() => {
    const reasoning = $('reasoning').value.trim(); if (!reasoning || reasoning.length > 3000) throw Error('Enter reasoning of up to 3,000 characters.');
    const result = I.classifyClaim(reasoning, $('methodology').value, [$('evidence').value]); const root = $('community-result'); root.replaceChildren();
    const card = make(root, 'article', undefined, 'event-card community-review-card'); make(card, 'span', result.classification.replaceAll('_', ' ').toLowerCase(), 'event-status is-warning'); make(card, 'h3', 'Evidence review');
    make(result.highRisk ? details(card, 'High-risk claim · expand for review') : card, 'p', reasoning); make(card, 'p', 'Method: ' + result.methodology.replaceAll('_', ' ').toLowerCase(), 'small'); for (const source of result.sources || []) link(card, 'Submitted evidence', source);
    make(card, 'p', 'Classification is not fact verification or an allegation of fraud. Verified ROI, win rate and trust score remain unavailable.', 'muted');
    button(card, 'Save private research note', () => { const state = store.get(); if (state.claims.length >= 100) throw Error('Private note limit reached. Export your research.'); saveEnvelope({ claims: [...state.claims, { reasoning, methodology: result.methodology, sources: result.sources, classification: result.classification, createdAt: new Date().toISOString() }] }); notice('Research note saved privately on this device.'); });
  }); });
  store.subscribe(state => JSON.stringify([state.plan.revision, state.slot, state.eventVersion, state.sport, state.competition, state.query, state.eventView, state.limit, state.replacing, state.clockTick]), () => safely(() => { renderNavigation(); renderEvents(); renderSlip(); renderTracker(); }));
  store.subscribe(state => state.view, () => safely(renderView));
  store.subscribe(state => state.history, () => { if (store.get().view === 'history') safely(renderHistory); });
  store.subscribe(state => state.eventVersion, () => { if (store.get().view === 'results') safely(renderResults); });
  window.addEventListener('storage', event => { if (event.key === key || event.key === null) persistence.invalidate(); });
  let timer = null;
  function startClock() { if (timer === null) timer = setInterval(() => { if (!document.hidden) store.update(state => ({ ...state, clockTick: state.clockTick + 1 })); }, 30000); }
  document.addEventListener('visibilitychange', () => { transport.setPaused(document.hidden); if (!document.hidden) safely(refresh); });
  window.addEventListener('online', () => { if (!document.hidden) safely(refresh); }); window.addEventListener('offline', () => notice('Offline · last good snapshots and saved research retained. Freshness checks still apply.'));
  window.addEventListener('pagehide', () => { clearInterval(timer); timer = null; transport.setPaused(true); for (const request of statsRequests.values()) request.abort(); });
  window.addEventListener('pageshow', () => { transport.setPaused(document.hidden); startClock(); if (!document.hidden) safely(refresh); });
  safely(() => { renderNavigation(); renderEvents(); renderSlip(); renderView(); startClock(); refresh().catch(report); });
})();
