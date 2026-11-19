'use strict';

const ValueWatchSportMethods = (() => {
  const modes = {
    'racing-top-four': { label: 'Racing Top Four · V1', path: './horse-predictions-data.json' }
  };

  function topFour(weights) {
    if (weights.length < 4 || weights.length > 30 ||
        weights.some(weight => !Number.isFinite(weight) || weight <= 0) ||
        Math.abs(weights.reduce((sum, weight) => sum + weight, 0) - 1) > .002) return null;
    if (weights.length === 4) return weights.map(() => 1);
    const probabilities = weights.map(() => 0);
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    function rank(used, remaining, chance, depth) {
      for (let i = 0; i < weights.length; i++) {
        const bit = 1 << i;
        if (used & bit) continue;
        const next = chance * weights[i] / remaining;
        probabilities[i] += next;
        if (depth < 3) rank(used | bit, remaining - weights[i], next, depth + 1);
      }
    }
    rank(0, total, 1, 0);
    return probabilities.map(value => Math.min(1, value));
  }

  function racing(doc, now) {
    const rows = [];
    for (const race of doc.forecasts) {
      const check = doc.current_field_checks?.[race.record_sha256];
      const observed = Date.parse(check?.runner_observed_at_utc);
      const checked = Date.parse(check?.checked_at_utc);
      const generated = Date.parse(race.generated_at_utc);
      if (!(Date.parse(race.startUTC) > now + 300000 && generated <= now &&
            observed <= checked && checked <= now && now - observed <= 1800000) ||
          check.status !== 'FRESH_MATCHING_FIELD_AND_CONTEXT' ||
          !race.context_signature || race.context_signature !== check.context_signature ||
          !Array.isArray(race.runners) || race.runners.length <= 4 ||
          !Array.isArray(check.active_runner_ids)) continue;
      const ids = race.runners.map(runner => String(runner.horse_id));
      const active = new Set(check.active_runner_ids.map(String));
      if (new Set(ids).size !== ids.length || active.size !== ids.length || !ids.every(id => active.has(id))) continue;
      const probabilities = topFour(race.runners.map(runner => runner.model_probability));
      if (!probabilities) continue;
      const leaders = race.runners.map((runner, i) => ({name: runner.name, probability: probabilities[i]}))
        .sort((a, b) => b.probability - a.probability).slice(0, 4);
      rows.push(race.race_name + ' — ' + leaders.map(x => x.name + ' ' + (x.probability * 100).toFixed(1) + '%').join(' · '));
    }
    return rows;
  }

  async function read(mode, request = fetch, now = Date.now()) {
    const response = await request(modes[mode].path, {cache: 'no-store'});
    if (!response.ok) throw Error('Feed unavailable');
    const doc = await response.json();
    const age = now - Date.parse(doc.generated_at_utc);
    if (doc.schema_version !== 1 || doc.research_only !== true || doc.model_validation !== 'UNVALIDATED' ||
        doc.publication_gate !== 'BLOCKED' || !Number.isFinite(age) || age < -300000 || age > 172800000) throw Error('Invalid or stale research feed');
    return {
      note: 'Experimental sequential finish-order model. Assumes all active runners finish. Place terms and odds are unverified.',
      rows: racing(doc, now)
    };
  }

  return { modes, read, topFour };
})();
if (typeof module === 'object' && module.exports) module.exports = ValueWatchSportMethods;
