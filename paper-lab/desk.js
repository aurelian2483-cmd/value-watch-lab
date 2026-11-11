'use strict';

(() => {
  const E = ResearchEngine, S = ResearchStore, I = ResearchInsights, C = ResearchConnections, J = ResearchJournal;
  const $ = id => document.getElementById(id);
  const rootURL = new URL('../', document.currentScript.src);
  const sports = { all: 'All sports', football: 'Football', racing: 'Horse racing', tennis: 'Tennis', nfl: 'NFL' };
  const symbols = { football: '⚽', racing: '♞', tennis: '◉', nfl: '◆' };
  const sources = { 'research-dashboard-data.json': ['football', 'Premier League'], 'football-expanded-data.json': ['football', 'Football leagues'], 'international-football-data.json': ['football', 'International football'], 'racing-research-data.json': ['racing', 'Racecards & source prices'], 'racing-future-data.json': ['racing-future', 'Future race schedules'], 'horse-predictions-data.json': ['racing-context', 'Racing model predictions'], 'other-sports-data.json': ['other', 'Tennis & NFL'], 'research-history.json': ['history', 'Historical results'] };
  const specs = Object.entries(sources).map(([file, [kind]]) => ({ kind, path: new URL(file, rootURL).pathname }));
  const key = 'value-watch-research-desk-v4';
  const day = E.day, today = () => new Intl.DateTimeFormat('sv-SE', {timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
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
  // Keep saved research, but do not strand every sport on a fully expired date range.
  if(initial.plan && typeof initial.plan.to==='string' && initial.plan.to<today()){
    initial.plan=E.createPlan({from:today(),to:plusDays(today(),13)});
  }
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
    const state = store.get(); if (persistence.write({ version: 4, plan, history: state.history, claims: state.claims, journal: state.journal })) write($('storage'), 'Saved on this device · export a backup');
  }
  function saveEnvelope(changes) {
    const state = store.get(), next = { version: 4, plan: state.plan, history: state.history, claims: state.claims, journal: state.journal, ...changes };
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
    const article = make(null, 'article', undefined, 'event-card'); article.dataset.eventId = id;
    const header = make(article, 'div', undefined, 'event-card-header');
    const meta = make(header, 'span', '', 'event-meta'), time = make(header, 'time', '', 'event-time'), title = make(article, 'h3', '', 'event-title');
    const status = make(article, 'span', '', 'event-status'), conditions = make(article, 'p', '', 'event-conditions');
    const prediction = make(article, 'div', '', 'prediction-summary'); prediction.setAttribute('aria-live', 'polite');
    const racingPanel = make(article, 'section', undefined, 'racing-highlights'); racingPanel.setAttribute('aria-label', 'Horse racing research highlights');
    const market = make(article, 'div', undefined, 'market-grid'), seasonPanel = make(article, 'section', undefined, 'season-comparison'), explanation = make(article, 'p', '', 'market-explanation'); seasonPanel.setAttribute('aria-label','Current-season-only model comparison');
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
    return { node: article, meta, time, title, status, conditions, prediction, market, racingPanel, seasonPanel, explanation, evidence, panel, buttons, check, modelPanel, notes, notesPanel, matchView, matchPanel, choices: new Map(), structural: '' };
  }
  function preferredStats(event) { return event?.stats?.h2h ? 'h2h' : Array.isArray(event?.stats?.recent) && event.stats.recent.length ? 'recent' : event?.stats?.rankings ? 'rankings' : 'sources'; }
  function patchCard(record, event) {
    for (const [tab, button] of record.buttons) { const available = tab === 'sources' || (tab === 'recent' ? Array.isArray(event.stats?.recent) && event.stats.recent.length > 0 : Boolean(event.stats?.[tab])); button.disabled = !available; button.title = available ? '' : 'Not supplied by the connected feed for this event'; }
    const state = store.get(), status = E.statusOf(event), selected = state.plan.slots[state.slot].legs;
    write(record.meta, symbols[event.sport] + ' ' + event.competition); write(record.time, dateText(event.startUTC)); record.time.dateTime = event.startUTC; write(record.title, event.name);
    write(record.status, status.label); record.status.className = 'event-status ' + (status.selectable ? 'is-current' : status.code === 'STARTED' ? '' : 'is-warning');
    const conditions = event.stats?.conditions; write(record.conditions, conditions ? [conditions.distance, conditions.going, conditions.raceClass && 'Class ' + conditions.raceClass].filter(Boolean).join(' · ') : event.choices[0]?.market || 'Research outcome');
    // Cross-sport v3 evidence signals: displayed independently from paper-slip selections.
    let evidencePanel=record.node.querySelector('.universal-evidence-v3');
    if(!evidencePanel){evidencePanel=make(record.node,'section',undefined,'universal-evidence-v3');record.prediction.after(evidencePanel);}
    evidencePanel.replaceChildren();
    const evidenceTitle=make(evidencePanel,'strong','Evidence v3 · '+(sports[event.sport]||event.sport));
    const contenders=(event.choices||[]).filter(c=>evaluateEvidenceSafe(event,c).green==='PROVISIONAL');
    const favourite=contenders.length===1?contenders[0]:null;
    const badges=favourite?evaluateEvidenceSafe(event,favourite):null;
    const gates=(event.choices||[]).map(choice=>({choice,gate:evaluateEvidenceSafe(event,choice)}));
    const blueChoices=gates.filter(x=>['VERIFIED','EXPERIMENTAL'].includes(x.gate.blue)).map(x=>x.choice.label);
    const sourceTie=gates.some(x=>x.gate.sourceTie===true);
    const yellowChoices=gates.filter(x=>['MULTI_USER_CONSENSUS','EXPERIMENTAL_AGREEMENT'].includes(x.gate.yellow)).map(x=>x.choice.label);
    make(evidencePanel,'p','GREEN · '+(favourite?favourite.label+(badges.greenBasis==='PUBLISHER_BETTING_FORECAST'?' · Provisional publisher forecast':' · Provisional observed-price favourite'):'Not established')+'  |  BLUE · '+(blueChoices.join(', ')||(sourceTie?'No clear leader · tied support':'Not awarded'))+'  |  YELLOW · '+(yellowChoices.join(', ')||'Not awarded'),'small');
    make(evidencePanel,'small','Publisher and forum sources labelled · Blue/Yellow are experimental source signals, not verified consensus · official market verification unavailable','muted');
    evidencePanel.style.cssText='padding:10px 12px;margin:10px 0;border:1px solid #52718b;border-radius:10px;background:#172b38;color:#f1f5f9';
    const communitySourcesOpen = Boolean(record.racingPanel.querySelector('.community-source-list')?.open);
    record.racingPanel.replaceChildren();
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
    const review = E.footballEvidenceReview(event);
    const leaders = E.modelLeaders(event), ordered = event.sport === 'racing' ? [...leaders.map(leader => event.choices.find(choice => choice.id === leader.id)), ...event.choices.filter(choice => !leaders.some(leader => leader.id === choice.id))] : event.choices;
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
        if(event.provisionalEntry)make(record.market,'p','Choose a source-listed horse for manual paper research. Final declarations unverified; no model prediction or verified price.','provisional-entry-note small');
        const shown = event.sport === 'racing' && ordered.length > 6 ? ordered.slice(0, 5) : ordered;
        const append = (parent, choice) => { const b = button(parent, '', () => select(event.id, choice.id), 'selection-button'); b.dataset.choiceId = choice.id; const modelBadge = make(b, 'span', '', 'model-pick-badge'), name = make(b, 'span', choice.label, 'selection-name'), price = make(b, 'strong', '—', 'selection-price'), caption = make(b, 'small', '', 'selection-caption'), odds = make(b, 'small', '', 'selection-odds'); record.choices.set(choice.id, { element: b, modelBadge, name, price, caption, odds, previous: null }); };
        for (const choice of shown) append(record.market, choice);
        if (shown.length < event.choices.length) { const rest = details(record.market, 'Show all ' + event.choices.length + ' runners', 'runner-disclosure'); const grid = make(rest, 'div', undefined, 'market-grid'); for (const choice of ordered.slice(shown.length)) append(grid, choice); }
      }
    }
    for (const choice of event.choices) {
      const view = record.choices.get(choice.id); if (!view) continue;
      const chosen = selected.some(leg => leg.eventId === event.id && leg.choiceId === choice.id), priced = typeof choice.quote?.decimal === 'number', publishedForecast=typeof choice.forecastPrice?.decimal==='number';
      const estimated = event.model && typeof choice.probability === 'number';
      const contextWeight = event.model?.probabilityKind === 'EXPERIMENTAL_CONTEXT_WEIGHT';
      const value = estimated ? pct(choice.probability) : priced ? choice.quote.decimal.toFixed(2) : publishedForecast?'Forecast '+choice.forecastPrice.decimal.toFixed(2):'No estimate';
      write(view.price, value); write(view.caption, (chosen ? 'IN THIS SLIP · ' : '') + (event.provisionalEntry?'PROVISIONAL PAPER CHOICE':estimated ? contextWeight ? 'CONTEXT WEIGHT · UNVALIDATED' : 'MODEL ESTIMATE · UNVALIDATED' : priced ? 'SOURCE ODDS · UNVERIFIED' : 'NO MODEL DATA'));
      write(view.odds, priced ? estimated ? 'Source odds ' + choice.quote.decimal.toFixed(2) + ' · unverified' : 'Bookmaker observation · unverified' : publishedForecast?'Publisher forecast · not bookmaker odds':'Bookmaker odds not connected');
      const leader = leaders.find(leader => leader.id === choice.id);
      const racingPick = event.sport === 'racing' ? racingPicks.find(pick => pick.choice.id === choice.id) : null;
      view.element.dataset.evidenceGreen=String(racingPick?.gate.green==='PROVISIONAL');
      view.element.dataset.evidenceBlue=String(['VERIFIED','EXPERIMENTAL'].includes(racingPick?.gate.blue));
      view.element.dataset.evidenceYellow=String(['MULTI_USER_CONSENSUS','EXPERIMENTAL_AGREEMENT'].includes(racingPick?.gate.yellow));
      view.modelBadge.hidden = !leader && !racingPick;
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
      view.name.textContent = racingPick ? '★ ' + choice.label : choice.label;
      view.name.style.setProperty('color', racingPick ? agreement ? '#fef08a' : hasCommunity ? '#bfdbfe' : '#e1ffae' : '', racingPick ? 'important' : '');
      view.modelBadge.style.setProperty('display', racingPick||leader ? 'block' : 'none', 'important');
      if (racingPick) view.modelBadge.textContent = agreement ? '🟡 EXPERIMENTAL AGREEMENT · PRICE/FORECAST + SOURCE' : racingPick.labels.join(' + ').toUpperCase();
      view.modelBadge.style.setProperty('color', racingPick ? agreement ? '#fef08a' : hasCommunity ? '#bfdbfe' : '#e1ffae' : '', racingPick ? 'important' : '');
      view.element.classList.toggle('is-model-first', leader?.rank === 1); view.element.classList.toggle('is-model-alternative', leader?.rank === 2);
      view.element.classList.toggle('is-selected', chosen); view.element.setAttribute('aria-pressed', String(chosen)); view.element.disabled = !status.selectable;
      view.element.setAttribute('aria-label', choice.label + ' · ' + (leader ? leader.rank === 1 ? 'model first choice · ' : 'model alternative · ' : '') + value + (contextWeight ? ' context weight' : estimated ? ' model estimate' : ' source odds') + ' · ' + (chosen ? 'remove from ' : 'add to ') + state.plan.slots[state.slot].name);
      if (priced && view.previous !== null && view.previous !== choice.quote.decimal) { view.element.classList.remove('odds-up', 'odds-down'); view.element.classList.add(choice.quote.decimal > view.previous ? 'odds-up' : 'odds-down'); }
      view.previous = priced ? choice.quote.decimal : null;
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
    write(record.prediction, leaders.length ? leaders.map(leader => (leader.rank === 1 ? 'Model first choice: ' : 'Alternative: ') + event.choices.find(choice => choice.id === leader.id).label).join(' · ') + (event.model.probabilityKind === 'EXPERIMENTAL_CONTEXT_WEIGHT' ? ' · experimental form ranking, not calibrated win chances' : ' · experimental model ranking') + (review?.notes.length ? ' · EVIDENCE REVIEW REQUIRED — model ranking is NOT a betting recommendation' : '') : event.model ? 'Model estimates are tied or no longer current; no distinct current first choice.' : 'No model selection: ' + (event.predictionStatus?.label || 'Model inputs unavailable.'));
    record.prediction.classList.toggle('evidence-review-required', Boolean(review?.notes.length));
    const notes = state.claims.filter(note => note.eventId === event.id);
    record.notes.hidden = !notes.length;
    const noteSignature = JSON.stringify(notes);
    if (record.notesPanel.dataset.signature !== noteSignature) {
      record.notesPanel.dataset.signature = noteSignature; record.notesPanel.replaceChildren();
      for (const note of notes) showNote(record.notesPanel, note);
    }
    record.check.href = C.eventLink(event, 'www.oddschecker.com') || C.oddschecker(event.sport);
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
    if (summary) write(summary, 'Why do slips favour one sport? · ' + available + ' eligible across four sports');
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
    make(target, 'p', 'Best Evidence, Balanced and Longshot rank by descriptive evidence coverage without sport quotas. ' +
      'Cross-Sport Explorer rotates through sports that actually qualify. Existing saved selections are never overwritten. ' +
      'No odds, expected value or model calibration is verified here.', 'small');
  }
  function renderEvents() {
    renderRacingCandidates();
    renderPaperEligibilityAudit();
    const state = store.get(), rows = filtered(state), visible = rows.slice(0, state.limit), root = $('events'); root.setAttribute('aria-busy', 'false');
    if (!cards.size) root.replaceChildren(); root.querySelectorAll('.event-empty, .load-more').forEach(element => element.remove());
    S.reconcile(root, visible.map(event => event.id), cards, createCard, (record, id) => patchCard(record, visible.find(event => event.id === id)));
    if (!visible.length && state.sport === 'racing') {
      const dates = [...new Set(state.events.filter(event => event.sport === 'racing').map(event => day(event.startUTC)))].sort();
      const latest = dates.at(-1);
      const upcomingMeetings=racingFixtureMeetings.filter(m=>m.date>=state.plan.from&&m.date<=state.plan.to); const box = empty(root, '0 verified racecards · '+upcomingMeetings.length+' scheduled meetings', (upcomingMeetings.length ? 'Meeting dates and courses are available, but race times, runners and odds are not yet verified. See the scheduled meetings below. ' : 'No meeting fixtures are loaded for the selected dates. ') + 'Racecards remain unavailable until verified source data is collected.', { label: 'Show next 14 days', run: () => { store.update(current => ({ ...current, competition: 'all', query: '', eventView: 'upcoming' })); $('search').value = ''; $('event-view').value = 'upcoming'; preset('14'); } }); box.classList.add('event-empty');
      if (latest && latest !== today()) button(box, 'View dated previous cards', () => { store.update(current => ({ ...current, competition: 'all', query: '', eventView: 'all' })); $('search').value = ''; $('event-view').value = 'all'; setRange(latest, latest); }, 'button button-quiet');
    }
    else if (!visible.length) { const box = empty(root, state.snapshotState?.status === 'unavailable' ? 'Research sources unavailable' : 'No events match this view', 'Try another sport or a wider date range. Saved research remains available; no events are invented to fill the board.', { label: 'Show next 14 days', run: () => preset('14') }); box.classList.add('event-empty'); }
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
    write($('coverage-summary'), rows.length + ' matching your filters · ' + state.events.length + ' total loaded records across all dates. Coverage is incomplete; zero means no matching records in these feeds.');
    write($('event-summary'), rows.length + ' ' + (state.eventView === 'upcoming' ? 'upcoming' : 'recorded') + ' event' + (rows.length === 1 ? '' : 's') + ' · ' + state.plan.from + ' → ' + state.plan.to + ' · UK time');
  }
  function renderNavigation() {
    const state = store.get(); $('sport').value = state.sport;
    document.querySelectorAll('[data-sport]').forEach(element => { const active = element.dataset.sport === state.sport; element.classList.toggle('active', active); element.setAttribute('aria-pressed', String(active)); });
    document.querySelectorAll('[data-count]').forEach(element => write(element, filtered({ ...state, sport: element.dataset.count }).length));
    const competitions = [...new Set(filtered({ ...state, competition: 'all' }).map(event => event.competition))].sort(), signature = JSON.stringify(competitions);
    if (state.competition !== 'all' && !competitions.includes(state.competition)) store.update(current => ({ ...current, competition: 'all', limit: 24 }));
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
          link(game, 'Check prices on Oddschecker ↗', C.eventLink(event, 'www.oddschecker.com') || C.oddschecker(event.sport));
        }
      }
    }
    if (!root.children.length) make(root, 'p', 'No tracked events in this range.', 'rail-empty');
    root.querySelectorAll('details').forEach(element => { element.open = opened.has(element.dataset.key); });
  }
  function patchLeg(record, leg, position, slot) {
    const signature = JSON.stringify([leg, position, slot.id, slot.legs.length, store.get().replacing, store.get().claims, store.get().plan.from, store.get().plan.to], (key, value) => key === 'ageMs' ? undefined : value); if (record.signature === signature) return;
    const opened = record.node.querySelector('details')?.open; record.signature = signature; record.node.replaceChildren();
    const top = make(record.node, 'div', undefined, 'slip-selection-top'); make(top, 'strong', leg.label);
    button(top, '×', () => savePlan(E.removeSelection(store.get().plan, slot.id, leg.id)), 'remove-button').setAttribute('aria-label', 'Remove ' + leg.label);
    make(record.node, 'p', symbols[leg.sport] + ' ' + leg.event, 'slip-selection-meta'); make(record.node, 'p', dateText(leg.startUTC) + ' · ' + leg.market, 'slip-selection-meta');
    const state = E.statusOf(store.get().events.find(event => event.id === leg.eventId));
    make(record.node, 'span', !leg.currentStatus?.selectable ? leg.currentStatus?.label || state.label : leg.quote?.decimal ? leg.quote.decimal.toFixed(2) + ' · unverified source price' : (typeof leg.probability === 'number' ? pct(leg.probability) + (leg.model?.probabilityKind === 'EXPERIMENTAL_CONTEXT_WEIGHT' ? ' context weight' : ' model win estimate') + ' · UNVALIDATED · odds not connected' : 'No model estimate · odds not connected'), 'leg-state' + (!leg.currentStatus?.selectable ? ' is-warning' : ''));
    if(leg.provisionalEntry)make(record.node,'p','Provisional paper entry · final declarations unverified','warning-line');
    // Mathematical hurdle only: this is not an estimated probability or positive-EV claim.
    if (Number.isFinite(leg.quote?.decimal) && leg.quote.decimal > 1) {
      const hurdle = 100 / leg.quote.decimal;
      make(record.node,'p','Breakeven hurdle: '+hurdle.toFixed(1)+'% at captured decimal odds '+leg.quote.decimal.toFixed(2)+(leg.quote.decimal < 2 ? ' · heavy-favourite price resistance: a high win rate is required' : '')+' · price unverified','slip-selection-meta');
    } else {
      make(record.node,'p','Breakeven hurdle: UNKNOWN · no captured decimal price','slip-selection-meta');
    }
    if (leg.sport === 'racing') {
      const marketAudit = details(record.node, 'Exchange movement & closing line · research', 'leg-market-audit');
      make(marketAudit,'p','Exchange trend: UNKNOWN · no verified timestamped Betfair exchange price pair or matched-volume evidence is connected.','small');
      make(marketAudit,'p','Betfair SP / Closing Line Value: UNKNOWN · no independently attributable BSP benchmark is connected.','small');
      make(marketAudit,'p','No steamer, drifter, 20% drift, convergence or CLV claim is inferred from bookmaker prices.','small');
    }
    if (day(leg.startUTC) < store.get().plan.from || day(leg.startUTC) > store.get().plan.to) make(record.node, 'p', 'Outside your selected dates · original selection retained', 'warning-line');
    const actions = make(record.node, 'div', undefined, 'selection-actions');
    const up = button(actions, '↑', () => savePlan(E.moveSelection(store.get().plan, slot.id, leg.id, position - 1)), 'move-button'); up.disabled = position === 0; up.setAttribute('aria-label', 'Move ' + leg.label + ' up');
    const down = button(actions, '↓', () => savePlan(E.moveSelection(store.get().plan, slot.id, leg.id, position + 1)), 'move-button'); down.disabled = position === slot.legs.length - 1; down.setAttribute('aria-label', 'Move ' + leg.label + ' down');
    button(actions, store.get().replacing === leg.id ? 'Cancel replace' : 'Replace', () => { store.update(state => ({ ...state, view: 'events', replacing: state.replacing === leg.id ? null : leg.id })); closeSlip(); notice('Choose a board outcome to replace ' + leg.label + '.'); });
    const evidence = details(record.node, 'Captured evidence & price', 'leg-evidence'); evidence.open = Boolean(opened);
    make(evidence, 'p', 'Captured ' + dateText(leg.capturedAt) + ' · estimate ' + pct(leg.probability) + ' · uncertainty unquantified', 'small'); provenance(evidence, leg.sources);
    for (const note of store.get().claims.filter(note => note.eventId === leg.eventId && (!note.choiceId || note.choiceId === leg.choiceId))) showNote(evidence, note);
    if (leg.quote) { link(evidence, 'Original price source', leg.quote.source); make(evidence, 'p', 'Observed ' + dateText(leg.quote.observedAt) + ' · not independently verified', 'small'); }
    if (leg.quoteState === 'PRICE_CHANGED') make(evidence, 'p', 'The source price changed. Replace this outcome explicitly to capture the current observation.', 'warning-line');
    if (state.selectable) {
      const form = make(evidence, 'form', undefined, 'record-price-form');
      const field = (label, type, value) => { const wrap = make(form, 'label', label), input = make(wrap, 'input'); input.type = type; input.value = value; input.required = true; return input; };
      link(evidence, 'Check prices on Oddschecker ↗', C.oddschecker(leg.sport));
      const price = field('Observed decimal price', 'number', leg.quote?.decimal || ''); price.min = '1.00000001'; price.max = '100000'; price.step = 'any';
      const bookmaker = field('Bookmaker', 'text', leg.quote?.bookmaker || 'Sky Bet'); bookmaker.maxLength = 100;
      const source = field('Evidence source URL', 'url', leg.quote?.source || '');
      const seen = field('Observation time (UTC)', 'datetime-local', new Date().toISOString().slice(0, 16));
      const submit = make(form, 'button', 'Record unverified source price', 'button button-secondary'); submit.type = 'submit'; make(form, 'p', 'User-recorded evidence only. Source, market and availability require independent checking.', 'small');
      form.addEventListener('submit', event => { event.preventDefault(); safely(() => savePlan(E.setRecordedQuote(store.get().plan, slot.id, leg.id, { decimal: Number(price.value), source: source.value, observedAt: new Date(seen.value + 'Z').toISOString(), bookmaker: bookmaker.value }))); });
    }
  }
  const X = ResearchExperimental;
  let engineView = 'current';
  try { engineView = X.mode(storage.getItem(X.preferenceKey)); } catch { /* Default view remains usable without storage. */ }
  function renderEngine(evaluation) {
    document.querySelectorAll('[data-engine]').forEach(element => element.setAttribute('aria-pressed', String(element.dataset.engine === engineView)));
    write($('engine-status'), ({current:'Current Engine 2.5 · existing research workflow.', experimental:'Experimental Engine 3.0 · illustrative, uncalibrated research mathematics.', compare:'Side-by-Side Compare · same captured inputs; no reranking.'})[engineView]);
    const root = $('engine-analysis'); root.hidden = engineView === 'current'; root.replaceChildren();
    if (root.hidden) return;
    make(root, 'h3', 'Selected paper slip · ' + store.get().plan.slots[store.get().slot].name);
    make(root, 'p', 'ILLUSTRATIVE: ±3 percentage points is a sensitivity scenario, not measured uncertainty. Calibration, Bayesian uncertainty, adaptive ranking and backtesting are not implemented here. No joint probability or portfolio EV is inferred.', 'small');
    if (!evaluation.legs.length) make(root, 'p', 'Choose an outcome to inspect its supplied inputs. No example probabilities or prices are substituted.');
    for (const leg of evaluation.legs) {
      const row = make(root, 'article', undefined, 'engine-comparison');
      make(row, 'h4', leg.event + ' · ' + leg.label);
      const current = make(row, 'div');
      if (engineView === 'compare') make(current, 'h4', 'Current Engine 2.5');
      make(current, 'p', 'Captured estimate: ' + pct(leg.probability) + ' · ' + (leg.model?.probabilityKind || 'No model input') + ' · UNVALIDATED');
      make(current, 'p', 'Source decimal price: ' + (leg.quote?.decimal ?? 'Unavailable') + ' · ' + leg.quoteState + ' · not executable', 'small');
      const experimental = make(row, 'div');
      make(experimental, 'h4', 'Experimental Engine 3.0');
      const result = leg.canCalculate && leg.currentStatus.selectable ? X.calculate(leg.probability, leg.quote?.decimal) : null;
      if (!result) { make(experimental, 'p', 'Unavailable: a supplied model input and a current source-matched price for a selectable outcome are required. No probability or odds inferred.'); continue; }
      make(experimental, 'p', 'Conditional arithmetic only. Racing context weights are not calibrated win probabilities; these results do not establish value.', 'small');
      make(experimental, 'p', 'Central EV: ' + pct(result.centralEV) + ' · break-even p: ' + pct(result.breakEven));
      make(experimental, 'p', 'Sensitivity p: ' + pct(result.low) + ' / ' + pct(result.probability) + ' / ' + pct(result.high) + ' → EV: ' + pct(result.lowEV) + ' / ' + pct(result.centralEV) + ' / ' + pct(result.highEV));
      make(experimental, 'p', 'Fragility (p − 1/o): ' + (result.fragility * 100).toFixed(2) + ' percentage points. A nonpositive margin means no positive central EV.');
      make(experimental, 'p', 'Unit-stake payoff variance: ' + result.variance.toFixed(4) + ' · EV sensitivity dEV/dp: ' + result.sensitivity.toFixed(4));
    }
    make(root, 'p', 'Formulae: EV = p×o−1; break-even = 1/o; fragility = p−1/o; variance = o²p(1−p). Unit stake = 1; no actual stake or settlement implied.', 'small');
  }
  document.querySelectorAll('[data-engine]').forEach(element => element.addEventListener('click', () => safely(() => {
    engineView = X.mode(element.dataset.engine);
    renderSlip();
    try { storage.setItem(X.preferenceKey, engineView); } catch { write($('engine-status'), $('engine-status').textContent + ' View preference could not be saved on this device.'); }
  })));
  let slipSignature = '';
  function renderSlip() {
    const state = store.get(), slot = state.plan.slots[state.slot], evaluation = E.evaluateSlot(slot, state.events);
    renderEngine(evaluation);
    write($('slip-title'), slot.name); write($('slip-subtitle'), slot.description); write($('slip-count'), slot.legs.length + ' / 15'); write($('mobile-count'), state.plan.slots.reduce((sum, slot) => sum + slot.legs.length, 0));
    document.querySelectorAll('[data-slot]').forEach(element => { const active = Number(element.dataset.slot) === state.slot + 1; element.classList.toggle('active', active); element.setAttribute('aria-pressed', String(active)); });
    if (document.activeElement !== $('stake')) $('stake').value = slot.stakeMinor ? (slot.stakeMinor / 100).toFixed(2) : ''; $('slip-structure').value = slot.structure;
    const signature = JSON.stringify([state.slot, evaluation, state.replacing, state.claims, state.plan.from, state.plan.to], (key, value) => key === 'ageMs' ? undefined : value); if (slipSignature === signature) return; slipSignature = signature;
    const root = $('slip-content'); if (!legs.size) root.replaceChildren(); root.querySelectorAll('.slip-empty, .generation-note').forEach(element => element.remove());
    S.reconcile(root, evaluation.legs.map(leg => leg.id), legs, id => { const row = make(null, 'article', undefined, 'slip-selection'); row.dataset.legId = id; return { node: row, signature: '' }; }, (record, id) => { const position = evaluation.legs.findIndex(leg => leg.id === id); patchLeg(record, evaluation.legs[position], position, slot); });
    if (!slot.legs.length) empty(root, 'Your perspective starts here.', 'Choose an outcome or build a research shortlist. Empty slips are valid.').classList.add('slip-empty');
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
    for (const spec of specs) { const file = new URL(spec.path, rootURL).pathname.split('/').pop(), snapshot = result.snapshots.find(item => item.path === spec.path), error = result.errors.find(item => item.path === spec.path), row = make($('feeds'), 'div', undefined, 'source-row'); make(row, 'strong', sources[file][1], 'source-name'); make(row, 'span', error ? error.retained ? 'Refresh failed · last good snapshot retained' : 'Unavailable' : 'Snapshot ' + dateText(snapshot?.document.generated_at_utc), 'source-status'); const technical = details(row, 'Technical details', 'source-debug'); make(technical, 'code', file); if (snapshot) make(technical, 'p', snapshot.document.generated_at_utc, 'small'); if (error) make(technical, 'p', error.message, 'warning-line'); }
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
    if (!persistence.failed) {
      const state = store.get();
      const eligible = state.events.filter(event => day(event.startUTC) >= state.plan.from && day(event.startUTC) <= state.plan.to);
      if (eligible.length && state.plan.slots.some(slot => !slot.legs.length)) {
        const generated = E.generateResearch(state.plan, eligible);
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
      if (events.length && !persistence.failed) {
        const current = store.get().plan;
        const eligible = events.filter(event => !event.futureScheduleOnly && day(event.startUTC) >= current.from && day(event.startUTC) <= current.to);
        if (current.slots.some(slot => !slot.legs.length) && eligible.length) {
          const generated = E.generateResearch(current, eligible);
          if (generated.slots.some((slot, index) => slot.legs.length !== current.slots[index].legs.length)) savePlan(generated);
        }
      }
      renderSources(result); notice((result.errors.length ? 'Some sources need attention · ' : '') + events.length + ' total records loaded across all dates · snapshot files checked ' + dateText(result.checkedAt)); }); } });
  let refreshInFlight=null;
  const refresh = () => {
    if(refreshInFlight)return refreshInFlight;
    lastRefresh=Date.now();$('refresh').disabled=true;
    refreshInFlight=(async()=>{
      try { await Promise.all([refreshCommunity(),refreshTournamentCoverage(),refreshRacingFixtures()]); return await transport.refresh(specs); }
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
  $('find-racing')?.addEventListener('click',()=>safely(()=>{racingCandidatesRequested=true;renderRacingCandidates();$('racing-candidates')?.scrollIntoView?.({block:'nearest'});}));
  $('generate').addEventListener('click', () => safely(() => { const state = store.get(); const scope = $('build-scope').value; const candidates = scope === 'all' ? state.events.filter(event => day(event.startUTC) >= state.plan.from && day(event.startUTC) <= state.plan.to) : filtered(state); savePlan(E.generateResearch(state.plan, candidates)); notice('Distinct research shortlists created where supported. Non-empty slips are retained. This is an evidence-coverage comparison, not verified value.'); }));
  $('slip-structure').addEventListener('change', event => safely(() => savePlan(E.setStructure(store.get().plan, store.get().slot + 1, event.target.value))));
  $('stake').addEventListener('input', event => { try { savePlan(E.setStake(store.get().plan, store.get().slot + 1, event.target.value || '0')); event.target.removeAttribute('aria-invalid'); } catch { event.target.setAttribute('aria-invalid', 'true'); } });
  $('stake').addEventListener('blur', () => { $('stake').value = store.get().plan.slots[store.get().slot].stakeMinor ? (store.get().plan.slots[store.get().slot].stakeMinor / 100).toFixed(2) : ''; $('stake').removeAttribute('aria-invalid'); });
  $('clear-slip').addEventListener('click', () => safely(() => savePlan(E.clearSlot(store.get().plan, store.get().slot + 1))));
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
  store.subscribe(state => JSON.stringify([state.plan.revision, state.slot, state.eventVersion, state.sport, state.competition, state.query, state.eventView, state.limit, state.replacing, state.clockTick, state.claims]), () => safely(() => { renderNavigation(); renderEvents(); renderSlip(); renderTracker(); }));
  store.subscribe(state => JSON.stringify([state.sport, state.plan.from, state.plan.to]), () => { if (store.get().view === 'history') safely(renderHistory); });
  store.subscribe(state => state.view, () => safely(renderView));
  store.subscribe(state => JSON.stringify([state.history, state.journal, state.claims]), () => { if (store.get().view === 'history') safely(renderHistory); });
  store.subscribe(state => state.eventVersion, () => { if (store.get().view === 'results') safely(renderResults); });
  window.addEventListener('storage', event => { if (event.key === key || event.key === null) persistence.invalidate(); });
  let timer = null, lastRefresh = 0;
  function startClock() { if (timer === null) timer = setInterval(() => { if (!document.hidden) { store.update(state => ({ ...state, clockTick: state.clockTick + 1 })); if (navigator.onLine && Date.now() - lastRefresh >= 60000) safely(refresh); } }, 30000); }
  document.addEventListener('visibilitychange', () => { transport.setPaused(document.hidden); if (!document.hidden) safely(refresh); });
  window.addEventListener('online', () => { if (!document.hidden) safely(refresh); }); window.addEventListener('offline', () => notice('Offline · last good snapshots and saved research retained. Freshness checks still apply.'));
  window.addEventListener('pagehide', () => { clearInterval(timer); timer = null; transport.setPaused(true); for (const request of statsRequests.values()) request.abort(); });
  window.addEventListener('pageshow', () => { transport.setPaused(document.hidden); startClock(); if (!document.hidden) safely(refresh); });
  safely(() => { renderNavigation(); renderEvents(); renderSlip(); renderView(); startClock(); refresh().catch(report); });
})();
