'use strict';
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ValueWatchBottleneckLab = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  // Availability is deliberately separated from deployment. These are the
  // repository's current research paths and the evidence needed before a
  // sport-specific Bottleneck challenger can be compared with them.
  const sports = Object.freeze({
    football: {
      label: 'Football', baseline: 'Current-season Poisson / saved forecast',
      bottleneck: 'Recent goal-difference tilt V0', status: 'RETROSPECTIVE_ONLY',
      evidence: '608 reconstructed forecasts; the 2025–26 retrospective holdout has already been inspected and is not a clean confirmation set.',
      next: 'Rebuild the candidate on a new, untouched chronological window and produce timestamped pre-match receipts.'
    },
    racing: {
      label: 'Horse racing', baseline: 'Context/form runner model',
      bottleneck: 'Runner-field rank adjustment', status: 'NOT_IMPLEMENTED',
      evidence: 'Experimental source forecasts exist, but the recovered 81-setting comparison did not run on historical race outcomes.',
      next: 'Build a field-matched, chronological experiment with confirmed runners and independently checked placings.'
    },
    tennis: {
      label: 'Tennis', baseline: 'ATP/WTA Elo',
      bottleneck: 'Surface and recent-form adjustment', status: 'NOT_IMPLEMENTED',
      evidence: 'Experimental match-winner estimates exist for a small, partial schedule; surface, serve/return history and independent results are incomplete.',
      next: 'Add dated match-level histories and run a surface-aware comparison on a separate chronological evaluation window.'
    },
    nfl: {
      label: 'NFL', baseline: 'K24 Elo with tie prior',
      bottleneck: 'Recent scoring-margin adjustment', status: 'NOT_IMPLEMENTED',
      evidence: 'Experimental estimates exist for a regular-season scoreboard sample; full-slate, injury, quarterback and independent settlement inputs are missing.',
      next: 'Use a complete season archive with cutoff-safe team and availability features, then evaluate by season.'
    },
    darts: {
      label: 'Darts', baseline: 'D1 Elo',
      bottleneck: 'Leg-difference and form adjustment', status: 'NOT_IMPLEMENTED',
      evidence: 'An experimental rating path exists, but many result times are delayed or uncorroborated and the timed fixture crosswalk is limited.',
      next: 'Establish exact match IDs, format and pre-event result histories before comparing a challenger.'
    },
    rugby: {
      label: 'Rugby', baseline: 'Pro D2 Elo only',
      bottleneck: 'Competition-specific margin adjustment', status: 'NOT_IMPLEMENTED',
      evidence: 'A limited Pro D2 research path exists. Rugby Union coverage is partial; Rugby League has no connected model path.',
      next: 'Keep Union and League separate, then build chronological results and feature histories for each competition.'
    },
    basketball: {
      label: 'Basketball', baseline: 'No connected model',
      bottleneck: 'Not available', status: 'BLOCKED_NO_DATA',
      evidence: 'Sports Watch discovery only; no connected event IDs, historical schedule, results or model inputs.',
      next: 'Establish permitted event identity, schedule and historical results before implementing a forecast.'
    },
    cricket: {
      label: 'Cricket', baseline: 'No connected model',
      bottleneck: 'Not available', status: 'BLOCKED_NO_DATA',
      evidence: 'Sports Watch discovery only; no connected event IDs, historical schedule, results or model inputs.',
      next: 'Establish permitted event identity, format, schedule and historical results before implementing a forecast.'
    },
    golf: {
      label: 'Golf', baseline: 'No connected model',
      bottleneck: 'Not available', status: 'BLOCKED_NO_DATA',
      evidence: 'Directory and manual coverage links only; no connected event IDs, results history or model inputs.',
      next: 'Establish permitted tournament and player identity, historical results and round-level inputs before modelling.'
    }
  });

  function forSport(sport, events = []) {
    const plan = sports[sport];
    if (!plan) return null;
    const matches = events.filter(event => event?.sport === sport);
    const modelled = matches.filter(event => Array.isArray(event.choices) &&
      event.choices.some(choice => Number.isFinite(choice?.probability)) &&
      typeof event.model?.name === 'string' && event.model.name.trim());
    return Object.freeze({ ...plan, eventCount: matches.length, currentEstimateCount: modelled.length,
      disclaimer: 'Research only · UNVALIDATED · no Bottleneck output is active for betting, EV or qualification.' });
  }

  return Object.freeze({ sports, forSport });
});
