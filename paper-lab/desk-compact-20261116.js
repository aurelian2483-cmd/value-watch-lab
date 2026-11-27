'use strict';

(() => {
  const E = ResearchEngine, S = ResearchStore, I = ResearchInsights, C = ResearchConnections, J = ResearchJournal;
  const $ = id => document.getElementById(id);
  const rootURL = new URL('../', document.currentScript.src);
  const sports = { all: 'All sports', football: 'Football', racing: 'Horse racing', tennis: 'Tennis', nfl: 'NFL', darts: 'Darts', rugby: 'Rugby' };
  const discoveryOnly = {golf:'Golf', basketball:'Basketball', cricket:'Cricket'};
  Object.assign(sports, discoveryOnly);
  const symbols = { football: '⚽', racing: '♞', tennis: '◉', nfl: '◆', rugby: '🏉' };
  const sources = { 'research-dashboard-data.json': ['football', 'Premier League'], 'football-expanded-data.json': ['football', 'Football leagues'], 'international-football-data.json': ['football', 'International football'], 'racing-research-data.json': ['racing', 'Racecards & source prices'], 'racing-future-data.json': ['racing-future', 'Future race schedules'], 'horse-predictions-data.json': ['racing-context', 'Racing model predictions'], 'other-sports-data.json': ['other', 'Tennis & NFL'], 'rugby-research-data.json': ['rugby', 'Rugby fixtures'], 'rugby/pro-d2-results.json': ['rugby-results', 'Official Pro D2 results'], 'research-history.json': ['history', 'Historical results'], 'research/result-review-status.json': ['result-review', 'Tennis & NFL result review'] };
  const sportFeedKinds = {football:['football'], racing:['racing','racing-future'],
    tennis:['other'], nfl:['other'], rugby:['rugby','rugby-results']};
  const specs = Object.entries(sources).map(([file, [kind, label]]) => ({ kind, label, path: new URL(file, rootURL).pathname }));
  const key = 'value-watch-research-desk-v4';
  const day = E.day, today = () => new Intl.DateTimeFormat('sv-SE', {timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const plusDays = (date, count) => new Date(Date.parse(date + 'T12:00:00Z') + count * 86400000).toISOString().slice(0, 10);
  const dateText = value => Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : 'Time not supplied';
  const money = value => value === null || value === undefined ? '—' : new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value / 100);
  const pct = value => typeof value === 'number' && Number.isFinite(value) ? (value * 100).toFixed(1) + '%' : '—';
  function publishedOddsForEvent(event){
    const rows=window.ValueWatchCurrentOddsForCards;
    if(!Array.isArray(rows)||event?.sport!=='football')return null;
    const start=Date.parse(event.startUTC),now=Date.now();
    const normalize=value=>String(value||'').normalize('NFKD').toLocaleLowerCase('en-GB').replace(/[^a-z0-9]/g,'');
    const [home,away]=event.participants.map(participant=>participant?.name);
    const matches=rows.filter(row=>row&&row.sport==='football'&&row.startMs===start&&row.expires>now&&
      normalize(row.home)===normalize(home)&&normalize(row.away)===normalize(away));
    if(matches.length!==1)return null;
    const quote=matches[0],prices=quote.prices;
    if(!prices||!['home','draw','away'].every(side=>Number.isFinite(prices[side])&&prices[side]>1))return null;
    return quote;
  }
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
    if (!value || value.version !== 4 || (value.autoFill !== undefined && typeof value.autoFill !== 'boolean') || !Array.isArray(value.history) || value.history.length > 200 || !Array.isArray(value.claims) || value.claims.length > 100) throw Error('Saved workspace is invalid.');
    E.restore(JSON.stringify(value.plan));
    for (const record of value.history) { if (!record?.snapshot || record.independentlyAttested !== false) throw Error('Saved history is invalid.'); E.restore(JSON.stringify(record.snapshot)); }
    for (const claim of value.claims) if (!claim || typeof claim.reasoning !== 'string' || claim.reasoning.length > 3000 || typeof claim.createdAt !== 'string' || !Number.isFinite(Date.parse(claim.createdAt)) || (claim.concern !== undefined && (typeof claim.concern !== 'string' || claim.concern.length > 1500)) || (claim.eventId !== undefined && claim.eventId !== null && (typeof claim.eventId !== 'string' || claim.eventId.length > 4000))) throw Error('Saved claim is invalid.');
    J.validateEntries(value.journal || []);
    return { ...value, journal: value.journal || [] };
  }
  let storage;
  try { storage = window.localStorage; }
  catch { storage = { getItem() { throw Error(); }, setItem() { throw Error(); } }; }
  const persistence = S.createPersistence(storage, key, validateWorkspace, message => write($('storage'), message));
  const restored = persistence.read();
  const initial = restored || { version: 4, plan: E.createPlan({ from: today(), to: plusDays(today(), 6) }), history: [], claims: [], journal: [] };
  // Never silently discard a populated expired plan when this browser is reopened.
  // Empty expired plans may start a new default range without erasing research.
  if(initial.autoFill !== false && initial.plan && typeof initial.plan.to==='string' && initial.plan.to<today() &&
     initial.plan.slots.every(slot => !slot.legs.length)){
    initial.plan=E.createPlan({from:today(),to:plusDays(today(),6)});
  }
  function urlFilters() {
    const params = new URLSearchParams(location.search);
    const sport = params.get('sport'), view = params.get('desk-view');
    return {
      sport: Object.hasOwn(sports, sport) ? sport : 'all',
      competition: params.get('desk-competition')?.slice(0, 160) || 'all',
      query: params.get('desk-query')?.slice(0, 120).trim().toLocaleLowerCase('en-GB') || '',
      eventView: ['history','all'].includes(view) ? view : 'upcoming'
    };
  }
  const store = S.createStore({ ...initial, ...urlFilters(), events: [], eventVersion: 0, snapshotState: null, slot: 0, view: 'events', limit: 24, replacing: null, clockTick: 0 });
  function writeDeskFilters() {
    const state = store.get();
    const url = new URL(location.href);
    for (const [key,value,fallback] of [['desk-competition',state.competition,'all'],
      ['desk-query',state.query,''],['desk-view',state.eventView,'upcoming']]) {
      if (value === fallback) url.searchParams.delete(key);
      else url.searchParams.set(key,value);
    }
    if (url.href !== location.href) history.replaceState(history.state,'',url);
  }
  let legacy = [];
  try { const raw = storage.getItem('value-watch-paper-lab-v3'); legacy = Object.values(raw ? JSON.parse(raw) : {}).map(plan => PaperLab.restore(JSON.stringify(plan))); }
  catch { notice('Earlier research could not be read; its original storage is untouched.'); }
  const cards = new Map(), legs = new Map(), statsRequests = new Map();
  let historicalResults = [];
  let historicalStatus = 'LOADING';
  function currentHistoryStatus(event) {
    return window.ValueWatchReliability.qualifyingEvidence(event, historicalResults);
  }
  const statistics = I.createStatisticsCache({ maxEntries: 150, ttlMs: 300000, loader: async ({ eventId, tab }, { signal } = {}) => {
    await Promise.resolve(); if (signal?.aborted) throw new DOMException('Selection changed', 'AbortError');
    const event = store.get().events.find(event => event.id === eventId); return { event, data: event?.stats?.[tab] ?? null };
  } });
  function savePlan(plan) {
    E.restore(E.serialize(plan)); store.update(state => ({ ...state, plan, replacing: null }));
    const state = store.get(); if (persistence.write({ version: 4, plan, history: state.history, claims: state.claims, journal: state.journal, autoFill:state.autoFill })) write($('storage'), 'Saved on this device · export a backup');
  }
  function saveEnvelope(changes) {
    const state = store.get(), next = { version: 4, plan: state.plan, history: state.history, claims: state.claims, journal: state.journal, autoFill:state.autoFill, ...changes };
    if (!persistence.write(next)) throw Error('The change could not be saved. Export your research before continuing.');
    store.update(current => ({ ...current, ...changes }));
  }
  let freshDailyBusy = false;
  async function createFreshDailySlips() {
    if (freshDailyBusy) return;
    freshDailyBusy = true;
    const controls = [$('fresh-daily-slips'),$('fresh-daily-slips-panel')].filter(Boolean);
    for (const control of controls) control.disabled = true;
    try {
      if (persistence.locked) throw Error('Local research storage is locked. Export your research before trying again.');
      const original = store.get().plan;
      write($('slip-refresh-outcome'), 'Checking the latest research feeds before generating new paper slips…');
      // Refresh source data first; a new plan ID does not mean the inputs changed.
      // During this operation the transport callback must not auto-fill old slots.
      const result = await refresh();
      const before = store.get();
      if (before.plan.id !== original.id || before.plan.revision !== original.revision)
        throw Error('Paper research was edited while feeds refreshed. Existing selections are unchanged; please retry.');
      if (!result?.snapshots?.length)
        throw Error('No source snapshots were loaded. Previous paper research was preserved.');
      const current = before.plan;
      // The user explicitly starts a new 7-day plan; saved historical legs are immutable.
      const from = today(), to = plusDays(from,6), now = Date.now();
      const available = before.events.filter(event =>
        day(event.startUTC) >= from && day(event.startUTC) <= to);
      if (!available.length) throw Error('No current research events were loaded for the next seven days. Refresh source data and try again.');
      const next = E.freshDailyResearch(current,available,from,to,now);
      const eligible = E.paperEligibilityAudit(next,available,now).reduce((n,row) => n + row.eligible,0);
      if (!eligible) throw Error('No evidence-eligible upcoming selections are available. The previous slips have been preserved.');
      const hasResearch = current.slots.some(slot => slot.legs.length);
      const alreadyArchived = before.history.some(record =>
        record.snapshot.id === current.id && record.snapshot.revision === current.revision);
      if (hasResearch && !alreadyArchived && before.history.length >= 200)
        throw Error('Saved research history is full. Export and manage your saved records before starting new slips.');
      // Snapshot before changing the active plan, and hash the exact captured revision.
      const record = hasResearch && !alreadyArchived ?
        await S.seal(E.freeze(current,now,before.events)) : null;
      const latest = store.get();
      if (latest.plan.id !== current.id || latest.plan.revision !== current.revision ||
          latest.history.length !== before.history.length || latest.claims.length !== before.claims.length ||
          latest.journal.length !== before.journal.length)
        throw Error('Research changed during refresh. No slips were replaced. Retry after reviewing the latest data.');
      const history = record ? [...latest.history,record] : latest.history;
      const oldChoices = current.slots.map(slot => slot.legs.map(leg => leg.eventId + ':' + leg.choiceId).join('|'));
      const newChoices = next.slots.map(slot => slot.legs.map(leg => leg.eventId + ':' + leg.choiceId).join('|'));
      const sameSelections = oldChoices.every((value,index) => value === newChoices[index]);
      const sportCounts = E.paperEligibilityAudit(next,available,now)
        .map(row => row.sport + ' ' + row.eligible).join(' · ');
      const sourceProblems = result.errors?.length || 0;
      // One validated persistence write for the plan AND archive. On failure,
      // keep the current in-memory plan, private notes, journal and saved research.
      saveEnvelope({plan:next,history,replacing:null});
      store.update(state => ({...state,slot:0,limit:24}));
      $('date-from').value = from; $('date-to').value = to;
      document.querySelectorAll('[data-range]').forEach(element => {
        const active = element.dataset.range === '7';
        element.classList.toggle('active',active);
        element.setAttribute('aria-pressed',String(active));
      });
      const total = next.slots.reduce((n,slot) => n+slot.legs.length,0);
      const outcome = 'Fresh feeds checked · ' + sportCounts +
        ' · ' + total + ' paper selections · ' +
        (sameSelections ? 'Choices unchanged because the latest eligible inputs produced the same shortlist.' :
          'New shortlist differs from the previous plan.') +
        (sourceProblems ? ' · ' + sourceProblems + ' source requests had problems; check Sources.' : '') +
        ' Experimental research only; no verified positive EV.';
      write($('slip-refresh-outcome'), outcome);
      notice('Fresh seven-day research plan saved · ' + total +
        ' experimental paper selections · ' + (record ? 'previous revision archived' :
        hasResearch ? 'previous revision already in saved research' : 'no previous selections to archive') +
        (sameSelections ? ' · Same qualifying choices as previous plan' : ' · Updated shortlist') +
        '. Nothing is a verified betting recommendation.');
    } catch (error) {
      write($('slip-refresh-outcome'), 'Refresh could not finish: ' + (error?.message || 'Unknown error') +
        ' · Existing saved selections have not been replaced.');
      throw error;
    } finally {
      freshDailyBusy = false;
      for (const control of controls) control.disabled = false;
    }
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
    if(event.futureScheduleOnly){notice('Future racecard is schedule-only. Wait for confirmed runners before making a paper selection.');return;}
    const existing = state.plan.slots[state.slot].legs.find(leg => leg.eventId === eventId);
    const next = state.replacing ? E.replaceSelection(state.plan, state.slot + 1, state.replacing, event, choiceId) : existing?.choiceId === choiceId ? E.removeSelection(state.plan, state.slot + 1, existing.id) : existing ? E.replaceSelection(state.plan, state.slot + 1, existing.id, event, choiceId) : E.addSelection(state.plan, state.slot + 1, event, choiceId);
    savePlan(next); notice('Selection recorded in ' + next.slots[state.slot].name + '. Original source evidence is preserved.');
  }
  // Research-only dual racing highlights. Community tips require independent sourced records;
  // never infer consensus from model rankings or bookmaker prices.
  function evaluateEvidenceSafe(event,choice) {
    try {
      const evaluator=window.ValueWatchEvidenceV3?.evaluate;
      if(typeof evaluator==='function')return evaluator(event,choice);
    }catch(error){console.warn('Evidence validator unavailable; badges blocked',error);}
    return {green:'NOT_ESTABLISHED',blue:'NOT_AWARDED',yellow:'NOT_AWARDED',media:'SEPARATE',qualifiedPosts:0,verifiedAuthors:0};
  }

  function racingHighlights(event) {
    if (event?.sport !== 'racing') return [];
    const choices=event.choices||[];
    return choices.map(choice=>{
      const gate=evaluateEvidenceSafe(event,choice),labels=[];
      if(gate.green==='PROVISIONAL')labels.push(gate.greenBasis==='PUBLISHER_BETTING_FORECAST'?'Forecast favourite':'Odds favourite');
      if(['VERIFIED','EXPERIMENTAL'].includes(gate.blue))labels.push('Experimental source leader');
      if(['MULTI_USER_CONSENSUS','EXPERIMENTAL_AGREEMENT'].includes(gate.yellow))labels.push('Experimental agreement · unverified');
      return {choice,gate,labels,reasons:[gate.marketBasis]};
    }).filter(pick=>pick.labels.length);
  }
  function racingEvidenceAudit(event) {
    const tips = (Array.isArray(event.communityTips) ? event.communityTips : []).filter(t=>t.primaryPostVerified===true && t.explicitBetSelectionVerified===true && t.timestampVerified===true);
    const forum = tips.filter(t => ['forum','social_forum'].includes(t.type));
    const press = tips.filter(t => !['forum','social_forum'].includes(t.type));
    const unique = rows => new Set(rows.map(t => (t.author || t.publisher || new URL(t.sourceUrl).hostname).trim().toLowerCase())).size;
    const forumCount = unique(forum), pressCount = unique(press);
    // These records do not contain press-naps totals or complete forum post corpora.
    // Never equate publisher observations with press naps or selections with all mentions.
    const health = Array.isArray(communityHealth.sourceHealth) ? communityHealth.sourceHealth : [];
    const failed = health.filter(h => h.status !== 'fetched').length;
    return { forumCount, pressCount, failed, coverage:'PARTIAL / UNKNOWN',
      pressNaps:null, rawMentions:null, positiveRatio:null,
      discrepancy:pressCount > 0 && !forumCount,
      convergence:false };
  }
  function createCard(id) {
    const article = make(null, 'article', undefined, 'event-card desk-event-card'); article.dataset.eventId = id;
    const time = make(article, 'time', '', 'event-time');
    const date = make(time, 'span', '', 'desk-event-date'), clock = make(time, 'strong', '', 'desk-event-clock');
    const header = make(article, 'div', undefined, 'event-card-header');
    const meta = make(header, 'span', '', 'event-meta'), title = make(header, 'h3', '', 'event-title');
    const signals = make(header, 'div', undefined, 'compact-event-signals');
    const status = make(signals, 'span', '', 'event-status'), conditions = make(article, 'p', '', 'event-conditions');
    const prediction = make(article, 'div', '', 'prediction-summary'); prediction.setAttribute('aria-live', 'polite');
    const racingDisclosure = details(article, 'Horse racing · research evidence & source audit', 'compact-evidence-disclosure');
    const racingPanel = make(racingDisclosure, 'section', undefined, 'racing-highlights'); racingPanel.setAttribute('aria-label', 'Horse racing research highlights');
    const methodConsensus = make(article, 'div', undefined, 'method-agreement-summary');
    methodConsensus.hidden = true;
    const market = make(article, 'div', undefined, 'market-grid');
    const choiceDisclosure = details(article, 'Runner / outcome source and model information', 'compact-evidence-disclosure compact-choice-disclosure');
    const choiceInformation = make(choiceDisclosure, 'div', undefined, 'compact-choice-information');
    const seasonDisclosure = details(article, 'Form and season comparison', 'compact-evidence-disclosure');
    const seasonPanel = make(seasonDisclosure, 'section', undefined, 'season-comparison'), explanation = make(article, 'p', '', 'market-explanation'); seasonPanel.setAttribute('aria-label','Current-season-only model comparison');
    const watch = button(header, 'Watch', () => chooseWatch('desk', id, article.dataset.sport, watch), 'desk-watch-button');
    watch.hidden = !$('dashboard-watch');
    const tools = make(article, 'div', undefined, 'event-tools');
    const check = link(tools, 'Check prices on Oddschecker ↗', 'https://www.oddschecker.com/');
    const note = button(tools, 'Add private note', () => {
      store.update(state => ({ ...state, view: 'community' })); renderNoteContext(); $('note-event').value = id; renderNoteChoices(); $('reasoning').focus();
    });
    const estimates = details(article, 'Experimental model details', 'model-details');
    const modelPanel = make(estimates, 'div');
    const notes = details(article, 'Private notes', 'model-details'), notesPanel = make(notes, 'div');
    const matchView = details(article, '2D match overview', 'match-overview'); const matchPanel = make(matchView, 'div');
    matchView.addEventListener('toggle', () => { if (matchView.open) renderMatchOverview(matchPanel, store.get().events.find(event => event.id === id)); });
    const evidence = details(article, 'Statistics & evidence');
    const tabs = make(evidence, 'div', undefined, 'stats-tabs'), panel = make(evidence, 'div', undefined, 'stats-panel'), buttons = new Map();
    tabs.setAttribute('role', 'group'); tabs.setAttribute('aria-label', 'Event statistics'); panel.setAttribute('aria-live', 'polite');
    for (const [tab, label] of [['h2h', 'H2H'], ['recent', 'Recent form'], ['rankings', 'Rankings'], ['sources', 'Sources']]) {
      const b = button(tabs, label, () => loadStats(id, tab, panel, buttons)); b.dataset.statsTab = tab; b.setAttribute('aria-pressed', 'false'); buttons.set(tab, b);
    }
    evidence.addEventListener('toggle', () => { if (evidence.open && (!panel.dataset.loaded || panel.dataset.pending === 'true')) safely(() => loadStats(id, preferredStats(store.get().events.find(event => event.id === id)), panel, buttons)); else if (!evidence.open) statsRequests.get(id)?.abort(); });
    // Two primary disclosures keep all outcome cards visible while preserving original evidence widgets.
    const disclosures = make(article, 'div', undefined, 'desk-row-disclosures');
    const researchGroup = details(disclosures, 'Research Evidence', 'research-main-disclosure');
    const advancedGroup = details(disclosures, 'Advanced Analysis', 'research-main-disclosure');
    researchGroup.append(conditions, explanation, racingDisclosure, choiceDisclosure, evidence, tools);
    advancedGroup.append(prediction, seasonDisclosure, estimates, notes, matchView);
    return { node: article, watch, signals, meta, time, date, clock, title, status, conditions, prediction, methodConsensus, market, racingPanel, racingDisclosure, researchGroup, advancedGroup, seasonPanel, seasonDisclosure, choiceInformation, explanation, evidence, panel, buttons, check, modelPanel, notes, notesPanel, matchView, matchPanel, choices: new Map(), structural: '' };
  }
  function preferredStats(event) { return event?.stats?.h2h ? 'h2h' : Array.isArray(event?.stats?.recent) && event.stats.recent.length ? 'recent' : event?.stats?.rankings ? 'rankings' : 'sources'; }
  function patchCard(record, event) {
    for (const [tab, button] of record.buttons) { const available = tab === 'sources' || (tab === 'recent' ? Array.isArray(event.stats?.recent) && event.stats.recent.length > 0 : Boolean(event.stats?.[tab])); button.disabled = !available; button.title = available ? '' : 'Not supplied by the connected feed for this event'; }
    const state = store.get(), status = E.statusOf(event), selected = state.plan.slots[state.slot].legs;
    write(record.meta, (symbols[event.sport] || '') + ' ' + event.competition);
    const [date, clock] = dateText(event.startUTC).split(', ');
    write(record.date, date);
    write(record.clock, clock || '');
    record.time.dateTime = event.startUTC;
    write(record.title, event.name);
    record.watch.setAttribute('aria-label', 'Watch ' + event.name);
    write(record.status, status.label); record.status.className = 'event-status ' + (status.selectable ? 'is-current' : status.code === 'STARTED' ? '' : 'is-warning');
    const conditions = event.stats?.conditions; write(record.conditions, conditions ? [conditions.distance, conditions.going, conditions.raceClass && 'Class ' + conditions.raceClass].filter(Boolean).join(' · ') : event.choices[0]?.market || 'Research outcome');
    // Cross-sport v3 evidence signals: displayed independently from paper-slip selections.
    let evidencePanel=record.node.querySelector('.universal-evidence-v3');
    if(!evidencePanel){const disclosure=details(null,'Research signals and methodology','compact-evidence-disclosure');evidencePanel=make(disclosure,'section',undefined,'universal-evidence-v3');record.researchGroup.prepend(disclosure);}
    evidencePanel.replaceChildren();
    const evidenceTitle=make(evidencePanel,'strong','Evidence v3 · '+(sports[event.sport]||event.sport));
    // Show running event-level estimates separately from proposed research challengers.
    // No challenger probability is calculated or implied by this display.
    const methodRows=window.ValueWatchMethodologyStatus?.forEvent(event)||[];
    if(methodRows.length){
      const methodStrip=make(evidencePanel,'div',undefined,'methodology-comparison');
      methodStrip.style.cssText='margin:8px 0;display:flex;flex-wrap:wrap;gap:6px;';
      for(const method of methodRows){
        const item=make(methodStrip,'span',method.name+' · '+method.status.replaceAll('_',' '),'small');
        item.title=method.detail;
        item.style.cssText='padding:5px 8px;border:1px solid #52718b;border-radius:8px;background:#15293e;color:#c7e4f8;max-width:100%;overflow-wrap:anywhere;';
      }
    }
    const contenders=(event.choices||[]).filter(c=>evaluateEvidenceSafe(event,c).green==='PROVISIONAL');
    const favourite=contenders.length===1?contenders[0]:null;
    const badges=favourite?evaluateEvidenceSafe(event,favourite):null;
    const gates=(event.choices||[]).map(choice=>({choice,gate:evaluateEvidenceSafe(event,choice)}));
    const blueChoices=gates.filter(x=>['VERIFIED','EXPERIMENTAL'].includes(x.gate.blue)).map(x=>x.choice.label);
    const sourceTie=gates.some(x=>x.gate.sourceTie===true);
    const yellowChoices=gates.filter(x=>['MULTI_USER_CONSENSUS','EXPERIMENTAL_AGREEMENT'].includes(x.gate.yellow)).map(x=>x.choice.label);
    make(evidencePanel,'p','GREEN · '+(favourite?favourite.label+(badges.greenBasis==='PUBLISHER_BETTING_FORECAST'?' · Provisional publisher forecast':' · Provisional observed-price favourite'):'Not established')+'  |  BLUE · '+(blueChoices.join(', ')||(sourceTie?'No clear leader · tied support':'Not awarded'))+'  |  YELLOW · '+(yellowChoices.join(', ')||'Not awarded'),'small');
    make(evidencePanel,'small','Market favourite: '+(badges?.greenBasis==='BOOKMAKER_SOURCE_OBSERVATION' ?
      'provisional same-source observed price leader, not independently verified' :
      'not established from a complete current bookmaker market')+
      ' · Highest experimental model estimate is NOT a bookmaker favourite · Blue/Yellow remain experimental source signals.','muted');
    evidencePanel.style.cssText='padding:10px 12px;margin:10px 0;border:1px solid #52718b;border-radius:10px;background:#172b38;color:#f1f5f9';
    const communitySourcesOpen = Boolean(record.racingPanel.querySelector('.community-source-list')?.open);
    record.racingPanel.replaceChildren();
    // V3+ is model provenance only; it must never modify the selection decision.
    if(event.sport === 'racing') window.ValueWatchHorseV3Plus?.attach(record.racingPanel, 'racing', event.model);
    record.racingDisclosure.hidden = event.sport !== 'racing';
    record.racingPanel.hidden = event.sport !== 'racing';
    record.racingPanel.style.cssText = event.sport === 'racing' ? 'display:block;visibility:visible;opacity:1;height:auto;min-height:0;overflow:visible;padding:14px 16px;margin:14px 0;border:1px solid #52718b;border-radius:12px;background:#172b38;color:#f1f5f9;line-height:1.55' : 'display:none';
    if (event.sport === 'racing') {
      make(record.racingPanel, 'strong', 'Horse racing · odds and community research (separate signals)');
      const picks = racingHighlights(event);
      const communityTips = Array.isArray(event.communityTips) ? event.communityTips : [];
      // Show the actual picks first; keep the evidence and collector diagnostics collapsed.
      const green = picks.find(p => p.gate.green==='PROVISIONAL');
      const forecastCoverage=event.publisherForecastCoverage;
      const unavailableReason=event.publisherForecastStatus==='INCOMPLETE_FORECAST'
        ? 'Source forecast is incomplete'+(Number.isInteger(forecastCoverage?.priced)&&Number.isInteger(forecastCoverage?.active)?' ('+forecastCoverage.priced+' of '+forecastCoverage.active+' active runners priced)':'')+'. No full-field favourite established.'
        : event.publisherForecastStatus==='UNAVAILABLE'?'Publisher has not supplied a usable forecast for this race.'
        : event.publisherForecastStatus==='FIELD_UNCONFIRMED'?'Source runner field is not confirmed.'
        : 'No unique favourite from a complete, fresh source price or labelled publisher forecast.';
      const evaluations=(event.choices||[]).map(choice=>({choice,gate:evaluateEvidenceSafe(event,choice)}));
      const blue=evaluations.filter(item=>['VERIFIED','EXPERIMENTAL'].includes(item.gate.blue));
      const yellow=evaluations.filter(item=>['MULTI_USER_CONSENSUS','EXPERIMENTAL_AGREEMENT'].includes(item.gate.yellow));
      const summary = make(record.racingPanel,'div',undefined,'racing-colour-summary');
      summary.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));gap:8px;margin:12px 0';
      const signal=(colour,title,horse,detail)=>{
        const tile=make(summary,'div');
        tile.style.cssText='border:1px solid '+colour+';border-left:5px solid '+colour+';border-radius:9px;padding:10px;background:#112636';
        const heading=make(tile,'strong',title);heading.style.color=colour;
        make(tile,'div',horse,'small');make(tile,'small',detail,'muted');
      };
      signal('#b8ee79',green?.gate.greenBasis==='PUBLISHER_BETTING_FORECAST'?'GREEN · Forecast favourite':'GREEN · Odds favourite',green?.choice.label||'Unavailable for this race',green?.gate.marketBasis||unavailableReason);
      signal('#60a5fa','BLUE · Source leader',blue.length?blue.map(x=>x.choice.label).join(', '):(sourceTie?'No clear leader':'Not awarded'),blue.length?'Unique source leader · experimental / unverified':sourceTie?'Equal source support; no blue horse awarded':'No dated source selection matched');
      signal('#facc15','YELLOW · Agreement',yellow.length?yellow.map(x=>x.choice.label).join(', '):'Not awarded',yellow.length?'Unique source leader + price/forecast favourite · unverified':'Requires a unique source leader matching the price/forecast favourite');
      const communityPanel = window.CommunityEvidence?.render(record.racingPanel, communityEntries, event);
      if (communityPanel) communityPanel.querySelector('.community-source-list').open = communitySourcesOpen;
      const diagnostics=make(record.racingPanel,'details',undefined,'racing-audit-details');
      diagnostics.style.cssText='margin:12px 0;border:1px solid #49657b;border-radius:10px;padding:10px;background:#102431';
      make(diagnostics,'summary','Evidence audit & collector details');
      const audit = racingEvidenceAudit(event);
      make(diagnostics,'p','LAYER 1 · Market: '+(event.choices.some(c=>Number.isFinite(c.quote?.decimal))?'source prices observed; check freshness':'no usable observed prices')+'; never inferred from forums','small');
      make(diagnostics,'p','LAYER 2 · Press/tipsters: '+audit.pressCount+' distinct sourced publisher/tipster observations; verified press naps: UNKNOWN','small');
      make(diagnostics,'p','LAYER 3 · Forums: '+audit.forumCount+' distinct attributable backers; raw mentions: UNKNOWN; sentiment ratio: UNKNOWN','small');
      make(diagnostics,'p','Forum collection coverage: '+audit.coverage+(audit.failed?' · '+audit.failed+' failed sources in last run':' · completeness not established'),'small');
      if(audit.discrepancy)make(diagnostics,'p','DISCREPANCY: Publisher/tipster selection observed, but forum backing is UNVERIFIED/ABSENT in collected evidence.','small');
      make(diagnostics,'p','CONFIRMED CONVERGENCE: NOT ESTABLISHED · press-naps count and comprehensive forum evidence unavailable','small');
      make(diagnostics,'p','Community collector · '+communityHealth.configured+' configured sources · '+(communityHealth.lastRun ? 'last run '+new Date(communityHealth.lastRun).toLocaleString('en-GB') : 'not yet run')+' · '+communityHealth.errors.length+' reported errors','small');
      if(communityHealth.pipeline)make(diagnostics,'p','Community matching across the next 48 hours: '+communityHealth.pipeline.forum_items_scanned+' forum items scanned → '+communityHealth.pipeline.upcoming_forum_candidates+' race-matched candidates → '+communityHealth.pipeline.checked_primary_posts+' checked primary posts.','small');
      if(communityHealth.pipeline?.publisher_selections_matched)make(diagnostics,'p','Published selections matched to captured runners: '+communityHealth.pipeline.publisher_selections_matched+' · publisher opinions, not verified forum consensus.','small');
      for(const failure of communityHealth.errors)make(diagnostics,'p',(failure.publisher||'Community source')+' · '+(failure.error||'unavailable'),'small');
      if(communityHealth.racecardHealth?.status==='stale_or_no_upcoming_races')make(diagnostics,'p','Upstream racecard stale: no future races for matching.','small');
      if(communityHealth.sourceHealth?.length){
        const sourceDetails=make(diagnostics,'details');
        make(sourceDetails,'summary','Collector source health · '+communityHealth.sourceHealth.filter(x=>x.status==='fetched').length+' fetched / '+communityHealth.sourceHealth.length+' attempted');
        for(const item of communityHealth.sourceHealth){
          make(sourceDetails,'p',item.publisher+' · '+(item.status==='fetched'?(item.items_scanned||0)+' scanned; '+(item.explicit_tip_observations||0)+' experimental tips':item.error||'fetch failed'),'small');
        }
      }
      if(!communityTips.length)make(diagnostics,'p','No independently attributable community selection matched to this race; absence of collected evidence is not evidence of no support.','small');
      const directory=make(diagnostics,'a','Browse racing research source directory ↗','small');
      directory.href=new URL('racing-research/community-source-catalog.json',rootURL).href;
      directory.target='_blank';directory.rel='noopener noreferrer';
      directory.style.color='#93c5fd';
      if (communityTips.length) {
        // Display every independently attributed community candidate, including ties.
        // Source domains are counted once per horse; this is evidence, not a win probability.
        const grouped = new Map();
        for (const tip of communityTips) {
          const choice = event.choices.find(c => c.id === tip.choiceId);
          if (!choice) continue;
          const identity=window.ValueWatchEvidenceV3?.sourceIdentity?.(tip);
          if(!identity)continue;
          const entry = grouped.get(choice.id) || {choice, sources:new Set(), tips:[]};
          if (!entry.sources.has(identity)) entry.tips.push(tip);
          entry.sources.add(identity);
          grouped.set(choice.id,entry);
        }
        const ranked = [...grouped.values()].sort((a,b)=>b.sources.size-a.sources.size || a.choice.label.localeCompare(b.choice.label));
        if (ranked.length) {
          const section = make(record.racingPanel, 'div');
          section.style.cssText = 'margin:12px 0;padding:12px;border:1px solid #47647c;border-radius:12px;background:#132536';
          make(section, 'strong', 'Captured source selections · '+ranked.length+' horse'+(ranked.length===1?'':'s'));
          if (sourceTie) make(section,'p','Equal source support · no clear leader; no blue or yellow awarded.','small');
          for (const entry of ranked) {
            const row = make(section,'div');
            row.style.cssText='padding:9px 0;border-top:1px solid #36546b';
            const title=make(row,'strong',entry.choice.label+' · '+entry.sources.size+' attributed source'+(entry.sources.size===1?'':'s'));
            title.style.color='#93c5fd';
            for (const tip of entry.tips) {
              const link=make(row,'a',tip.publisher||new URL(tip.sourceUrl).hostname,'small');
              link.href=tip.sourceUrl;link.target='_blank';link.rel='noopener noreferrer';
              link.style.cssText='display:inline-block;margin:5px 12px 0 0;color:#a9d1ff;text-decoration:underline';
            }
          }
        }
      }
      if (!picks.length) make(record.racingPanel, 'p', 'Odds/form highlight unavailable · no unique sourced price favourite.', 'small');
      for (const pick of picks) {
        const item = make(record.racingPanel, 'div', undefined, 'racing-highlight-item'); item.style.cssText = 'display:block;padding:10px 0;border-top:1px solid #52718b;color:#f1f5f9';
        make(item, 'strong', pick.choice.label + ' · ' + pick.labels.join(' + '));
        make(item, 'p', pick.reasons.join(' · ') + ' · research only', 'small');
      }
    }
    const racingPicks = racingHighlights(event);
    const currentOdds = publishedOddsForEvent(event);
    record.node.dataset.sport = event.sport;
    const marketRow = event.sport !== 'racing';
    record.node.classList.toggle('desk-market-row', marketRow);
    const hasModelEstimate = Boolean(event.model && event.choices.some(choice => Number.isFinite(choice.probability)));
    const fixtureKey = event.sport === 'football' && event.league &&
      window.FootballMatchEvidence?.fixtureKey({
        league: event.league, home: event.participants[0]?.name, away: event.participants[1]?.name, kickoff_utc: event.startUTC
      });
    const comparisonModel = window.ValueWatchFootballMarketModels?.get(fixtureKey);
    const model = comparisonModel?.cutoff > Date.now() ? comparisonModel : null;
    const quickSignals = record.signals;
    quickSignals.replaceChildren(record.status);
    const displaySeason = event.apiSeasonComparison ?? event.seasonComparison;
    if (event.sport === 'football' && !event.international && (displaySeason || model || hasModelEstimate)) {
      if (displaySeason) {
        const {prob_home, prob_draw, prob_away} = displaySeason;
        make(quickSignals, 'span', 'This season (1 / X / 2) · ' +
          [prob_home, prob_draw, prob_away].map(pct).join(' / ') +
          (displaySeason.small_sample ? ' · Small sample' : '') +
          (event.apiSeasonComparison ? ' · Football data provided by the Football-Data.org API' : ''), 'compact-evidence-note');
      } else {
        make(quickSignals, 'span', 'Current-season venue comparison unavailable', 'compact-evidence-note');
      }
    }
    if (event.sport === 'racing') {
      const highlights = racingPicks.map(item => item.choice.label + ' · ' + item.labels.join(' + '));
      make(quickSignals, 'span', highlights.length ? 'Experimental signals: ' + highlights.join('; ') : 'No confirmed research signal', 'compact-signal-pill');
    } else if(currentOdds) {
      make(quickSignals,'span','Sky Bet · observed '+dateText(new Date(currentOdds.observed).toISOString())+' UK','compact-signal-pill live-price-pill');
    }
    if (event.sport === 'football') {
      const comparison = displaySeason;
      const probabilities = comparison
        ? [comparison.prob_home, comparison.prob_draw, comparison.prob_away]
        : event.choices.map(choice => choice.probability);
      const preview = window.ResearchAudit.footballMarginPreview(probabilities, comparison?.method ?? event.model?.name);
      if (preview) make(quickSignals, 'span', preview, 'compact-evidence-note');
    }
    if (marketRow && (model || hasModelEstimate)) make(quickSignals, 'span', 'Model unvalidated', 'compact-evidence-note');
    if (marketRow && (currentOdds || model || hasModelEstimate)) make(quickSignals, 'span', 'EV withheld', 'compact-evidence-note');
    const review = E.footballEvidenceReview(event);
    record.market.classList.toggle('desk-three-way',event.sport==='football'&&event.choices.length===3);
    const leaders = E.modelLeaders(event);
    const methodSignal = status.selectable ? ValueWatchMethodStars.evaluate(event, {
      selected: selectedMethods,
      leaderId: leaders.find(leader=>leader.rank===1)?.id ?? null,
      reliability: selectedMethods.includes('reliability') ? currentHistoryStatus(event) : null,
      hybrid: selectedMethods.includes('hybrid') && hybridEvidence && !hybridEvidence.pending &&
        Date.now()-hybridEvidence.at<60000 ? hybridResult(event,hybridEvidence) : null
    }) : {byChoice:{},overlaps:[]};
    record.methodConsensus.replaceChildren();
    for(const overlap of methodSignal.overlaps){
      const title = event.choices.find(choice=>choice.id===overlap.choice)?.label || overlap.choice;
      const names = overlap.methods.map(id=>ValueWatchMethodStars.byId.get(id)?.name||id);
      const chip=make(record.methodConsensus,'span','★ '+overlap.methods.length+' methods favour '+title+' · directional overlap only','method-agreement-chip');
      chip.title=names.join(' + ')+' · UNVALIDATED; may share data and modelling assumptions';
      chip.setAttribute('aria-label',names.join(' and ')+' indicate the same '+title+' direction; not independently validated');
    }
    record.methodConsensus.hidden=!methodSignal.overlaps.length;
    const ordered = event.sport === 'racing' ? [...leaders.map(leader => event.choices.find(choice => choice.id === leader.id)), ...event.choices.filter(choice => !leaders.some(leader => leader.id === choice.id))] : event.choices;
    const structural = JSON.stringify([status.code === 'STARTED',event.futureScheduleOnly,event.provisionalEntry, ordered.map(choice => [choice.id, choice.label]), leaders.map(leader => leader.id), racingPicks.map(pick => pick.choice.id)]);
    if (record.structural !== structural) {
      record.structural = structural; record.market.replaceChildren(); record.choices.clear();
      if (event.futureScheduleOnly) {
        make(record.market,'span','Scheduled race · source entries may be listed; final declarations and prices unverified · paper selections disabled','archived-status');
        if(event.choices.some(choice=>!choice.id.startsWith('awaiting-'))){
          const entries=make(record.market,'details',undefined,'source-entries');
          make(entries,'summary',event.choices.length+' source-observed active entries · final field unverified');
          for(const choice of event.choices){
            const pick=racingPicks.find(p=>p.choice.id===choice.id),line=make(entries,'p',choice.label+(pick?' · '+pick.labels.join(' + '):''),'small');
            line.dataset.evidenceGreen=String(pick?.gate.green==='PROVISIONAL');
            line.dataset.evidenceBlue=String(['VERIFIED','EXPERIMENTAL'].includes(pick?.gate.blue));
            line.dataset.evidenceYellow=String(['MULTI_USER_CONSENSUS','EXPERIMENTAL_AGREEMENT'].includes(pick?.gate.yellow));
            if(pick){line.classList.add('is-racing-highlight');line.style.cssText='border-left:3px solid #60a5fa;padding:8px;color:#bfdbfe';}
          }
        }
      }
      else if (status.code === 'STARTED') make(record.market, 'span', event.score?.label ? 'Recorded final: ' + event.score.label : 'Event has started or finished · additions closed', 'archived-status');
      else {
        if(event.provisionalEntry)make(record.market,'p','Provisional entries · final declarations and prices unverified.','provisional-entry-note small');
        const shown = ordered; // All participants visible for comparison across all sports.
        const append = (parent, choice) => { const b = button(parent, '', () => select(event.id, choice.id), 'selection-button'); b.dataset.choiceId = choice.id; const modelBadge = make(b, 'span', '', 'model-pick-badge'), name = make(b, 'span', choice.label, 'selection-name'), price = make(b, 'strong', '—', 'selection-price'), methodStars = make(b, 'span', undefined, 'method-star-row'), caption = make(b, 'small', '', 'selection-caption'), method = make(b, 'small', '', 'selection-methodology'), odds = make(b, 'small', '', 'selection-odds'), comparison = make(b, 'small', '', 'desk-market-comparison'); record.choices.set(choice.id, { element: b, modelBadge, name, price, methodStars, caption, method, odds, comparison, previous: null }); };
        for (const choice of shown) append(record.market, choice);
        if (shown.length < event.choices.length) { const rest = details(record.market, 'Show all ' + event.choices.length + ' runners', 'runner-disclosure'); const grid = make(rest, 'div', undefined, 'market-grid'); for (const choice of ordered.slice(shown.length)) append(grid, choice); }
      }
    }
    const emptyMarket = marketRow && record.choices.size > 0 && !currentOdds && !model && !hasModelEstimate &&
      !event.choices.some(choice => Number.isFinite(choice.quote?.decimal) || Number.isFinite(choice.forecastPrice?.decimal));
    record.market.classList.toggle('desk-market-empty', emptyMarket);
    const note = record.market.querySelector('.desk-market-note');
    if (emptyMarket && !note) record.market.prepend(make(null, 'p', 'No verified prices or model estimates', 'desk-market-note'));
    else if (!emptyMarket) note?.remove();
    if (marketRow && !currentOdds && !emptyMarket && record.choices.size)
      make(quickSignals, 'span', 'No verified price', 'compact-evidence-note');
    const compactRunners = event.sport === 'racing' && record.choices.size > 0 &&
      event.choices.every(choice => !Number.isFinite(choice.probability) &&
        !Number.isFinite(choice.quote?.decimal) && !Number.isFinite(choice.forecastPrice?.decimal));
    record.market.classList.toggle('runner-list-compact', compactRunners);
    const marketHeading = record.market.querySelector('.runner-list-heading');
    if (!compactRunners) marketHeading?.remove();
    else if (!marketHeading) {
      const heading = make(null, 'p', 'Runner list · estimates and prices unavailable', 'runner-list-heading small');
      record.market.prepend(heading);
    }
    for (const choice of event.choices) {
      const view = record.choices.get(choice.id); if (!view) continue;
      const chosen = selected.some(leg => leg.eventId === event.id && leg.choiceId === choice.id);
      const livePrice=currentOdds?.prices?.[choice.id],hasLivePrice=Number.isFinite(livePrice)&&livePrice>1;
      const quote=hasLivePrice?{decimal:livePrice}:choice.quote;
      const priced = typeof quote?.decimal === 'number', publishedForecast=typeof choice.forecastPrice?.decimal==='number';
      const estimated = event.model && typeof choice.probability === 'number';
      const contextWeight = event.model?.probabilityKind === 'EXPERIMENTAL_CONTEXT_WEIGHT';
      const acceptedProbability = model?.outcomes.find(outcome => outcome.id === choice.id)?.probability;
      const probability = acceptedProbability ?? (estimated && !contextWeight ? choice.probability : null);
      const estimateBasis = event.sport === 'football'
        ? window.ResearchAudit.footballEstimateBasis(acceptedProbability != null ? model.name : event.model?.name)
        : 'Model estimate';
      const fair = acceptedProbability > 0 ? (1 / acceptedProbability).toFixed(2) : '';
      const unavailableEstimate=!estimated&&!priced&&!publishedForecast&&acceptedProbability==null;
      const value = hasLivePrice ? livePrice.toFixed(2) : acceptedProbability != null ? pct(acceptedProbability) : estimated ? pct(choice.probability) : priced ? quote.decimal.toFixed(2) : publishedForecast?'Forecast '+choice.forecastPrice.decimal.toFixed(2):'—';
      view.element.classList.toggle('is-unpriced',unavailableEstimate);
      view.element.classList.toggle('has-matched-price',hasLivePrice);
      write(view.price, compactRunners ? '' : value); view.price.hidden = !view.price.textContent; view.caption.hidden = compactRunners && !chosen; write(view.caption, (chosen ? 'IN THIS SLIP · ' : '') + (event.provisionalEntry?'PROVISIONAL PAPER CHOICE':hasLivePrice ? 'Sky Bet price' : estimated ? contextWeight ? 'Context weight' : estimateBasis : priced ? 'SOURCE ODDS · UNVERIFIED' : publishedForecast?'PUBLISHER FORECAST · NOT BOOKMAKER ODDS':marketRow?'':'Model unavailable'));
      if (marketRow) {
        const comparison = [hasLivePrice && probability != null ? pct(probability) + ' · ' + estimateBasis : '', fair ? 'Fair ' + fair : ''].filter(Boolean);
        write(view.comparison, comparison.join(' · '));
        view.comparison.title = comparison.length && model ? model.name + ' · UNVALIDATED' : '';
        if (!hasLivePrice && acceptedProbability != null) write(view.caption, (chosen ? 'IN THIS SLIP · ' : '') + estimateBasis);
      }
      write(view.odds, hasLivePrice ? 'Sky Bet '+livePrice.toFixed(2)+' · observed '+dateText(new Date(currentOdds.observed).toISOString())+' UK · checked '+dateText(new Date(currentOdds.checked).toISOString())+' UK · EV withheld' : priced ? estimated ? 'Source odds ' + quote.decimal.toFixed(2) + ' · unverified' : 'Bookmaker observation · unverified' : publishedForecast?'Publisher forecast · not bookmaker odds':'No matched bookmaker price in this snapshot');
      write(view.method, event.model?.name ? 'Method: ' + event.model.name + ' · UNVALIDATED' + (contextWeight ? ' · context weight, not win probability' : '') : 'Method: unavailable · no validated forecast');
      const leader = leaders.find(leader => leader.id === choice.id);
      const racingPick = event.sport === 'racing' ? racingPicks.find(pick => pick.choice.id === choice.id) : null;
      view.element.dataset.evidenceGreen=String(racingPick?.gate.green==='PROVISIONAL');
      view.element.dataset.evidenceBlue=String(['VERIFIED','EXPERIMENTAL'].includes(racingPick?.gate.blue));
      view.element.dataset.evidenceYellow=String(['MULTI_USER_CONSENSUS','EXPERIMENTAL_AGREEMENT'].includes(racingPick?.gate.yellow));
      view.modelBadge.hidden = marketRow || (!leader && !racingPick);
      write(view.modelBadge, racingPick ? racingPick.labels.join(' + ').toUpperCase() : leader?.rank === 1 ? 'MODEL FIRST CHOICE' : 'MODEL ALTERNATIVE');
      // Explicit high-contrast styling survives disabled-button and mobile theme rules.
      view.element.classList.toggle('is-racing-highlight', Boolean(racingPick));
      const hasCommunity = ['VERIFIED','EXPERIMENTAL'].includes(racingPick?.gate.blue);
      const agreement = ['MULTI_USER_CONSENSUS','EXPERIMENTAL_AGREEMENT'].includes(racingPick?.gate.yellow);
      const borderColour = agreement ? '#facc15' : hasCommunity ? '#60a5fa' : '#b8ee79';
      view.element.style.setProperty('border', racingPick ? '3px solid '+borderColour : '', racingPick ? 'important' : '');
      view.element.style.setProperty('box-shadow', agreement ? '0 0 0 2px rgba(250,204,21,.24), inset 0 0 0 1px #fde68a' : '', agreement ? 'important' : '');
      view.element.style.setProperty('background-color', racingPick ? agreement ? '#433b20' : hasCommunity ? '#1c3049' : '#203b36' : '', racingPick ? 'important' : '');
      view.element.style.setProperty('color', racingPick ? '#f4ffe8' : '', racingPick ? 'important' : '');
      view.element.style.setProperty('opacity', racingPick ? '1' : '', racingPick ? 'important' : '');
      view.name.textContent = racingPick ? '★ ' + choice.label : event.sport === 'football' ?
        ({ home: 'Home', draw: 'Draw', away: 'Away' }[choice.id] || choice.label) : choice.label;
      view.name.style.setProperty('color', racingPick ? agreement ? '#fef08a' : hasCommunity ? '#bfdbfe' : '#e1ffae' : '', racingPick ? 'important' : '');
      view.modelBadge.style.setProperty('display', !view.modelBadge.hidden ? 'block' : 'none', 'important');
      if (racingPick) view.modelBadge.textContent = agreement ? '🟡 EXPERIMENTAL AGREEMENT · PRICE/FORECAST + SOURCE' : racingPick.labels.join(' + ').toUpperCase();
      view.modelBadge.style.setProperty('color', racingPick ? agreement ? '#fef08a' : hasCommunity ? '#bfdbfe' : '#e1ffae' : '', racingPick ? 'important' : '');
      view.element.classList.toggle('is-model-first', leader?.rank === 1); view.element.classList.toggle('is-model-alternative', leader?.rank === 2);
      view.element.classList.toggle('is-selected', chosen); view.element.setAttribute('aria-pressed', String(chosen)); view.element.disabled = !status.selectable;
      const metric = hasLivePrice ? value + ' Sky Bet observed price' : acceptedProbability != null ? value + ' model estimate' : contextWeight ? value + ' context weight' : estimated ? value + ' model estimate' :
        priced ? value + ' source odds' : publishedForecast ? value + ' publisher forecast' : 'estimate unavailable';
      view.element.setAttribute('aria-label', choice.label + ' · ' + (leader ? leader.rank === 1 ? 'model first choice · ' : 'model alternative · ' : '') + metric + (view.comparison.textContent ? ' · ' + view.comparison.textContent : '') + ' · ' + (status.selectable ? (chosen ? 'remove from ' : 'add to ') + state.plan.slots[state.slot].name : 'paper selection unavailable'));
      const priceSource = hasLivePrice ? 'matched-sky-bet' : choice.quote?.source;
      if (!priced || view.previousSource !== priceSource) view.element.classList.remove('odds-up', 'odds-down');
      else if (view.previous !== null && view.previous !== quote.decimal) {
        view.element.classList.remove('odds-up', 'odds-down');
        view.element.classList.add(quote.decimal > view.previous ? 'odds-up' : 'odds-down');
      }
      view.previous = priced ? quote.decimal : null;
      view.previousSource = priceSource;
      const starring=methodSignal.byChoice[choice.id]||[];
      view.methodStars.replaceChildren();
      for(const m of starring){
        const star=make(view.methodStars,'span','★','method-direction-star');
        star.dataset.methodStar=m.id;
        star.title=m.name+' · experimental direction only; not a verified betting edge';
        star.setAttribute('aria-label',m.name+' research direction');
      }
      if(starring.length>1){
        const agreement=make(view.methodStars,'span',starring.length+' methods align','method-direction-alignment');
        agreement.title='Same outcome direction only; these methods may use shared evidence and are not independent endorsements';
      }
      view.methodStars.hidden=!starring.length;
    }
    // Preserve detailed per-choice source information in an expandable panel rather than repeating it on every card.
    record.choiceInformation.replaceChildren();
    for (const choice of event.choices) {
      const row = make(record.choiceInformation, 'div', undefined, 'compact-choice-info-row');
      make(row, 'strong', choice.label);
      const matchedPrice = currentOdds?.prices?.[choice.id];
      make(row, 'p', Number.isFinite(matchedPrice) ? 'Sky Bet '+matchedPrice.toFixed(2)+' via The Odds API · checked '+dateText(new Date(currentOdds.checked).toISOString())+' UK · EV withheld' : Number.isFinite(choice.quote?.decimal) ? 'Source-observed odds: ' + choice.quote.decimal.toFixed(2) + ' · unverified' : Number.isFinite(choice.forecastPrice?.decimal) ? 'Publisher forecast: ' + choice.forecastPrice.decimal.toFixed(2) + ' · not bookmaker odds' : 'No source-observed bookmaker odds', 'small');
      const assessment = E.candidateAssessment(event, choice.id);
      make(row, 'p', assessment.label + ' · ' + assessment.blockers[0], 'small');
      make(row, 'p', event.model?.name ? 'Method: ' + event.model.name + ' · UNVALIDATED' : 'Method unavailable · ' + (event.unavailableReason || 'no supported estimate'), 'small');
    }
    const comparison = event.sport === 'football' ? event.seasonComparison : null;
    const signature = JSON.stringify([event.sport,event.international,event.internationalAnalysis,comparison,event.seasonForm,event.choices.map(choice=>choice.label)]);
    if (record.seasonPanel.dataset.signature !== signature) {
      record.seasonPanel.dataset.signature = signature;
      record.seasonPanel.replaceChildren();
      if (event.sport === 'football' && event.international) {
        const analysis=event.internationalAnalysis;
        make(record.seasonPanel,'strong','International teams · recent captured results','season-heading');
        make(record.seasonPanel,'p','Separate national-team analysis · up to 10 captured regulation-time results per team within 365 days. Coverage is partial.','small');
        if(analysis){
          for(const [side,index] of [['home',0],['away',2]]){
            const rows=Array.isArray(analysis[side+'_sample'])?analysis[side+'_sample']:[];
            const box=details(record.seasonPanel,(event.choices[index]?.label||side)+' · '+rows.length+' captured matches · '+rows.map(r=>r.result).join(' '));
            for(const row of rows){
              const line=make(box,'p',String(row.date).slice(0,10)+' · '+row.result+' · '+row.goals_for+'–'+row.goals_against+' vs '+row.opponent,'small');
              if(/^https:\/\/site\.api\.espn\.com\//.test(row.source_receipt?.url||'')){const link=make(line,'a',' Source result');link.href=row.source_receipt.url;link.target='_blank';link.rel='noopener noreferrer';}
            }
          }
          make(record.seasonPanel,'p',analysis.status==='EXPERIMENTAL_COMPARISON_AVAILABLE'?'Experimental scoring comparison shown above; minimum five results per team. No opponent-strength, squad or venue adjustment. Friendlies and competitive games combined. UNVALIDATED; no verified betting value.':'Comparison unavailable: fewer than five captured regulation results for at least one team. No estimate invented.','small');
        }else make(record.seasonPanel,'p','International result analysis has not been captured for this fixture yet.','small');
      } else if (event.sport === 'football') {
        const seasonText = comparison && /^\d{4}$/.test(comparison.season) ? '20'+comparison.season.slice(0,2)+'/20'+comparison.season.slice(2) : 'current season';
        make(record.seasonPanel,'strong','This season only · '+seasonText,'season-heading');
        const maturity=E.footballSeasonMaturity(event);
        if(maturity){
          const audit=details(record.seasonPanel,'Current-season sample maturity · football only','football-maturity-details');
          make(audit,'p','5–7 matches is a research checkpoint, not an automatic improvement or betting advantage.', 'small');
          for(const note of maturity.notes) make(audit,'p',note,'small');
          if (maturity.status === 'SOURCE_OBSERVED' && Array.isArray(maturity.sourceReceipts)) {
            const sourcePanel=details(audit,'Current-season form source receipts','football-form-sources');
            for(const receipt of maturity.sourceReceipts) {
              const row=make(sourcePanel,'p',undefined,'small');
              link(row,'Completed league results source',receipt.url);
              make(row,'span',' · observed '+dateText(receipt.observed_at_utc),'small');
            }
          }
        }
        if (comparison) {
          const summary = make(record.seasonPanel,'div',undefined,'season-probabilities');
          const labels = [event.choices[0]?.label || 'Home','Draw',event.choices[2]?.label || 'Away'];
          [comparison.prob_home,comparison.prob_draw,comparison.prob_away].forEach((probability,index)=>{
            const cell = make(summary,'div',undefined,'season-probability');
            make(cell,'span',labels[index],'season-label');
            make(cell,'strong',pct(probability),'season-value');
          });
          make(record.seasonPanel,'p','Based only on completed current-season league matches · home venue sample '+comparison.home_venue_matches+' · away venue sample '+comparison.away_venue_matches+'. '+(comparison.small_sample?'SMALL SAMPLE · ':'')+'Unvalidated model comparison, not bookmaker odds or verified value.','small');
        } else {
          make(record.seasonPanel,'p','Current-season-only estimate unavailable: insufficient verified current-season scoring data for both teams, or feed not yet updated. No figures invented.','small');
        }
      }
    }
    if (record.matchView.open) renderMatchOverview(record.matchPanel, event);
    record.prediction.hidden = !event.model && event.sport !== 'racing';
    write(record.prediction, event.racecardConflict ? 'Racecard conflict: competing listings have overlapping runners. Selection is paused until the active racecard can be confirmed.' : leaders.length ? leaders.map(leader => (leader.rank === 1 ? 'Model first choice: ' : 'Alternative: ') + event.choices.find(choice => choice.id === leader.id).label).join(' · ') + (event.model.probabilityKind === 'EXPERIMENTAL_CONTEXT_WEIGHT' ? ' · experimental form ranking, not calibrated win chances' : ' · experimental model ranking') + (review?.notes.length ? ' · EVIDENCE REVIEW REQUIRED — model ranking is NOT a betting recommendation' : '') : event.model ? 'Model estimates are tied or no longer current; no distinct current first choice.' : event.provisionalEntry ? 'Model estimate pending confirmed runners.' : 'No model selection: ' + (event.predictionStatus?.label || 'Model inputs unavailable.'));
    record.prediction.classList.toggle('evidence-review-required', Boolean(review?.notes.length));
    const notes = state.claims.filter(note => note.eventId === event.id);
    record.notes.hidden = !notes.length;
    const noteSignature = JSON.stringify(notes);
    if (record.notesPanel.dataset.signature !== noteSignature) {
      record.notesPanel.dataset.signature = noteSignature; record.notesPanel.replaceChildren();
      for (const note of notes) showNote(record.notesPanel, note);
    }
    record.check.hidden = event.sport === 'rugby';
    if (!record.check.hidden) record.check.href = C.eventLink(event, 'www.oddschecker.com') || C.oddschecker(event.sport);
    record.check.title = 'Opens Oddschecker. Match the event, date, market and Sky Bet column; no price is imported.';
    const modelSignature = JSON.stringify([event.model, review, event.choices.map(choice => [choice.label, choice.probability])]);
    if (record.modelPanel.dataset.signature !== modelSignature) {
      record.modelPanel.dataset.signature = modelSignature; record.modelPanel.replaceChildren();
      if (event.model) for (const choice of event.choices) {
        const row = make(record.modelPanel, 'div', undefined, 'stat-row'); make(row, 'span', choice.label); make(row, 'strong', pct(choice.probability));
      }
      if (review?.notes.length) { const heading = make(record.modelPanel, 'strong', 'Evidence review required — model ranking is not a recommendation'); heading.classList.add('evidence-review-heading'); for (const note of review.notes) make(record.modelPanel, 'p', '• ' + note, 'small'); make(record.modelPanel, 'p', 'No verified Sky Bet price or validated expected value is connected. Do not infer a betting edge from this ranking.', 'small'); }
      if (event.model?.limitation) make(record.modelPanel, 'p', event.model.limitation, 'small');
      if (event.model?.recordHash) make(record.modelPanel, 'code', event.model.recordHash, 'source-digest');
      make(record.modelPanel, 'p', event.model ? 'Model ' + event.model.name + ' · UNVALIDATED · uncertainty unquantified. Percentages are estimates, not prices or verified value.' : 'No supported model estimate supplied.', 'small');
    }
    write(record.explanation, event.model ? event.model.probabilityKind === 'EXPERIMENTAL_CONTEXT_WEIGHT' ? 'Experimental context weights · not calibrated win probabilities · no verified EV' : 'Experimental estimate · uncertainty unquantified · no verified EV' : event.sources.some(source => source.url) ? 'Source-observed event · no supported model estimate' : 'Paper hypothesis · event-level receipt unavailable');
  }
  async function loadStats(id, tab, panel, buttons) {
    statsRequests.get(id)?.abort(); const controller = new AbortController(); statsRequests.set(id, controller);
    for (const [name, b] of buttons) { b.classList.toggle('active', name === tab); b.setAttribute('aria-pressed', String(name === tab)); }
    panel.dataset.loaded = tab; panel.dataset.pending = 'true'; panel.replaceChildren(); make(panel, 'p', 'Loading source-backed research…', 'muted');
    const event = store.get().events.find(event => event.id === id); if (!event) return;
    try {
      const result = await statistics.load({ eventId: id, sport: event.sport_type, season: day(event.startUTC).slice(0, 4), source: event.observedAt, tab }, { signal: controller.signal });
      if (controller.signal.aborted || statsRequests.get(id) !== controller) return; panel.dataset.pending = 'false'; panel.replaceChildren();
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
  function renderMatchOverview(panel, event) {
    if (!event) return;
    const signature = JSON.stringify([event.id, event.score, E.statusOf(event).code, event.observedAt]);
    if (panel.dataset.signature === signature) return; panel.dataset.signature = signature; panel.replaceChildren();
    make(panel, 'p', event.participants.map(item => item.name).join(' vs '), 'match-participants');
    const ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg'); svg.setAttribute('viewBox', '0 0 600 260'); svg.setAttribute('class', 'sport-diagram'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', sports[event.sport] + ' schematic. No player, ball or runner positions are available.');
    const draw = (tag, attributes) => { const node = document.createElementNS(ns, tag); for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value); svg.append(node); return node; };
    draw('rect', { x: 20, y: 20, width: 560, height: 220, rx: event.sport === 'racing' ? 100 : 2, fill: '#142c29', stroke: '#8db6a4', 'stroke-width': 2 });
    if (event.sport === 'football') { draw('line', {x1:300,y1:20,x2:300,y2:240,stroke:'#8db6a4'}); draw('circle',{cx:300,cy:130,r:35,fill:'none',stroke:'#8db6a4'}); for (const x of [20,510]) draw('rect',{x,y:75,width:70,height:110,fill:'none',stroke:'#8db6a4'}); }
    if (event.sport === 'tennis') { draw('line',{x1:300,y1:20,x2:300,y2:240,stroke:'#edf3fc','stroke-width':3}); for (const y of [48,212]) draw('line',{x1:20,y1:y,x2:580,y2:y,stroke:'#8db6a4'}); for (const x of [165,435]) draw('line',{x1:x,y1:48,x2:x,y2:212,stroke:'#8db6a4'}); draw('line',{x1:165,y1:130,x2:435,y2:130,stroke:'#8db6a4'}); }
    if (event.sport === 'nfl') for(let x=70;x<580;x+=46) draw('line',{x1:x,y1:20,x2:x,y2:240,stroke:'#8db6a4','stroke-dasharray':'5 5'});
    if (event.sport === 'racing') { draw('rect',{x:60,y:60,width:480,height:140,rx:70,fill:'none',stroke:'#8db6a4'}); draw('line',{x1:300,y1:20,x2:300,y2:60,stroke:'#edf3fc','stroke-width':4}); }
    panel.append(svg);
    make(panel, 'strong', event.score?.label ? 'Source-backed final · ' + event.score.label : 'Scheduled ' + dateText(event.startUTC) + ' · score not supplied', 'match-score');
    make(panel, 'p', '2D schematic only. Live action and positions are not connected. Snapshot observed ' + dateText(event.observedAt) + '.', 'small');
    if (event.score) provenance(panel, event.score.sources);
  }
  let racingCandidatesRequested=false;
  function renderRacingCandidates(){
    const panel=$('racing-candidates');if(!panel)return;
    panel.hidden=!racingCandidatesRequested;if(panel.hidden)return;
    panel.replaceChildren();const state=store.get();
    const rows=E.racingCandidates(state.events,state.plan.from,state.plan.to,window.ValueWatchEvidenceV3?.evaluate);
    make(panel,'h3',rows.length+' of 4 racing research candidates');
    make(panel,'p',state.plan.from+' → '+state.plan.to+' · selected dates, all racing competitions. Ranked by agreement, then source leader, then favourite; ties use race time. One horse per race. Experimental evidence ranking, not best bets or verified value.','small');
    if(!rows.length)make(panel,'p','No eligible candidates. Fresh racecards and a qualifying source or favourite signal are required. Refresh loads the latest published snapshot; no selections are invented.','small');
    for(const row of rows){
      const item=make(panel,'div',undefined,'research-row');make(item,'strong',row.choice.label+' · '+row.event.competition+' · '+dateText(row.event.startUTC));
      make(item,'p',row.reasons.join(' · ')+(row.event.provisionalEntry?' · Final declarations unverified':''),'small');
      const selected=state.plan.slots[state.slot].legs.some(leg=>leg.eventId===row.event.id&&leg.choiceId===row.choice.id);
      const add=button(item,selected?'In current paper slip':'Choose for current paper slip',()=>select(row.event.id,row.choice.id));add.disabled=selected;
    }
  }
  function renderPaperEligibilityAudit() {
    const section = $('paper-eligibility-audit'), target = $('paper-eligibility-breakdown');
    if (!section || !target) return;
    const state = store.get();
    const rows = E.paperEligibilityAudit(state.plan, state.events);
    const available = rows.reduce((n, row) => n + row.eligible, 0);
    const summary = section.querySelector('summary');
    if (summary) write(summary, 'Why do slips favour one sport? · ' + available + ' eligible across ' + rows.length + ' sports');
    target.replaceChildren();
    make(target, 'p', 'For ' + state.plan.from + ' to ' + state.plan.to +
      ' · all loaded sports regardless of the event filter. Eligibility is not positive expected value or a recommendation.', 'small');
    for (const row of rows) {
      const panel = make(target, 'div', undefined, 'paper-audit-sport');
      const headline = make(panel, 'p');
      make(headline, 'strong', (symbols[row.sport] || '') + ' ' + sports[row.sport] + ': ');
      make(headline, 'span', row.eligible + ' eligible · ' + row.excluded + ' excluded · ' + row.selected + ' saved slip legs');
      if (row.eligible) {
        const top = details(panel, 'Top evidence candidates (descriptive)');
        for (const item of row.top) make(top, 'p',
          item.event + ' · score ' + item.evidence + ' · ' + dateText(item.startUTC) +
          (item.communityExperimental ? ' · community research signal' : ''), 'small');
      }
      if (row.excluded) {
        const reasons = details(panel, 'Exclusion reasons');
        for (const [reason, count] of Object.entries(row.reasons)) make(reasons, 'p', count + ' × ' + reason, 'small');
      }
    }
    make(target, 'p', 'Best Evidence, Balanced and Longshot rank by descriptive evidence coverage, rotating between eligible sports only when source-evidence scores are equal. ' +
      'Cross-Sport Explorer rotates through sports that actually qualify. Existing saved selections are never overwritten. ' +
      'No odds, expected value or model calibration is verified here.', 'small');
  }
  const fixtureLabs = {
    darts: { name:'Darts', feed:'darts/feed.json' },
    rugby: { name:'Rugby', feed:'rugby-research-data.json' }
  };
  const fixtureSnapshots = new Map();
  let fixtureMarketRequest;
  const fixtureBase = new URL(location.pathname.endsWith('/paper-lab/') || location.pathname.endsWith('/paper-lab/index.html') ? '../' : './', location.href);
  async function fetchFixtureSource(url, format) {
    const response = await fetch(url, {cache:'no-store', signal:AbortSignal.timeout(10000)});
    if (!response.ok) throw Error('Source unavailable');
    return response[format]();
  }
  function loadFixtureSnapshot(sport) {
    let snapshot = fixtureSnapshots.get(sport);
    if (!snapshot) {
      snapshot = {loading:true};
      const request = snapshot;
      fixtureSnapshots.set(sport, request);
      Promise.allSettled([
        fetchFixtureSource(new URL(fixtureLabs[sport].feed, fixtureBase), 'json'),
        fetchFixtureSource(new URL(sport + '/', fixtureBase), 'text'),
        fetchFixtureSource(new URL(sport === 'darts' ? 'darts/analysis.json' : 'rugby/pro-d2-results.json', fixtureBase), 'json'),
        fixtureMarketRequest ||= fetchFixtureSource(new URL('paper-lab/fixture-market-evidence.json', fixtureBase), 'json')
      ]).then(([feed, official, analysis, markets]) => {
        const doc = feed.status === 'fulfilled' ? feed.value : null;
        const officialDoc = official.status === 'fulfilled'
          ? new DOMParser().parseFromString(official.value, 'text/html') : null;
        const officialRows = [...(officialDoc?.querySelectorAll('#official-snapshot [data-desk-date]') || [])]
          .map(row => ({date:row.dataset.deskDate,
            participants:row.textContent.trim().split(' · ')[0].split(' vs '),
            competition:row.dataset.deskCompetition,
            session:row.dataset.deskSession,
            start:row.dataset.deskStart,
            venue:row.dataset.deskVenue,
            venueZone:row.dataset.deskZone,
            code:row.dataset.deskCode,
            sources:[...(row.querySelectorAll('a[href]').length ? row.querySelectorAll('a[href]') : officialDoc.querySelectorAll('#official-snapshot a[href]'))].map(a => a.getAttribute('href'))}));
        const evidence = ResearchFixtureEvidence.normalize(sport, doc, officialRows, Date.now(), analysis.status === 'fulfilled' ? analysis.value : null, markets.status === 'fulfilled' ? markets.value : null);
        if (fixtureSnapshots.get(sport) === request) {
          fixtureSnapshots.set(sport, {...evidence, usable:evidence.current,
            hasOfficial:Boolean(officialDoc?.querySelector('#official-snapshot'))});
        }
      }).catch(() => {
        if (fixtureSnapshots.get(sport) === request) fixtureSnapshots.set(sport, {fixtures:[], usable:false, hasOfficial:false});
      }).finally(() => safely(() => {
        renderNavigation();
        renderEvents();
      }));
    }
    return snapshot;
  }
  function matchingFixtures(snapshot, state) {
    return ResearchFixtureEvidence.matching(snapshot, state);
  }
  function renderFixtureCounts(state) {
    let total = 0;
    for (const sport of Object.keys(fixtureLabs)) {
      const snapshot = loadFixtureSnapshot(sport);
      const available = snapshot.usable || snapshot.hasOfficial;
      const count = snapshot.loading ? '…' : available ? matchingFixtures(snapshot, state).length : '—';
      if (Number.isInteger(count)) total += count;
      const status = snapshot.loading ? 'Loading fixtures' : available ? count + ' fixtures in selected view' : 'Fixture sources unavailable';
      document.querySelectorAll('[data-count="' + sport + '"]').forEach(badge => {
        write(badge, count);
        badge.title = status;
        badge.setAttribute('aria-label', status);
      });
    }
    return total;
  }
  function renderFixtureLab(root, state, sport = state.sport) {
    const lab = fixtureLabs[sport], snapshot = loadFixtureSnapshot(sport);
    const panel = make(root, 'section', undefined, 'fixture-events');
    panel.dataset.fixtureSport = sport;
    const heading = make(panel, 'div', undefined, 'fixture-coverage');
    make(heading, 'h3', lab.name + ' events');
    if (snapshot.loading) {
      make(heading, 'p', 'Loading ' + lab.name.toLowerCase() + ' sources…');
      return 0;
    }
    const fixtures = matchingFixtures(snapshot, state);
    const historyLabel = sport === 'rugby' ? ' official Pro D2 final scores loaded' : ' historical records in the connected feed';
    make(heading, 'p', fixtures.length + ' matches in this view · ' + (snapshot.historyCount || 0) + historyLabel);
    if (snapshot.analysisHistoryCount !== null && snapshot.analysisHistoryCount !== undefined) make(heading, 'p', 'D1 analysis uses ' + snapshot.analysisHistoryCount + ' results from a fully paginated recent 28-day window. Experimental; recent results are delayed.', 'small');
    if (snapshot.observedAt) make(heading, 'p', 'Provider snapshot: ' + dateText(snapshot.observedAt) + (snapshot.usable ? '' : ' · stale or unconfirmed'), 'small');
    if (!snapshot.usable) make(heading, 'p', 'Provider feed unavailable or stale. Any retained calendar records are shown with their source status.', 'small');
    if (!fixtures.length) make(heading, 'p', 'No collected matches match these dates, competition and search. This does not establish that no games are scheduled.');
    if (sport === 'rugby') {
      const calendar = make(heading, 'a', 'Open Rugby League calendar', 'text-link');
      calendar.href = new URL('rugby/?code=RL#league-calendar', fixtureBase).href;
      const nextLeague = ResearchFixtureEvidence.matching(snapshot, {...state, competition:'all', query:'', eventView:'upcoming',
        plan:{from:plusDays(state.plan.to, 1), to:'9999-12-31'}}).find(row => row.code === 'RL' && row.official);
      if (nextLeague && state.sport === 'rugby' && state.eventView === 'upcoming' && state.competition === 'all' && !state.query) {
        button(heading, 'Show next announced Rugby League fixtures', () => setRange(nextLeague.date,plusDays(nextLeague.date, 13)), 'button button-secondary');
      }
    }
    const audit = details(heading, 'Source coverage and missing inputs');
    if (sport === 'rugby') {
      for (const code of ['RU','RL']) {
        const health = snapshot.sourceHealth?.[code];
        make(audit, 'p', (code === 'RU' ? 'Rugby Union' : 'Rugby League') + ': ' + (health
          ? health.days_succeeded + ' dates checked out of a ' + health.horizon_days + '-day horizon · ' + health.events + ' provider fixtures · free API may omit events'
          : 'No provider collection report available') + '.');
      }
    }
    make(audit, 'p', 'Market snapshots are dated observations. Match cards show available sources and model inputs.');
    const labLink = make(audit, 'a', 'Open ' + lab.name + ' Research Lab');
    labLink.href = new URL(sport + '/', fixtureBase).href;
    for (const row of fixtures.slice(0,state.limit)) {
      const card = make(panel, 'article', undefined, 'event-card fixture-event-card');
      card.dataset.fixtureId = row.id;
      const header = make(card, 'div', undefined, 'event-card-header');
      make(header, 'span', row.competition + (row.code === 'RL' ? ' · Rugby League' : row.code === 'RU' ? ' · Rugby Union' : ''), 'event-meta');
      const time = make(header, 'time', row.start ? dateText(row.start) + ' UK' : row.session ? dateText(row.session) + ' UK session' : row.date + (row.venueZone ? ' · Las Vegas date · UK kickoff TBC' : ' · match time unconfirmed'), 'event-time');
      time.dateTime = row.start || row.session || row.date;
      make(card, 'h3', row.name, 'event-title');
      if ($('dashboard-watch')) {
        const watch = button(card, 'Watch', () => chooseWatch('lab', row.id, sport, watch), 'desk-watch-button');
        watch.setAttribute('aria-label', 'Watch ' + row.name);
      }
      make(card, 'p', row.sourceStatus, 'event-status');
      if (row.venue) make(card, 'p', row.venue, 'small');
      const outcomes = make(card, 'div', undefined, 'fixture-outcomes');
      const rugbyEvent = row.rugbyModel && state.events.find(event => event.sport === 'rugby' &&
        event.providerEventId === String(row.provider?.event_id) && event.startUTC === row.start &&
        event.name === row.name && E.statusOf(event).selectable);
      if (rugbyEvent) card.dataset.paperEventId = rugbyEvent.id;
      const rugbyEstimate = row.rugbyModel?.probabilities;
      const addRugbyChoice = (outcome, choiceId) => {
        if (!rugbyEvent) return;
        const selected = state.plan.slots[state.slot].legs.some(leg => leg.eventId === rugbyEvent.id && leg.choiceId === choiceId);
        const control = button(outcome, selected ? 'Remove from paper slip' : 'Add to paper slip',
          () => select(rugbyEvent.id, choiceId));
        control.setAttribute('aria-pressed', String(selected));
      };
      row.participants.forEach((participant,index) => {
        const outcome = make(outcomes, 'div', undefined, 'fixture-outcome');
        make(outcome, 'strong', participant);
        const matches = row.form?.[index];
        if (matches?.length)
          make(outcome, 'span', 'Recent league form: ' + matches.map(match => match.result).join(' · ') + ' (newest first)');
        else if (row.form) make(outcome, 'span', 'No matched Pro D2 results for this team.');
        if (row.model?.prob_a !== null && row.model?.prob_a !== undefined)
          make(outcome, 'span', 'D1 estimate: ' + pct(index === 0 ? row.model.prob_a : row.model.prob_b) + ' · uncalibrated');
        if (rugbyEstimate) {
          make(outcome, 'span', 'Experimental estimate: ' + pct(rugbyEstimate[index === 0 ? 0 : 2]));
          addRugbyChoice(outcome, index === 0 ? 'home' : 'away');
        }
      });
      if (rugbyEstimate) {
        const draw = make(outcomes,'div',undefined,'fixture-outcome');
        make(draw,'strong','Draw');
        make(draw,'span','Experimental estimate: ' + pct(rugbyEstimate[1]));
        addRugbyChoice(draw,'draw');
      }
      make(card, 'p', row.reason, 'fixture-model-status');
      if (!row.marketEvidence) make(card, 'p', 'Bookmaker odds unavailable · Paper research only', 'small');
      else {
        const market = row.marketEvidence;
        if (!row.start) make(card, 'p', 'Market-listed time · ' + dateText(market.listedStart) + ' UK', 'small');
        const prices = details(card, 'Captured prices · paper research', 'compact-evidence-disclosure');
        make(prices, 'p', market.labels.join(' / '), 'small');
        for (const receipt of [market.benchmark, market.sky]) {
          make(prices, 'p', receipt.bookmaker + ' · ' + receipt.prices.map(price => price.toFixed(2)).join(' / ') +
            ' · captured ' + dateText(receipt.at) + ' UK');
          link(prices, 'View ' + receipt.bookmaker + ' source', receipt.source);
        }
        if (market.directSource) link(prices, 'Check the current Sky Bet listing', market.directSource);
      }
      const evidence = details(card, 'Match evidence and sources', 'compact-evidence-disclosure');
      if (row.rugbyModel) make(evidence,'p','Pro D2 Elo replays earlier league results in date order with fixed starting ratings, a fixed home advantage, and a smoothed league draw rate. Experimental and uncalibrated.','small');
      if (row.form?.some(matches => matches.length)) make(evidence,'p','W = win · D = draw · L = loss','small');
      if (row.form) row.form.forEach((matches,index) => {
        if (!matches.length) return;
        make(evidence,'strong',row.participants[index] + ' · Recent Pro D2 results');
        for (const match of matches) {
          const line = make(evidence,'p',match.date + ' · ' + match.result + ' ' + match.scored + '–' + match.conceded + ' vs ' + match.opponent + ' • ', 'small');
          link(line, 'Official score', match.source);
        }
      });
      if (row.providerDateConflict) make(evidence, 'p', 'Provider listed ' + row.providerDateConflict + '. The PDC schedule gives the date shown above.');
      if (row.model) make(evidence, 'p', 'D1 prior matches: ' + row.model.prior_a + ' / ' + row.model.prior_b + '. Historical sample is provider-observed, not independently verified.');
      for (const source of row.sources) link(evidence, 'View source · ' + new URL(source).hostname, source);
      if (!row.sources.length) make(evidence, 'p', 'Provider observation has no public per-match source URL.');
      if (row.observedAt) make(evidence, 'p', 'Provider observed: ' + dateText(row.observedAt));
    }
    if (fixtures.length > state.limit) button(panel, 'Show more ' + lab.name.toLowerCase() + ' matches', () =>
      store.update(current => ({...current,limit:current.limit + 24})), 'button button-secondary');
    return fixtures.length;
  }
  function renderSportActions(state) {
    const fixtureView = Boolean(fixtureLabs[state.sport]);
    if ($('find-racing')) $('find-racing').hidden = !['all','racing'].includes(state.sport);
    if ($('racing-candidates')) $('racing-candidates').hidden = !['all','racing'].includes(state.sport) || !racingCandidatesRequested;
    const filteredBuild = (fixtureView || Object.hasOwn(discoveryOnly, state.sport)) && $('build-scope').value !== 'all' && !filtered(state).some(event => event.sport === state.sport && E.statusOf(event).selectable);
    $('generate').disabled = filteredBuild;
    $('generate').title = filteredBuild ? 'No qualifying selections: see the missing inputs on each match card.' : '';
    const audit = $('paper-eligibility-audit');
    if (audit) audit.hidden = fixtureView || Object.hasOwn(discoveryOnly, state.sport);
  }
  function renderSportEvidence(state) {
    const panel = $('sport-evidence');
    const sport = state.sport;
    panel.hidden = sport === 'all';
    if (panel.hidden) return;
    const selected = filtered(state);
    const now = Date.now();
    const eligibility = selected.filter(event => E.statusOf(event, now).selectable).length;
    const stale = selected.filter(event => E.statusOf(event, now).code === 'STALE').length;
    const snapshot = state.snapshotState;
    const files = (snapshot?.snapshots || []).filter(row => sportFeedKinds[sport]?.includes(row.kind));
    const failures = (snapshot?.errors || []).filter(row => sportFeedKinds[sport]?.includes(row.kind));
    const hasSportBucket = !['tennis','nfl'].includes(sport) ||
      files.some(file => Array.isArray(file.document.sports?.[sport]?.events));
    const schedule = Object.hasOwn(discoveryOnly, sport)
      ? sport === 'golf' ? 'Official coverage links only.' : 'Manual match discovery and official coverage links are available in Sports Watch.'
      : fixtureLabs[sport] ? 'See the calendar below for provider and official schedule evidence.'
      : !snapshot ? 'Loading schedule snapshots…'
      : !files.length ? 'Schedule sources unavailable.'
      : !hasSportBucket ? 'The schedule snapshot has no usable ' + sports[sport] + ' event section.'
      : !selected.length ? 'No schedule records match the current dates and filters.'
      : selected.length + ' matching events · ' + eligibility + ' available for paper research' +
        (stale ? ' · ' + stale + ' stale' : '') + '.';
    const sourcesText = files.map(file => {
      const observed = sport === 'tennis' || sport === 'nfl'
        ? file.document.sports?.[sport]?.generated_at_utc || file.document.generated_at_utc : file.document.generated_at_utc;
      return (specs.find(spec => spec.path === file.path)?.label || file.kind) + ' · snapshot ' + dateText(observed) + ' UK';
    });
    const signature = JSON.stringify([sport,schedule,sourcesText,failures.map(f => [f.path,f.retained])]);
    if (panel.dataset.signature === signature) return;
    panel.dataset.signature = signature;
    panel.replaceChildren();
    make(panel, 'h3', sports[sport] + ' evidence and workflow');
    const lane = make(panel, 'section');
    lane.setAttribute('aria-label', 'Experimental source coverage');
    make(lane, 'p', window.ValueWatchFreeSourceLanes.laneForSport(sport));
    make(lane, 'p', 'Current odds unavailable from approved free sources. No new free feed connected.', 'small');
    make(panel, 'p', schedule);
    for (const line of sourcesText) make(panel, 'p', line, 'small');
    for (const failure of failures) make(panel, 'p', (specs.find(spec => spec.path === failure.path)?.label || failure.kind) +
      (failure.retained ? ' refresh failed · last successful snapshot retained' : ' source unavailable'), 'small');
    make(panel, 'p', 'PASS · No qualifying opportunity established. UNVALIDATED / BLOCKED.', 'small');
    if (['darts','rugby'].includes(sport)) make(panel, 'p', 'Exact fixture links are unavailable. Use the calendar to inspect the published schedule and its evidence.', 'small');
    if (Object.hasOwn(discoveryOnly, sport)) make(panel, 'p', 'Exact fixture details are unavailable for this sport.', 'small');
    if (sport === 'nfl') make(panel, 'p', 'Weekly screening target: 3–5 statistical candidates when evidence supports them. The target is optional.', 'small');
    const routes = {
      football:[['Football Match Centre','football-match/'],['Market Intelligence','market-intelligence/']],
      racing:[['Racing research and market evidence','racing-research/']],
      darts:[['Darts analysis and sources','darts/']],
      rugby:[['Rugby calendar and analysis','rugby/']]
    };
    const nav = make(panel, 'nav');
    nav.setAttribute('aria-label', sports[sport] + ' research tools');
    const links = [...(routes[sport] || []), ['Sports Watch', 'sports-watch/?sport=' + sport]];
    if (!Object.hasOwn(discoveryOnly, sport)) links.push(['Validation Centre','validation-centre/'], ['Operations','ops-control/'], ['Wildcard research','wildcard/']);
    for (const [label,path] of links) {
      const a = make(nav,'a',label,'text-link');
      a.href = new URL(path, rootURL).href;
    }
  }
  function chooseWatch(kind, id, sport, opener) {
    const url = new URL(location.href);
    url.searchParams.set('watch', kind + ':' + sport + ':' + id);
    if (url.href !== location.href) history.pushState(history.state, '', url);
    renderWatchSelection();
    $('dashboard-watch-title').focus();
    $('dashboard-watch').scrollIntoView({block:'nearest'});
    watchOpener = opener;
  }
  let watchOpener;
  function renderWatchSelection() {
    if (!$('dashboard-watch')) return;
    const key = new URLSearchParams(location.search).get('watch');
    const match = typeof key === 'string' && key.length <= 500 &&
      /^(desk|lab):(football|racing|tennis|nfl|darts|rugby):(.+)$/.exec(key);
    let event = null;
    if (match) {
      const [, kind, sport, id] = match;
      const rows = kind === 'desk' ? store.get().events : loadFixtureSnapshot(sport)?.fixtures ?? [];
      const candidates = rows.filter(row => row.id === id && (kind === 'lab' || row.sport === sport));
      if (candidates.length === 1) {
        const row = candidates[0];
        event = { key, sport, name: row.name, time: row.startUTC || row.start || row.session || row.date };
      }
    }
    window.dispatchEvent(new CustomEvent('valuewatch:watch-selection', {detail:{event, requested:Boolean(key)}}));
  }
  window.addEventListener('valuewatch:watch-ready', renderWatchSelection);
  $('dashboard-watch-close')?.addEventListener('click', () => {
    const url = new URL(location.href);
    url.searchParams.delete('watch');
    history.pushState(history.state, '', url);
    renderWatchSelection();
    if (watchOpener?.isConnected) watchOpener.focus();
    else $('search').focus();
  });

  function renderEvents() {
    renderRacingCandidates();
    renderPaperEligibilityAudit();
    const state = store.get();
    renderWatchSelection();
    renderSportActions(state);
    renderSportEvidence(state);
    const normalRows = filtered(state).filter(event => event.sport !== 'rugby');
    const isReliability = selectedMethods.length === 1 && selectedMethods[0] === 'reliability';
    const rows = isReliability
      ? normalRows.filter(event => currentHistoryStatus(event).status === 'FORM_CANDIDATE')
      : normalRows;
    const activeLabs = Object.keys(fixtureLabs).filter(sport => state.sport === sport || (state.sport === 'all' && !isReliability));
    const fixtureRowsPresent = activeLabs.some(sport => matchingFixtures(loadFixtureSnapshot(sport),state).length > 0);
    const visible = rows.slice(0, state.limit), root = $('events');
    root.setAttribute('aria-busy', String(!state.snapshotState && !Object.hasOwn(discoveryOnly, state.sport)));
    if (!cards.size) root.replaceChildren(); root.querySelectorAll('.event-empty, .load-more, .fixture-events').forEach(element => element.remove());
    S.reconcile(root, visible.map(event => event.id), cards, createCard, (record, id) => patchCard(record, visible.find(event => event.id === id)));
    root.querySelector('.desk-market-head')?.remove();
    if (visible.length && visible.every(event => event.sport === 'football')) {
      const heading = make(null, 'div', undefined, 'desk-market-head');
      make(heading, 'span', 'Start (UK)');
      make(heading, 'span', 'Fixture / competition');
      const outcomes = make(heading, 'div', undefined, 'desk-market-head-outcomes');
      for (const label of ['1 · Home', 'X · Draw', '2 · Away']) make(outcomes, 'span', label);
      make(heading, 'span', 'Evidence');
      root.prepend(heading);
    }
    if (!state.snapshotState && !fixtureLabs[state.sport] && !Object.hasOwn(discoveryOnly, state.sport)) {
      make(root, 'p', 'Loading research schedules…', 'event-empty');
    } else if (!visible.length && state.sport === 'racing' && !isReliability) {
      const dates = [...new Set(state.events.filter(event => event.sport === 'racing').map(event => day(event.startUTC)))].sort();
      const latest = dates.at(-1);
      const upcomingMeetings=racingFixtureMeetings.filter(m=>m.date>=state.plan.from&&m.date<=state.plan.to); const box = empty(root, '0 verified racecards · '+upcomingMeetings.length+' scheduled meetings', (upcomingMeetings.length ? 'Meeting dates and courses are available, but race times, runners and odds are not yet verified. See the scheduled meetings below. ' : 'No meeting fixtures are loaded for the selected dates. ') + 'Racecards remain unavailable until verified source data is collected.', { label: 'Show next 14 days', run: () => { store.update(current => ({ ...current, competition: 'all', query: '', eventView: 'upcoming' })); $('search').value = ''; $('event-view').value = 'upcoming'; preset('14'); } }); box.classList.add('event-empty');
      if (latest && latest !== today()) button(box, 'View dated previous cards', () => { store.update(current => ({ ...current, competition: 'all', query: '', eventView: 'all' })); $('search').value = ''; $('event-view').value = 'all'; setRange(latest, latest); }, 'button button-quiet');
    }
    else if (!visible.length && !fixtureLabs[state.sport] && !Object.hasOwn(discoveryOnly, state.sport) && !fixtureRowsPresent) { const box = empty(root,
      isReliability ? 'No historical form candidates with sufficient evidence' :
      state.snapshotState?.status === 'unavailable' ? 'Research sources unavailable' : 'No events match this view',
      isReliability ? 'Automatic seven-competition screening is active. Existing source records do not establish five earlier results for both teams and the required win pattern in this view. No predictions or odds were invented. Switch engines or widen the date range. Historical archive: '+historicalStatus+'.' :
      'Try another sport or a wider date range. Saved research remains available; no events are invented to fill the board.',
      { label: 'Show next 14 days', run: () => preset('14') }); box.classList.add('event-empty'); }
    if (rows.length > visible.length) button(root, 'Show more events (' + (rows.length - visible.length) + ')', () => store.update(state => ({ ...state, limit: state.limit + 24 })), 'button button-secondary load-more');
    // Tournament-level source observations are informational, not fictitious match cards.
    let tournamentPanel=$('tennis-tournament-coverage');
    if(!tournamentPanel){tournamentPanel=make(null,'details',undefined,'coverage-disclosure');tournamentPanel.id='tennis-tournament-coverage';$('coverage-summary').after(tournamentPanel);}
    tournamentPanel.replaceChildren();
    tournamentPanel.hidden=state.sport!=='tennis';
    if(!tournamentPanel.hidden){
      make(tournamentPanel,'summary','Tournament coverage and pending draws');
      const relevant=tournamentCoverage.filter(d=>d.date>=state.plan.from&&d.date<=state.plan.to);
      if(!relevant.length)make(tournamentPanel,'p','No verified tournament schedule metadata loaded yet. The next collector run must publish this feed.','muted');
      for(const dateRow of relevant){
        const names=[...new Set(dateRow.tournaments.filter(t=>t&&typeof t.name==='string'&&['ATP','WTA'].includes(t.tour)).map(t=>t.tour+' · '+t.name))].slice(0,12);
        make(tournamentPanel,'p',dateRow.date+': '+(names.length?names.join(' | '):'No source-observed tournament names'),'small');
      }
    }
    // Coverage is a property of observed source records, not of the date picker.
    let coverage=$('racing-date-coverage');
    if(!coverage){coverage=make(null,'details',undefined,'coverage-disclosure');coverage.id='racing-date-coverage';$('coverage-summary').after(coverage);}
    coverage.replaceChildren();
    const selectedSport=state.sport;
    coverage.hidden=!['racing','football','tennis','nfl'].includes(selectedSport);
    if(!coverage.hidden){
      const observed=state.events.filter(e=>e.sport===selectedSport);
      const selectable=rows.filter(e=>E.statusOf(e).selectable).length;
      make(coverage,'summary','Coverage details · '+rows.length+' matching events · '+selectable+' available for paper research');
      if(selectedSport==='racing'){
        const fixtures=racingFixtureMeetings.filter(m=>m.date>=state.plan.from&&m.date<=state.plan.to);
        const meetings=details(coverage,'Meeting fixtures ('+fixtures.length+')','meeting-fixture-disclosure');
        make(meetings,'p','Meeting calendar only. Individual racecards below carry their own runner and source status.','small');
        for(const m of fixtures.slice(0,70)){
          const item=make(meetings,'div',undefined,'research-row');make(item,'strong',m.date+' · '+m.course);
          const a=make(item,'a','View source meeting');a.href=m.source_url;a.target='_blank';a.rel='noopener noreferrer';
        }
      }
      const days=[];let d=state.plan.from;
      while(d<=state.plan.to&&days.length<31){days.push(d);d=plusDays(d,1);}
      const sportLabel={racing:'Racecards',football:'Football fixtures',tennis:'Tennis matches',nfl:'NFL games'}[selectedSport];
      make(coverage,'p',sportLabel+' · day-by-day source coverage (loaded records, not a complete competition calendar):','small');
      const wrap=make(coverage,'div',undefined,'racing-day-chips');
      wrap.style.cssText='display:flex;gap:6px;flex-wrap:wrap;margin:8px 0 12px';
      for(const date of days){
        const n=observed.filter(e=>day(e.startUTC)===date).length;
        const chip=button(wrap,date.slice(5)+' · '+(n?n+' loaded':'not loaded'),()=>{
          setRange(date,date);store.update(x=>({...x,eventView:'all',competition:'all',query:''}));
          $('event-view').value='all';$('search').value='';
        },'button button-quiet');
        chip.style.cssText='font-size:12px;padding:7px 9px;'+(n?'border-color:#52718b':'opacity:.75');
        chip.title=n?'View loaded records for this day':'No source-observed records loaded; this does not prove no events are scheduled';
      }
      if(days.some(date=>!observed.some(e=>day(e.startUTC)===date))){
        make(coverage,'p',selectedSport==='tennis'
          ?'Draws pending or schedule not supplied: future ATP/WTA matches cannot be shown until named players and start times are published. No fictitious matchups or probabilities are generated.'
          :selectedSport==='nfl'
          ?'NFL games are collected from the current and next regular-season weekly slates. Bye weeks and UK date changes affect daily counts; an empty day is not proof of a complete schedule.'
          :selectedSport==='football'
          ?'Football fixture feed has gaps on the selected dates. Missing records are not evidence that leagues have no games; source collection and cross-checks must be expanded.'
          :'Some selected dates have no collected racecards. This is a source-coverage gap, not evidence of no scheduled racing.','muted');
      }
    }
    let highlightCoverage=$('racing-highlight-coverage');
    if(!highlightCoverage){highlightCoverage=make(null,'div',undefined,'coverage-summary');highlightCoverage.id='racing-highlight-coverage';$('coverage-summary').after(highlightCoverage);}
    highlightCoverage.hidden=state.sport!=='racing';
    if(state.sport==='racing'){
      const racingRows=rows.filter(event=>event.sport==='racing'),counts={green:0,blue:0,yellow:0};let first=null;
      for(const event of racingRows){
        const gates=event.choices.map(choice=>evaluateEvidenceSafe(event,choice));
        const green=gates.some(g=>g.green==='PROVISIONAL'),blue=gates.some(g=>['VERIFIED','EXPERIMENTAL'].includes(g.blue)),yellow=gates.some(g=>['MULTI_USER_CONSENSUS','EXPERIMENTAL_AGREEMENT'].includes(g.yellow));
        counts.green+=Number(green);counts.blue+=Number(blue);counts.yellow+=Number(yellow);
        if(!first&&(green||blue||yellow))first=event;
      }
      highlightCoverage.replaceChildren();
      make(highlightCoverage,'p',counts.green+' of '+racingRows.length+' races have a green source favourite · '+counts.blue+' blue source leaders · '+counts.yellow+' yellow agreements. Counts cover your selected dates, including races further down the list.');
      if(racingRows.length&&!counts.blue)make(highlightCoverage,'p','No blue leader established from current matched source selections; yellow also needs that leader.');
      if(first)button(highlightCoverage,'Go to first highlighted race',()=>{
        const id=first.id,index=rows.findIndex(event=>event.id===id);
        store.update(state=>({...state,limit:Math.max(state.limit,index+1)}));
        setTimeout(()=>{const card=cards.get(id)?.node;const target=card?.querySelector('[data-evidence-green="true"], [data-evidence-blue="true"], [data-evidence-yellow="true"]');const disclosure=target?.closest('.runner-disclosure');if(disclosure)disclosure.open=true;target?.scrollIntoView({block:'center'});target?.focus({preventScroll:true});},0);
      },'button button-secondary');
    }
    write($('coverage-summary'), !state.snapshotState ? 'Loading research schedules…' : rows.length + ' matching your filters · ' + state.events.length + ' total loaded records across all dates. Coverage is incomplete; zero means no matching records in these feeds.');
    let fixtureCount = 0;
    for (const sport of activeLabs) fixtureCount += renderFixtureLab(root, state, sport);
    if (Object.hasOwn(discoveryOnly, state.sport)) {
      write($('event-summary'), sports[state.sport] + ' · Sports Watch coverage');
      write($('coverage-summary'), 'No connected research fixtures, prices, model or paper selections for this sport.');
    } else if (fixtureLabs[state.sport]) {
      write($('event-summary'), fixtureCount + (fixtureCount === 1 ? ' match' : ' matches') + ' in the selected view · ' + state.plan.from + ' → ' + state.plan.to);
      write($('coverage-summary'), 'Schedule and model evidence appear on each match. Any captured prices are dated source observations.');
    } else {
      write($('event-summary'), rows.length + ' research events' + (state.sport === 'all' && !isReliability ? ' + ' + fixtureCount + ' darts/rugby calendar matches' : '') + ' · ' + state.plan.from + ' → ' + state.plan.to + ' · UK time');
    }
  }

  function renderNavigation() {
    const state = store.get(); $('sport').value = state.sport;
    document.querySelectorAll('[data-sport], [data-pro-sport]').forEach(element => {
      const active = (element.dataset.sport || element.dataset.proSport) === state.sport;
      element.classList.toggle('active', active);
      element.setAttribute('aria-pressed', String(active));
    });
    const fixtureCount = renderFixtureCounts(state);
    document.querySelectorAll('[data-count]').forEach(element => {
      const sport = element.dataset.count;
      if (fixtureLabs[sport]) return;
      const count = filtered({ ...state, sport }).length;
      write(element, sport === 'all' ? count + fixtureCount : count);
    });
    const fixtureCompetitions = Object.keys(fixtureLabs).filter(sport => state.sport === 'all' || state.sport === sport).flatMap(sport => matchingFixtures(loadFixtureSnapshot(sport), {...state,competition:'all'}).map(row => row.competition));
    const competitions = [...new Set([...filtered({ ...state, competition: 'all' }).map(event => event.competition), ...fixtureCompetitions])].filter(Boolean).sort(), signature = JSON.stringify(competitions);
    const outside = state.competition !== 'all' && !competitions.includes(state.competition);
    if (outside) competitions.push(state.competition);
    const optionsSignature = signature + (outside ? '|' + state.competition : '');
    if ($('competition').dataset.signature !== optionsSignature) {
      $('competition').dataset.signature = optionsSignature; $('competition').replaceChildren(); const all = make($('competition'), 'option', 'All competitions'); all.value = 'all';
      for (const name of competitions) { const option = make($('competition'), 'option', outside && name === state.competition ? name + ' (outside current coverage)' : name); option.value = name; }
      write($('competition-count'), String(competitions.length));
      $('competition-nav').replaceChildren();
      button($('competition-nav'), 'All competitions', () => store.update(state => ({ ...state, competition: 'all', limit: 24 })), 'competition-button').dataset.competition = 'all';
      for (const name of competitions) button($('competition-nav'), name, () => store.update(state => ({ ...state, competition: name, limit: 24 })), 'competition-button').dataset.competition = name;
    }
    $('competition').value = competitions.includes(state.competition) ? state.competition : 'all';
    const needle = $('competition-search').value.trim().toLocaleLowerCase();
    let visible = 0;
    $('competition-nav').querySelectorAll('button[data-competition]').forEach(element => {
      const selected = element.dataset.competition === state.competition;
      element.classList.toggle('active', selected);
      element.setAttribute('aria-pressed', String(selected));
      const match = element.dataset.competition === 'all' || element.dataset.competition.toLocaleLowerCase().includes(needle);
      element.hidden = !match;
      if (match) visible++;
    });
    const noResults = $('competition-nav').querySelector('.competition-no-results');
    if (noResults) noResults.remove();
    if (visible === 1 && needle) make($('competition-nav'), 'p', 'No matching competitions', 'rail-empty competition-no-results');
  }
  $('competition-search').addEventListener('input', () => safely(renderNavigation));
  let trackerSignature = '';
  function renderTracker() {
    const rows = filtered(store.get()), signature = JSON.stringify(rows.map(event => [event.id, event.score, E.statusOf(event).code])); if (signature === trackerSignature) return; trackerSignature = signature;
    const root = $('tracker'), opened = new Set([...root.querySelectorAll('details[open]')].map(element => element.dataset.key)); root.replaceChildren();
    for (const sport of Object.keys(sports).filter(name => name !== 'all')) {
      const matches = rows.filter(event => event.sport === sport); if (!matches.length) continue;
      const sportBox = details(root, symbols[sport] + ' ' + sports[sport] + ' · ' + matches.length, 'tracker-sport'); sportBox.dataset.key = sport;
      for (const competition of [...new Set(matches.map(event => event.competition))]) {
        const league = details(sportBox, competition, 'tracker-competition'); league.dataset.key = sport + ':' + competition;
        for (const event of matches.filter(event => event.competition === competition).slice(0, 20)) {
          const game = details(league, event.name, 'tracker-event'); game.dataset.key = event.id;
          make(game, 'p', dateText(event.startUTC), 'small'); make(game, 'strong', event.score?.label ? 'Final · ' + event.score.label : E.statusOf(event).label); make(game, 'p', 'Snapshot ' + dateText(event.observedAt) + ' · published data, not live tracking', 'small'); if (event.score) provenance(game, event.score.sources);
          const sofa = C.eventLink(event, 'www.sofascore.com');
          if (sofa) link(game, 'View sourced Sofascore event ↗', sofa);
          if (event.sport !== 'rugby') link(game, 'Check prices on Oddschecker ↗', C.eventLink(event, 'www.oddschecker.com') || C.oddschecker(event.sport));
        }
      }
    }
    if (!root.children.length) make(root, 'p', 'No tracked events in this range.', 'rail-empty');
    root.querySelectorAll('details').forEach(element => { element.open = opened.has(element.dataset.key); });
  }
  function patchLeg(record, leg, position, slot) {
    const signature = JSON.stringify([leg, position, slot.id, slot.legs.length, store.get().replacing, store.get().claims, store.get().plan.from, store.get().plan.to], (key, value) => key === 'ageMs' ? undefined : value); if (record.signature === signature) return;
    const opened = record.node.querySelector('.leg-evidence')?.open; record.signature = signature; record.node.replaceChildren();
    const liveEvent = store.get().events.find(event => event.id === leg.eventId);
    const started = Number.isFinite(Date.parse(leg.startUTC)) && Date.parse(leg.startUTC) <= Date.now();
    const archived = started || !liveEvent || leg.currentStatus?.selectable === false;
    record.node.classList.toggle('slip-archived', archived);
    record.node.classList.toggle('slip-current', !archived);
    const top = make(record.node, 'div', undefined, 'slip-selection-top'); make(top, 'strong', leg.label);
    button(top, '×', () => savePlan(E.removeSelection(store.get().plan, slot.id, leg.id)), 'remove-button').setAttribute('aria-label', 'Remove ' + leg.label);
    make(record.node, 'p', symbols[leg.sport] + ' ' + leg.event, 'slip-selection-meta'); make(record.node, 'p', dateText(leg.startUTC) + ' · ' + leg.market, 'slip-selection-meta');
    const reasonDetails = details(record.node,'Selection explanation & limitations','leg-context-details');
    make(reasonDetails,'p','Paper entry · ' + (leg.model?.name || 'no model estimate captured') + ' · ' +
      (leg.evidenceStatus || 'capture status unavailable') + '. PASS for qualification; no verified bookmaker value.','slip-selection-meta');
    const state = E.statusOf(liveEvent);
    if (archived) make(record.node,'span',started?'Past event · saved research':!liveEvent?'Not in current snapshots · saved research':'Unavailable for current selection · saved research','slip-archive-status');
    make(record.node, 'span', !leg.currentStatus?.selectable ? leg.currentStatus?.label || state.label : leg.quote?.decimal ? leg.quote.decimal.toFixed(2) + ' · unverified source price' : (typeof leg.probability === 'number' ? pct(leg.probability) + (leg.model?.probabilityKind === 'EXPERIMENTAL_CONTEXT_WEIGHT' ? ' context weight' : ' model win estimate') + ' · UNVALIDATED · odds not connected' : 'No model estimate · odds not connected'), 'leg-state' + (!leg.currentStatus?.selectable ? ' is-warning' : ''));
    if(leg.provisionalEntry)make(record.node,'p','Provisional paper entry · final declarations unverified','warning-line');
    // Mathematical hurdle only: this is not an estimated probability or positive-EV claim.
    if (Number.isFinite(leg.quote?.decimal) && leg.quote.decimal > 1) {
      const hurdle = 100 / leg.quote.decimal;
      make(reasonDetails,'p','Breakeven hurdle: '+hurdle.toFixed(1)+'% at captured decimal odds '+leg.quote.decimal.toFixed(2)+(leg.quote.decimal < 2 ? ' · short-price risk: a high win rate is required' : '')+' · price unverified','slip-selection-meta');
    } else {
      make(reasonDetails,'p','Breakeven hurdle: UNKNOWN · no captured decimal price','slip-selection-meta');
    }
    if (leg.sport === 'racing') {
      window.ValueWatchHorseV3Plus?.attach(reasonDetails, 'racing', leg.model);
      const marketAudit = details(reasonDetails, 'Exchange movement & closing line · research', 'leg-market-audit');
      make(marketAudit,'p','Exchange trend: UNKNOWN · no verified timestamped Betfair exchange price pair or matched-volume evidence is connected.','small');
      make(marketAudit,'p','Betfair SP / Closing Line Value: UNKNOWN · no independently attributable BSP benchmark is connected.','small');
      make(marketAudit,'p','No steamer, drifter, 20% drift, convergence or CLV claim is inferred from bookmaker prices.','small');
    }
    if (day(leg.startUTC) < store.get().plan.from || day(leg.startUTC) > store.get().plan.to) make(reasonDetails, 'p', 'Outside your selected dates · original selection retained', 'warning-line');
    const actions = make(record.node, 'div', undefined, 'selection-actions');
    const up = button(actions, '↑', () => savePlan(E.moveSelection(store.get().plan, slot.id, leg.id, position - 1)), 'move-button'); up.disabled = position === 0; up.setAttribute('aria-label', 'Move ' + leg.label + ' up');
    const down = button(actions, '↓', () => savePlan(E.moveSelection(store.get().plan, slot.id, leg.id, position + 1)), 'move-button'); down.disabled = position === slot.legs.length - 1; down.setAttribute('aria-label', 'Move ' + leg.label + ' down');
    button(actions, store.get().replacing === leg.id ? 'Cancel replace' : 'Replace', () => { store.update(state => ({ ...state, view: 'events', replacing: state.replacing === leg.id ? null : leg.id })); closeSlip(); notice('Choose a board outcome to replace ' + leg.label + '.'); });
    const evidence = details(record.node, 'Captured evidence & price', 'leg-evidence'); evidence.open = Boolean(opened);
    make(evidence, 'p', 'Event reference: ' + leg.eventId, 'small event-reference');
    if (leg.currentStatus?.selectable && liveEvent && !archived) {
      button(evidence,'Review this event on the board',() => {
        closeSlip();
        navigateSport(leg.sport);
        $('search').value = '';
        $('event-view').value = 'all';
        store.update(state => ({...state, query:'', eventView:'all', limit:24}));
        const state = store.get();
        const index = leg.sport === 'rugby'
          ? matchingFixtures(loadFixtureSnapshot('rugby'),state).findIndex(row =>
            String(row.provider?.event_id) === liveEvent.providerEventId && row.start === liveEvent.startUTC && row.name === liveEvent.name)
          : filtered(state).findIndex(event => event.id === leg.eventId);
        if (index < 0) {
          notice('The saved fixture is not visible in the current board or research engine. Its original evidence is retained.');
          return;
        }
        store.update(state => ({...state, limit:Math.max(24,index+1)}));
        const card = leg.sport === 'rugby' ? [...$('events').querySelectorAll('[data-paper-event-id]')]
          .find(row => row.dataset.paperEventId === leg.eventId) : cards.get(leg.eventId)?.node;
        card?.scrollIntoView({block:'start'});
        if (card) [...card.querySelectorAll('button:not([disabled])')].find(control => control.getClientRects().length)?.focus({preventScroll:true});
      });
    }
    make(evidence, 'p', 'Captured ' + dateText(leg.capturedAt) + ' · estimate ' + pct(leg.probability) + ' · uncertainty unquantified', 'small'); provenance(evidence, leg.sources);
    for (const note of store.get().claims.filter(note => note.eventId === leg.eventId && (!note.choiceId || note.choiceId === leg.choiceId))) showNote(evidence, note);
    if (leg.quote) { link(evidence, 'Original price source', leg.quote.source); make(evidence, 'p', 'Observed ' + dateText(leg.quote.observedAt) + ' · not independently verified', 'small'); }
    if (leg.quoteState === 'PRICE_CHANGED') make(evidence, 'p', 'The source price changed. Replace this outcome explicitly to capture the current observation.', 'warning-line');
    if (state.selectable && leg.currentStatus?.selectable) {
      const form = make(evidence, 'form', undefined, 'record-price-form');
      const field = (label, type, value) => { const wrap = make(form, 'label', label), input = make(wrap, 'input'); input.type = type; input.value = value; input.required = true; return input; };
      if (leg.sport !== 'rugby') link(evidence, 'Check prices on Oddschecker ↗', C.oddschecker(leg.sport));
      const price = field('Observed decimal price', 'number', leg.quote?.decimal || ''); price.min = '1.00000001'; price.max = '100000'; price.step = 'any';
      const bookmaker = field('Bookmaker', 'text', leg.quote?.bookmaker || 'Sky Bet'); bookmaker.maxLength = 100;
      const source = field('Evidence source URL', 'url', leg.quote?.source || '');
      const seen = field('Observation time (UTC)', 'datetime-local', new Date().toISOString().slice(0, 16));
      const submit = make(form, 'button', 'Record unverified source price', 'button button-secondary'); submit.type = 'submit'; make(form, 'p', 'User-recorded evidence only. Source, market and availability require independent checking.', 'small');
      form.addEventListener('submit', event => { event.preventDefault(); safely(() => savePlan(E.setRecordedQuote(store.get().plan, slot.id, leg.id, { decimal: Number(price.value), source: source.value, observedAt: new Date(seen.value + 'Z').toISOString(), bookmaker: bookmaker.value }))); });
    }
  }
  const X = ResearchExperimental;
  const M = ValueWatchEngineMethodSelection;
  const methodStarRegistry = ValueWatchMethodStars;
  function mountMethodStarGuide(){
    const picker=$('engine-methods'), status=$('engine-status');
    if(!picker||!status||status.previousElementSibling?.classList.contains('method-star-guide'))return;
    for(const tile of picker.querySelectorAll('button[data-method]')){
      const star=make(null,'span','★','method-identity-star');
      star.dataset.methodStar=tile.dataset.method;
      star.setAttribute('aria-hidden','true');
      tile.querySelector('.engine-method-name')?.before(star);
    }
    const guide=make(null,'div',undefined,'method-star-guide');
    guide.setAttribute('aria-label','Permanent method star colours and status');
    const heading=make(guide,'strong','Method star key · each colour identifies a different method');
    const chips=make(guide,'div',undefined,'method-star-legend');
    for(const method of methodStarRegistry.methods){
      const chip=make(chips,'span',undefined,'method-star-key');
      chip.dataset.methodStar=method.id;
      make(chip,'span','★','method-key-symbol');
      make(chip,'span',method.name);
      if(['tool','readiness','place-model','separate-unconnected'].includes(method.kind)){
        make(chip,'small',method.kind==='tool'?'comparison tool':method.kind==='readiness'?'paper lab':method.kind==='place-model'?'top-4 market; separate':'separate / not connected','method-unavailable');
      }
    }
    const alpha=make(guide,'a','Open Alpha Hunt · separate research','method-alpha-link');
    alpha.href=new URL('alpha-hunt/',rootURL).href;
    make(guide,'p','Stars beside outcomes appear only when a selected method supplies a usable matching direction. Several stars on one outcome mean directions coincide — NOT independent agreement, validated accuracy or betting value. Racing top-four is a different market.','method-star-disclosure');
    status.before(guide);
  }
  mountMethodStarGuide();
  const sportsMethods = typeof ValueWatchSportMethods === 'undefined' ? null : ValueWatchSportMethods;
  const methodModes = sportsMethods?.modes || {};
  const researchMode = value => Object.hasOwn(methodModes, value) ? value : X.mode(value);
  const methodSnapshots = new Map();
  let selectedMethods = ['current'];
  try { selectedMethods = M.fromStorage(storage.getItem(M.preferenceKey), storage.getItem(X.preferenceKey)); }
  catch { /* Default view remains usable without storage. */ }
  let engineView = selectedMethods[0] || 'current';
  const engineExplanations = {
    current:'Current Engine 2.5 · existing research workflow.',
    experimental:'Engine 3.0 · frozen recent-form football model + market.',
    hybrid:'Hybrid 3.1 · current-season football model + independent market.',
    compare:'Compare the saved estimate with each experimental method.',
    reliability:'Historical Reliability · form-pattern screen; not certified betting value.',
    bottleneck:'Bottleneck Lab · Premier League paper comparison and sport readiness.',
    'racing-top-four':'Racing Top Four · unvalidated win-to-place research transform.'
  };
  const engineLabels = Object.fromEntries(M.methods.map(method => [method.id,method.label]));
  let hybridEvidence;
  function loadHybridEvidence() {
    if (hybridEvidence && Date.now() - hybridEvidence.at < 60000) return hybridEvidence;
    const entry = {at:Date.now(), pending:true, data:null};
    hybridEvidence = entry;
    const bundled = () => fetchFixtureSource(new URL('paper-lab/hybrid-market-data.json', rootURL), 'json');
    const published = rootURL.hostname === 'aurelian2483-cmd.github.io' && rootURL.pathname === '/value-watch-lab/'
      ? fetchFixtureSource(new URL('https://raw.githubusercontent.com/aurelian2483-cmd/value-watch-lab/main/paper-lab/hybrid-market-data.json'), 'json')
        .then(data => {
          if (data?.schema_version !== 1 || !Array.isArray(data.records)) throw Error('Market feed unavailable');
          return data;
        }).catch(bundled)
      : bundled();
    published.then(data => { entry.data = data; })
      .catch(() => {})
      .finally(() => {
        entry.pending = false;
        if (hybridEvidence === entry && ['compare','hybrid'].some(mode => selectedMethods.includes(mode))) {
          safely(renderSlip);
          safely(renderEvents);
        }
      });
    return entry;
  }
  function hybridResult(event, entry) {
    if (entry.pending && event?.startUTC && event.sport === 'football') return {reason:'Checking benchmark coverage…'};
    const engine = globalThis.ValueWatchHybrid;
    if (!engine) return {reason:'Hybrid module unavailable.'};
    const result = engine.evaluate(event, entry.data);
    return result.probabilities ? result : {...result, captured:engine.capturedComparison(event, entry.data)};
  }
  function hybridLines(parent, result) {
    if (result.probabilities) make(parent, 'p', 'Home / draw / away · ' + result.probabilities.map(pct).join(' / '));
    const candidate = result.selection;
    if (candidate) make(parent, 'p', candidate.id.toUpperCase() + ' · ' + candidate.decimal.toFixed(2) + ' Sky Bet · estimated EV ' + pct(candidate.estimatedEV));
    else if (result.captured) {
      const capture = result.captured;
      make(parent, 'p', 'Archived market comparison · ' + dateText(capture.at) + ' UK');
      make(parent, 'p', 'Home / draw / away · ' + capture.probabilities.map(pct).join(' / '));
      make(parent, 'p', (capture.hadCandidate ? 'Historical paper candidate' : 'PASS at capture') + ' · refreshed prices required', 'small');
      const sources = details(parent, 'Archived sources');
      for (const receipt of capture.sources) link(sources, receipt.label, receipt.url);
    } else make(parent, 'p', result.reason);
  }
  function renderFrozenCandidate(parent, fixture) {
    if (fixture?.sport !== 'football') {
      make(parent, 'p', fixture ? 'Football regulation-time result only.' : 'Current fixture unavailable.');
      return;
    }
    const ordered = ['home','draw','away'].map(id => fixture.choices?.find(choice => choice.id === id));
    if (!/poisson.form.alpha.0[.]025.v1/i.test(fixture.model?.name || '')) {
      make(parent, 'p', 'Frozen recent-form forecast unavailable.');
      return;
    }
    const now = Date.now();
    const quotes = ordered.map(choice => choice?.quote);
    const consistent = quotes.every(q => q && Number.isFinite(q.decimal) && q.decimal > 1 &&
      q.status === 'SOURCE_OBSERVED_UNVERIFIED' && Number.isFinite(Date.parse(q.observedAt)) &&
      now - Date.parse(q.observedAt) >= 0 && now - Date.parse(q.observedAt) <= 1800000 &&
      Date.parse(fixture.startUTC) > now + 300000 && Date.parse(q.observedAt) < Date.parse(fixture.startUTC) - 300000 &&
      q.bookmaker && q.source && q.bookmaker === quotes[0]?.bookmaker && q.source === quotes[0]?.source);
    const candidate = consistent ? X.marketCandidate(ordered.map(c => c?.probability), quotes.map(q => q.decimal)) : null;
    if (!candidate) {
      make(parent, 'p', 'Fresh, matched home/draw/away input unavailable.');
      return;
    }
    make(parent, 'p', 'Home / draw / away · ' + candidate.probabilities.map(pct).join(' / '));
    make(parent, 'p', candidate.selection === 'PASS' ? 'PASS · below 5% estimated EV or above odds cap' :
      candidate.selection + ' · odds ' + candidate.selectedOdds.toFixed(2) + ' · estimated EV ' + pct(candidate.estimatedEV));
  }
  let bottleneckFootballFixture = '';
  let bottleneckFootballMethod = 'challenger';
  let bottleneckArchiveRequest;

  function renderBottleneckFootball(root, lab) {
    const section = make(root, 'section', undefined, 'bottleneck-paper');
    make(section, 'h4', 'Premier League paper comparison');
    const content = make(section, 'div', 'Loading frozen football predictions…');
    bottleneckArchiveRequest ??= fetch(new URL('research/bottleneck/football-paper-pairs.json', rootURL), {cache:'no-store'})
      .then(response => {
        if (!response.ok) throw Error('Prediction archive unavailable');
        return response.json();
      }).catch(() => null);
    bottleneckArchiveRequest.then(data => {
      if (!section.isConnected) return;
      content.replaceChildren();
      const pairs = lab.footballPaperPairs(data);
      if (!pairs.length) {
        make(content, 'p', data ? 'The archive has no eligible frozen predictions yet.' : 'The published prediction archive is unavailable.', 'small');
        return;
      }
      const controls = make(content, 'div', undefined, 'bottleneck-paper-controls');
      const makeSelect = (text, options) => {
        const label = make(controls, 'label', text);
        const select = make(label, 'select');
        for (const [value, labelText] of options) make(select, 'option', labelText).value = value;
        return select;
      };
      const identity = row => JSON.stringify([row.home,row.away,row.kickoff_utc]);
      const fixture = makeSelect('Choose a fixture', pairs.map(row => [identity(row), row.home + ' vs ' + row.away + ' · ' + dateText(row.kickoff_utc)]));
      const method = makeSelect('Choose a model view', [['challenger','Bottleneck pilot'],['baseline','Current-season baseline']]);
      if (pairs.some(row => identity(row) === bottleneckFootballFixture)) fixture.value = bottleneckFootballFixture;
      method.value = bottleneckFootballMethod;
      const result = make(content, 'div', undefined, 'bottleneck-paper-result');
      result.setAttribute('aria-live', 'polite');
      const evidence = details(content, 'Capture and source details', 'bottleneck-paper-evidence');
      const capture = make(evidence, 'p');
      make(evidence, 'p', 'Experimental paper estimates frozen before kickoff. Football data provided by the Football-Data.org API.');
      function draw() {
        bottleneckFootballFixture = fixture.value;
        bottleneckFootballMethod = method.value;
        const row = pairs.find(pair => identity(pair) === fixture.value);
        const values = row[method.value];
        const labels = [row.home,'Draw',row.away];
        const best = Math.max(...values);
        const leaders = labels.map((_, i) => i).filter(i => best - values[i] < 1e-12);
        result.replaceChildren();
        make(result, 'p', 'Paper pick', 'bottleneck-paper-label');
        make(result, 'strong', leaders.length === 1 ? labels[leaders[0]] : 'Tied estimates', 'bottleneck-paper-pick');
        const outcomes = make(result, 'div', undefined, 'bottleneck-paper-outcomes');
        labels.forEach((label, i) => {
          const outcome = make(outcomes, 'div', undefined,
            'bottleneck-paper-outcome' + (leaders.length === 1 && leaders[0] === i ? ' is-leading' : ''));
          make(outcome, 'span', label);
          make(outcome, 'strong', pct(values[i]));
        });
        write(capture, 'Captured ' + dateText(row.captured_at_utc) + ' UK · ' +
          (method.value === 'challenger' ? row.challenger_model : row.baseline_model));
      }
      fixture.addEventListener('change', draw);
      method.addEventListener('change', draw);
      draw();
    });
  }

  function renderEngineMode(evaluation, view, root, openComparisons, focusedComparison) {
    const method = methodModes[view];
    if (method) {
      make(root, 'p', method.label + ' · Research only', 'small');
      make(root, 'h3', 'Research suggestions');
      make(root, 'p', 'PASS for betting · UNVALIDATED · Publication blocked');

      const mode = view;
      let entry = methodSnapshots.get(mode);
      if (!entry || (!entry.pending && Date.now() - entry.at >= 60000)) {
        entry = {pending:true, at:Date.now()};
        methodSnapshots.set(mode, entry);
        sportsMethods.read(mode).then(result => { entry.result = result; }).catch(() => {
          entry.result = {note:'Research feed unavailable or invalid.', rows:[]};
        }).finally(() => {
          entry.pending = false;
          if (selectedMethods.includes(mode)) renderSlip();
        });
      }
      if (entry.pending) { make(root, 'p', 'Loading published research…'); return; }
      make(root, 'p', entry.result.note);
      for (const row of entry.result.rows) make(root, 'p', row, 'small');
      if (!entry.result.rows.length) make(root, 'p', 'No eligible research suggestions in the current feed.');
      return;
    }
    if (view === 'current') {
      make(root, 'p', 'Saved estimates and prices stay on the fixture board and paper slips. Research only.', 'small');
      return;
    }
    const state = store.get();
    if (view === 'bottleneck') {
      const lab = window.ValueWatchBottleneckLab;
      if (lab && (state.sport === 'all' || state.sport === 'football')) {
        renderBottleneckFootball(root, lab);
      }
      const rows = lab?.forSelection(state.sport, filtered(state), E.statusOf) || [];
      const readiness = details(root, 'Readiness and previous research', 'bottleneck-paper-evidence');
      readiness.open = state.sport !== 'all' && state.sport !== 'football';
      const list = make(readiness, 'div', undefined, 'bottleneck-readiness-list');
      if (!rows.length) make(list, 'p', 'Bottleneck evidence is unavailable for this view.', 'small');
      for (const row of rows) {
        const card = make(list, 'section', undefined, 'bottleneck-readiness-card');
        card.dataset.bottleneckLane = row.key;
        make(card, 'h4', row.label + ' · ' + (row.key === 'football' ? 'V0 retrospective study' : row.status.replaceAll('_', ' ')));
        make(card, 'p', 'Baseline path: ' + row.baseline + (row.baselineEstimateCount ?
          ' · ' + row.baselineEstimateCount + ' fresh estimates in the filtered desk feed' :
          ' · no fresh estimate counted in the filtered desk feed'), 'small');
        make(card, 'p', row.key === 'football' ? 'Premier League pilot estimates are isolated in the paper comparison. Second star withheld.' : 'Bottleneck estimate: unavailable for current events. Second star withheld.', 'small');
        make(card, 'p', 'Research candidate: ' + row.bottleneck, 'small');
        make(card, 'p', row.evidence, 'small');
        make(card, 'p', 'Next: ' + row.next, 'small');
      }
      make(readiness, 'p', 'Unvalidated research. Betting publication blocked.');
      const evidence = make(readiness, 'a', 'Open the pinned data inventory (JSON)');
      evidence.href = new URL('research/bottleneck/inventory.json', rootURL).href;
      return;
    }
    if (view === 'reliability') {
      const available = filtered(store.get()).filter(event => event.sport==='football');
      const matched = available.map(event=>({event,result:currentHistoryStatus(event)}));
      const candidates = matched.filter(item=>item.result.status==='FORM_CANDIDATE');
      const incomplete = matched.filter(item=>item.result.status==='INSUFFICIENT_HISTORY').length;
      make(root,'h3','Historical Reliability · match screening');
      make(root,'p',available.length+' football fixtures in current filters · '+candidates.length+' form candidates · '+incomplete+' without five earlier results for both teams.');
      make(root,'p','Coverage: '+historicalStatus+'. A form candidate is NOT a validated prediction or value-qualified bet. No verified pre-kickoff bookmaker prices are present in this historical screen.','small');
      for(const item of candidates) make(root,'p',item.event.name+' · '+item.result.side+' historical form direction · '+item.result.homeWins+'/5 home wins vs '+item.result.awayWins+'/5 away wins · odds/value unverified','small');
      if(!candidates.length)make(root,'p','No candidate satisfies the strict form rule with the historical evidence currently loaded. No matches are added merely to fill the list.');
      return;
    }
    if (view === 'hybrid' && !['football', 'all'].includes(state.sport)) {
      make(root, 'h3', 'Hybrid 3.1 · football only');
      make(root, 'p', 'The current-season hybrid is a football research method. It cannot score ' + (sports[state.sport] || state.sport) + ' events. Select Football to see its football-only view; cross-sport Bottleneck forecasts are not deployed.', 'small');
      return;
    }
    const entry = view === 'experimental' ? null : loadHybridEvidence();
    if (view === 'hybrid') {
      make(root, 'h3', 'Football paper suggestions');
      make(root, 'p', 'UNVALIDATED · Paper research only', 'small');
      const fixtures = filtered(state).filter(event => event.sport === 'football');
      if (entry.pending || !fixtures.length) {
        make(root, 'p', entry.pending ? 'Checking market evidence…' : 'No football fixtures match these filters.');
        return;
      }
      const rows = fixtures.map(event => ({event, result:hybridResult(event, entry)}));
      const ready = rows.filter(row => row.result.probabilities);
      const archived = rows.filter(row => row.result.captured);
      make(root, 'p', fixtures.length + ' fixtures · ' + ready.length + ' current blends · ' +
        ready.filter(row => row.result.checkedBothMarkets).length + ' paired price checks · ' +
        ready.filter(row => row.result.selection).length + ' paper suggestions' +
        (archived.length ? ' · ' + archived.length + ' archived comparisons' : ''));
      const collection = entry.data?.collection_status;
      if (collection?.state === 'RATE_LIMITED' && Date.parse(collection.retry_after_utc) > Date.now())
        make(root, 'p', 'The market source is limiting refreshes. Next attempt after ' +
          dateText(collection.retry_after_utc) + ' UK.', 'small');
      for (const row of [...ready, ...archived].slice(0, state.limit)) {
        const item = make(root, 'div', undefined, 'engine-hybrid-result');
        make(item, 'h4', row.event.name);
        hybridLines(item, row.result);
      }
      const missing = new Map();
      for (const row of rows) {
        if (!row.result.probabilities && !row.result.captured) missing.set(row.result.reason, (missing.get(row.result.reason) || 0) + 1);
      }
      for (const [reason, count] of missing) make(root, 'p', count + ' fixtures · ' + reason, 'small');
      return;
    }

    make(root, 'h3', 'Selected paper slip · ' + state.plan.slots[state.slot].name);
    make(root, 'p', 'UNVALIDATED · Paper research only', 'small');
    make(root, 'p', 'Saved bookmaker prices are historical observations, not live odds. Open a match to inspect model and source evidence.', 'small');
    const marketArchive = make(root, 'a', 'Browse recorded football prices', 'text-link');
    marketArchive.href = new URL('market-intelligence/', rootURL).href;
    if (!evaluation.legs.length) make(root, 'p', 'Choose an outcome to compare its evidence.');
    if (evaluation.legs.length) {
      const glossary = details(root, 'How the methods differ');
      make(glossary, 'p', '2.5 shows the saved estimate. 3.0 blends its frozen recent-form forecast and market at 50/50. 3.1 blends the current-season forecast and an independent market at 50/50, then checks a separate Sky Bet price.');
    }
    for (const leg of evaluation.legs) {
      const disclosure = make(root, 'details', undefined, 'engine-selection-details');
      const key = JSON.stringify([leg.eventId, leg.startUTC, leg.choiceId]);
      disclosure.dataset.comparison = key;
      disclosure.open = openComparisons.has(key);
      const storedDecimal = leg.quote?.decimal;
      const shownPrice = typeof storedDecimal === 'number' && Number.isFinite(storedDecimal) && storedDecimal > 1
        ? ' · recorded ' + storedDecimal.toFixed(2) + ' (unverified, not live)'
        : ' · no recorded odds';
      const summary = make(disclosure, 'summary', leg.event + ' · ' + leg.label + shownPrice);
      if (focusedComparison === key) summary.focus({preventScroll:true});
      const row = make(disclosure, 'div', undefined, 'engine-comparison' + (entry ? ' engine-comparison-three' : ' engine-comparison-single'));
      const fixture = state.events.find(item => item.id === leg.eventId && item.startUTC === leg.startUTC);
      if (entry) {
        const current = make(row, 'div');
        make(current, 'h5', '2.5 · Saved estimate');
        make(current, 'p', typeof leg.probability === 'number' ? pct(leg.probability) : 'Estimate unavailable');
        if (leg.model?.probabilityKind) make(current, 'p', leg.model.probabilityKind === 'EXPERIMENTAL_CURRENT_SEASON_COMPARISON' ? 'Current-season Poisson' : leg.model.name || leg.model.probabilityKind, 'small');
        make(current, 'p', leg.quote?.decimal ? 'Recorded price ' + leg.quote.decimal + ' · unverified' : 'Price unavailable', 'small');
      }
      const experimental = make(row, 'div');
      make(experimental, 'h5', '3.0 · Frozen recent-form blend');
      renderFrozenCandidate(experimental, fixture);
      if (entry) {
        const hybrid = make(row, 'div');
        make(hybrid, 'h5', '3.1 · Current-season hybrid');
        hybridLines(hybrid, hybridResult(fixture || {sport:leg.sport}, entry));
      }

      const scenario = details(row, 'Price sensitivity on saved 2.5 estimate', 'engine-sensitivity evidence-details');
      const result = leg.canCalculate && leg.currentStatus.selectable ? X.calculate(leg.probability, leg.quote?.decimal) : null;
      if (!result) {
        make(scenario, 'p', 'Requires a saved estimate and a current source-matched price.');
        continue;
      }
      make(scenario, 'p', 'Illustrative ±3 percentage-point scenarios. Racing context weights are uncalibrated.', 'small');
      make(scenario, 'p', 'Central EV ' + pct(result.centralEV) + ' · break-even ' + pct(result.breakEven));
      make(scenario, 'p', 'Scenario EV · ' + [result.lowEV,result.centralEV,result.highEV].map(pct).join(' / '));
      make(scenario, 'p', 'Margin to break-even ' + (result.fragility * 100).toFixed(2) + ' pp · payoff variance ' + result.variance.toFixed(4) + ' · EV sensitivity ' + result.sensitivity.toFixed(4), 'small');
    }
  }
  function renderEngine(evaluation) {
    const picker = $('engine-methods');
    for (const tile of picker.querySelectorAll('button[data-method]')) {
      const chosen = selectedMethods.includes(tile.dataset.method);
      tile.classList.toggle('is-selected',chosen);
      tile.setAttribute('aria-pressed',String(chosen));
    }
    const legacySelect = $('engine-select');
    if (legacySelect) legacySelect.value = selectedMethods[0] || 'current';
    const root = $('engine-analysis');
    const openByView = new Map();
    for (const detail of root.querySelectorAll('details[data-comparison][open]')) {
      const view = detail.closest('[data-engine-panel]')?.dataset.enginePanel;
      if (!view) continue;
      if (!openByView.has(view)) openByView.set(view,new Set());
      openByView.get(view).add(detail.dataset.comparison);
    }
    const focusedElement = document.activeElement;
    const focusedView = focusedElement?.closest?.('[data-engine-panel]')?.dataset.enginePanel;
    const focusedKey = focusedElement?.matches?.('summary') ?
      focusedElement.parentElement?.dataset.comparison : undefined;
    if (!selectedMethods.length) {
      write($('engine-status'),'Select one or more method boxes to inspect their research evidence.');
    } else if (selectedMethods.length === 1) {
      write($('engine-status'),engineExplanations[selectedMethods[0]] || 'Research-only comparison.');
    } else {
      write($('engine-status'),selectedMethods.length + ' methods selected · Separate evidence panels below. Models UNVALIDATED; betting publication BLOCKED.');
    }
    root.hidden = selectedMethods.length === 0 ||
      (selectedMethods.length === 1 && selectedMethods[0] === 'current');
    root.replaceChildren();
    if (root.hidden) return;
    for (const view of selectedMethods) {
      const panel = make(root,'section',undefined,'engine-mode-panel');
      panel.dataset.enginePanel = view;
      make(panel,'h3',engineLabels[view] || view,'engine-mode-panel-heading');
      const content = make(panel,'div',undefined,'engine-mode-content');
      renderEngineMode(evaluation,view,content,openByView.get(view) || new Set(),
        focusedView === view ? focusedKey : undefined);
    }
  }
  function applyMethodSelection(next) {
    selectedMethods = M.normalize(next,[]);
    engineView = selectedMethods[0] || 'current';
    renderSlip();
    renderEvents();
    try {
      storage.setItem(M.preferenceKey,JSON.stringify(selectedMethods));
      storage.setItem(X.preferenceKey,engineView);
    } catch { write($('engine-status'), $('engine-status').textContent + ' View preference could not be saved on this device.'); }
  }
  $('engine-methods').addEventListener('click', event => safely(() => {
    const tile = event.target.closest('button[data-method]');
    if (!tile || !$('engine-methods').contains(tile)) return;
    applyMethodSelection(M.toggle(selectedMethods,tile.dataset.method));
  }));
  // Hidden legacy select supports old saved single-mode integrations.
  $('engine-select').addEventListener('change', event => safely(() => {
    applyMethodSelection([researchMode(event.target.value)]);
  }));
  const wildcardStorageKey = 'value-watch-weekly-wildcard-v1';
  const wildcardSportNames = {football:'Football',racing:'Horse racing',tennis:'Tennis',nfl:'NFL',rugby:'Rugby'};
  function wildcardWeek(date) {
    const d=new Date(date+'T12:00:00Z');
    const offset=(d.getUTCDay()+6)%7;
    d.setUTCDate(d.getUTCDate()-offset);
    return d.toISOString().slice(0,10);
  }
  function wildcardSaved() {
    try {
      const raw=storage.getItem(wildcardStorageKey);
      if (!raw || raw.length>80000) return null;
      const record=JSON.parse(raw);
      if (record?.version!==1 || !Array.isArray(record.entries) || record.entries.length>16) return null;
      return record;
    } catch {return null;}
  }

  // Three methodological review lenses are not real endorsements or human sign-offs.
  // All values are research-only and isolated from the four existing saved paper slips.
  const wildRiskStorageKey='value-watch-fifth-wildcard-paper-v1';
  let wildRiskDays=7,wildRiskMode='double',wildDraft={stake:'1.00',quotes:{}};
  try{
    const raw=storage.getItem(wildRiskStorageKey);
    if(raw && raw.length<=16000){
      const saved=JSON.parse(raw);
      if(saved?.version===1 && [7,14,21].includes(saved.days) &&
        ['double','treble','five','seven'].includes(saved.mode) &&
        typeof saved.stake==='string' && saved.stake.length<=5 &&
        saved.quotes && typeof saved.quotes==='object' && !Array.isArray(saved.quotes) &&
        Object.keys(saved.quotes).length<=30 && Object.entries(saved.quotes).every(([k,v])=>
          k.length<500 && typeof v==='string' && v.length<=10)){
        wildRiskDays=saved.days;wildRiskMode=saved.mode;
        wildDraft={stake:saved.stake,quotes:{...saved.quotes}};
      }
    }
  }catch{}
  function persistWildRisk(){
    try{storage.setItem(wildRiskStorageKey,JSON.stringify({
      version:1,days:wildRiskDays,mode:wildRiskMode,stake:wildDraft.stake,
      quotes:wildDraft.quotes,savedAt:new Date().toISOString()
    }));return true}catch{return false}
  }
  function renderWildcardRisk(target){
    const from=today(),to=plusDays(from,wildRiskDays-1),now=Date.now();
    const review=E.wildcardRiskStudio(store.get().events,from,to,now);
    const panel=make(target,'section',undefined,'wildcard-risk-studio');
    make(panel,'p','GOLD WILDCARD · FIFTH EXPERIMENTAL PAPER SLIP','wildcard-risk-eyebrow');
    make(panel,'h4','Risk Studio · Build a speculative combination');
    make(panel,'p','Independent research tool inspired by the publicly described methods of three bettors. They do not participate, review or endorse these selections.','wildcard-note');
    make(panel,'p','Darts · Elo D1 laboratory available. The published verified results/fixtures feed is empty, so Darts is excluded from combination picks until source-backed eligible events exist.','wildcard-darts-status');
    const lens=make(panel,'div',undefined,'wildcard-review-lenses');
    const rules=[
      ['Billy Walters lens','Market discipline','Current executable bookmaker prices: NOT VERIFIED. Examine injuries, line movement, price freshness and a fixed stake limit.'],
      ['Tony Bloom lens','Portfolio and correlated risk','Multiple legs increase failure risk; sporting events may be dependent. Cross-market value and correlation: NOT VERIFIED.'],
      ['Bill Benter lens','Statistical modelling','Forecasts are UNVALIDATED. Independent calibration, model/public probability comparisons and out-of-sample validation: NOT COMPLETED.']
    ];
    for(const [name,role,detail] of rules){
      const card=make(lens,'article',undefined,'wildcard-lens');
      make(card,'strong',name);make(card,'small',role);make(card,'p',detail,'small');
    }
    const config=make(panel,'div',undefined,'wildcard-config');
    const daysLabel=make(config,'label','Research horizon');
    const days=make(daysLabel,'select');
    for(const n of [7,14,21]){
      const option=make(days,'option',n+' days');option.value=String(n);option.selected=n===wildRiskDays;
    }
    days.addEventListener('change',()=>safely(()=>{
      wildRiskDays=Number(days.value);wildDraft.quotes={};persistWildRisk();renderWildcard();
    }));
    make(config,'p',review.available+' distinct future model-backed events available for investigation within '+review.from+' to '+review.to+'.','small');
    const buttons=make(panel,'div',undefined,'wildcard-risk-modes');
    for(const mode of review.modes){
      const b=button(buttons,mode.name+' · '+mode.legs+' legs'+(mode.available?'':' · unavailable'),()=>{
        wildRiskMode=mode.id;wildDraft.quotes={};persistWildRisk();renderWildcard();
      },'wildcard-risk-mode');
      b.disabled=!mode.available;
      b.setAttribute('aria-pressed',String(wildRiskMode===mode.id));
    }
    const mode=review.modes.find(m=>m.id===wildRiskMode);
    if(!mode?.available){
      make(panel,'p',review.available?
        'Not enough eligible model-backed events for this number of legs. Try the shorter option or a wider date range.':
        'No current model-backed events pass the preliminary source gates. Do not force a selection.','wildcard-note');
      return;
    }
    const slip=make(panel,'div',undefined,'wildcard-fifth-slip');
    make(slip,'h5',mode.name+' · PAPER RESEARCH · NO BET PLACED');
    make(slip,'p',mode.description,'small');
    for(const item of mode.selections){
      const row=make(slip,'div',undefined,'wildcard-fifth-leg');
      make(row,'strong',item.sport.toUpperCase()+' · '+item.event);
      make(row,'span',item.outcome+' · '+dateText(item.startUTC),'small');
      make(row,'p','Experimental model estimate: '+pct(item.experimentalProbability)+' · not calibrated · NOT verified bookmaker odds','small');
      const label=make(row,'label','Optional manually observed decimal odds (not verified)');
      const input=make(label,'input');input.type='text';input.inputMode='decimal';
      input.autocomplete='off';input.placeholder='e.g. 2.50';input.maxLength=10;
      input.value=wildDraft.quotes[item.eventId+'|'+item.choiceId+'|'+item.startUTC]||'';
      input.addEventListener('input',()=>{wildDraft.quotes[item.eventId+'|'+item.choiceId+'|'+item.startUTC]=input.value;persistWildRisk();calculate()});
    }
    const stakeLabel=make(slip,'label','Hypothetical £ stake · paper only · maximum £10');
    const stake=make(stakeLabel,'input');stake.type='text';stake.inputMode='decimal';stake.maxLength=5;
    stake.value=wildDraft.stake;stake.addEventListener('input',()=>{wildDraft.stake=stake.value;persistWildRisk();calculate()});
    const outcome=make(slip,'div',undefined,'wildcard-calculation');
    const explain=make(slip,'p','All legs would have to win. Odds are manually typed illustrations, not independently verified live bookmaker prices. No combined win probability or estimated EV is calculated.','small');
    function calculate(){
      outcome.replaceChildren();
      const values=mode.selections.map(x=>wildDraft.quotes[x.eventId+'|'+x.choiceId+'|'+x.startUTC]||'');
      const priceOk=values.every(v=>/^(?:\d{1,4})(?:\.\d{1,3})?$/.test(v)&&Number(v)>1&&Number(v)<=10000);
      const stakeOk=/^\d{1,2}(?:\.\d{1,2})?$/.test(wildDraft.stake)&&Number(wildDraft.stake)>0&&Number(wildDraft.stake)<=10;
      if(!stakeOk){make(outcome,'p','Enter a hypothetical stake between £0.01 and £10.00.','wildcard-note');return}
      if(!priceOk){make(outcome,'p','Illustrative payout: unavailable until a valid decimal price is entered for every leg.','wildcard-note');return}
      // Arithmetical scenario only, no independence/probability inference.
      const decimal=values.reduce((a,v)=>a*Number(v),1);
      const gross=decimal*Number(wildDraft.stake);
      if(!Number.isFinite(gross)||gross>100000000){make(outcome,'p','Payout exceeds the supported scenario range.','wildcard-note');return}
      make(outcome,'strong','Hypothetical all-win gross return: £'+gross.toFixed(2));
      make(outcome,'p','Illustrative combined decimal multiplier: '+decimal.toFixed(3)+' · net if all win: £'+(gross-Number(wildDraft.stake)).toFixed(2)+'. If any leg loses, return £0 and the full stake is lost.','small');
      make(outcome,'p','NOT a bookmaker quote · NO verified edge · EV unavailable · NOT a recommendation.','wildcard-note');
    }
    calculate();
    make(panel,'p','The fifth paper draft is saved locally on this device when storage is available. Prices remain hypothetical and must be rechecked; no bookmaker availability or human expert sign-off is implied.','wildcard-note');
  }
  function renderWildcardDiscovery(target) {
    const from=today(),to=plusDays(from,6);
    const audit=E.wildcardCandidateAudit(store.get().events,from,to,Date.now());
    const panel=make(target,'section',undefined,'wildcard-discovery');
    make(panel,'h4','Wildcard research radar · current 7-day window');
    make(panel,'p','Research leads are broader than qualified bets. No positive value, bookmaker prices, combined probability or maximum payout is inferred.','wildcard-note');
    for(const row of audit.sports) {
      const section=details(panel,(wildcardSportNames[row.sport]||row.sport)+' · '+row.inWindow+
        ' future observed · '+row.qualifying+' preliminary model leads · '+row.blocked+' investigation leads');
      if(!row.inWindow) {
        make(section,'p',row.observed===0?'No future dated event in loaded source data.':'No future events inside the selected seven-day period.','small');
        if(row.nextOutside)make(section,'p','Next observed event outside the review: '+row.nextOutside.event+
          ' · '+dateText(row.nextOutside.startUTC)+'. Not eligible for this week.','small');
      }
      for(const lead of row.watchlist.slice(0,5)) {
        const entry=make(section,'div',undefined,'wildcard-radar-row');
        make(entry,'strong',lead.event+' · '+dateText(lead.startUTC));
        make(entry,'p',lead.status==='PRELIMINARY_MODEL_LEAD'?
          'Experimental model evidence present · preliminary only, not independently approved.':
          'Investigate: '+lead.reasons.join(', '),'small');
        if(lead.candidateOutcome)make(entry,'p','Model-leading outcome (uncalibrated): '+lead.candidateOutcome,'small');
      }
      if(row.watchlist.length>5)make(section,'p',(row.watchlist.length-5)+' additional lead(s) in the source audit.','small');
    }
    make(panel,'p','The review is recalculated from the latest loaded events. The saved weekly snapshot and four paper slips are not overwritten.','wildcard-note');
  }
  function renderWildcardTracker(target, entries, openWeeks, keepOpen, now) {
    const records=entries.filter(row=>row?.review?.kind==='WEEKLY_WILDCARD_PAPER_RESEARCH' &&
      typeof row.week==='string' && Array.isArray(row.review.selections)).sort((a,b)=>b.week.localeCompare(a.week));
    if(!records.length)return;
    const tracker=details(target,'Saved picks & results · '+records.length+' week'+(records.length===1?'':'s'),'wildcard-archive wildcard-results-tracker');
    tracker.open=keepOpen;
    make(tracker,'p','Saved on this device. One week’s totals count only corroborated results.','wildcard-note');
    const evidence=E.wildcardResultEvidence(store.get().snapshotState?.snapshots,now);
    for(const {week,review} of records){
      const rows=review.selections.filter(Boolean).map(chosen=>({chosen,result:E.wildcardResult(chosen,review.generatedAt,evidence,now)}));
      const checked=rows.filter(row=>typeof row.result.correct==='boolean');
      const summary=checked.length
        ? checked.filter(row=>row.result.correct).length+' correct of '+checked.length+' corroborated'
        : 'No corroborated results yet';
      const original=details(tracker,'Week of '+week+' · '+summary,'wildcard-archive wildcard-saved-review');
      original.dataset.week=week;
      original.open=openWeeks.has(week) || (!keepOpen && records.length===1);
      make(original,'p','Saved '+dateText(review.generatedAt)+' · '+(rows.length-checked.length)+' without a corroborated result','wildcard-note');
      for(const {chosen,result} of rows){
        const section=make(original,'div',undefined,'wildcard-sport');
        make(section,'strong',(wildcardSportNames[chosen.sport]||chosen.sport)+' · '+chosen.outcome);
        make(section,'p',chosen.event+' · '+dateText(chosen.startUTC));
        make(section,'p',result.label,'small');
        if(result.sources?.length)provenance(details(section,'Final score sources'),result.sources);
        make(section,'p','Saved experimental estimate '+pct(chosen.experimentalProbability)+(chosen.model?' · '+chosen.model:''),'small');
        const quote=chosen.preEventPrice;
        if(quote?.status==='SOURCE_OBSERVED_UNVERIFIED' && Number.isFinite(quote.decimal) && quote.decimal>1 &&
          PaperLab.url(quote.source) && Date.parse(quote.observedAt)<=Date.parse(review.generatedAt) &&
          Date.parse(quote.observedAt)<Date.parse(chosen.startUTC)){
          const price=make(section,'p','Pre-event price '+quote.decimal.toFixed(2)+' · source observation, unverified · '+dateText(quote.observedAt)+' · ','small');
          link(price,'Price source',quote.source);
        }else make(section,'p','Pre-event price unavailable','small');
      }
      for(const row of (Array.isArray(review.coverage)?review.coverage:[]).filter(Boolean))
        if(!rows.some(({chosen})=>chosen.sport===row.sport))
          make(original,'p',(wildcardSportNames[row.sport]||row.sport)+' · PASS when saved','wildcard-note');
    }
  }

  function renderWildcard() {
    const target=$('wildcard-result'),control=$('wildcard-build');
    if(!target||!control)return;
    const currentWeek=wildcardWeek(today()),data=wildcardSaved();
    const saved=data?.entries?.find(row=>row?.week===currentWeek);
    const keepResearchOpen=Boolean(target.querySelector('.wildcard-current-audit[open]'));
    const keepSavedOpen=Boolean(target.querySelector('.wildcard-results-tracker[open]'));
    const openWeeks=new Set([...target.querySelectorAll('.wildcard-saved-review[open]')].map(item=>item.dataset.week));
    target.replaceChildren();
    const frozen=saved?.review?.kind==='WEEKLY_WILDCARD_PAPER_RESEARCH'?saved.review:null;
    control.hidden=Boolean(frozen);
    control.disabled=Boolean(frozen);
    write(control,'Save this week\'s research');
    const from=today(),to=plusDays(from,6);
    const review=E.weeklyWildcardReview(store.get().events,from,to,Date.now());
    const heading=make(target,'div',undefined,'wildcard-compact-heading');
    make(heading,'strong','Current seven-day review');
    make(heading,'span','Paper research','wildcard-compact-status');
    make(target,'p',from+' to '+to+' · UK dates. Estimates are experimental.','wildcard-compact-intro');
    const grid=make(target,'div',undefined,'wildcard-shortlist');
    for(const sport of review.reviewedSports){
      const cov=review.coverage?.find(row=>row.sport===sport);
      const chosen=review.selections?.find(row=>row.sport===sport);
      const box=make(grid,'article',undefined,'wildcard-shortlist-card'+(chosen?'':' wildcard-shortlist-pass'));
      const top=make(box,'div',undefined,'wildcard-shortlist-top');
      make(top,'strong',(symbols[sport]||'')+' '+(wildcardSportNames[sport]||sport));
      make(top,'small',(cov?.eligible||0)+' model lead'+((cov?.eligible||0)===1?'':'s'));
      if(!chosen){
        make(box,'strong','PASS · No supported selection','wildcard-shortlist-pick');
        make(box,'small','No qualifying model and source evidence.','wildcard-shortlist-detail');
        continue;
      }
      make(box,'strong',chosen.outcome,'wildcard-shortlist-pick');
      make(box,'small',chosen.event+' · '+dateText(chosen.startUTC),'wildcard-shortlist-detail');
      make(box,'strong',pct(chosen.experimentalProbability)+' · experimental estimate','wildcard-shortlist-estimate');
    }
    make(target,'p','Combined slip: verified prices unavailable.','wildcard-compact-warning');
    renderWildcardTracker(target,data?.entries||[],openWeeks,keepSavedOpen,Date.now());
    const archive=details(target,'Source audit, limitations and alternatives','wildcard-archive wildcard-current-audit');
    archive.open=keepResearchOpen;
    const list=make(archive,'ul',undefined,'wildcard-review-list');
    for(const note of review.notes)make(list,'li',note);
    renderWildcardRisk(archive);
    renderWildcardDiscovery(archive);
  }
  let wildcardBusy=false;
  async function createWeeklyWildcard(prefetchedResult=null){
    if(wildcardBusy)return;
    wildcardBusy=true;
    const button=$('wildcard-build');
    button.disabled=true;
    try{
      const week=wildcardWeek(today());
      if(wildcardSaved()?.entries?.some(row=>row.week===week)) {renderWildcard();return;}
      const result=prefetchedResult||await refresh();
      if(!result?.snapshots?.length)throw Error('Research feeds are unavailable. No wildcard was saved.');
      const from=today(),to=plusDays(from,6);
      const review=E.weeklyWildcardReview(store.get().events,from,to,Date.now());
      if(!review.selections.length)throw Error('No supported current research candidates. No wildcard created.');
      const data=wildcardSaved()||{version:1,entries:[]};
      const latest=wildcardSaved();
      if(latest?.entries?.some(row=>row.week===week)){renderWildcard();return;}
      const entry={week,review};
      const next={version:1,entries:[...data.entries.filter(row=>row.week!==week),entry].slice(-16)};
      storage.setItem(wildcardStorageKey,JSON.stringify(next));
      renderWildcard();
      notice('Weekly Wildcard research snapshot saved on this device. No paper slips, prices or stakes were changed.');
    }catch(error){
      renderWildcard();
      make($('wildcard-result'),'p','Weekly review was not saved: '+(error?.message||'Unknown error')+'. Existing paper research was not changed.','wildcard-note');
      throw error;
    }finally{wildcardBusy=false;}
  }
  let slipSignature = '';
  function renderSlipHealth(state) {
    const target = $('slip-refresh-health');
    if (!target) return;
    const audit = E.paperEligibilityAudit(state.plan,state.events);
    const totals = audit.map(row => row.sport + ': ' + row.eligible).join(' · ');
    const eligible = audit.reduce((n,row) => n + row.eligible,0);
    const saved = state.plan.slots.reduce((n,slot) => n + slot.legs.length,0);
    write(target, 'Plan ' + state.plan.from + ' – ' + state.plan.to + ' · ' +
      saved + ' saved selections · ' + (state.events.length ?
      eligible + ' eligible now (' + totals + ')' : 'No source events loaded yet. Check the refresh status.') +
      (persistence.locked ? ' · Browser storage locked; export your work before retrying.' : '') +
      '. Research only; no verified expected value.');
  }
  let archivedSlipVisible = false;
  function renderSlip() {
    const state = store.get(), slot = state.plan.slots[state.slot], evaluation = E.evaluateSlot(slot, state.events);
    renderEngine(evaluation);
    renderSlipHealth(state);
    if ($('preview-clear-slip')) $('preview-clear-slip').disabled = !slot.legs.length || persistence.locked;
    if ($('preview-reset-slip')) $('preview-reset-slip').disabled = !state.events.length || persistence.locked;
    write($('slip-title'), slot.name); write($('slip-subtitle'), slot.description); write($('slip-count'), slot.legs.length + ' / 15'); write($('mobile-count'), state.plan.slots.reduce((sum, slot) => sum + slot.legs.length, 0));
    document.querySelectorAll('[data-slot]').forEach(element => { const active = Number(element.dataset.slot) === state.slot + 1; element.classList.toggle('active', active); element.setAttribute('aria-pressed', String(active)); });
    if (document.activeElement !== $('stake')) $('stake').value = slot.stakeMinor ? (slot.stakeMinor / 100).toFixed(2) : ''; $('slip-structure').value = slot.structure;
    const signature = JSON.stringify([state.plan.id, state.plan.revision, state.slot, evaluation, state.replacing, state.claims, state.plan.from, state.plan.to], (key, value) => key === 'ageMs' ? undefined : value); if (slipSignature === signature) return; slipSignature = signature;
    const root = $('slip-content'); if (!legs.size) root.replaceChildren(); root.querySelectorAll('.slip-empty, .generation-note').forEach(element => element.remove());
    S.reconcile(root, evaluation.legs.map(leg => leg.id), legs, id => { const row = make(null, 'article', undefined, 'slip-selection'); row.dataset.legId = id; return { node: row, signature: '' }; }, (record, id) => { const position = evaluation.legs.findIndex(leg => leg.id === id); patchLeg(record, evaluation.legs[position], position, slot); });
    root.querySelectorAll('.slip-section-heading').forEach(element => element.remove());
    const currentCount = root.querySelectorAll('.slip-selection.slip-current').length;
    const archivedCount = root.querySelectorAll('.slip-selection.slip-archived').length;
    root.classList.toggle('slip-archive-collapsed', !archivedSlipVisible);
    if(slot.legs.length){
      const currentHeading=make(root,'div',undefined,'slip-section-heading slip-current-heading');
      make(currentHeading,'strong','Current research · '+currentCount);
      make(currentHeading,'small','Upcoming selections with an event in the current source snapshot. Research only, no validated value.');
      if(archivedCount){
        const historic=make(root,'div',undefined,'slip-section-heading slip-archived-heading');
        const toggle=button(historic,(archivedSlipVisible?'Hide':'Show')+' saved history / unresolved · '+archivedCount,()=>{
          archivedSlipVisible=!archivedSlipVisible;
          root.classList.toggle('slip-archive-collapsed',!archivedSlipVisible);
          write(toggle,(archivedSlipVisible?'Hide':'Show')+' saved history / unresolved · '+archivedCount);
          toggle.setAttribute('aria-expanded',String(archivedSlipVisible));
        },'slip-archive-toggle');
        toggle.setAttribute('aria-expanded',String(archivedSlipVisible));
        make(historic,'small','Past, absent from current feeds or no longer selectable. Nothing is deleted.');
      }
    }
    if (!slot.legs.length) empty(root, 'No paper selections', 'An empty slip is valid. Review current evidence and add an eligible research outcome, or leave the slip empty.').classList.add('slip-empty');
    if (slot.generation) make(root, 'p', slot.generation.reason, 'generation-note small');
    const metrics = $('slip-metrics'); metrics.replaceChildren();
    const metric = (label, value, primary = false) => { const row = make(metrics, 'div', undefined, primary ? 'metric-primary' : 'metric-row'); make(row, 'span', label); make(row, 'strong', value); };
    if (!slot.stakeMinor) make(metrics, 'p', 'Enter your paper stake per line to calculate amounts.', 'small');
    metric('Lines × stake per line', evaluation.lineCount + ' × ' + money(slot.stakeMinor)); metric('Total hypothetical stake', money(evaluation.totalStakeMinor)); metric('Illustrative odds product', evaluation.combinedDecimal ? evaluation.combinedDecimal.toFixed(2) : '—'); metric('Gross if every leg wins', money(evaluation.grossReturnMinor), true); metric('Net if every leg wins', money(evaluation.netReturnMinor));
    const compare = details(metrics, 'Compare structures', 'structure-comparison');
    for (const structure of ['singles', 'doubles', 'trebles', 'accumulator']) { const result = E.evaluateSlot({ ...slot, structure }, state.events), row = make(compare, 'div', undefined, 'metric-row'); make(row, 'span', structure + ' · ' + result.lineCount + ' lines'); make(row, 'strong', result.grossReturnMinor === null ? 'Needs prices' : money(result.grossReturnMinor)); }
    // Informational dependency audit: no claims of independent legs or forced exclusions.
    const racingLegs = evaluation.legs.filter(leg => leg.sport === 'racing');
    const racingByEvent = new Map();
    for (const leg of racingLegs) {
      const key = leg.eventId || leg.event;
      racingByEvent.set(key, (racingByEvent.get(key) || 0) + 1);
    }
    $('slip-warnings').replaceChildren();
    if ([...racingByEvent.values()].some(count => count > 1))
      make($('slip-warnings'),'p','DEPENDENCY WARNING: multiple horses from the same race appear on this paper slip. Treat the outcomes as correlated, not independent.','warning-line');
    if (racingLegs.length > 1)
      make($('slip-warnings'),'p','MULTI-LEG RESEARCH: shared weather, going, trainer and market exposure have not been independently checked; combined odds are illustrative only.','warning-line');
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
  let journalApproach = '';
  function renderProgress(root) {
    const state = store.get(), summary = J.summarize(state.history.map(record => record.snapshot), state.journal, { sport: state.sport, from: state.plan.from, to: state.plan.to, slotId: journalApproach || undefined });
    const panel = make(root, 'section', undefined, 'surface journal-summary'); make(panel, 'h3', 'Paper progress');
    const label = make(panel, 'label', 'Research approach '), select = make(label, 'select');
    for (const [id, title] of [['', 'All four approaches'], ...E.APPROACHES.map(item => [item.id, item.name])]) { const option = make(select, 'option', title); option.value = id; }
    select.value = journalApproach; select.addEventListener('change', () => { journalApproach = select.value; safely(renderHistory); });
    make(panel, 'p', 'Saved-date filter: ' + state.plan.from + ' → ' + state.plan.to + ' · ' + sports[state.sport] + ' · manual, unverified paper outcomes', 'small');
    const unannotated = state.history.reduce((total, record) => total + record.snapshot.slots.filter(slot => slot.legs.length && !state.journal.some(entry => entry.key === J.key(record.snapshot, slot.id))).length, 0);
    make(panel, 'p', summary.settledCount + ' settled · ' + summary.pendingCount + ' pending · ' + summary.disputedCount + ' disputed · ' + unannotated + ' saved slips not annotated (all dates)', 'small');
    if (summary.mixedExcluded) make(panel, 'p', summary.mixedExcluded + ' mixed-sport slips excluded from this single-sport total.', 'small');
    if (summary.invalidCount) make(panel, 'p', summary.invalidCount + ' inconsistent records excluded. Check originals before relying on totals.', 'warning-line');
    if (!summary.settledCount) { make(panel, 'p', 'Your chart starts when an eligible paper result is recorded. No example profits are shown.', 'muted'); return; }
    make(panel, 'strong', 'Paper net ' + money(summary.netReturnMinor) + ' · stake ' + money(summary.totalStakeMinor) + ' · gross return ' + money(summary.grossReturnMinor));
    const rows = summary.entries.filter(entry => entry.status === 'SETTLED').sort((a, b) => a.recordedAt.localeCompare(b.recordedAt) || a.key.localeCompare(b.key));
    let cumulative = 0; const values = [0, ...rows.map(entry => cumulative += entry.grossReturnMinor - entry.stakeMinor)], low = Math.min(...values), high = Math.max(...values), span = Math.max(high - low, 1);
    const ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg'); svg.setAttribute('viewBox', '0 0 600 100'); svg.setAttribute('class', 'journal-chart'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'Cumulative manually recorded paper net, ' + money(summary.netReturnMinor) + ' across ' + rows.length + ' settled slips. Corrections replace previous totals.');
    const line = document.createElementNS(ns, 'polyline'); line.setAttribute('points', values.map((value, index) => (8 + index / (values.length - 1) * 584) + ',' + (90 - (value - low) / span * 80)).join(' ')); line.setAttribute('fill', 'none'); line.setAttribute('stroke', 'currentColor'); line.setAttribute('stroke-width', '2'); svg.append(line); panel.append(svg);
    make(panel, 'p', 'Corrections recalculate this chart. Results are your paper records, not independently verified performance.', 'small');
  }
  function renderSettlement(parent, snapshot, slot) {
    const state = store.get(), entries = state.journal.filter(entry => entry.key === J.key(snapshot, slot.id)), last = entries.at(-1);
    const box = details(parent, 'Paper outcome · ' + (last?.status || 'NOT RECORDED'), 'model-details');
    if (last) { make(box, 'p', 'Revision ' + last.revision + ' · ' + dateText(last.recordedAt) + ' · MANUAL / UNVERIFIED', 'small'); make(box, 'p', last.reason); link(box, 'Result source ↗', last.source); }
    const form = make(box, 'form', undefined, 'journal-form');
    const statusLabel = make(form, 'label', 'Paper status'), status = make(statusLabel, 'select');
    for (const name of ['PENDING', 'DISPUTED', 'SETTLED']) { const option = make(status, 'option', name); option.value = name; } status.value = last?.status || 'PENDING';
    const field = (title, type, value = '') => { const label = make(form, 'label', title), input = make(label, 'input'); input.type = type; input.value = value; return input; };
    const gross = field('Gross paper return (£, includes returned stake; 0 = complete loss)', 'text', last?.grossReturnMinor === null || !last ? '' : (last.grossReturnMinor / 100).toFixed(2)); gross.inputMode = 'decimal'; gross.maxLength = 14;
    const source = field('Result source URL', 'url', last?.source || ''); source.required = true; source.maxLength = 2000;
    const reasonLabel = make(form, 'label', 'Explain the exact market settlement or correction'), reason = make(reasonLabel, 'textarea'); reason.maxLength = 2000; reason.required = true; reason.rows = 2;
    const sync = () => { gross.disabled = status.value !== 'SETTLED'; gross.required = !gross.disabled; }; status.addEventListener('change', sync); sync();
    const submit = make(form, 'button', last ? 'Append paper correction' : 'Record paper outcome', 'button button-secondary'); submit.type = 'submit';
    make(form, 'p', 'Confirm settlement rules yourself, including voids, retirement, each-way and dead heats. Enter the actual paper gross amount; it is never inferred. Original prices and stake are required for settled totals.', 'small');
    const feedback = make(form, 'p', '', 'warning-line'); feedback.setAttribute('role', 'status');
    form.addEventListener('submit', event => { event.preventDefault(); safely(() => { try {
      const journal = J.append(store.get().journal, snapshot, slot.id, { status: status.value, source: source.value, reason: reason.value, grossReturnMinor: status.value === 'SETTLED' ? E.moneyMinor(gross.value) : null });
      saveEnvelope({ journal }); notice('Paper outcome appended; original evidence and prior corrections retained.');
    } catch (error) { write(feedback, error.message); } }); });
    if (entries.length) { const audit = details(box, 'Previous annotations · ' + entries.length); for (const entry of entries) { make(audit, 'p', 'Revision ' + entry.revision + ' · ' + entry.status + ' · ' + dateText(entry.recordedAt) + (entry.grossReturnMinor !== null ? ' · gross ' + money(entry.grossReturnMinor) : ''), 'small'); make(audit, 'p', entry.reason, 'small'); link(audit, 'Recorded source ↗', entry.source); } }
  }
  function renderHistory() {
    const root = $('history'), state = store.get(); root.replaceChildren(); renderProgress(root);
    if (!state.history.length && !legacy.length) empty(root, 'Keep the original evidence.', 'Save a research snapshot to preserve selections, source prices and model versions. Captures are read-only and exportable.');
    for (const [index, record] of [...state.history].reverse().entries()) {
      const snapshot = record.snapshot, card = make(root, 'article', undefined, 'history-card'); make(card, 'span', 'Saved ' + dateText(snapshot.savedAt), 'event-meta'); make(card, 'h3', snapshot.from + ' → ' + snapshot.to); make(card, 'p', snapshot.slots.reduce((sum, slot) => sum + slot.legs.length, 0) + ' selections · original evidence retained · paper annotations below', 'muted');
      const evidence = details(card, 'Original slips & source observations');
      for (const slot of snapshot.slots) { make(evidence, 'h4', slot.name + ' · ' + slot.legs.length + ' legs'); if (slot.legs.length) renderSettlement(evidence, snapshot, slot); for (const leg of slot.legs) { const row = make(evidence, 'div', undefined, 'history-leg'); make(row, 'strong', leg.label); make(row, 'p', leg.event + ' · ' + dateText(leg.startUTC), 'small'); make(row, 'p', 'Estimate ' + pct(leg.probability) + ' · observed price ' + (leg.quote?.decimal ?? 'not supplied'), 'small'); provenance(row, leg.sources); for (const note of state.claims.filter(note => note.eventId === leg.eventId && (!note.choiceId || note.choiceId === leg.choiceId))) showNote(row, note); } }
      const integrity = make(card, 'p', record.sha256 ? 'Checking local integrity…' : 'Local hash unavailable · not independently attested', 'small');
      if (record.sha256) S.verify(record).then(valid => { if (integrity.isConnected) write(integrity, valid ? 'Local SHA-256 matches · not independently attested' : 'Integrity mismatch · do not rely on this record'); }).catch(() => write(integrity, 'Integrity verification unavailable'));
      button(card, 'Export original snapshot', () => exportJSON(record, 'research-snapshot-' + snapshot.from + '-' + index + '.json'));
    }
    for (const plan of legacy) { const card = make(root, 'article', undefined, 'history-card'); make(card, 'h3', 'Earlier paper workspace · ' + plan.date); make(card, 'p', 'Original storage has not been modified.', 'small'); for (const slot of plan.slots) for (const leg of slot.legs) make(card, 'p', leg.label + ' · ' + leg.event); button(card, 'Export earlier plan', () => exportJSON(plan, 'earlier-paper-plan-' + plan.date + '.json')); }
    if (state.claims.length) { const notes = details(root, 'Private community research notes · ' + state.claims.length); for (const claim of state.claims) { const card = make(notes, 'article', undefined, 'history-card'); make(card, 'h4', claim.classification.replaceAll('_', ' ').toLowerCase()); make(card, 'p', claim.reasoning); make(card, 'small', dateText(claim.createdAt), 'muted');
      if (claim.event) make(card, 'p', claim.event + (claim.choice ? ' · ' + claim.choice : ''), 'small');
      if (claim.kind) make(card, 'p', claim.kind + (claim.sourceDate ? ' · source dated ' + claim.sourceDate : ''), 'small');
      if (claim.concern) make(card, 'p', 'Concern / counterargument: ' + claim.concern, 'small');
      for (const source of claim.sources || []) link(card, 'Original source ↗', source); } }
  }
  function showNote(parent, note) {
    const card = make(parent, 'div', undefined, 'history-leg');
    if (note.choice) make(card, 'strong', note.choice);
    make(card, 'p', note.reasoning); make(card, 'small', (note.kind || 'Unverified claim') + ' · saved ' + dateText(note.createdAt), 'muted');
    if (note.concern) make(card, 'p', 'Concern: ' + note.concern, 'small');
    for (const source of note.sources || []) link(card, 'Original source ↗', source);
  }
  function noteEvents() {
    const state = store.get(), rows = new Map(state.events.map(event => [event.id, event]));
    const captured = [...state.plan.slots, ...state.history.flatMap(record => record.snapshot.slots)].flatMap(slot => slot.legs);
    for (const leg of captured) {
      if (state.events.some(event => event.id === leg.eventId)) continue;
      if (!rows.has(leg.eventId)) rows.set(leg.eventId, { id: leg.eventId, name: leg.event, choices: [] });
      const event = rows.get(leg.eventId);
      if (!event.choices.some(choice => choice.id === leg.choiceId)) event.choices.push({ id: leg.choiceId, label: leg.label });
    }
    return [...rows.values()];
  }
  function renderNoteContext() {
    const select = $('note-event'), chosen = select.value; select.replaceChildren();
    const none = make(select, 'option', 'General research note'); none.value = '';
    const seen = new Set();
    const rows = noteEvents();
    for (const event of rows) if (!seen.has(event.id)) { seen.add(event.id); const option = make(select, 'option', event.name); option.value = event.id; }
    select.value = seen.has(chosen) ? chosen : ''; renderNoteChoices();
  }
  function renderNoteChoices() {
    const select = $('note-choice'); select.replaceChildren(); const none = make(select, 'option', 'Whole event'); none.value = '';
    for (const choice of noteEvents().find(event => event.id === $('note-event').value)?.choices || []) { const option = make(select, 'option', choice.label); option.value = choice.id; }
  }
  $('note-event').addEventListener('change', renderNoteChoices);
  function renderView() {
    const state = store.get(); for (const view of ['events', 'results', 'history', 'community']) $(view + '-view').hidden = state.view !== view;
    document.querySelectorAll('[data-view]').forEach(element => { const active = element.dataset.view === state.view; element.classList.toggle('active', active); if (active) element.setAttribute('aria-current', 'page'); else element.removeAttribute('aria-current'); });
    if (state.view === 'results') renderResults(); if (state.view === 'history') renderHistory(); if (state.view === 'community') renderNoteContext();
  }
  function renderSources(result) {
    $('feeds').replaceChildren();
    for (const spec of specs) { const file = new URL(spec.path, rootURL).pathname.split('/').pop(), snapshot = result.snapshots.find(item => item.path === spec.path), error = result.errors.find(item => item.path === spec.path), row = make($('feeds'), 'div', undefined, 'source-row'); make(row, 'strong', spec.label, 'source-name'); make(row, 'span', error ? error.retained ? 'Refresh failed · last good snapshot retained' : 'Unavailable' : 'Snapshot ' + dateText(snapshot?.document.generated_at_utc), 'source-status'); const technical = details(row, 'Technical details', 'source-debug'); make(technical, 'code', file); if (snapshot) make(technical, 'p', snapshot.document.generated_at_utc, 'small'); if (error) make(technical, 'p', error.message, 'warning-line'); }
    write($('source-summary'), result.errors.length ? 'Sources · ' + result.errors.length + ' need attention' : 'Sources · ' + result.snapshots.length + ' snapshots');
  }
  // Curated, auditable community observations. The public browser never scrapes third-party sites.
  // Match exact provider race ID, start time, runner name and publication chronology.
  let tournamentCoverage = [];
  let racingFixtureMeetings = [];
  let racingFixtureStatus = 'NOT_LOADED';
  async function refreshRacingFixtures(){
    try{
      const response=await fetch(new URL('racing-future-data.json',rootURL),{cache:'no-store'});
      if(!response.ok)throw Error('Fixture feed unavailable');
      const d=await response.json();
      if(d.schema_version!==1||d.research_only!==true||d.publication_gate!=='BLOCKED'||d.model_validation!=='UNVALIDATED')throw Error('Fixture feed research gates invalid');
      racingFixtureMeetings=Array.isArray(d.fixture_meetings)?d.fixture_meetings.filter(m=>m&&m.record_type==='MEETING_FIXTURE'&&/^\d{4}-\d{2}-\d{2}$/.test(m.date)&&typeof m.course==='string'&&m.course.length<80&&typeof m.source_url==='string'&&/^https:\/\/(www\.sportinglife\.com|www\.racingpost\.com|www\.attheraces\.com)\//.test(m.source_url)&&m.race_times_status==='NOT_SUPPLIED'&&m.declarations_status==='NOT_VERIFIED'):[];
      racingFixtureStatus=d.fixture_source_status||'NOT_AVAILABLE';
    }catch(error){racingFixtureMeetings=[];racingFixtureStatus='NOT_AVAILABLE';console.warn('Fixture coverage unavailable',error);}
    renderEvents();
  }
  async function refreshTournamentCoverage() {
    try {
      const response=await fetch(new URL('other-sports-data.json',rootURL),{cache:'no-store'});
      if(!response.ok)throw Error('Tournament metadata unavailable');
      const document=await response.json();
      if(document.schema_version!==1||document.research_only!==true||document.publication_gate!=='BLOCKED'||document.model_validation!=='UNVALIDATED')throw Error('Untrusted tournament feed');
      const days=document.sports?.tennis?.tournament_schedule_days;
      tournamentCoverage=Array.isArray(days)?days.filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d.date)&&Array.isArray(d.tournaments)).slice(0,14):[];
    }catch(error){tournamentCoverage=[];console.warn('Tennis tournament schedule unavailable',error);}
    renderEvents();
  }
  let communityEntries = [];
  let communityHealth = {lastRun:null, added:0, errors:[], configured:0, sourceHealth:[]};
  async function refreshCommunity() {
    try {
      const response = await fetch(new URL('racing-research/source-observations.json', rootURL), {cache:'no-store'});
      if (!response.ok) throw Error('Community archive unavailable');
      const feed = await response.json();
      if (feed.schema_version !== 1 || !Array.isArray(feed.entries) || feed.entries.length > 10000) throw Error('Unsupported community archive');
      communityEntries = feed.entries;
      communityHealth = {lastRun:feed.last_collector_run_utc || null,added:Number(feed.collector_added)||0,errors:Array.isArray(feed.collector_errors)?feed.collector_errors:[],configured:0,sourceHealth:Array.isArray(feed.collector_source_health)?feed.collector_source_health:[],racecardHealth:feed.racecard_health||null,pipeline:feed.community_pipeline||null};
      try { const cfg = await fetch(new URL('racing-research/community-feeds.json',rootURL),{cache:'no-store'}); if(cfg.ok){const data=await cfg.json();communityHealth.configured=(data.sources||[]).filter(x=>x.enabled).length+Number(feed.publisher_sources_attempted||0);} } catch {}
    } catch { communityEntries = []; communityHealth = {lastRun:null,added:0,errors:[],configured:0}; }
    store.update(state => ({...state, events:state.events.map(event => ({...event,communityTips:matchCommunity(event)})), eventVersion:state.eventVersion+1}));
    // Community data arrives asynchronously after the initial racecard snapshot.
    // Fill only empty paper slips; never replace user choices or historical legs.
    if (!persistence.failed && store.get().autoFill !== false) {
      const state = store.get();
      const eligible = state.events.filter(event => day(event.startUTC) >= state.plan.from && day(event.startUTC) <= state.plan.to);
      if (eligible.length && state.plan.slots.some(slot => !slot.legs.length)) {
        const generated = E.generateResearch(state.plan, eligible, Date.now(), { automatic: true });
        if (generated.slots.some((slot,index) => slot.legs.length !== state.plan.slots[index].legs.length)) savePlan(generated);
      }
    }
  }
  function matchCommunity(event) {
    if (event.sport !== 'racing' || !event.providerEventId) return [];
    // The descriptive panel is optional; missing scripts must not stop a feed refresh.
    const eligible = window.CommunityEvidence?.eligible;
    if (typeof eligible !== 'function') return [];
    return communityEntries.filter(entry => {
      if(!eligible(entry,event))return false;
      return entry.stance === 'support';
    }).map(entry => ({
      choiceId:event.choices.find(choice => choice.label.trim().toLowerCase() === String(entry.horse).trim().toLowerCase()).id,
      type:entry.group, sourceUrl:entry.url, observedAt:entry.observed_at_utc,
      sourceSelectionObserved:entry.extraction_method==='RANKED_RACECARD_VERDICT_V1'?false:entry.verification!=='PRIMARY_POST_CAPTURED',
      ...window.ValueWatchEvidenceV3.selectionAvailability(entry,event),
      publisher:entry.publisher, sourceIdentity:entry.source_identity, author:entry.author, publishedAt:entry.published_at_utc || entry.publication_date,
      ...(window.ValueWatchEvidenceV3?.communityEvidence?.(entry,event)||{primaryPostVerified:false,explicitBetSelectionVerified:false,timestampVerified:false})
    }));
  }
  const transport = ResearchTransport.createSnapshotClient({ fetch: window.fetch.bind(window), onStatus(status) { $('refresh').disabled = status.status === 'loading'; $('events').setAttribute('aria-busy', String(status.status === 'loading' && !store.get().events.length)); }, onUpdate(result) { safely(() => { const events = E.normalizeFeeds(result.snapshots).map(event => ({...event,communityTips:matchCommunity(event)})); store.update(state => ({ ...state, events, eventVersion: state.eventVersion + 1, snapshotState: result }));
      // Populate empty research slips automatically from the current published snapshots.
      // Preserve every existing leg, user edit and historical record on refresh.
      if (events.length && store.get().autoFill !== false && !persistence.failed && !freshDailyBusy && !wildcardBusy) {
        const current = store.get().plan;
        const eligible = events.filter(event => !event.futureScheduleOnly && day(event.startUTC) >= current.from && day(event.startUTC) <= current.to);
        if (current.slots.some(slot => !slot.legs.length) && eligible.length) {
          const generated = E.generateResearch(current, eligible, Date.now(), { automatic: true });
          if (generated.slots.some((slot, index) => slot.legs.length !== current.slots[index].legs.length)) savePlan(generated);
        }
      }
      renderSources(result); notice((result.errors.length ? 'Some sources need attention · ' : '') + events.length + ' total records loaded across all dates · snapshot files checked ' + dateText(result.checkedAt)); }); } });
  let refreshInFlight=null;
  const refresh = () => {
    if(refreshInFlight)return refreshInFlight;
    lastRefresh=Date.now();$('refresh').disabled=true;
    refreshInFlight=(async()=>{
      try { fixtureSnapshots.clear(); renderFixtureCounts(store.get()); await Promise.all([refreshCommunity(),refreshTournamentCoverage(),refreshRacingFixtures()]); return await transport.refresh(specs); }
      finally { refreshInFlight=null;$('refresh').disabled=false; }
    })();
    return refreshInFlight;
  };
  let opener = null;
  function openSlip() { opener = document.activeElement; document.body.classList.add('paper-open'); $('paper-backdrop').hidden = false; $('paper-open').setAttribute('aria-expanded', 'true'); $('slip-panel').setAttribute('aria-modal', 'true'); $('slip-panel').setAttribute('role', 'dialog'); $('paper-close').focus(); }
  function closeSlip() { document.body.classList.remove('paper-open'); $('paper-backdrop').hidden = true; $('paper-open').setAttribute('aria-expanded', 'false'); $('slip-panel').removeAttribute('aria-modal'); $('slip-panel').removeAttribute('role'); opener?.focus(); }
  $('paper-open').addEventListener('click', openSlip); $('paper-close').addEventListener('click', closeSlip); $('paper-backdrop').addEventListener('click', closeSlip);
  document.addEventListener('keydown', event => { if (!document.body.classList.contains('paper-open')) return; if (event.key === 'Escape') closeSlip(); if (event.key === 'Tab') { const items = [...$('slip-panel').querySelectorAll('button:not([disabled]),input,select,summary,a[href]')].filter(element => element.getClientRects().length); if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1)?.focus(); } else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0]?.focus(); } } });
  $('date-from').value = initial.plan.from; $('date-to').value = initial.plan.to;
  $('search').value = store.get().query;
  $('event-view').value = store.get().eventView;
  document.querySelectorAll('[data-range]').forEach(element => { element.addEventListener('click', () => safely(() => preset(element.dataset.range))); const active = !restored && element.dataset.range === '7'; element.classList.toggle('active', active); element.setAttribute('aria-pressed', String(active)); });
  function chooseSport(sport) {
    store.update(state => ({ ...state, sport, view: 'events', competition: 'all', limit: 24 }));
    if (!document.documentElement.classList.contains('unified-desk') && (fixtureLabs[sport] || Object.hasOwn(discoveryOnly, sport))) $('events-view').scrollIntoView({block:'start'});
  }
  function navigateSport(sport) {
    if (!Object.hasOwn(sports, sport)) return;
    if (store.get().sport !== sport) {
      const url = new URL(location.href);
      url.searchParams.delete('desk-competition');
      if (sport === 'all') url.searchParams.delete('sport');
      else url.searchParams.set('sport', sport);
      history.pushState(null, '', url);
    }
    chooseSport(sport);
  }
  document.querySelectorAll('[data-sport]').forEach(element => element.addEventListener('click', () => navigateSport(element.dataset.sport)));
  window.addEventListener('popstate', () => {
    clearTimeout(searchTimer);
    const filters = urlFilters();
    renderWatchSelection();
    $('search').value = filters.query;
    $('event-view').value = filters.eventView;
    store.update(state => ({ ...state, ...filters, view: 'events', limit: 24 }));
  });
  document.querySelectorAll('[data-view]').forEach(element => element.addEventListener('click', () => store.update(state => ({ ...state, view: element.dataset.view }))));
  document.querySelectorAll('[data-slot]').forEach(element => element.addEventListener('click', () => store.update(state => ({ ...state, slot: Number(element.dataset.slot) - 1, replacing: null }))));
  for (const id of ['date-from', 'date-to']) $(id).addEventListener('change', () => safely(() => setRange($('date-from').value, $('date-to').value)));
  $('sport').addEventListener('change', event => navigateSport(event.target.value));
  $('competition').addEventListener('change', event => store.update(state => ({ ...state, competition: event.target.value, limit: 24 })));
  $('event-view').addEventListener('change', event => store.update(state => ({ ...state, eventView: event.target.value, limit: 24 })));
  let searchTimer; $('search').addEventListener('input', event => { clearTimeout(searchTimer); const query = event.target.value.slice(0,120).trim().toLocaleLowerCase('en-GB'); searchTimer = setTimeout(() => store.update(state => ({ ...state, query, limit: 24 })), 100); });
  $('refresh').addEventListener('click', () => safely(() => { if (!hybridEvidence?.pending) hybridEvidence = null; fixtureMarketRequest = null; fixtureSnapshots.clear(); renderFixtureCounts(store.get()); renderEvents(); return refresh(); }));
  $('find-racing')?.addEventListener('click',()=>safely(()=>{racingCandidatesRequested=true;renderRacingCandidates();$('racing-candidates')?.scrollIntoView?.({block:'nearest'});}));
  $('wildcard-build')?.addEventListener('click',()=>safely(createWeeklyWildcard));
  for (const id of ['fresh-daily-slips','fresh-daily-slips-panel'])
    $(id)?.addEventListener('click', () => safely(createFreshDailySlips));
  $('build-scope').addEventListener('change', () => renderSportActions(store.get()));
  $('generate').addEventListener('click', () => safely(() => { const state = store.get(); const scope = $('build-scope').value; const candidates = scope === 'all' ? state.events.filter(event => day(event.startUTC) >= state.plan.from && day(event.startUTC) <= state.plan.to) : filtered(state); savePlan(E.generateResearch(state.plan, candidates)); notice('Distinct research shortlists created where supported. Non-empty slips are retained. This is an evidence-coverage comparison, not verified value.'); }));
  $('slip-structure').addEventListener('change', event => safely(() => savePlan(E.setStructure(store.get().plan, store.get().slot + 1, event.target.value))));
  $('stake').addEventListener('input', event => { try { savePlan(E.setStake(store.get().plan, store.get().slot + 1, event.target.value || '0')); event.target.removeAttribute('aria-invalid'); } catch { event.target.setAttribute('aria-invalid', 'true'); } });
  $('stake').addEventListener('blur', () => { $('stake').value = store.get().plan.slots[store.get().slot].stakeMinor ? (store.get().plan.slots[store.get().slot].stakeMinor / 100).toFixed(2) : ''; $('stake').removeAttribute('aria-invalid'); });
  $('clear-slip').addEventListener('click', () => safely(() => savePlan(E.clearSlot(store.get().plan, store.get().slot + 1))));
  const inlineSlipStatus = message => write($('preview-slip-status'), message);
  $('preview-clear-slip')?.addEventListener('click', () => safely(() => {
    const {plan,slot} = store.get();
    saveEnvelope({plan:E.clearSlot(plan,slot+1),replacing:null});
    inlineSlipStatus('This slip is clear.');
    $('preview-reset-slip').focus();
  }));
  $('preview-reset-slip')?.addEventListener('click', () => safely(() => {
    const {plan,slot,events} = store.get();
    const current = plan.slots[slot];
    const next = E.generateResearch(E.clearSlot(plan,slot+1),events,Date.now(),{slotId:current.id});
    if (!next.slots[slot].legs.length) {
      inlineSlipStatus('No supported suggestions for this slip in the current date range.');
      return;
    }
    if (current.legs.length && !window.confirm('Replace the selections on this slip with current suggestions?')) return;
    saveEnvelope({plan:next,replacing:null});
    inlineSlipStatus('Suggested picks restored.');
  }));
  document.querySelectorAll('[data-pro-slot]').forEach(card => card.addEventListener('click', () => inlineSlipStatus('')));
  let pendingBackup = null, backupRevision = 0;
  $('backup-file').addEventListener('change', async event => {
    const revision = ++backupRevision;
    pendingBackup = null;
    const confirm = $('restore-confirm');
    confirm.disabled = true;
    const file = event.target.files?.[0];
    if (!file) { write($('backup-status'), 'Choose a Value Watch JSON backup.'); return; }
    write($('backup-status'), 'Checking backup…');
    try {
      if (file.size > 8_000_000) throw Error('This backup exceeds the browser storage limit.');
      const data = JSON.parse(await file.text());
      if (data?.recordType !== 'LOCAL_PAPER_RESEARCH' ||
          !Array.isArray(data.savedHistory) || !Array.isArray(data.privateNotes) || !Array.isArray(data.manualJournal)) {
        throw Error('Choose a complete backup created with Export JSON.');
      }
      const { schemaVersion, id, from, to, createdAt, updatedAt, revision:planRevision, slots,
        research_only, model_validation, publication_gate } = data;
      const plan = E.restore(JSON.stringify({ schemaVersion, id, from, to, createdAt, updatedAt,
        revision:planRevision, slots, research_only, model_validation, publication_gate }));
      const workspace = validateWorkspace({ version:4, plan, history:data.savedHistory, claims:data.privateNotes, journal:data.manualJournal });
      if (revision !== backupRevision) return;
      pendingBackup = workspace;
      confirm.disabled = false;
      write($('backup-status'), from + ' to ' + to + ' · ' + workspace.history.length + ' saved snapshots · ' +
        workspace.claims.length + ' private notes. Restoring replaces the workspace on this device.');
    } catch (error) {
      if (revision === backupRevision) write($('backup-status'), 'Backup rejected. ' + error.message);
    }
  });
  $('restore-confirm').addEventListener('click', () => {
    if (!pendingBackup) return;
    try {
      const {plan,history,claims,journal} = pendingBackup;
      saveEnvelope({plan,history,claims,journal,autoFill:false});
      store.update(state => ({...state,replacing:null,limit:24}));
      $('date-from').value = plan.from; $('date-to').value = plan.to;
      document.querySelectorAll('[data-range]').forEach(element => {
        element.classList.remove('active'); element.setAttribute('aria-pressed','false');
      });
      pendingBackup = null;
      $('restore-confirm').disabled = true;
      $('backup-file').value = '';
      write($('backup-status'), 'Backup restored on this device.');
      renderNavigation(); renderEvents(); renderSlip(); renderTracker();
    } catch (error) { write($('backup-status'), error.message); }
  });
  $('export').addEventListener('click', () => safely(() => { const state = store.get(); exportJSON({ ...E.freeze(state.plan, Date.now(), state.events), savedHistory: state.history, privateNotes: state.claims, manualJournal: state.journal }, 'value-watch-research-' + state.plan.from + '.json'); }));
  let saving = false;
  $('freeze').addEventListener('click', () => safely(async () => { if (saving) return; saving = true; $('freeze').disabled = true; try { const state = store.get(); if (state.history.some(record => record.snapshot.id === state.plan.id && record.snapshot.revision === state.plan.revision)) { notice('This revision is already saved. Find it in Saved research.'); return; } if (state.history.length >= 200) throw Error('Local journal limit reached. Export your research.'); const record = await S.seal(E.freeze(state.plan, Date.now(), state.events)); saveEnvelope({ history: [...store.get().history, record] }); notice('Original research saved. Paper outcomes can be annotated in Saved research.'); } finally { saving = false; $('freeze').disabled = false; } }));
  $('community').addEventListener('submit', event => { event.preventDefault(); safely(() => {
    const reasoning = $('reasoning').value.trim(); if (!reasoning || reasoning.length > 3000) throw Error('Enter reasoning of up to 3,000 characters.');
    const linkedEvent = noteEvents().find(item => item.id === $('note-event').value);
    const choice = linkedEvent?.choices.find(item => item.id === $('note-choice').value);
    const context = { eventId: linkedEvent?.id || null, event: linkedEvent?.name || null, choiceId: choice?.id || null, choice: choice?.label || null, sourceDate: $('note-source-date').value || null, concern: $('note-concern').value.trim().slice(0, 1500), kind: $('note-kind').value };
    const result = I.classifyClaim(reasoning, $('methodology').value, [$('evidence').value]); const root = $('community-result'); root.replaceChildren();
    const card = make(root, 'article', undefined, 'event-card community-review-card'); make(card, 'span', result.classification.replaceAll('_', ' ').toLowerCase(), 'event-status is-warning'); make(card, 'h3', 'Evidence review');
    make(result.highRisk ? details(card, 'High-risk claim · expand for review') : card, 'p', reasoning); make(card, 'p', 'Method: ' + result.methodology.replaceAll('_', ' ').toLowerCase(), 'small'); for (const source of result.sources || []) link(card, 'Submitted evidence', source);
    make(card, 'p', 'Classification is not fact verification or an allegation of fraud. Verified ROI, win rate and trust score remain unavailable.', 'muted');
    button(card, 'Save private research note', () => { const state = store.get(); if (state.claims.length >= 100) throw Error('Private note limit reached. Export your research.'); saveEnvelope({ claims: [...state.claims, { reasoning, methodology: result.methodology, sources: result.sources, classification: result.classification, createdAt: new Date().toISOString(), ...context }] }); notice('Research note saved privately on this device.'); });
  }); });
  // Independent score archive: never confuse research forecast ledger with a
  // results-history sample. Incomplete/stale feeds fail closed; no invented picks.
  fetch(new URL('historical-reliability-data.json',rootURL),{cache:'no-store'}).then(response => {
    if(!response.ok)throw Error('seven-competition results archive not yet published');
    return response.json();
  }).then(data => {
    if(data.schema_version!==1 || data.research_only!==true ||
       data.model_validation!=='UNVALIDATED' || data.publication_gate!=='BLOCKED' ||
       data.source_verification!=='SINGLE_SOURCE_UNVERIFIED' ||
       !Array.isArray(data.audit) || data.audit.length!==7 ||
       !Array.isArray(data.results) || data.results.length<90 ||
       !Number.isFinite(Date.parse(data.generated_at_utc)))
      throw Error('archive safety and coverage checks failed');
    if(Date.now()-Date.parse(data.generated_at_utc)>72*3600000 ||
       Date.parse(data.generated_at_utc)>Date.now()+600000)
      throw Error('historical source archive is stale or invalid');
    const sourceLeagues=new Set(data.audit.filter(a=>a.status==='SOURCE_REPORTED_UNVERIFIED'&&a.rows>0).map(a=>a.competition));
    if(window.ValueWatchReliability.competitions.some(league=>!sourceLeagues.has(league)))
      throw Error('a competition is missing');
    const unique=new Set();
    historicalResults=data.results.filter(entry=>{
      if(!entry || !sourceLeagues.has(entry.competition) || !entry.home || !entry.away ||
         !['H','D','A'].includes(entry.actual_outcome) ||
         entry.time_precision!=='DATE_ONLY_END_OF_DAY' ||
         !/^https:\/\/raw\.githubusercontent\.com\/oladeeayo\/open-matchday\//.test(entry.source_url||'') ||
         !Number.isFinite(Date.parse(entry.kickoff_utc)) ||
         Date.parse(entry.kickoff_utc)>=Date.now())return false;
      const key=[entry.competition,entry.home,entry.away,entry.kickoff_utc].join('|');
      if(unique.has(key))return false;
      unique.add(key);
      return true;
    });
    historicalStatus=historicalResults.length+' source-reported 2026/27 results across seven competitions · refreshed '+dateText(data.generated_at_utc)+' · not independently verified';
    if(selectedMethods.includes('reliability')){renderEvents();renderSlip();}
  }).catch(error=>{
    historicalResults=[];
    historicalStatus='seven-competition archive unavailable or stale ('+error.message+')';
    if(selectedMethods.includes('reliability')){renderEvents();renderSlip();}
  });
  store.subscribe(state => JSON.stringify([state.competition,state.query,state.eventView]), writeDeskFilters);
  store.subscribe(state => JSON.stringify([state.plan.id, state.plan.revision, state.slot, state.eventVersion, state.sport, state.competition, state.query, state.eventView, state.limit, state.replacing, state.clockTick, state.claims]), () => safely(() => { renderNavigation(); renderEvents(); renderSlip(); renderWildcard(); renderTracker(); }));
  store.subscribe(state => JSON.stringify([state.sport, state.plan.from, state.plan.to]), () => { if (store.get().view === 'history') safely(renderHistory); });
  store.subscribe(state => state.view, () => safely(renderView));
  store.subscribe(state => JSON.stringify([state.history, state.journal, state.claims]), () => { if (store.get().view === 'history') safely(renderHistory); });
  store.subscribe(state => state.eventVersion, () => { if (store.get().view === 'results') safely(renderResults); });
  window.addEventListener('storage', event => { if (event.key === key || event.key === null) persistence.invalidate(); });
   window.addEventListener('valuewatch:published-card-odds',()=>safely(renderEvents));
  let timer = null, lastRefresh = 0;
  function startClock() { if (timer === null) timer = setInterval(() => { if (!document.hidden) { store.update(state => ({ ...state, clockTick: state.clockTick + 1 })); if (navigator.onLine && Date.now() - lastRefresh >= 60000) safely(refresh); } }, 30000); }
  document.addEventListener('visibilitychange', () => { transport.setPaused(document.hidden); if (!document.hidden) safely(refresh); });
  window.addEventListener('online', () => { if (!document.hidden) safely(refresh); }); window.addEventListener('offline', () => notice('Offline · last good snapshots and saved research retained. Freshness checks still apply.'));
  window.addEventListener('pagehide', () => { clearInterval(timer); timer = null; transport.setPaused(true); for (const request of statsRequests.values()) request.abort(); });
  window.addEventListener('pageshow', () => { transport.setPaused(document.hidden); startClock(); if (!document.hidden) safely(refresh); });
  safely(() => {
    renderNavigation(); renderEvents(); renderSlip(); renderWildcard(); renderView(); startClock();
    refresh().then(result=>{
      if(result?.snapshots?.length&&!wildcardSaved()?.entries?.some(row=>row.week===wildcardWeek(today())))
        return createWeeklyWildcard(result).catch(error=>{
          // A missing weekly research candidate is never grounds to break the desk.
          const target=$('wildcard-result');
          if(target)make(target,'p','Automatic weekly review unavailable: '+error.message,'wildcard-note');
        });
    }).catch(report);
  });
})();
