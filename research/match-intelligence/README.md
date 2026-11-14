# Value Watch — Match Intelligence Engine, Stage 1

**Status:** research-only, **UNVALIDATED**, betting publication **BLOCKED**.

This isolated branch holds the first usable match-intelligence component. The Chelsea vs Arsenal example is a **case-study placeholder**, not a claim that a Chelsea–Arsenal fixture exists at a particular time. The test fixture date and example.org source are synthetic and **must not be used as real football evidence**.

## Existing, verified repository capabilities
- `scripts/expanded_football.py` on `research/prospective-100`: home/away goal statistics, Poisson 1X2 baseline, five pseudo-match league-average shrinkage, current-season W/D/L form as **descriptive** evidence.
- `scripts/football_h2h.py`: up to ten chronologically preceding H2H fixtures, venue-specific H2H counts, descriptive conflict signals.
- `scripts/football_h2h_backtest.py`: research-only H2H challenger and paired probability scoring, default adjustment weight zero.
- Existing `current_season_team_form` explicitly labels opponent-strength adjustment, manager changes and transfer impact as unavailable.

## Evidence groups (not weights)
1. `historical_results` — verified dated prior fixtures, with strict cutoff.
2. `current_form` — home/away form and competition context.
3. `opponent_strength` — strength at the time each preceding fixture occurred; no hindsight.
4. `expected_goals` — licensed provider xG with recorded observation time and model definition.
5. `lineup_availability` — confirmed starting XI or pre-cutoff availability reports, distinguished.
6. `squad_continuity` — dated verified transfers and squad changes, not invented impact values.
7. `manager_tactics` — date-stamped manager tenure and evidence for tactical effects.
8. `rest_travel` — known previous fixture times, travel context, rest days.
9. `venue` — independent venue context, avoiding double-counting baseline home advantage.
10. `market_benchmark` — timestamped 1X2 prices, margin-aware and reference-only.

For each evidence item, store factor, status, description, HTTPS source, observation timestamp and first-known timestamp. A `VERIFIED` claim after the prematch snapshot cutoff is downgraded to `UNVERIFIED`; a missing source is rejected. A missing factor stays **NOT_READY** rather than being estimated.

## API and execution
```js
const {auditMatchEvidence}=require('./match-evidence');
const audit=auditMatchEvidence({
 fixture:{home:'Chelsea',away:'Arsenal',kickoff_utc:'2026-12-01T20:00:00Z'},
 snapshot_at_utc:'2026-11-30T12:00:00Z',
 baseline:null,
 evidence:[]
});
```
The dates are deliberately synthetic. This returns an evidence coverage audit, **not** forecast probabilities. No current Chelsea or Arsenal injuries, tactics, lineup, odds or fixture status have been asserted.

`node --test tests/test_match_intelligence_evidence.cjs`

## Next gated experiments
1. Attach a real fixture ID, kickoff and frozen prematch timestamp verified by two independent sources when appropriate.
2. Bind real source-backed baseline, current form and opponent-strength observations with timestamped receipts.
3. Freeze a training/calibration/chronological holdout plan before selecting coefficients.
4. Test opponent-adjusted recent form **separately** against the original Poisson baseline, then investigate combination/overlap with time decay and H2H.
5. Keep reports `UNVALIDATED` and `BLOCKED` until independent results and appropriate quality controls support any promotion.

### Limitations
- Tests have been committed but are **not represented as executed** unless a genuine test-run log is available.
- This component audits evidence only; it does not fetch or authenticate providers, quantify player impacts, fit coefficients, or score 1X2 probabilities.
- Do not merge into the live model or publish bets based on this module.
