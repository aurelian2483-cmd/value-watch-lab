'use strict';
// Research-only evidence audit. This module NEVER modifies 1X2 probabilities.
const FACTORS = Object.freeze([
  'historical_results','current_form','opponent_strength','expected_goals',
  'lineup_availability','squad_continuity','manager_tactics','rest_travel','venue','market_benchmark'
]);
const VALID_STATUSES = new Set(['VERIFIED','MISSING','CONFLICTED','STALE','UNVERIFIED']);
function parseTimestamp(v, field) {
  if (typeof v !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(v))
    throw Error(field + ': timezone-aware ISO 8601 timestamp required');
  const ms = Date.parse(v);
  if (!Number.isFinite(ms)) throw Error(field + ': invalid timestamp');
  return ms;
}
function auditMatchEvidence(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('Input object required');
  const {fixture, snapshot_at_utc, evidence = [], baseline = null} = input;
  if (!fixture || typeof fixture !== 'object') throw Error('Fixture required');
  if (![fixture.home, fixture.away].every(v => typeof v === 'string' && v.trim()) || fixture.home.trim() === fixture.away.trim())
    throw Error('Two different teams required');
  const kickoff = parseTimestamp(fixture.kickoff_utc, 'kickoff_utc');
  const cutoff = parseTimestamp(snapshot_at_utc, 'snapshot_at_utc');
  if (cutoff >= kickoff) throw Error('Evidence snapshot must predate kickoff');
  if (!Array.isArray(evidence)) throw Error('Evidence array required');
  let baselineResult = null;
  if (baseline !== null) {
    const p = [baseline.home,baseline.draw,baseline.away];
    if (!p.every(v => typeof v === 'number' && Number.isFinite(v) && v > 0 && v < 1) || Math.abs(p.reduce((a,b)=>a+b,0)-1)>1e-8)
      throw Error('Baseline must be a normalized 1X2 probability vector');
    baselineResult = {home:p[0],draw:p[1],away:p[2]};
  }
  const grouped = Object.fromEntries(FACTORS.map(k => [k,[]]));
  const problems = [];
  for (let i=0;i<evidence.length;i++) {
    const e=evidence[i];
    if (!e || typeof e !== 'object' || !FACTORS.includes(e.factor) || !VALID_STATUSES.has(e.status))
      throw Error('Invalid evidence factor or status at index ' + i);
    if (typeof e.description !== 'string' || !e.description.trim()) throw Error('Evidence description required at index '+i);
    const item = {factor:e.factor,status:e.status,description:e.description,source_url:e.source_url || null,
      observed_at_utc:e.observed_at_utc || null,known_at_utc:e.known_at_utc || null};
    if (e.status === 'VERIFIED') {
      if (typeof e.source_url !== 'string' || !/^https:\/\//.test(e.source_url))
        throw Error('Verified evidence requires HTTPS source at index '+i);
      const known = parseTimestamp(e.known_at_utc,'known_at_utc');
      const observed = parseTimestamp(e.observed_at_utc,'observed_at_utc');
      if (known > cutoff || observed > cutoff) {
        item.status='UNVERIFIED';
        problems.push({index:i,reason:'Evidence was not known at the pre-match snapshot cutoff'});
      }
    }
    grouped[e.factor].push(item);
  }
  const factors=FACTORS.map(factor => {
    const rows=grouped[factor], verified=rows.filter(x=>x.status==='VERIFIED').length;
    return {factor, verified_items:verified, total_items:rows.length,
      readiness:verified > 0 ? 'EVIDENCE_PRESENT' : 'NOT_READY', items:rows};
  });
  return {
    fixture:{home:fixture.home,away:fixture.away,kickoff_utc:fixture.kickoff_utc},
    snapshot_at_utc, baseline,
    baseline_probabilities:baselineResult,
    evidence_audit:factors, rejected_or_downgraded:problems,
    evidence_factors_with_verified_items:factors.filter(x=>x.verified_items>0).length,
    evidence_factors_missing:factors.filter(x=>!x.verified_items).map(x=>x.factor),
    model_validation:'UNVALIDATED', research_only:true, publication_gate:'BLOCKED',
    probability_adjustment:null, fair_odds:null, expected_value:null,
    note:'Evidence coverage is not model accuracy. No factor weights or live predictions are generated.'
  };
}
module.exports = {auditMatchEvidence, FACTORS};
