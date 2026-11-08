(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./core.js'), require('../research-audit-core.js'), require('../racecards-core.js'));
  } else {
    root.ResearchEngine = factory(root.PaperLab, root.ResearchAudit, root.RaceCards);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Core, Audit, Cards) {
  'use strict';

  const GATES = Object.freeze({ research_only: true, model_validation: 'UNVALIDATED', publication_gate: 'BLOCKED' });
  const APPROACHES = Object.freeze([
    { id: 'best-evidence', name: 'Best Evidence', description: 'Source coverage and available research first.', structure: 'singles' },
    { id: 'balanced', name: 'Balanced', description: 'Compare a small set as singles, doubles or trebles.', structure: 'doubles' },
    { id: 'explorer', name: 'Cross-Sport Explorer', description: 'Explore evidence across available sports.', structure: 'accumulator' },
    { id: 'longshot', name: 'Experimental Longshot', description: 'Larger combinations, with dependence and uncertainty unresolved.', structure: 'accumulator' }
  ]);
  const SPORTS = Object.freeze({ football: 'FOOTBALL', racing: 'HORSE_RACING', tennis: 'TENNIS', nfl: 'NFL', rugby_union: 'RUGBY_UNION', rugby_league: 'RUGBY_LEAGUE' });
  const STRUCTURES = new Set(['singles', 'doubles', 'trebles', 'accumulator']);
  const MAX_LEGS = 15;
  const MAX_STAKE_MINOR = 100000000;
  const MAX_MONEY_MINOR = 1000000000000;
  const list = value => Array.isArray(value) ? value : [];
  const clone = value => structuredClone(value);
  const str = (value, max = 500) => typeof value === 'string' ? value.trim().slice(0, max) : '';
  const instant = value => typeof value === 'string' && /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? Date.parse(value) : NaN;
  const validProbability = value => typeof value === 'number' && Number.isFinite(value) && value > 0 && value < 1;
  const vector = values => values.length > 1 && values.every(validProbability) && Math.abs(values.reduce((sum, value) => sum + value, 0) - 1) < 1e-8;
  const key = (...parts) => JSON.stringify(parts);

  function dateOnly(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw Error('Choose a valid calendar date.');
    const parsed = new Date(value + 'T12:00:00Z');
    if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw Error('Choose a valid calendar date.');
    return value;
  }

  function range(from, to) {
    dateOnly(from); dateOnly(to);
    const days = (Date.parse(to + 'T12:00:00Z') - Date.parse(from + 'T12:00:00Z')) / 86400000 + 1;
    if (days < 1 || days > 90) throw Error('Choose an ordered date range of at most 90 days.');
    return { from, to, days };
  }

  function sourceRows(rows, observedAt, path) {
    const sources = list(rows).map(source => {
      const url = Core.url(source?.url || source?.source);
      const observed = source?.observed_at_utc || source?.received_at_utc || source?.observedAt;
      if (!url || !Number.isFinite(instant(observed))) return null;
      return { url, observedAt: observed, sha256: /^[a-f0-9]{64}$/i.test(source.sha256 || '') ? source.sha256 : null, kind: 'PROVIDER_RECEIPT', label: new URL(url).hostname.replace(/^www\./, ''), path: null };
    }).filter(Boolean);
    if (!sources.length) sources.push({ url: null, observedAt, sha256: null, kind: 'PUBLISHED_SNAPSHOT', label: 'Published research snapshot; event-level receipt unavailable', path: str(path, 200) });
    return sources;
  }

  function makeEvent({ sport, identity, providerId, competition, name, participants, startUTC, observedAt, sources, choices, stats, model, extra = {} }, now) {
    if (!SPORTS[sport] || !name || !Number.isFinite(instant(startUTC)) || !Number.isFinite(instant(observedAt))) return null;
    if (participants.length < 2 || new Set(participants.map(p => p.id)).size !== participants.length || choices.length < 2 || new Set(choices.map(c => c.id)).size !== choices.length) return null;
    const result = {
      schema_version: 1, id: key(sport, identity, startUTC), identity: key(sport, identity), sport_type: SPORTS[sport], sport,
      competition: str(competition) || 'Competition not supplied', name: str(name), participants, startUTC, observedAt,
      receivedAt: null, provider: sources.some(s => s.kind === 'PROVIDER_RECEIPT') ? sources.filter(s => s.url).map(s => s.label).join(' + ') : 'Published repository snapshot',
      providerEventId: providerId ? String(providerId) : null, sources, choices, stats: stats || {}, model: model || null,
      ttlMs: sport === 'racing' ? 1800000 : 129600000, score: null, ...extra, ...GATES
    };
    result.status = statusOf(result, now);
    return result;
  }

  function football(document, path, now) {
    const modelRows = list(document.experimental_model_forecasts);
    return list(document.upcoming_fixtures).map(row => {
      if (!str(row?.home) || !str(row?.away) || row.home === row.away) return null;
      const league = row.league || 'PL', start = row.kickoff_utc;
      const candidates = modelRows.filter(model => model.home === row.home && model.away === row.away && instant(model.kickoff_utc) === instant(start) && (model.league || 'PL') === league);
      const model = candidates.find(model => model.research_only === true && model.publication_gate === 'BLOCKED' && model.model_validation === 'UNVALIDATED' && model.odds === null && model.expected_value === null && vector([model.prob_home, model.prob_draw, model.prob_away]) && instant(model.generated_at_utc || document.generated_at_utc) < instant(start) - 300000) || null;
      const h2h = row.head_to_head_research;
      const sources = sourceRows(row.schedule_source_receipts, document.generated_at_utc, path);
      const participants = [{ id: key(league, row.home), name: str(row.home) }, { id: key(league, row.away), name: str(row.away) }];
      return makeEvent({ sport: 'football', identity: key(league, row.home, row.away), providerId: row.espn_event_id, competition: row.league_name || ({ PL: 'Premier League', E1: 'Championship' }[league] || league), name: row.home + ' vs ' + row.away, participants, startUTC: start, observedAt: document.generated_at_utc, sources,
        choices: [{ id: 'home', label: str(row.home), probability: model?.prob_home ?? null }, { id: 'draw', label: 'Draw', probability: model?.prob_draw ?? null }, { id: 'away', label: str(row.away), probability: model?.prob_away ?? null }].map(choice => ({ ...choice, uncertainty: null, quote: null, market: 'Match result · regulation time' })),
        model: model ? { name: str(model.model), observedAt: model.generated_at_utc || document.generated_at_utc, validation: 'UNVALIDATED', probabilityKind: 'EXPERIMENTAL_MODEL_ESTIMATE', uncertainty: null, trainingMode: str(model.training_basis?.mode), trainingSource: str(model.training_basis?.source_receipts?.[0]?.url), trainingSampleSize: model.training_basis?.training_matches ?? null } : null,
        stats: { h2h: h2h && Number.isSafeInteger(h2h.sample_size) && h2h.sample_size >= 0 ? clone(h2h) : null, recent: null, rankings: null },
        extra: { providerStatus: str(row.status || row.event_status), league, forecastStatus: str(row.forecast_status), forecastEligible: row.forecast_eligible === true, seasonComparison: row.current_season_comparison && row.current_season_comparison.research_only === true && row.current_season_comparison.publication_gate === 'BLOCKED' && row.current_season_comparison.odds === null && row.current_season_comparison.expected_value === null && row.current_season_comparison.method === 'CURRENT_SEASON_POISSON_COMPARISON_V1' && vector([row.current_season_comparison.prob_home,row.current_season_comparison.prob_draw,row.current_season_comparison.prob_away]) && Number.isSafeInteger(row.current_season_comparison.home_venue_matches) && Number.isSafeInteger(row.current_season_comparison.away_venue_matches) ? clone(row.current_season_comparison) : null }
      }, now);
    }).filter(Boolean);
  }

  function footballEvidenceReview(event) {
    if (!event || event.sport !== 'football' || !event.model) return null;
    const notes = [];
    if (event.model.trainingMode === 'PRIOR_SEASON') notes.push('Forecast uses prior-season scoring data; current-season form is not included in this estimate.');
    if (!event.stats?.recent || !event.stats?.recent.length) notes.push('Recent five-match form is not supplied to this model.');
    const h2h = event.stats?.h2h;
    const venue = h2h?.at_current_home_venue;
    if (venue && Number.isSafeInteger(venue.sample_size) && venue.sample_size >= 3 && venue.away_wins === venue.sample_size) {
      notes.push('Historical H2H check: away team won all ' + venue.sample_size + ' recorded meetings at this home venue; descriptive evidence only.');
    }
    if (h2h?.status === 'DESCRIPTIVE_ONLY_NOT_VALIDATED') notes.push('Head-to-head history is descriptive and is not incorporated into the forecast probabilities.');
    if (event.forecastEligible === false) notes.push('This event is not eligible for the official prospective prediction challenge.');
    return { status: notes.length ? 'REVIEW_REQUIRED' : 'LIMITED_EVIDENCE', notes, verifiedMarketComparison: false, actionable: false };
  }

  function racing(document, path, now, contextFeed) {
    return list(document.races).map(row => {
      const runners = list(row?.runners), active = runners.filter(horse => horse.active_runner === true && horse.runner_status === 'RUNNER');
      const observedAt = row.runner_observed_at_utc || row.observedAtUTC || document.generated_at_utc;
      const sources = sourceRows([{ url: row.runner_source || row.source, observed_at_utc: observedAt, sha256: row.runner_source_sha256 }, ...(row.going_basis === 'SECOND_PUBLISHER_STRUCTURED_GOING' && row.secondary_going_receipt ? [row.secondary_going_receipt] : [])], observedAt, path);
      const checked = Cards.contextForecast(row, contextFeed, now);
      const forecast = checked.valid && checked.fresh ? checked.record : null;
      const choices = active.map(horse => {
        const quote = Core.quote({ sport: 'racing', raw: row }, String(horse.horse_id), now);
        return { id: String(horse.horse_id), label: str(horse.name), probability: forecast?.runners.find(runner => String(runner.horse_id) === String(horse.horse_id))?.model_probability ?? null, uncertainty: null, market: 'Win', quote: quote.decimal === null ? null : { decimal: quote.decimal, source: quote.source, observedAt: quote.observed, bookmaker: quote.bookmaker, status: quote.status, executable: false } };
      });
      const recent = active.map(horse => ({ participantId: String(horse.horse_id), name: str(horse.name), runs: list(horse.previous_results).filter(run => /^\d{4}-\d{2}-\d{2}$/.test(run.date || '') && run.date < Core.day(row.startUTC) && run.date <= Core.day(observedAt)).slice(0, 10).map(run => ({ date: run.date, course: str(run.course_name), position: Number.isSafeInteger(run.position) ? run.position : null, runnerCount: Number.isSafeInteger(run.runner_count) ? run.runner_count : null, finishStatus: str(run.finish_status), going: str(run.going), distance: str(run.distance) })) }));
      return makeEvent({ sport: 'racing', identity: String(row.race_id), providerId: row.race_id, competition: str(row.racecourse), name: str(row.racecourse) + ' · ' + str(row.name), participants: active.map(horse => ({ id: String(horse.horse_id), name: str(horse.name) })), startUTC: row.startUTC, observedAt, sources, choices,
        model: forecast ? { name: forecast.model, validation: 'UNVALIDATED', probabilityKind: 'EXPERIMENTAL_CONTEXT_WEIGHT', observedAt: forecast.generated_at_utc, recordHash: forecast.record_sha256, limitation: forecast.limitation || contextFeed.limitations?.[0] || 'Untrained context-weighted form heuristic; not calibrated win probabilities.', discipline: forecast.run_type } : null,
        stats: { h2h: null, recent, rankings: null, conditions: { going: str(row.going), distance: str(row.distance), surface: str(row.surface), raceClass: str(row.race_class), discipline: str(row.run_type), disciplineBasis: str(row.run_type_basis) } },
        extra: { predictionStatus: { code: forecast ? 'CURRENT_MODEL' : checked.reason || 'MODEL_UNAVAILABLE', label: forecast ? 'Current experimental context forecast' : checked.label }, providerStatus: str(row.race_stage), fieldConfirmed: row.runner_data_status === 'SINGLE_SOURCE_RUNNERS_OBSERVED' && active.length >= 2 && active.length === row.active_runner_count && new Set(runners.map(horse => String(horse.horse_id))).size === runners.length && runners.every(horse => ['RUNNER', 'NONRUNNER', 'WITHDRAWN'].includes(horse.runner_status) && horse.active_runner === (horse.runner_status === 'RUNNER')), withdrawn: runners.filter(horse => !horse.active_runner).map(horse => ({ id: String(horse.horse_id), name: str(horse.name), status: str(horse.runner_status) })) }
      }, now);
    }).filter(Boolean);
  }

  function futureRacing(document,path,now) {
    if(document.research_only!==true||document.publication_gate!=='BLOCKED'||document.model_validation!=='UNVALIDATED')return [];
    return list(document.races).map(row=>{
      const url=row.source_url||row.source;
      const observed=row.observation_timestamp_utc||row.observedAtUTC;
      const start=row.scheduled_start_time_utc||row.startUTC;
      const id=String(row.race_id||'');
      if(!id||typeof url!=='string'||!/^https:\/\/www\.(racingpost|sportinglife)\.com\/racecards?\//.test(url.replace('/racing/racecards/','/racecards/')))return null;
      if(!Number.isFinite(instant(start))||!Number.isFinite(instant(observed))||instant(observed)>=instant(start))return null;
      const source=sourceRows([{url,observed_at_utc:observed}],observed,path);
      const venue=str(row.venue||row.racecourse);
      const name=str(row.race_name||row.name);
      return makeEvent({sport:'racing',identity:id,providerId:id,competition:venue,name:venue+' · '+name,participants:[{id:'awaiting-1',name:'Declarations not independently verified'},{id:'awaiting-2',name:'Runner list unavailable'}],startUTC:start,observedAt:observed,sources:source,choices:[{id:'awaiting-1',label:'Declarations unverified',quote:null,probability:null,market:'No market'},{id:'awaiting-2',label:'Runners unavailable',quote:null,probability:null,market:'No market'}],extra:{futureScheduleOnly:true,fieldConfirmed:false,providerStatus:'SCHEDULE_ONLY',declarationStageReported:str(row.declaration_stage),sourceVerification:'USER_SUPPLIED_UNVERIFIED',predictionStatus:{code:'DECLARATIONS_PENDING',label:'Reported schedule; declarations and odds not independently verified'}}},now);
    }).filter(Boolean);
  }

  function otherSports(document, path, now) {
    return Object.entries(document.sports || {}).filter(([sport]) => ['tennis', 'nfl'].includes(sport)).flatMap(([sport, part]) => list(part.events).map(row => {
      const participants = list(row.participants).map(p => ({ id: String(p.id), name: str(p.name) }));
      const generatedAt = part.generated_at_utc || document.generated_at_utc;
      const observedAt = row.source_collected_at_utc ?? generatedAt;
      if (!Number.isFinite(instant(observedAt)) || instant(observedAt) > instant(generatedAt) || instant(observedAt) > now) return null;
      const validModel = Audit.validateOtherForecast(row, sport, generatedAt, now);
      const outcomes = validModel ? row.forecast.outcomes : participants.map(p => ({ id: p.id, name: p.name }));
      return makeEvent({ sport, identity: String(row.id), providerId: row.id, competition: str(row.competition).replace(/\ufffd/g, '·'), name: row.name, participants, startUTC: row.startUTC, observedAt, sources: sourceRows([{ url: row.source, observed_at_utc: observedAt, sha256: row.source_sha256 }], observedAt, path),
        choices: outcomes.map(outcome => ({ id: String(outcome.id), label: str(outcome.name), probability: validModel ? outcome.probability : null, uncertainty: null, quote: null, market: sport === 'nfl' ? 'Game result · including overtime' : 'Match winner' })),
        stats: { h2h: null, recent: null, rankings: null },
        model: validModel ? { name: str(row.forecast.model), observedAt: row.forecast.generated_at_utc || observedAt, validation: 'UNVALIDATED', probabilityKind: 'EXPERIMENTAL_MODEL_ESTIMATE', trainingMatches: row.forecast.training_matches, uncertainty: null } : null,
        extra: { providerStatus: str(row.status || row.event_status) }
      }, now);
    }).filter(Boolean));
  }

  function historical(document, path, now) {
    return Audit.normalizeFootballHistory(document, now).map(row => makeEvent({ sport: 'football', identity: row.id, providerId: null, competition: 'Premier League · historical results', name: row.home + ' vs ' + row.away, participants: [{ id: row.home, name: row.home }, { id: row.away, name: row.away }], startUTC: row.startUTC, observedAt: document.generated_at_utc, sources: sourceRows(row.source_receipts, document.generated_at_utc, path), choices: [{ id: 'home', label: row.home }, { id: 'draw', label: 'Draw' }, { id: 'away', label: row.away }].map(choice => ({ ...choice, probability: null, uncertainty: null, quote: null, market: 'Match result · regulation time' })),
      stats: { h2h: null, recent: null, rankings: null }, extra: { providerStatus: 'FINAL', score: { home: row.score_home, away: row.score_away, label: row.score_home + ' – ' + row.score_away, verification: row.result_verification, sources: sourceRows(row.source_receipts, document.generated_at_utc, path) } }
    }, now)).filter(Boolean);
  }

  function statusOf(event, now = Date.now()) {
    const state = (code, label, selectable = false) => ({ code, label, selectable, ageMs: event ? now - instant(event.observedAt) : null });
    if (!event || !Number.isFinite(instant(event.startUTC)) || !Number.isFinite(instant(event.observedAt))) return state('UNAVAILABLE', 'Event information unavailable');
    if (event.identityConflict) return state('IDENTITY_CONFLICT', 'Conflicting event observations');
    const providerStatus = String(event.providerStatus || '').toUpperCase();
    if (/CANCEL|ABANDON|VOID/.test(providerStatus)) return state('CANCELLED', 'Cancelled or abandoned');
    if (/POSTPON|SUSPEND|DELAY/.test(providerStatus)) return state('POSTPONED', 'Postponed or delayed · recheck required');
    if (instant(event.startUTC) <= now + 300000 || /FINAL|WEIGHEDIN|RACERESULT|FINISH|OFFTIME|RUNNING/.test(providerStatus)) return state('STARTED', 'Started, completed or inside five-minute cutoff');
    if (event.sport === 'racing' && (!event.fieldConfirmed || !['DORMANT', 'GOINGDOWN', 'ATTHEPOST'].includes(providerStatus))) return state('FIELD_UNCONFIRMED', 'Current runner field or race status unconfirmed');
    const age = now - instant(event.observedAt);
    if (!Number.isFinite(age) || age < 0 || age > event.ttlMs) return state('STALE', age < 0 ? 'Observation time is unconfirmed' : 'Snapshot needs a refresh');
    const receipts = list(event.sources).filter(source => source.kind === 'PROVIDER_RECEIPT');
    if (receipts.some(source => { const sourceAge = now - instant(source.observedAt); return !Number.isFinite(sourceAge) || sourceAge < 0 || sourceAge > event.ttlMs; })) return state('STALE', 'Source evidence needs a refresh');
    return receipts.length ? state('READY', 'Available for paper research', true) : state('UNVERIFIED_SOURCE', 'Paper hypothesis · event receipt unavailable', true);
  }

  // Separate codes and identities prevent Rugby Union and Rugby League models/data mixing.
  function rugby(document,path,now) {
    return list(document.upcoming_fixtures).map(row=>{
      const sport=row.code==='RU'?'rugby_union':row.code==='RL'?'rugby_league':null;
      if(!sport||!str(row.home)||!str(row.away)||row.home===row.away)return null;
      const participants=[{id:key(sport,row.home),name:str(row.home)},{id:key(sport,row.away),name:str(row.away)}];
      return makeEvent({sport,identity:key(row.competition_code,row.event_id),providerId:row.event_id,
        competition:str(row.competition_name),name:row.home+' vs '+row.away,participants,
        startUTC:row.kickoff_utc,observedAt:document.generated_at_utc,
        sources:sourceRows(row.source_receipts,document.generated_at_utc,path),
        choices:participants.map(p=>({id:p.id,label:p.name,probability:null,uncertainty:null,quote:null,market:'Match winner · research only'})),
        stats:{h2h:null,recent:null,rankings:null},model:null,
        extra:{rugbyCode:row.code,forecastStatus:'SCHEDULE_ONLY_NO_VALIDATED_MODEL',scheduleOnly:true}},now);
    }).filter(Boolean);
  }

  function normalizeFeeds(documents, now = Date.now()) {
    const adapters = { football, rugby, racing, other: otherSports, history: historical, 'racing-context': () => [],'racing-future':futureRacing };
    const contexts = list(documents).filter(item => item?.kind === 'racing-context' && Core.safe(item.document) && instant(item.document.generated_at_utc) <= now);
    const contextFeed = contexts.length === 1 ? contexts[0].document : null;
    const index = new Map(), diagnostics = [];
    for (const item of list(documents)) {
      const document = item?.document;
      if (!Core.safe(document) || instant(document.generated_at_utc) > now || !adapters[item.kind]) {
        diagnostics.push({ path: str(item?.path), reason: 'Unsupported, unsafe or future-dated snapshot' }); continue;
      }
      try {
        for (const event of adapters[item.kind](document, item.path, now, contextFeed)) {
          const previous = index.get(event.id);
          if (previous && instant(previous.observedAt) === instant(event.observedAt) && key(previous.choices.map(c => [c.id, c.label])) !== key(event.choices.map(c => [c.id, c.label]))) { previous.identityConflict = true; previous.status = statusOf(previous, now); continue; }
          if (!previous || instant(event.observedAt) > instant(previous.observedAt) || (instant(event.observedAt) === instant(previous.observedAt) && event.sources.filter(s => s.url).length > previous.sources.filter(s => s.url).length)) index.set(event.id, event);
        }
      } catch (error) { diagnostics.push({ path: str(item.path), reason: 'Snapshot could not be normalized: ' + str(error.message) }); }
    }
    const events = [...index.values()].sort((a, b) => instant(a.startUTC) - instant(b.startUTC) || a.id.localeCompare(b.id));
    const identities = new Map();
    for (const event of events) {
      const identityDay = key(event.identity, Core.day(event.startUTC));
      const previous = identities.get(identityDay);
      if (previous && instant(previous.startUTC) !== instant(event.startUTC)) { previous.identityConflict = true; event.identityConflict = true; previous.status = statusOf(previous, now); event.status = statusOf(event, now); }
      else identities.set(identityDay, event);
    }
    Object.defineProperty(events, 'diagnostics', { value: diagnostics, enumerable: false });
    return events;
  }

  function createPlan({ from, to = from, createdAt = new Date().toISOString() }) {
    range(from, to);
    if (!Number.isFinite(instant(createdAt))) throw Error('Invalid plan creation timestamp.');
    return { schemaVersion: 3, id: key('research-plan', createdAt, from, to), from, to, createdAt, updatedAt: createdAt, revision: 0,
      slots: APPROACHES.map(approach => ({ ...approach, stakeMinor: 0, legs: [], generation: null })), ...GATES };
  }

  function getSlot(plan, slotId) {
    const slot = typeof slotId === 'number' ? plan.slots[slotId - 1] : plan.slots.find(item => item.id === slotId);
    if (!slot) throw Error('Choose one of the four research slips.');
    return slot;
  }

  function change(plan, slotId, action, now = Date.now()) {
    const next = clone(plan), slot = getSlot(next, slotId);
    action(slot);
    next.revision += 1; next.updatedAt = new Date(now).toISOString();
    return next;
  }

  function capture(event, choiceId, plan, now) {
    const state = statusOf(event, now), choice = event?.choices?.find(item => item.id === choiceId);
    if (!state.selectable || !choice) throw Error(state.selectable ? 'That outcome is no longer available.' : state.label);
    if (event.sport === 'football' && (!event.seasonComparison || !vector([event.seasonComparison.prob_home, event.seasonComparison.prob_draw, event.seasonComparison.prob_away]))) throw Error('Current-season football evidence unavailable; paper selection blocked.');
    const eventDate = Core.day(event.startUTC);
    if (eventDate < plan.from || eventDate > plan.to) throw Error('The event falls outside this research date range.');
    return { id: key(event.id, choice.id), eventId: event.id, identity: event.identity, choiceId: choice.id, label: choice.label, event: event.name, sport: event.sport, sport_type: event.sport_type, competition: event.competition, startUTC: event.startUTC, market: choice.market, observedAt: event.observedAt, capturedAt: new Date(now).toISOString(), sources: clone(event.sources), probability: event.sport === 'football' ? event.seasonComparison[{home:'prob_home',draw:'prob_draw',away:'prob_away'}[choice.id]] : choice.probability, uncertainty: null, model: event.sport === 'football' ? { name:'CURRENT_SEASON_POISSON_COMPARISON_V1', validation:'UNVALIDATED', probabilityKind:'EXPERIMENTAL_CURRENT_SEASON_COMPARISON', observedAt:event.observedAt, trainingMode:'CURRENT_SEASON_ONLY' } : clone(event.model), quote: clone(choice.quote), evidenceStatus: state.code, ...GATES };
  }

  function addSelection(plan, slotId, event, choiceId, now = Date.now()) {
    const leg = capture(event, choiceId, plan, now);
    return change(plan, slotId, slot => {
      if (slot.legs.length >= MAX_LEGS) throw Error('A research slip supports at most 15 selections.');
      if (slot.legs.some(item => item.eventId === leg.eventId || item.identity === leg.identity)) throw Error('Each slip can contain only one outcome from an event.');
      slot.legs.push(leg); slot.generation = null;
    }, now);
  }

  function legIndex(slot, legId) {
    const index = Number.isInteger(legId) ? legId : slot.legs.findIndex(leg => leg.id === legId);
    if (index < 0 || index >= slot.legs.length) throw Error('Selection not found in this slip.');
    return index;
  }

  function removeSelection(plan, slotId, legId, now = Date.now()) {
    return change(plan, slotId, slot => { slot.legs.splice(legIndex(slot, legId), 1); slot.generation = null; }, now);
  }

  function moveSelection(plan, slotId, legId, targetIndex, now = Date.now()) {
    return change(plan, slotId, slot => {
      if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= slot.legs.length) throw Error('Choose a valid selection position.');
      const [leg] = slot.legs.splice(legIndex(slot, legId), 1); slot.legs.splice(targetIndex, 0, leg);
    }, now);
  }

  function replaceSelection(plan, slotId, legId, event, choiceId, now = Date.now()) {
    const replacement = capture(event, choiceId, plan, now);
    return change(plan, slotId, slot => {
      const index = legIndex(slot, legId);
      if (slot.legs.some((leg, i) => i !== index && (leg.eventId === replacement.eventId || leg.identity === replacement.identity))) throw Error('The replacement duplicates another event in this slip.');
      slot.legs[index] = replacement; slot.generation = null;
    }, now);
  }

  function moneyMinor(value) {
    if (typeof value === 'number') { if (!Number.isSafeInteger(value) || value < 0 || value > MAX_STAKE_MINOR) throw Error('Stake must be whole minor currency units within the supported limit.'); return value; }
    if (typeof value !== 'string' || !/^\d{1,7}(?:\.\d{1,2})?$/.test(value)) throw Error('Enter a non-negative stake with at most two decimal places.');
    const [whole, fraction = ''] = value.split('.');
    const result = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
    if (!Number.isSafeInteger(result) || result > MAX_STAKE_MINOR) throw Error('Stake exceeds the supported simulation limit.');
    return result;
  }

  function setStake(plan, slotId, value, now = Date.now()) {
    const stake = moneyMinor(value);
    return change(plan, slotId, slot => { slot.stakeMinor = stake; }, now);
  }

  function setStructure(plan, slotId, structure, now = Date.now()) {
    if (!STRUCTURES.has(structure)) throw Error('Unsupported research bet structure.');
    return change(plan, slotId, slot => { slot.structure = structure; }, now);
  }

  function updateRange(plan, from, to, now = Date.now()) {
    range(from, to);
    return { ...clone(plan), from, to, revision: plan.revision + 1, updatedAt: new Date(now).toISOString() };
  }

  function clearSlot(plan, slotId, now = Date.now()) {
    return change(plan, slotId, slot => { slot.legs = []; slot.generation = null; }, now);
  }

  function setRecordedQuote(plan, slotId, legId, observation, now = Date.now()) {
    if (!observation || !decimalRatio(observation.decimal) || !Core.url(observation.source)) throw Error('A decimal price above 1 and an HTTPS evidence source are required.');
    const seen = instant(observation.observedAt);
    if (!Number.isFinite(seen) || seen > now || now - seen > 1800000) throw Error('Record a price observed within the last 30 minutes, not in the future.');
    return change(plan, slotId, slot => {
      const leg = slot.legs[legIndex(slot, legId)];
      if (seen >= instant(leg.startUTC) - 300000 || now >= instant(leg.startUTC) - 300000) throw Error('A price must be recorded before the five-minute event cutoff.');
      leg.quote = { decimal: observation.decimal, source: Core.url(observation.source), observedAt: observation.observedAt, bookmaker: str(observation.bookmaker, 100) || 'User-recorded source', status: 'USER_RECORDED_UNVERIFIED', executable: false };
    }, now);
  }

  function decimalRatio(value) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 1 || value > 100000 || !/^\d+(?:\.\d{1,8})?$/.test(String(value))) return null;
    const [whole, fraction = ''] = String(value).split('.');
    return { numerator: BigInt(whole + fraction), denominator: 10n ** BigInt(fraction.length) };
  }

  function combinations(count, size) {
    const result = [];
    const visit = (start, chosen) => {
      if (chosen.length === size) { result.push(chosen); return; }
      for (let index = start; index <= count - (size - chosen.length); index++) visit(index + 1, [...chosen, index]);
    };
    if (size > 0 && size <= count) visit(0, []);
    return result;
  }

  function supportedQuote(quote, event, now) {
    if (!quote || !decimalRatio(quote.decimal) || !Core.url(quote.source) || quote.executable !== false || !['SOURCE_OBSERVED_UNVERIFIED','USER_RECORDED_UNVERIFIED'].includes(quote.status)) return false;
    const age = now - instant(quote.observedAt);
    return Number.isFinite(age) && age >= 0 && age <= 1800000 && instant(quote.observedAt) < instant(event.startUTC) - 300000;
  }

  function evaluateSlot(slot, events, now = Date.now()) {
    const index = events instanceof Map ? events : new Map(list(events).map(event => [event.id, event]));
    const warnings = new Set(), checked = list(slot.legs).map(leg => {
      const event = index.get(leg.eventId), choice = event?.choices.find(item => item.id === leg.choiceId);
      const state = !event ? { code: 'EVENT_MISSING', label: 'Event absent from current snapshots', selectable: false } : !choice ? { code: 'OUTCOME_REMOVED', label: 'Outcome removed or runner withdrawn', selectable: false } : statusOf(event, now);
      let quoteState = 'UNPRICED';
      if (event && choice && leg.quote?.status === 'USER_RECORDED_UNVERIFIED' && supportedQuote(leg.quote, event, now)) {
        quoteState = 'ILLUSTRATIVE_SOURCE_PRICE';
        warnings.add('Includes a user-recorded, unverified price. Its source, market identity and availability have not been independently checked.');
      } else if (event && choice && supportedQuote(leg.quote, event, now) && supportedQuote(choice.quote, event, now)) {
        quoteState = leg.quote.decimal === choice.quote.decimal && leg.quote.bookmaker === choice.quote.bookmaker && leg.quote.source === choice.quote.source ? 'ILLUSTRATIVE_SOURCE_PRICE' : 'PRICE_CHANGED';
      } else if (leg.quote) quoteState = 'PRICE_STALE_OR_UNCONFIRMED';
      if (!state.selectable) warnings.add(state.label);
      if (quoteState === 'PRICE_CHANGED') warnings.add('A source price changed. Replace the selection explicitly to capture the new observation.');
      if (quoteState === 'PRICE_STALE_OR_UNCONFIRMED') warnings.add('A recorded price is stale, withdrawn or no longer source-matched.');
      return { ...clone(leg), currentStatus: state, currentQuote: clone(choice?.quote || null), quoteState, canCalculate: state.selectable && quoteState === 'ILLUSTRATIVE_SOURCE_PRICE' };
    });
    const size = { singles: 1, doubles: 2, trebles: 3, accumulator: checked.length }[slot.structure];
    const lines = combinations(checked.length, size), totalStakeMinor = lines.length * slot.stakeMinor;
    let grossReturnMinor = null, combinedDecimal = null;
    if (checked.length > 1) warnings.add('Combined probability and EV are withheld: dependence between events has not been modelled.');
    if (checked.some(leg => leg.quoteState === 'UNPRICED')) warnings.add('Missing prices: no return is inferred from model percentages.');
    if (checked.length && !lines.length) warnings.add('This structure needs more selections.');
    if (checked.length >= 12) warnings.add('Experimental longshot comparison: more legs compound failure risk; a larger payout is not evidence of value.');
    if (!slot.stakeMinor && checked.length) warnings.add('Enter your paper stake per line; no stake has been chosen for you.');
    let calculationStatus = checked.length ? 'UNAVAILABLE' : 'EMPTY';
    if (lines.length && slot.stakeMinor > 0 && checked.every(leg => leg.canCalculate)) {
      let gross = 0n, overflow = false;
      for (const line of lines) {
        let numerator = BigInt(slot.stakeMinor), denominator = 1n;
        for (const position of line) { const ratio = decimalRatio(checked[position].quote.decimal); numerator *= ratio.numerator; denominator *= ratio.denominator; }
        gross += (numerator * 2n + denominator) / (denominator * 2n);
        if (gross > BigInt(MAX_MONEY_MINOR)) { overflow = true; break; }
      }
      if (!overflow) {
        grossReturnMinor = Number(gross); calculationStatus = 'ILLUSTRATIVE_OBSERVED_PRICES';
        if (slot.structure === 'accumulator') { const product = checked.reduce((total, leg) => total * leg.quote.decimal, 1); combinedDecimal = Number.isFinite(product) ? product : null; }
        warnings.add('Arithmetic illustration from unverified publisher price observations, not a bookmaker offer or verified combined quote.');
        warnings.add('Assumes all selections win with full payout; void, retirement, dead-heat, each-way and partial-settlement rules are not connected.');
      } else { calculationStatus = 'LIMIT_EXCEEDED'; warnings.add('The hypothetical return exceeds the safe display limit.'); }
    }
    return { id: slot.id, structure: slot.structure, legs: checked, currentStatus: checked.every(leg => leg.currentStatus.selectable) ? 'CURRENT' : 'RECHECK_REQUIRED', pricedLegs: checked.filter(leg => leg.canCalculate).length, lineCount: lines.length, stakeMinor: slot.stakeMinor, stakeBasis: 'PER_LINE', totalStakeMinor, grossReturnMinor, netReturnMinor: grossReturnMinor === null ? null : grossReturnMinor - totalStakeMinor, combinedDecimal, verifiedCombinedOdds: null, probability: null, expectedValue: null, calculationStatus, warnings: [...warnings], ...GATES };
  }

  function generateResearch(plan, events, now = Date.now()) {
    let next = clone(plan);
    const candidates = list(events).filter(event =>
      statusOf(event, now).selectable &&
      Core.day(event.startUTC) >= plan.from && Core.day(event.startUTC) <= plan.to &&
      (event.sport !== 'football' || (event.seasonComparison && vector([event.seasonComparison.prob_home,event.seasonComparison.prob_draw,event.seasonComparison.prob_away])))
    ).map(event => {
      const validChoices = event.choices.filter(choice => validProbability(event.sport === 'football' ? event.seasonComparison[{home:'prob_home',draw:'prob_draw',away:'prob_away'}[choice.id]] : choice.probability));
      const tips = event.sport === 'racing' && Array.isArray(event.communityTips) ? event.communityTips : [];
      const counts = new Map();
      for (const tip of tips) {
        if (!event.choices.some(choice => choice.id === tip.choiceId) || !['forum','blog','tipster'].includes(tip.type) || typeof tip.sourceUrl !== 'string' || !/^https:\/\//.test(tip.sourceUrl)) continue;
        try {
          const domain = new URL(tip.sourceUrl).hostname.toLowerCase();
          if (!counts.has(tip.choiceId)) counts.set(tip.choiceId, new Set());
          counts.get(tip.choiceId).add(domain);
        } catch {}
      }
      const community = [...counts].sort((a,b)=>b[1].size-a[1].size || a[0].localeCompare(b[0]));
      const uniqueCommunity = community.length && (community.length === 1 || community[0][1].size > community[1][1].size);
      const communityChoice = uniqueCommunity ? event.choices.find(choice => choice.id === community[0][0]) : null;
      if (!communityChoice && (!event.model && event.sport !== 'football' || !validChoices.length)) return null;
      const choice = communityChoice || [...validChoices].sort((a,b) => (event.sport === 'football' ? event.seasonComparison[{home:'prob_home',draw:'prob_draw',away:'prob_away'}[b.id]]-event.seasonComparison[{home:'prob_home',draw:'prob_draw',away:'prob_away'}[a.id]] : b.probability-a.probability) || a.id.localeCompare(b.id))[0];
      return {event, choice, evidence: (communityChoice ? community[0][1].size*5 : 0) + event.sources.filter(source=>source.kind==='PROVIDER_RECEIPT').length*4 + (event.stats.h2h?2:0) + (event.stats.recent?1:0), communityExperimental:Boolean(communityChoice)};
    }).filter(Boolean).sort((a,b)=>b.evidence-a.evidence || instant(a.event.startUTC)-instant(b.event.startUTC) || a.event.id.localeCompare(b.event.id));
    const signatures = new Set(next.slots.filter(slot => slot.legs.length).map(slot => slot.legs.map(leg => leg.id).sort().join('|')));
    for (const approach of APPROACHES) {
      const current = getSlot(next, approach.id);
      if (current.legs.length) continue;
      let rows = candidates;
      if (approach.id === 'explorer') {
        const groups = new Map(); for (const row of candidates) { if (!groups.has(row.event.sport)) groups.set(row.event.sport, []); groups.get(row.event.sport).push(row); }
        rows = []; let layer = 0; while ([...groups.values()].some(group => group.length > layer)) { for (const group of groups.values()) if (group[layer]) rows.push(group[layer]); layer++; }
      }
      const cap = { 'best-evidence': 3, balanced: 2, explorer: 4, longshot: 15 }[approach.id];
      rows = rows.slice(0, cap);
      const signature = rows.map(row => key(row.event.id, row.choice.id)).sort().join('|');
      if (!rows.length || signatures.has(signature)) {
        next = change(next, approach.id, slot => { slot.generation = { at: new Date(now).toISOString(), status: 'INSUFFICIENT_DISTINCT_EVIDENCE', reason: 'No distinct evidence-supported shortlist is available. No selections were forced.', candidateCount: candidates.length }; }, now);
        continue;
      }
      signatures.add(signature);
      for (const row of rows) next = addSelection(next, approach.id, row.event, row.choice.id, now);
      next = change(next, approach.id, slot => { slot.generation = { at: new Date(now).toISOString(), status: 'EXPERIMENTAL_RESEARCH_SHORTLIST', candidateCount: candidates.length, policy: 'EVIDENCE_COVERAGE_V1', reason: 'Ranked by source coverage and available descriptive research; the chosen outcome has the largest existing experimental model estimate. Not an EV ranking or validated recommendation.' }; }, now);
    }
    return next;
  }

  function restore(raw) {
    if (typeof raw !== 'string' || raw.length > 4000000) throw Error('Saved plan is too large or unreadable.');
    const plan = JSON.parse(raw);
    if (!plan || plan.schemaVersion !== 3 || plan.research_only !== true || plan.model_validation !== 'UNVALIDATED' || plan.publication_gate !== 'BLOCKED') throw Error('Saved research plan failed safety checks.');
    range(plan.from, plan.to);
    if (!str(plan.id, 2000) || !Number.isFinite(instant(plan.createdAt)) || !Number.isFinite(instant(plan.updatedAt)) || !Number.isSafeInteger(plan.revision) || plan.revision < 0 || !Array.isArray(plan.slots) || plan.slots.length !== 4) throw Error('Invalid saved plan metadata.');
    for (const [position, slot] of plan.slots.entries()) {
      if (!slot || slot.id !== APPROACHES[position].id || !STRUCTURES.has(slot.structure) || !Number.isSafeInteger(slot.stakeMinor) || slot.stakeMinor < 0 || slot.stakeMinor > MAX_STAKE_MINOR || !Array.isArray(slot.legs) || slot.legs.length > MAX_LEGS) throw Error('Invalid saved research slip.');
      const events = new Set();
      for (const leg of slot.legs) {
        if (!leg || ['id', 'eventId', 'identity', 'choiceId', 'label', 'event', 'sport', 'sport_type', 'competition', 'startUTC', 'observedAt', 'capturedAt', 'market'].some(field => typeof leg[field] !== 'string' || leg[field].length > 4000) || SPORTS[leg.sport] !== leg.sport_type || !Number.isFinite(instant(leg.startUTC)) || !Number.isFinite(instant(leg.observedAt)) || !Number.isFinite(instant(leg.capturedAt)) || !Array.isArray(leg.sources) || leg.sources.length > 20 || events.has(leg.identity) || leg.research_only !== true || leg.model_validation !== 'UNVALIDATED' || leg.publication_gate !== 'BLOCKED') throw Error('Invalid or duplicate saved selection.');
        if (leg.sources.some(source => !source || !['PROVIDER_RECEIPT', 'PUBLISHED_SNAPSHOT'].includes(source.kind) || !Number.isFinite(instant(source.observedAt)) || (source.url !== null && !Core.url(source.url)))) throw Error('Invalid saved source provenance.');
        if (leg.quote !== null && (!leg.quote || !decimalRatio(leg.quote.decimal) || !Core.url(leg.quote.source) || leg.quote.executable !== false || !Number.isFinite(instant(leg.quote.observedAt)))) throw Error('Invalid saved price observation.');
        if (leg.probability !== null && !validProbability(leg.probability)) throw Error('Invalid saved experimental model estimate.');
        events.add(leg.identity);
      }
    }
    return clone(plan);
  }

  function serialize(plan) { const raw = JSON.stringify(plan); restore(raw); return raw; }

  function freeze(plan, now = Date.now(), events = []) {
    const snapshot = restore(serialize(plan));
    return { ...snapshot, savedAt: new Date(now).toISOString(), recordType: 'LOCAL_PAPER_RESEARCH', independentlyAttested: false, settlementStatus: 'NOT_CONNECTED', roi: null, evaluations: snapshot.slots.map(slot => evaluateSlot(slot, events, now)), ...GATES };
  }

  function modelLeaders(event, now = Date.now()) {
    if (!event?.model || !statusOf(event, now).selectable || !vector(list(event.choices).map(choice => choice.probability))) return [];
    const ordered = [...event.choices].sort((a, b) => b.probability - a.probability || a.id.localeCompare(b.id));
    const equal = (a, b) => Math.abs(a.probability - b.probability) < 1e-10;
    if (ordered.length > 1 && equal(ordered[0], ordered[1])) return [];
    const leaders = [{ id: ordered[0].id, rank: 1, probability: ordered[0].probability }];
    if (ordered.length === 2 || !equal(ordered[1], ordered[2])) leaders.push({ id: ordered[1].id, rank: 2, probability: ordered[1].probability });
    return leaders;
  }

  function candidateAssessment(event, choiceId, now = Date.now()) {
    const choice = event?.choices.find(item => item.id === choiceId), state = statusOf(event, now);
    const blockers = [];
    if (!state.selectable) blockers.push(state.label);
    if (!event?.model || !validProbability(choice?.probability)) blockers.push('No supported experimental estimate for this outcome');
    if (!supportedQuote(choice?.quote, event, now)) blockers.push('No current source price');
    blockers.push('Model is unvalidated; no verified EV or actionable grade');
    return { grade: blockers.length > 1 ? 'C' : 'B', label: blockers.length > 1 ? 'Incomplete evidence' : 'Speculative research', blockers, expectedValue: null, actionable: false };
  }

  function fractionalToDecimal(value) {
    if (typeof value !== 'string' || !/^\d{1,6}\s*\/\s*\d{1,6}$/.test(value)) throw Error('Use a positive fractional price such as 5/2.');
    const [numerator, denominator] = value.split('/').map(Number);
    if (numerator <= 0 || denominator <= 0) throw Error('Fractional price terms must be positive.');
    return 1 + numerator / denominator;
  }

  function impliedProbability(decimal) {
    if (!decimalRatio(decimal)) throw Error('A supported decimal price above 1 is required.');
    return 1 / decimal;
  }

  return Object.freeze({ GATES, APPROACHES, SPORTS, MAX_LEGS, createPlan, normalizeFeeds, statusOf, addSelection, removeSelection, moveSelection, replaceSelection, setStake, setStructure, updateRange, clearSlot, setRecordedQuote, candidateAssessment, modelLeaders, footballEvidenceReview, fractionalToDecimal, impliedProbability, evaluateSlot, generateResearch, moneyMinor, combinations, serialize, restore, freeze, dateOnly, range, day: Core.day });
});
