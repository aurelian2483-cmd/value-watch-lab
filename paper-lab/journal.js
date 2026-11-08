(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ResearchJournal = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const STATUSES = new Set(['PENDING', 'DISPUTED', 'SETTLED']);
  const SLOT_IDS = new Set(['best-evidence', 'balanced', 'explorer', 'longshot']);
  const MAX_ENTRIES = 5000;
  const MAX_MONEY_MINOR = 1000000000000;
  const GATES = Object.freeze({ research_only: true, model_validation: 'UNVALIDATED', publication_gate: 'BLOCKED' });
  const clone = value => structuredClone(value);
  const timestamp = value => typeof value === 'string' && /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? Date.parse(value) : NaN;

  function https(value) {
    if (typeof value !== 'string' || value.length > 2000) return null;
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'https:' && !parsed.username && !parsed.password ? parsed.href : null;
    } catch { return null; }
  }

  function text(value, max) {
    return typeof value === 'string' && value.trim().length > 0 && value.length <= max;
  }

  function money(value) {
    return Number.isSafeInteger(value) && value >= 0 && value <= MAX_MONEY_MINOR;
  }

  function key(snapshot, slotId) {
    if (!snapshot || !text(snapshot.id, 4000) || !Number.isFinite(timestamp(snapshot.savedAt)) || !SLOT_IDS.has(slotId)) throw Error('Choose a saved research snapshot and a valid slip.');
    return JSON.stringify([snapshot.id, snapshot.savedAt, slotId]);
  }

  function lineCount(slot) {
    const n = slot.legs.length;
    switch (slot.structure) {
      case 'singles': return n;
      case 'doubles': return n < 2 ? 0 : n * (n - 1) / 2;
      case 'trebles': return n < 3 ? 0 : n * (n - 1) * (n - 2) / 6;
      case 'accumulator': return n ? 1 : 0;
      default: throw Error('The saved slip has an unsupported structure.');
    }
  }

  function snapshotSlot(snapshot, slotId) {
    key(snapshot, slotId);
    if (snapshot.research_only !== true || snapshot.model_validation !== 'UNVALIDATED' || snapshot.publication_gate !== 'BLOCKED' || snapshot.independentlyAttested !== false || !Array.isArray(snapshot.slots)) throw Error('Only a frozen, explicitly unverified paper research record can be annotated.');
    const matches = snapshot.slots.filter(slot => slot?.id === slotId);
    if (matches.length !== 1) throw Error('The saved slip cannot be identified uniquely.');
    const slot = matches[0];
    if (!Array.isArray(slot.legs) || slot.legs.length < 1 || slot.legs.length > 15 || !money(slot.stakeMinor)) throw Error('Choose a nonempty saved slip with a valid original stake.');
    const ids = new Set();
    for (const leg of slot.legs) {
      if (!leg || !text(leg.id, 5000) || !text(leg.eventId, 4000) || !text(leg.sport, 40) || !Number.isFinite(timestamp(leg.startUTC)) || ids.has(leg.eventId)) throw Error('The saved slip has missing or duplicate event identities.');
      ids.add(leg.eventId);
    }
    const count = lineCount(slot), stakeMinor = count * slot.stakeMinor;
    if (!money(stakeMinor)) throw Error('Original total stake exceeds the supported research limit.');
    return { slot, count, stakeMinor };
  }

  // The serialized basis detects accidental edits to a locally saved slip. It is
  // neither a signature nor proof of independent timestamping or settlement.
  function basis(snapshot, slot) {
    return JSON.stringify({
      id: snapshot.id, savedAt: snapshot.savedAt, slotId: slot.id,
      structure: slot.structure, stakeMinor: slot.stakeMinor,
      legs: slot.legs.map(leg => ({
        id: leg.id, eventId: leg.eventId, sport: leg.sport, startUTC: leg.startUTC,
        choiceId: leg.choiceId ?? null, label: leg.label ?? null,
        quote: leg.quote ? {
          decimal: leg.quote.decimal, source: leg.quote.source,
          observedAt: leg.quote.observedAt, bookmaker: leg.quote.bookmaker ?? null,
          executable: leg.quote.executable ?? null
        } : null
      }))
    });
  }

  function validOriginalPrices(slot, recordedAt) {
    return slot.legs.every(leg => {
      const quote = leg.quote, observed = timestamp(quote?.observedAt), start = timestamp(leg.startUTC);
      return quote && typeof quote.decimal === 'number' && Number.isFinite(quote.decimal) && quote.decimal > 1 && quote.decimal <= 100000 &&
        https(quote.source) && quote.executable === false && Number.isFinite(observed) && observed <= recordedAt && observed < start;
    });
  }

  function validateEntries(entries, now = Date.now()) {
    if (!Array.isArray(entries) || entries.length > MAX_ENTRIES) throw Error('The manual research journal is invalid or too large.');
    if (!Number.isFinite(now)) throw Error('The journal validation time is unavailable.');
    const latest = new Map(), ids = new Set();
    for (const entry of entries) {
      if (!entry || entry.schemaVersion !== 1 || !text(entry.snapshotId, 4000) || !Number.isFinite(timestamp(entry.snapshotSavedAt)) || !SLOT_IDS.has(entry.slotId) || !STATUSES.has(entry.status) || !https(entry.source) || !text(entry.reason, 2000) || !Number.isFinite(timestamp(entry.recordedAt)) || !money(entry.stakeMinor) || !Number.isSafeInteger(entry.revision) || entry.revision < 1 || entry.verification !== 'MANUAL_UNVERIFIED' || entry.research_only !== true || entry.model_validation !== 'UNVALIDATED' || entry.publication_gate !== 'BLOCKED' || !text(entry.snapshotBasis, 150000)) throw Error('A manual journal entry failed validation.');
      const expectedKey = JSON.stringify([entry.snapshotId, entry.snapshotSavedAt, entry.slotId]);
      if (entry.key !== expectedKey || entry.id !== JSON.stringify([expectedKey, entry.revision]) || ids.has(entry.id)) throw Error('Journal identity is duplicated or inconsistent.');
      if (timestamp(entry.snapshotSavedAt) > timestamp(entry.recordedAt)) throw Error('A journal annotation cannot precede its saved snapshot.');
      if (timestamp(entry.recordedAt) > now) throw Error('A journal annotation cannot be future-dated.');
      if (entry.status === 'SETTLED' ? !money(entry.grossReturnMinor) || entry.stakeMinor <= 0 : entry.grossReturnMinor !== null) throw Error('Only a settled manual record can contain a gross return.');
      const previous = latest.get(entry.key);
      if (entry.revision !== (previous?.revision || 0) + 1 || (previous && timestamp(entry.recordedAt) < timestamp(previous.recordedAt)) || (previous && entry.snapshotBasis !== previous.snapshotBasis)) throw Error('Journal corrections must append in order against the unchanged original snapshot.');
      ids.add(entry.id); latest.set(entry.key, entry);
    }
    return clone(entries);
  }

  function append(entries, snapshot, slotId, input, now = Date.now()) {
    const existing = validateEntries(entries, now);
    if (existing.length >= MAX_ENTRIES) throw Error('Export a backup: the local manual journal has reached its entry limit.');
    if (!input || !STATUSES.has(input.status) || !https(input.source) || !text(input.reason, 2000)) throw Error('Choose a status and provide an HTTPS result source plus an explanation of the exact market settlement.');
    const recordedAt = input.recordedAt || new Date(now).toISOString(), recorded = timestamp(recordedAt);
    if (!Number.isFinite(now) || !Number.isFinite(recorded) || recorded > now || recorded < timestamp(snapshot?.savedAt)) throw Error('The annotation timestamp must follow the saved snapshot and cannot be in the future.');
    const { slot, count, stakeMinor } = snapshotSlot(snapshot, slotId), entryKey = key(snapshot, slotId), snapshotBasis = basis(snapshot, slot);
    const previous = [...existing].reverse().find(entry => entry.key === entryKey);
    if (previous && (previous.snapshotBasis !== snapshotBasis || recorded < timestamp(previous.recordedAt))) throw Error('The original snapshot changed or the correction precedes an earlier annotation.');
    if (input.status === 'SETTLED') {
      if (!money(input.grossReturnMinor)) throw Error('Enter a non-negative gross return in whole minor currency units; zero records a complete loss.');
      if (slot.stakeMinor <= 0 || count === 0 || stakeMinor <= 0 || !validOriginalPrices(slot, recorded)) throw Error('Settlement totals require a positive original stake and a sourced original price captured before every event. Keep this record pending or disputed.');
      if (slot.legs.some(leg => timestamp(leg.startUTC) > recorded)) throw Error('An event has not started; its research outcome cannot yet be recorded as settled.');
    } else if (input.grossReturnMinor !== undefined && input.grossReturnMinor !== null) throw Error('Pending and disputed entries cannot record returns.');
    const revision = (previous?.revision || 0) + 1;
    const entry = {
      schemaVersion: 1, id: JSON.stringify([entryKey, revision]), key: entryKey,
      snapshotId: snapshot.id, snapshotSavedAt: snapshot.savedAt, slotId, revision,
      status: input.status, source: https(input.source), reason: input.reason.trim(), recordedAt,
      grossReturnMinor: input.status === 'SETTLED' ? input.grossReturnMinor : null,
      stakeMinor, snapshotBasis, verification: 'MANUAL_UNVERIFIED', ...GATES
    };
    return [...existing, entry];
  }

  function filterDate(value) {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || new Date(value + 'T12:00:00Z').toISOString().slice(0, 10) !== value) throw Error('Choose a valid journal date filter.');
    return value;
  }

  function summarize(history, entries, filters = {}) {
    const clean = validateEntries(entries);
    if (!Array.isArray(history) || history.length > 1000) throw Error('Research history is unavailable or exceeds the supported size.');
    const from = filterDate(filters.from), to = filterDate(filters.to);
    if (from && to && from > to) throw Error('Journal date filters must be ordered.');
    const sport = filters.sport && filters.sport !== 'all' ? filters.sport : null;
    if (sport && !['football', 'racing', 'tennis', 'nfl'].includes(sport)) throw Error('Unsupported sport filter.');
    if (filters.slotId && !SLOT_IDS.has(filters.slotId)) throw Error('Unsupported research approach filter.');
    const snapshots = new Map(), ambiguous = new Set();
    for (const snapshot of history) {
      if (!snapshot || !text(snapshot.id, 4000) || !Number.isFinite(timestamp(snapshot.savedAt))) continue;
      for (const slot of Array.isArray(snapshot.slots) ? snapshot.slots : []) {
        if (!SLOT_IDS.has(slot?.id)) continue;
        const entryKey = key(snapshot, slot.id);
        if (snapshots.has(entryKey)) {
          const old = snapshots.get(entryKey);
          if (JSON.stringify(old.slot) !== JSON.stringify(slot)) ambiguous.add(entryKey);
        } else snapshots.set(entryKey, { snapshot, slot });
      }
    }
    const latest = new Map();
    for (const entry of clean) latest.set(entry.key, entry);
    const result = { settledCount: 0, pendingCount: 0, disputedCount: 0, invalidCount: 0, mixedExcluded: 0, totalStakeMinor: 0, grossReturnMinor: 0, netReturnMinor: 0, roiPercent: null, entries: [], verification: 'MANUAL_UNVERIFIED', monetaryBasis: 'Manually recorded paper results only; not independently verified performance', ...GATES };
    for (const entry of latest.values()) {
      if (filters.slotId && entry.slotId !== filters.slotId) continue;
      const capturedDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(entry.snapshotSavedAt));
      if (from && capturedDate < from || to && capturedDate > to) continue;
      const match = snapshots.get(entry.key);
      if (!match || ambiguous.has(entry.key)) { result.invalidCount++; continue; }
      let original;
      try { original = snapshotSlot(match.snapshot, entry.slotId); } catch { result.invalidCount++; continue; }
      if (basis(match.snapshot, original.slot) !== entry.snapshotBasis || original.stakeMinor !== entry.stakeMinor) { result.invalidCount++; continue; }
      const sports = new Set(original.slot.legs.map(leg => leg.sport));
      if (sport && (!sports.has(sport) || sports.size > 1)) { if (sports.has(sport) && sports.size > 1) result.mixedExcluded++; continue; }
      if (entry.status === 'SETTLED' && (!validOriginalPrices(original.slot, timestamp(entry.recordedAt)) || original.slot.legs.some(leg => timestamp(leg.startUTC) > timestamp(entry.recordedAt)))) { result.invalidCount++; continue; }
      if (entry.status === 'PENDING') result.pendingCount++;
      if (entry.status === 'DISPUTED') result.disputedCount++;
      if (entry.status === 'SETTLED') {
        if (!money(result.totalStakeMinor + entry.stakeMinor) || !money(result.grossReturnMinor + entry.grossReturnMinor)) throw Error('The manual research totals exceed the safe calculation limit.');
        result.settledCount++;
        result.totalStakeMinor += entry.stakeMinor;
        result.grossReturnMinor += entry.grossReturnMinor;
      }
      result.entries.push(clone(entry));
    }
    result.netReturnMinor = result.grossReturnMinor - result.totalStakeMinor;
    result.roiPercent = result.totalStakeMinor > 0 ? result.netReturnMinor / result.totalStakeMinor * 100 : null;
    return result;
  }

  return Object.freeze({ key, validateEntries, append, summarize });
});
