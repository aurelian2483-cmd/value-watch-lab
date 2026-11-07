'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const T = require('../paper-lab/transport.js');

function timerClock(start = Date.parse('2026-11-08T10:00:00Z')) {
  let now = start, nextId = 1;
  const jobs = new Map();
  return {
    clock: () => now,
    setTimeout: (callback, delay) => { const id = nextId++; jobs.set(id, { callback, due: now + delay }); return id; },
    clearTimeout: id => jobs.delete(id),
    pending: () => jobs.size,
    advance(ms) {
      const destination = now + ms;
      while (true) {
        const first = [...jobs.entries()].filter(([, value]) => value.due <= destination).sort((a, b) => a[1].due - b[1].due)[0];
        if (!first) break;
        now = first[1].due; jobs.delete(first[0]); first[1].callback();
      }
      now = destination;
    }
  };
}
const flush = async () => { for (let i = 0; i < 8; i++) await new Promise(setImmediate); };
const documentAt = time => ({ schema_version: 1, research_only: true, model_validation: 'UNVALIDATED', publication_gate: 'BLOCKED', generated_at_utc: new Date(time).toISOString(), events: [] });
const specs = [{ kind: 'football', path: '../football.json' }, { kind: 'racing', path: '../racing.json' }];

async function snapshots() {
  const timer = timerClock(), updates = [], statuses = [];
  let calls = 0, fail = false, generated = timer.clock(), hold = false, release = [];
  const client = T.createSnapshotClient({ ...timer, random: () => 0.5, retryBaseMs: 100, maxRetryMs: 200, timeoutMs: 1000, maxRetries: 2,
    onUpdate: state => updates.push(state), onStatus: state => statuses.push(state.status),
    fetch: async source => {
      calls++;
      if (hold) await new Promise(resolve => release.push(resolve));
      if (fail && source.includes('racing')) throw Error('Provider unavailable');
      return { ok: true, json: async () => documentAt(generated) };
    }
  });
  hold = true;
  const first = client.refresh(specs), duplicate = client.refresh(specs);
  assert.equal(first, duplicate, 'concurrent refresh callers share exactly one promise');
  assert.equal(calls, 2);
  hold = false; release.splice(0).forEach(callback => callback());
  const initial = await first;
  assert.equal(initial.status, 'ready'); assert.equal(initial.snapshots.length, 2); assert.equal(timer.pending(), 0);
  fail = true; timer.advance(200); generated = timer.clock();
  const partial = await client.refresh(specs);
  assert.equal(partial.status, 'degraded'); assert.equal(partial.snapshots.length, 2); assert.equal(partial.errors[0].retained, true);
  assert.equal(partial.snapshots.find(value => value.kind === 'racing').document.generated_at_utc, initial.snapshots[1].document.generated_at_utc);
  assert(partial.retryAt); assert.equal(timer.pending(), 1);
  timer.advance(100); await flush(); assert.equal(calls, 6, 'first retry rechecks explicit sources');
  timer.advance(200); await flush(); assert.equal(calls, 8); assert.equal(timer.pending(), 0, 'bounded retry budget is exhausted');
  fail = false; generated = timer.clock() - 10000;
  const older = await client.refresh(specs);
  assert(older.errors.every(value => value.message.includes('Older snapshot rejected')));
  generated = timer.clock() + 1;
  const future = await client.refresh(specs); assert(future.errors.every(value => value.message.includes('future')));
  generated = timer.clock(); await client.refresh(specs);
  assert.equal(client.getState().status, 'ready');
  const beforePause = calls;
  client.setPaused(true); assert.equal(timer.pending(), 0); await client.refresh(specs); assert.equal(calls, beforePause);
  client.setPaused(false); hold = true;
  const abandoned = client.refresh(specs); client.setPaused(true); client.setPaused(false);
  hold = false; const resumed = client.refresh(specs); assert.notEqual(resumed, abandoned, 'resuming cannot reuse an aborted request');
  await resumed; await abandoned;
  assert.equal(client.getState().status, 'ready');
  release.splice(0).forEach(callback => callback()); await flush();
  assert.equal(client.getState().status, 'ready', 'late resolution cannot replace the resumed state');
  client.dispose(); assert.equal(client.getState().status, 'disposed'); assert.equal(timer.pending(), 0);
  await client.refresh(specs); assert.equal(timer.pending(), 0); assert(updates.length > 0); assert(statuses.includes('paused'));
  await assert.rejects(() => T.createSnapshotClient({ ...timer, fetch: async () => ({}) }).refresh([{ kind: 'a', path: 'javascript:bad' }]), /safe HTTPS/);
}

async function hungAndMalformed() {
  const timer = timerClock();
  const hung = T.createSnapshotClient({ ...timer, fetch: () => new Promise(() => {}), timeoutMs: 100, maxRetries: 0 });
  const request = hung.refresh([specs[0]]); timer.advance(100); const failed = await request;
  assert.equal(failed.status, 'unavailable'); assert(failed.errors[0].message.includes('timed out')); assert.equal(timer.pending(), 0);
  hung.dispose();
  const unsafe = T.createSnapshotClient({ ...timer, maxRetries: 0, fetch: async () => ({ ok: true, json: async () => ({ ...documentAt(timer.clock()), publication_gate: 'OPEN' }) }) });
  assert.equal((await unsafe.refresh([specs[0]])).snapshots.length, 0); unsafe.dispose();
  const oversized = T.createSnapshotClient({ ...timer, maxRetries: 0, maxBytes: 1024, fetch: async () => ({ ok: true, text: async () => ' '.repeat(1025) }) });
  assert((await oversized.refresh([specs[0]])).errors[0].message.includes('size limit')); oversized.dispose();
  const disposeHung = T.createSnapshotClient({ ...timer, maxRetries: 0, fetch: () => new Promise(() => {}) });
  const disposal = disposeHung.refresh([specs[0]]); disposeHung.dispose(); assert.equal((await disposal).status, 'disposed'); assert.equal(timer.pending(), 0);
}

function sockets() {
  const timer = timerClock(), messages = [], recoveries = [], statuses = [], instances = [];
  class Socket {
    constructor(url) { this.url = url; this.readyState = 0; this.sent = []; instances.push(this); }
    open() { this.readyState = 1; if (this.onopen) this.onopen(); }
    send(raw) { this.sent.push(JSON.parse(raw)); }
    close() { this.readyState = 3; if (this.onclose) this.onclose(); }
    message(value) { if (this.onmessage) this.onmessage({ data: typeof value === 'string' ? value : JSON.stringify(value) }); }
  }
  assert.throws(() => T.createRealtimeClient({ WebSocket: Socket }), /explicitly configured/);
  assert.throws(() => T.createRealtimeClient({ url: 'ws://example.org', WebSocket: Socket }), /WSS/);
  assert.throws(() => T.createRealtimeClient({ url: 'wss://user:password@example.org', WebSocket: Socket }), /WSS/);
  const client = T.createRealtimeClient({ ...timer, url: 'wss://provider.example.org/observations', WebSocket: Socket, random: () => 0.5,
    retryBaseMs: 100, maxRetryMs: 200, maxRetries: 2, timeoutMs: 500,
    onMessage: value => messages.push(value), onRecoveryRequired: value => recoveries.push(value.reason), onStatus: value => statuses.push(value.status)
  });
  assert.equal(instances.length, 0, 'no connection without visible event subscriptions');
  const releaseA = client.subscribe('event-a'), releaseA2 = client.subscribe('event-a'), releaseB = client.subscribe('event-b');
  assert.equal(instances.length, 1, 'one shared socket'); instances[0].open();
  assert.deepEqual(instances[0].sent, [{ type: 'subscribe', event_id: 'event-a' }, { type: 'subscribe', event_id: 'event-b' }]);
  const packet = sequence => ({ event_id: 'event-a', sequence, observed_at_utc: new Date(timer.clock()).toISOString(), payload: { score: 'source-observed value' } });
  instances[0].message(packet(10)); instances[0].message(packet(10)); instances[0].message(packet(9));
  assert.equal(messages.length, 1, 'duplicate and out-of-order sequence ignored');
  instances[0].message(packet(12)); assert.equal(messages.length, 1); assert(recoveries.includes('SEQUENCE_GAP'));
  client.acknowledgeSnapshot('event-a', 12, new Date(timer.clock()).toISOString()); instances[0].message(packet(13)); assert.equal(messages.length, 2);
  instances[0].message({ ...packet(14), observed_at_utc: new Date(timer.clock() + 1).toISOString() });
  instances[0].message({ ...packet(14), observed_at_utc: new Date(timer.clock() - 60000).toISOString() });
  instances[0].message('{bad json'); assert.equal(messages.length, 2);
  releaseA(); assert(!instances[0].sent.some(value => value.type === 'unsubscribe' && value.event_id === 'event-a'), 'reference counting retains shared subscription');
  instances[0].close(); assert.equal(timer.pending(), 1); timer.advance(100); assert.equal(instances.length, 2);
  instances[1].open(); assert.equal(instances[1].sent.length, 2, 'subscriptions replay once after reconnect'); assert(recoveries.includes('RECONNECTED'));
  instances[1].message(packet(14)); assert.equal(messages.length, 3);
  instances[1].close(); timer.advance(200); assert.equal(instances.length, 3); instances[2].open(); instances[2].close();
  assert(statuses.includes('unavailable')); assert(recoveries.includes('RETRY_LIMIT')); assert.equal(timer.pending(), 0, 'flapping connections cannot retry forever');
  releaseA2(); releaseA2(); releaseB(); assert.equal(client.getState().subscriptions, 0); assert.equal(timer.pending(), 0);
  const releaseC = client.subscribe('event-c'); assert.equal(instances.length, 4); timer.advance(500); assert(recoveries.includes('CONNECTION_TIMEOUT')); assert.equal(timer.pending(), 1);
  releaseC(); assert.equal(timer.pending(), 0); client.dispose(); assert.equal(client.getState().disposed, true);
  assert.throws(() => client.subscribe('event-d'), /disposed/);
}

async function compatibility() {
  const root = path.resolve(__dirname, '..');
  for (const filename of ['research-dashboard-data.json', 'football-expanded-data.json', 'racing-research-data.json', 'other-sports-data.json', 'research-history.json', 'horse-model-data.json', 'horse-context-data.json']) {
    const document = JSON.parse(fs.readFileSync(path.join(root, filename), 'utf8'));
    assert(Number.isFinite(T.validateSnapshot(document, Date.parse(document.generated_at_utc) + 1)), filename + ' satisfies research transport gates');
  }
}

(async () => {
  await snapshots(); await hungAndMalformed(); sockets(); await compatibility();
  console.log('Research transport: coalescing, timeout/dispose, bounded retries, retained/older snapshots, research gates, pause/resume races, shared socket references, reconnect/replay and sequence recovery passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
