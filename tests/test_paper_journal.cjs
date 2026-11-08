'use strict';
const assert = require('node:assert/strict');
const J = require('../paper-lab/journal.js');

// Explicitly synthetic fixtures exercise local paper bookkeeping; these are not
// production results, authenticated odds, or independently verified records.
const capturedAt = '2026-11-01T10:00:00Z';
const now = Date.parse('2026-11-03T12:00:00Z');
const gates = { research_only: true, model_validation: 'UNVALIDATED', publication_gate: 'BLOCKED' };
function leg(id, sport = 'football') {
  return { id: 'leg-' + id, eventId: 'event-' + id, sport, choiceId: 'home', label: 'Synthetic test selection', startUTC: '2026-11-02T14:00:00Z', quote: { decimal: 2.25, source: 'https://example.org/observed-price', observedAt: capturedAt, bookmaker: 'Synthetic test source', executable: false } };
}
function snapshot(legs = [leg('a')], structure = 'accumulator', stakeMinor = 100) {
  return { id: 'synthetic-plan', savedAt: '2026-11-01T10:01:00Z', independentlyAttested: false, slots: [{ id: 'best-evidence', structure, stakeMinor, legs }], ...gates };
}
const original = snapshot();
const input = { status: 'SETTLED', source: 'https://example.net/result', reason: 'Manual review: exact market settled as a complete loss.', grossReturnMinor: 0 };
let entries = J.append([], original, 'best-evidence', input, now);
assert.equal(entries.length, 1);
assert.equal(entries[0].verification, 'MANUAL_UNVERIFIED');
assert.equal(J.key(original, 'best-evidence'), JSON.stringify([original.id, original.savedAt, 'best-evidence']));
let summary = J.summarize([original], entries);
assert.equal(summary.settledCount, 1);
assert.equal(summary.totalStakeMinor, 100);
assert.equal(summary.grossReturnMinor, 0, 'a zero gross return records a loss');
assert.equal(summary.netReturnMinor, -100);
assert.equal(summary.roiPercent, -100);
const first = JSON.stringify(entries[0]);
entries = J.append(entries, original, 'best-evidence', { ...input, reason: 'Correction after the published result amendment: win recorded manually.', grossReturnMinor: 225 }, now + 1000);
assert.equal(entries.length, 2, 'corrections append a revision');
assert.equal(JSON.stringify(entries[0]), first, 'original entry remains unchanged');
summary = J.summarize([original, structuredClone(original)], entries);
assert.equal(summary.settledCount, 1, 'identical frozen snapshots are not double counted');
assert.equal(summary.totalStakeMinor, 100);
assert.equal(summary.grossReturnMinor, 225);
assert.equal(summary.netReturnMinor, 125);
assert.equal(summary.roiPercent, 125);
entries = J.append(entries, original, 'best-evidence', { ...input, status: 'DISPUTED', grossReturnMinor: null, reason: 'Source correction is under review; settlement withdrawn.' }, now + 2000);
summary = J.summarize([original], entries);
assert.equal(summary.settledCount, 0, 'a disputed revision removes previous totals');
assert.equal(summary.disputedCount, 1);
assert.equal(summary.roiPercent, null);
assert.equal(summary.totalStakeMinor, 0);

const missingPrice = snapshot([{ ...leg('missing'), quote: null }]);
assert.throws(() => J.append([], missingPrice, 'best-evidence', input, now), /original price/);
const pending = J.append([], missingPrice, 'best-evidence', { status: 'PENDING', source: 'https://example.net/result', reason: 'No captured price; settlement cannot contribute to performance.' }, now);
assert.equal(J.summarize([missingPrice], pending).pendingCount, 1);
assert.equal(J.summarize([missingPrice], pending).totalStakeMinor, 0);
assert.throws(() => J.append([], original, 'best-evidence', { ...input, grossReturnMinor: -1 }, now));
assert.throws(() => J.append([], original, 'best-evidence', { ...input, grossReturnMinor: 2.5 }, now));
assert.throws(() => J.append([], original, 'best-evidence', { ...input, source: 'javascript:alert(1)' }, now));
assert.throws(() => J.append([], original, 'best-evidence', { ...input, source: 'https://user:secret@example.org/result' }, now));
assert.throws(() => J.append([], original, 'best-evidence', { ...input, reason: '' }, now));
assert.throws(() => J.append([], original, 'best-evidence', { ...input, recordedAt: '2026-11-10T00:00:00Z' }, now));
assert.throws(() => J.append([], original, 'best-evidence', input, Date.parse('2026-11-01T12:00:00Z')), /not started/);
assert.throws(() => J.append([], snapshot([leg('zero')], 'singles', 0), 'best-evidence', input, now));
assert.throws(() => J.append([], snapshot([{ ...leg('late'), quote: { ...leg('late').quote, observedAt: '2026-11-02T14:01:00Z' } }]), 'best-evidence', input, now));
assert.throws(() => J.append([], original, 'best-evidence', { ...input, status: 'PENDING' }, now), /cannot record returns/);
assert.throws(() => J.validateEntries([entries[0], entries[0]]), /duplicated/);
assert.throws(() => J.validateEntries([{ ...entries[0], revision: 2, id: JSON.stringify([entries[0].key, 2]) }]), /append in order/);

const edited = structuredClone(original);
edited.slots[0].stakeMinor = 200;
assert.equal(J.summarize([edited], [entries[0]]).invalidCount, 1, 'edited original snapshots invalidate monetary totals');
assert.throws(() => J.append([entries[0]], edited, 'best-evidence', input, now), /original snapshot changed/);
const mixed = snapshot([leg('football'), leg('tennis', 'tennis')], 'doubles', 100);
const mixedEntries = J.append([], mixed, 'best-evidence', { ...input, grossReturnMinor: 506 }, now);
summary = J.summarize([mixed], mixedEntries, { sport: 'football' });
assert.equal(summary.settledCount, 0);
assert.equal(summary.mixedExcluded, 1, 'mixed slips are not attributed wholly to one sport');
summary = J.summarize([mixed], mixedEntries);
assert.equal(summary.totalStakeMinor, 100);
assert.equal(summary.grossReturnMinor, 506, 'manual gross return is recorded, never recalculated from odds');
const system = snapshot([leg('1'), leg('2'), leg('3')], 'doubles', 100);
const systemEntries = J.append([], system, 'best-evidence', { ...input, grossReturnMinor: 0 }, now);
assert.equal(J.summarize([system], systemEntries).totalStakeMinor, 300, 'per-line stakes are counted across doubles');
assert.equal(J.summarize([original], [entries[0]], { from: '2026-11-02' }).settledCount, 0);
assert.equal(J.summarize([original], [entries[0]], { slotId: 'balanced' }).settledCount, 0);
assert.throws(() => J.summarize([original], [], { from: '2026-02-31' }));
console.log('Paper journal: append-only corrections, original-price gates, zero losses, exact stakes, snapshot identity, disputed exclusions and mixed-sport attribution passed');
