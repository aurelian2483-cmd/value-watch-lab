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
      bottleneck: 'Field-conditional runner research', status: 'BLOCKED_VALIDATION_DATA',
      evidence: 'The prospective A/B endpoint has no scored pairs. The 76-race historical replay has already been inspected.',
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
    rugby_union: {
      label: 'Rugby Union · Pro D2', baseline: 'Pro D2 Elo · regulation result',
      bottleneck: 'Capped prior points-margin adjustment', status: 'RETROSPECTIVE_ONLY',
      evidence: 'The 24-match retrospective screen covers one season and one source. The paired log-loss interval crosses zero, and the challenger was worse in one of three rounds. With no time-matched bookmaker benchmark, incremental value is unproven.',
      next: 'Freeze a new window with timestamped inputs and independently checked finals. Other Union competitions have no connected challenger.'
    },
    rugby_league: {
      label: 'Rugby League', baseline: 'No connected model · NRL schedule only',
      bottleneck: 'Not available', status: 'BLOCKED_NO_DATA',
      evidence: 'The NRL replay requires an external result CSV. The calendar cannot supply training or settlement outcomes.',
      next: 'Establish auditable League-specific results, timing and event IDs.'
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

  function forSelection(selection, events = [], statusOf = () => ({code: 'UNAVAILABLE'})) {
    const keys = selection === 'all' ? Object.keys(sports) :
      selection === 'rugby' ? ['rugby_union', 'rugby_league'] :
      Object.hasOwn(sports, selection) ? [selection] : [];
    return keys.map(key => {
      const matches = events.filter(event => {
        if (key === 'rugby_league') return false;
        if (key === 'rugby_union') return event?.sport === 'rugby' && event.model?.name === 'Pro D2 Elo';
        return event?.sport === key;
      });
      const estimates = new Set(matches.filter(event => {
        const probabilities = Array.isArray(event.choices) ? event.choices.map(choice => choice?.probability) : [];
        return event.id && event.model?.name && event.model.validation === 'UNVALIDATED' && statusOf(event)?.code === 'READY' &&
          probabilities.length >= 2 && probabilities.every(p => Number.isFinite(p) && p >= 0 && p <= 1) &&
          Math.abs(probabilities.reduce((sum, p) => sum + p, 0) - 1) < 0.001;
      }).map(event => event.id));
      return { ...sports[key], key, baselineEstimateCount: estimates.size,
        bottleneckEstimate: null, bottleneckStar: false };
    });
  }

  function footballPaperPairs(data, now = Date.now()) {
    const vector = p => Array.isArray(p) && p.length === 3 &&
      p.every(x => Number.isFinite(x) && x >= 0 && x <= 1) &&
      Math.abs(p.reduce((sum, x) => sum + x, 0) - 1) < 1e-8;
    return Object.values(data || {}).filter(row => {
      const start = Date.parse(row?.kickoff_utc), captured = Date.parse(row?.captured_at_utc);
      return typeof row?.home === 'string' && typeof row?.away === 'string' &&
        row.baseline_model === 'FOOTBALL_DATA_VENUE_POISSON_V1' &&
        row.challenger_model === 'BOTTLENECK_PL_RECENT_GOAL_DIFF_PILOT_V1' &&
        captured <= now && start - captured >= 300000 &&
        /^[a-f0-9]{64}$/.test(row.source_sha256 || '') &&
        /^https:\/\/api\.football-data\.org\/v4\/competitions\/PL\/matches\?season=\d{4}$/.test(row.source) &&
        vector(row.baseline) && vector(row.challenger);
    }).sort((a, b) => {
      const first = Date.parse(a.kickoff_utc), second = Date.parse(b.kickoff_utc);
      const archived = first <= now, otherArchived = second <= now;
      if (archived !== otherArchived) return archived ? 1 : -1;
      return archived ? second - first : first - second;
    });
  }

  return Object.freeze({ forSelection, footballPaperPairs });
});
