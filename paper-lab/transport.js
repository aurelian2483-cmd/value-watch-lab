(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ResearchTransport = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const UTC = /T.*(?:Z|\+00:00)$/;
  const MAX_SNAPSHOT_BYTES = 12 * 1024 * 1024;
  const MAX_MESSAGE_BYTES = 64 * 1024;
  const timestamp = value => typeof value === 'string' && UTC.test(value) ? Date.parse(value) : NaN;
  const notify = (callback, value) => { try { if (typeof callback === 'function') callback(value); } catch (_) { /* A view failure must not stop transport cleanup. */ } };
  const bounded = (value, fallback, min, max) => Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;

  function validateSnapshot(document, now) {
    if (!document || typeof document !== 'object' || Array.isArray(document) ||
        document.schema_version !== 1 || document.research_only !== true ||
        document.model_validation !== 'UNVALIDATED' || document.publication_gate !== 'BLOCKED') {
      throw new Error('Snapshot research safeguards or schema are invalid');
    }
    const generated = timestamp(document.generated_at_utc);
    if (!Number.isFinite(generated) || generated > now) throw new Error('Snapshot timestamp is invalid or in the future');
    return generated;
  }

  function validateSpecs(specs) {
    if (!Array.isArray(specs) || specs.length < 1 || specs.length > 32) throw new Error('Expected 1–32 explicit snapshot sources');
    const seen = new Set();
    return specs.map(spec => {
      if (!spec || typeof spec.kind !== 'string' || !spec.kind || typeof spec.path !== 'string' ||
          !spec.path || spec.path.length > 2048 || seen.has(spec.path) || spec.path.startsWith('//')) {
        throw new Error('Invalid or duplicated snapshot source');
      }
      const address = new URL(spec.path, 'https://snapshot.local/');
      if (address.protocol !== 'https:' || address.username || address.password) throw new Error('Snapshot sources must use safe HTTPS or relative paths');
      seen.add(spec.path);
      return { kind: spec.kind, path: spec.path };
    });
  }

  function createSnapshotClient(options) {
    options = options || {};
    const fetcher = options.fetch || (typeof fetch === 'function' ? fetch.bind(globalThis) : null);
    if (!fetcher) throw new Error('A fetch implementation is required');
    const clock = options.clock || Date.now;
    const later = options.setTimeout || setTimeout;
    const cancel = options.clearTimeout || clearTimeout;
    const random = options.random || Math.random;
    const timeoutMs = bounded(options.timeoutMs, 15000, 100, 60000);
    const retryBaseMs = bounded(options.retryBaseMs, 1500, 100, 60000);
    const maxRetryMs = bounded(options.maxRetryMs, 30000, retryBaseMs, 300000);
    const maxRetries = Math.floor(bounded(options.maxRetries, 3, 0, 10));
    const maxBytes = bounded(options.maxBytes, MAX_SNAPSHOT_BYTES, 1024, 32 * 1024 * 1024);
    const lastGood = new Map(), requests = new Set();
    let flight = null, retryTimer = null, disposed = false, paused = false, attempts = 0, epoch = 0, lastSpecs = [];
    let state = { status: 'idle', checkedAt: null, snapshots: [], errors: [], retryAt: null };

    function emitStatus(status, extra) {
      state = { ...state, status, ...extra };
      notify(options.onStatus, { status, retryAt: state.retryAt, ...extra });
    }
    function clearRetry() { if (retryTimer !== null) cancel(retryTimer); retryTimer = null; state.retryAt = null; }
    function getState() { return { ...state, snapshots: state.snapshots.slice(), errors: state.errors.map(error => ({ ...error })) }; }

    async function readSource(spec, requestEpoch) {
      const controller = new AbortController();
      let timer = null, rejectAbort;
      const interrupted = new Promise((_, reject) => { rejectAbort = reject; });
      const abort = reason => { controller.abort(); rejectAbort(new Error(reason)); };
      requests.add(abort);
      timer = later(() => abort('Snapshot request timed out'), timeoutMs);
      try {
        const operation = (async () => {
          const response = await fetcher(spec.path, { cache: 'no-store', credentials: 'same-origin', signal: controller.signal });
          if (!response || !response.ok) throw new Error('Snapshot request failed' + (response ? ' (HTTP ' + response.status + ')' : ''));
          const length = Number(response.headers && response.headers.get && response.headers.get('content-length'));
          if (Number.isFinite(length) && length > maxBytes) throw new Error('Snapshot exceeds the size limit');
          let document;
          if (typeof response.text === 'function') {
            const raw = await response.text();
            if (raw.length > maxBytes || new TextEncoder().encode(raw).byteLength > maxBytes) throw new Error('Snapshot exceeds the size limit');
            document = JSON.parse(raw);
          } else {
            document = await response.json();
            if (JSON.stringify(document).length > maxBytes) throw new Error('Snapshot exceeds the size limit');
          }
          const generated = validateSnapshot(document, clock());
          const previous = lastGood.get(spec.path);
          if (previous && generated < timestamp(previous.document.generated_at_utc)) throw new Error('Older snapshot rejected; last successful data retained');
          if (controller.signal.aborted || disposed || requestEpoch !== epoch) throw new Error('Snapshot request cancelled');
          const snapshot = { kind: spec.kind, path: spec.path, document, receivedAt: new Date(clock()).toISOString() };
          lastGood.set(spec.path, snapshot);
          return snapshot;
        })();
        return await Promise.race([operation, interrupted]);
      } finally {
        cancel(timer);
        requests.delete(abort);
      }
    }

    function refresh(specs, automaticRetry) {
      if (disposed) return Promise.resolve(getState());
      if (flight) return flight;
      let clean;
      try { clean = validateSpecs(specs || lastSpecs); } catch (error) { return Promise.reject(error); }
      lastSpecs = clean;
      if (paused) return Promise.resolve(getState());
      clearRetry();
      if (!automaticRetry) attempts = 0;
      const requestEpoch = epoch;
      emitStatus('loading');
      const currentFlight = Promise.all(clean.map(async spec => {
        try { await readSource(spec, requestEpoch); return null; }
        catch (error) { return { path: spec.path, kind: spec.kind, message: String(error.message || 'Snapshot unavailable').slice(0, 300), retained: lastGood.has(spec.path) }; }
      })).then(errors => {
        if (disposed || requestEpoch !== epoch) return getState();
        const failures = errors.filter(Boolean);
        const snapshots = clean.map(spec => lastGood.get(spec.path)).filter(Boolean);
        const status = failures.length ? (snapshots.length ? 'degraded' : 'unavailable') : 'ready';
        state = { status, checkedAt: new Date(clock()).toISOString(), snapshots, errors: failures, retryAt: null };
        if (failures.length && !paused && attempts < maxRetries) {
          const delay = Math.min(maxRetryMs, retryBaseMs * Math.pow(2, attempts)) * (0.75 + bounded(random(), 0.5, 0, 1) * 0.5);
          attempts += 1;
          state.retryAt = new Date(clock() + Math.round(delay)).toISOString();
          retryTimer = later(() => { retryTimer = null; refresh(lastSpecs, true); }, Math.round(delay));
        } else if (!failures.length) attempts = 0;
        notify(options.onUpdate, getState());
        notify(options.onStatus, { status, retryAt: state.retryAt, checkedAt: state.checkedAt });
        return getState();
      }).finally(() => { if (flight === currentFlight) flight = null; });
      flight = currentFlight;
      return flight;
    }

    function setPaused(value) {
      if (disposed) return;
      paused = Boolean(value);
      if (paused) {
        clearRetry();
        epoch += 1;
        flight = null;
        for (const abort of requests) abort('Snapshot request paused');
        emitStatus('paused');
      } else emitStatus(state.snapshots.length ? 'ready' : 'idle');
    }
    function dispose() {
      if (disposed) return;
      disposed = true;
      epoch += 1;
      clearRetry();
      for (const abort of requests) abort('Snapshot client disposed');
      emitStatus('disposed');
    }
    return { refresh, getState, setPaused, dispose };
  }

  function createRealtimeClient(options) {
    options = options || {};
    let address;
    try { address = new URL(options.url); } catch (_) { throw new Error('An explicitly configured WSS provider URL is required'); }
    if (address.protocol !== 'wss:' || address.username || address.password || address.hash) throw new Error('An explicitly configured WSS provider URL is required');
    const Socket = options.WebSocket || (typeof WebSocket === 'function' ? WebSocket : null);
    if (!Socket) throw new Error('A WebSocket implementation is required');
    const clock = options.clock || Date.now, later = options.setTimeout || setTimeout, cancel = options.clearTimeout || clearTimeout, random = options.random || Math.random;
    const base = bounded(options.retryBaseMs, 1000, 100, 60000), maxDelay = bounded(options.maxRetryMs, 30000, base, 300000);
    const maxMessageAgeMs = bounded(options.maxMessageAgeMs, 30000, 1000, 300000), maxBytes = bounded(options.maxBytes, MAX_MESSAGE_BYTES, 1024, 1024 * 1024);
    const maxAttempts = Math.floor(bounded(options.maxRetries, 8, 0, 100));
    const subscriptions = new Map(), sequences = new Map();
    let socket = null, reconnect = null, connectionTimer = null, stableTimer = null, attempt = 0, disposed = false, generation = 0, opened = false;
    const status = (name, extra) => notify(options.onStatus, { status: name, ...extra });
    const send = message => { if (socket && socket.readyState === 1) { try { socket.send(JSON.stringify(message)); } catch (_) { status('recovering', { reason: 'Subscription send failed' }); recover('SEND_FAILED'); try { socket.close(); } catch (_) { closeSocket(); scheduleReconnect(); } } } };
    function clearReconnect() { if (reconnect !== null) cancel(reconnect); reconnect = null; }
    function clearConnectionTimers() { if (connectionTimer !== null) cancel(connectionTimer); if (stableTimer !== null) cancel(stableTimer); connectionTimer = stableTimer = null; }
    function closeSocket() {
      clearConnectionTimers();
      generation += 1;
      if (!socket) return;
      const previous = socket;
      socket = null;
      previous.onopen = previous.onmessage = previous.onerror = previous.onclose = null;
      try { previous.close(1000, 'No active research subscriptions'); } catch (_) { /* Already closed by provider. */ }
    }
    function recover(reason) { notify(options.onRecoveryRequired, { reason, events: [...subscriptions.keys()] }); }
    function scheduleReconnect() {
      if (disposed || !subscriptions.size || reconnect !== null) return;
      if (attempt >= maxAttempts) { status('unavailable', { reason: 'Retry limit reached; snapshot recovery required' }); recover('RETRY_LIMIT'); return; }
      const delay = Math.round(Math.min(maxDelay, base * Math.pow(2, attempt++)) * (0.75 + bounded(random(), 0.5, 0, 1) * 0.5));
      status('reconnecting', { retryAt: new Date(clock() + delay).toISOString() });
      reconnect = later(() => { reconnect = null; connect(); }, delay);
    }
    function connect() {
      if (disposed || socket || !subscriptions.size) return;
      const current = ++generation;
      status('connecting');
      try { socket = new Socket(address.href); } catch (_) { socket = null; recover('CONNECTION_FAILED'); scheduleReconnect(); return; }
      const active = socket;
      connectionTimer = later(() => { if (socket !== active || active.readyState === 1) return; closeSocket(); recover('CONNECTION_TIMEOUT'); scheduleReconnect(); }, bounded(options.timeoutMs, 10000, 100, 60000));
      active.onopen = () => {
        if (disposed || generation !== current || socket !== active) return;
        if (connectionTimer !== null) cancel(connectionTimer); connectionTimer = null;
        stableTimer = later(() => { stableTimer = null; if (socket === active && active.readyState === 1) attempt = 0; }, 30000);
        for (const eventId of subscriptions.keys()) send({ type: 'subscribe', event_id: eventId });
        status('connected');
        if (opened) recover('RECONNECTED');
        opened = true;
      };
      active.onmessage = message => {
        if (disposed || generation !== current || socket !== active || typeof message.data !== 'string') return;
        if (message.data.length > maxBytes || new TextEncoder().encode(message.data).byteLength > maxBytes) { status('invalid_message', { reason: 'Message too large' }); return; }
        let value;
        try { value = JSON.parse(message.data); } catch (_) { status('invalid_message', { reason: 'Invalid JSON' }); return; }
        const observed = timestamp(value && value.observed_at_utc);
        if (!value || typeof value !== 'object' || !subscriptions.has(value.event_id) || !Number.isSafeInteger(value.sequence) || value.sequence < 0 ||
            !Number.isFinite(observed) || observed > clock() || clock() - observed > maxMessageAgeMs || !value.payload || typeof value.payload !== 'object' || Array.isArray(value.payload)) {
          status('invalid_message', { reason: 'Event, sequence, timestamp or payload invalid' }); return;
        }
        const previous = sequences.get(value.event_id);
        if (previous && (value.sequence <= previous.sequence || observed < previous.observed)) return;
        if (previous && value.sequence > previous.sequence + 1) { recover('SEQUENCE_GAP'); status('recovering', { eventId: value.event_id }); return; }
        try { if (typeof options.validateMessage === 'function' && options.validateMessage(value) !== true) throw new Error('Rejected'); } catch (_) { status('invalid_message', { reason: 'Provider-specific validation failed' }); return; }
        sequences.set(value.event_id, { sequence: value.sequence, observed });
        notify(options.onMessage, value);
      };
      active.onerror = () => { if (socket === active) { recover('PROVIDER_INTERRUPTION'); try { active.close(); } catch (_) { socket = null; scheduleReconnect(); } } };
      active.onclose = () => { if (generation !== current || socket !== active) return; clearConnectionTimers(); socket = null; recover('DISCONNECTED'); scheduleReconnect(); };
    }
    function subscribe(eventId) {
      if (disposed) throw new Error('Realtime client is disposed');
      if (typeof eventId !== 'string' || !eventId.trim() || eventId.length > 250 || subscriptions.size >= 500 && !subscriptions.has(eventId)) throw new Error('Invalid event subscription');
      const count = subscriptions.get(eventId) || 0;
      subscriptions.set(eventId, count + 1);
      if (!count && socket && socket.readyState === 1) send({ type: 'subscribe', event_id: eventId });
      connect();
      let released = false;
      return function unsubscribe() {
        if (released) return;
        released = true;
        const remaining = (subscriptions.get(eventId) || 0) - 1;
        if (remaining > 0) subscriptions.set(eventId, remaining);
        else { subscriptions.delete(eventId); sequences.delete(eventId); send({ type: 'unsubscribe', event_id: eventId }); }
        if (!subscriptions.size) { clearReconnect(); closeSocket(); attempt = 0; status('idle'); }
      };
    }
    function acknowledgeSnapshot(eventId, sequence, observedAtUTC) {
      const observed = timestamp(observedAtUTC);
      if (!subscriptions.has(eventId) || !Number.isSafeInteger(sequence) || sequence < 0 || !Number.isFinite(observed) || observed > clock()) throw new Error('Invalid authoritative recovery marker');
      const previous = sequences.get(eventId);
      if (!previous || sequence >= previous.sequence && observed >= previous.observed) sequences.set(eventId, { sequence, observed });
    }
    function dispose() { if (disposed) return; disposed = true; clearReconnect(); subscriptions.clear(); sequences.clear(); closeSocket(); status('disposed'); }
    return { subscribe, acknowledgeSnapshot, dispose, getState: () => ({ connected: Boolean(socket && socket.readyState === 1), subscriptions: subscriptions.size, retryAttempt: attempt, disposed }) };
  }

  return { createSnapshotClient, createRealtimeClient, validateSnapshot };
});
