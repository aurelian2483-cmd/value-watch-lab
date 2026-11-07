(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ResearchStore = factory();
})(globalThis, function () {
  'use strict';

  // Subscribers select their own slice. An unchanged slice never schedules work.
  function createStore(initial, schedule = fn => queueMicrotask(fn)) {
    let state = initial;
    let queued = false;
    const subscribers = new Set();
    function flush() {
      queued = false;
      for (const subscription of [...subscribers]) {
        if (!subscribers.has(subscription)) continue;
        const next = subscription.select(state);
        if (!subscription.equal(next, subscription.value)) {
          const previous = subscription.value;
          subscription.value = next;
          subscription.notify(next, previous);
        }
      }
    }
    return {
      get: () => state,
      update(updater) {
        const next = typeof updater === 'function' ? updater(state) : updater;
        if (Object.is(next, state)) return;
        state = next;
        if (!queued) { queued = true; schedule(flush); }
      },
      subscribe(select, notify, equal = Object.is) {
        const subscription = { select, notify, equal, value: select(state) };
        subscribers.add(subscription);
        return () => subscribers.delete(subscription);
      },
      dispose() { subscribers.clear(); }
    };
  }

  function createPersistence(storage, key, validate, onError = () => {}) {
    let lastRaw = null;
    let locked = false;
    const report = message => { locked = true; onError(message); };
    return {
      read() {
        try {
          lastRaw = storage.getItem(key);
          if (lastRaw === null) return null;
          if (lastRaw.length > 8_000_000) throw Error('Stored research exceeds the recovery limit.');
          return validate(JSON.parse(lastRaw));
        } catch { report('Saved research could not be read. It has not been overwritten. Export your current work before recovering the stored copy.'); return null; }
      },
      write(value) {
        if (locked) return false;
        try {
          validate(value);
          if (storage.getItem(key) !== lastRaw) {
            report('Research changed in another tab. Export your current work and reload to avoid overwriting it.');
            return false;
          }
          const raw = JSON.stringify(value);
          if (raw.length > 8_000_000) throw Error('Storage limit');
          storage.setItem(key, raw);
          lastRaw = raw;
          return true;
        } catch { report('This browser could not save the change. Export your research before leaving this page.'); return false; }
      },
      invalidate() { report('Research changed in another tab. Export your current work and reload to load the latest saved copy.'); },
      get locked() { return locked; }
    };
  }

  // Same keys retain the same nodes, including expanded details and keyboard focus.
  function reconcile(container, keys, cache, create, update) {
    const wanted = new Set(keys);
    for (const [key, record] of cache) {
      if (!wanted.has(key)) { record.node.remove(); cache.delete(key); }
    }
    let cursor = container.firstElementChild;
    for (const key of keys) {
      let record = cache.get(key);
      if (!record) { record = create(key); cache.set(key, record); }
      update(record, key);
      if (record.node !== cursor) container.insertBefore(record.node, cursor);
      cursor = record.node.nextElementSibling;
    }
  }

  function canonical(value) {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
    return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
  }

  async function seal(snapshot, cryptoProvider = globalThis.crypto) {
    const body = structuredClone(snapshot);
    if (!cryptoProvider?.subtle) return { snapshot: body, sha256: null, integrity: 'UNAVAILABLE', independentlyAttested: false };
    const bytes = new TextEncoder().encode(canonical(body));
    const digest = await cryptoProvider.subtle.digest('SHA-256', bytes);
    const sha256 = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    return { snapshot: body, sha256, integrity: 'LOCAL_SHA256', independentlyAttested: false };
  }

  async function verify(record, cryptoProvider = globalThis.crypto) {
    if (record?.integrity !== 'LOCAL_SHA256' || !/^[a-f0-9]{64}$/.test(record.sha256 || '')) return false;
    return (await seal(record.snapshot, cryptoProvider)).sha256 === record.sha256;
  }

  return { createStore, createPersistence, reconcile, canonical, seal, verify };
});
