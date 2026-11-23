'use strict';
(function (root) {
  const modes = ['current', 'experimental', 'hybrid', 'compare', 'reliability', 'bottleneck'];
  const preferenceKey = 'value-watch-engine-view-v1';
  const mode = value => modes.includes(value) ? value : 'current';
  // Unit-stake Bernoulli payoff: o-1 on a win, -1 otherwise.
  // Delta is a scenario assumption, never an estimated confidence interval.
  function calculate(p, o, delta = .03) {
    if (typeof p !== 'number' || !Number.isFinite(p) || p < 0 || p > 1 || typeof o !== 'number' || !Number.isFinite(o) || o <= 1 || typeof delta !== 'number' || !Number.isFinite(delta) || delta < 0 || delta > 1) return null;
    const low = Math.max(0, p - delta), high = Math.min(1, p + delta);
    return { probability: p, odds: o, breakEven: 1 / o, centralEV: p * o - 1, low, high, lowEV: low * o - 1, highEV: high * o - 1, sensitivity: o, fragility: p - 1 / o, variance: o * o * p * (1 - p) };
  }
  // Frozen football 1X2 challenger, research display only. The caller must supply
  // the pre-kickoff recent-form probability vector and a complete same-market quote.
  function marketCandidate(recentForm, decimalOdds) {
    const vector = Array.isArray(recentForm) && recentForm.length === 3 &&
      recentForm.every(p => typeof p === 'number' && Number.isFinite(p) && p >= 0 && p <= 1) &&
      Math.abs(recentForm.reduce((a, b) => a + b, 0) - 1) <= 1e-7;
    const prices = Array.isArray(decimalOdds) && decimalOdds.length === 3 &&
      decimalOdds.every(o => typeof o === 'number' && Number.isFinite(o) && o > 1);
    if (!vector || !prices) return null;
    const implied = decimalOdds.map(o => 1 / o);
    const sum = implied.reduce((a, b) => a + b, 0);
    const market = implied.map(p => p / sum);
    const probabilities = recentForm.map((p, i) => 0.5 * p + 0.5 * market[i]);
    const choices = probabilities.map((p, i) => ({ index: i, odds: decimalOdds[i], estimatedEV: p * decimalOdds[i] - 1 }))
      .filter(x => x.odds <= 5 && x.estimatedEV >= 0.05)
      .sort((a, b) => b.estimatedEV - a.estimatedEV || a.index - b.index);
    return { probabilities, marketProbabilities: market, selection: choices.length ? ['HOME', 'DRAW', 'AWAY'][choices[0].index] : 'PASS',
      selectedOdds: choices.length ? choices[0].odds : null, estimatedEV: choices.length ? choices[0].estimatedEV : null,
      researchOnly: true, independentlyVerifiedQuote: false };
  }
  const api = { mode, preferenceKey, calculate, marketCandidate };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ResearchExperimental = Object.freeze(api);
})(typeof globalThis !== 'undefined' ? globalThis : this);
