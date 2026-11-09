'use strict';
(function (root) {
  const modes = ['current', 'experimental', 'compare'];
  const preferenceKey = 'value-watch-engine-view-v1';
  const mode = value => modes.includes(value) ? value : 'current';
  // Unit-stake Bernoulli payoff: o-1 on a win, -1 otherwise.
  // Delta is a scenario assumption, never an estimated confidence interval.
  function calculate(p, o, delta = .03) {
    if (typeof p !== 'number' || !Number.isFinite(p) || p < 0 || p > 1 || typeof o !== 'number' || !Number.isFinite(o) || o <= 1 || typeof delta !== 'number' || !Number.isFinite(delta) || delta < 0 || delta > 1) return null;
    const low = Math.max(0, p - delta), high = Math.min(1, p + delta);
    return { probability: p, odds: o, breakEven: 1 / o, centralEV: p * o - 1, low, high, lowEV: low * o - 1, highEV: high * o - 1, sensitivity: o, fragility: p - 1 / o, variance: o * o * p * (1 - p) };
  }
  const api = { mode, preferenceKey, calculate };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ResearchExperimental = Object.freeze(api);
})(typeof globalThis !== 'undefined' ? globalThis : this);
