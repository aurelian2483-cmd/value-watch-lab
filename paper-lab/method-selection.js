/* Engine comparison tile selection: UI preferences only, never betting eligibility. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ValueWatchEngineMethodSelection = Object.freeze(api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const methods = Object.freeze([
    Object.freeze({id:'current',label:'Current Engine 2.5',kind:'predictor'}),
    Object.freeze({id:'experimental',label:'Experimental Engine 3.0',kind:'predictor'}),
    Object.freeze({id:'hybrid',label:'Hybrid Engine 3.1 · Football',kind:'predictor'}),
    Object.freeze({id:'compare',label:'Side-by-Side Compare',kind:'tool'}),
    Object.freeze({id:'reliability',label:'Historical Reliability Model',kind:'screen'}),
    Object.freeze({id:'bottleneck',label:'Bottleneck Lab',kind:'research-readiness'}),
    Object.freeze({id:'racing-top-four',label:'Racing Top Four · V1',kind:'predictor'})
  ]);
  const allowed = new Set(methods.map(m => m.id));
  const preferenceKey = 'value-watch-engine-methods-v2';
  function normalize(value, fallback = ['current']) {
    const arr = Array.isArray(value) ? value : fallback;
    const seen = new Set();
    return arr.filter(id => typeof id === 'string' && allowed.has(id) && !seen.has(id) && (seen.add(id), true));
  }
  function toggle(selected, id) {
    const current = normalize(selected);
    if (!allowed.has(id)) return current;
    return current.includes(id) ? current.filter(x => x !== id) : [...current,id];
  }
  function fromStorage(raw, legacy) {
    if (typeof raw === 'string' && raw.length < 2048) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return normalize(parsed,[]);
      } catch { /* Ignore malformed external local preference. */ }
    }
    return normalize(allowed.has(legacy) ? [legacy] : ['current']);
  }
  return Object.freeze({methods,preferenceKey,normalize,toggle,fromStorage});
});
