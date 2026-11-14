# Value Watch — Existing Data Recovery Audit (2026-11-14)

**Scope:** Connected repository `aurelian2483-cmd/value-watch-lab`. Inspected both `main` and `research/prospective-100`. READ-ONLY audit of original records; no production or prior original ledgers changed.

## Central correction
The `main` branch's `prediction-ledger.json` and `results-feed.json` each have empty `records` arrays. This **does not mean the project has no archived predictions or results**. A different branch `research/prospective-100` contains existing model forecasts, independently cross-checked final results and research ledgers. The newly created model-validation laboratory had not yet imported these.

## Verified file observations (repository file inspection)
| Data location | Count / observation | Appropriate meaning |
|---|---|---|
| `research/prospective-100:research/football-expanded-archive/v1/` | **307** hashed snapshot JSON files | Archived pre-event model snapshot *candidates*, not 307 verified live predictions |
| `research/prospective-100:research/football-expanded-results/v1/verified.json` | **66** scored records, **66 distinct league/home/away/kickoff keys** | Real-result sourced evaluations of existing **other league** Poisson family variants |
| `research/prospective-100:research/results-ledger/v1/verified-results.json` | **18** scored EPL **model-records**, **16** distinct strict team-name fixture keys | Some duplicate events across models, not 18 independent EPL matches; identity canonicalization needed before cross-model pairing |
| `research/prospective-100:research/persistent-forecast-ledger.json` | Existing linked forecast-record entries with GitHub run IDs, SHA256s and pre-event event identities | Review-only, challenge_eligible=0, historical cutoff not verified |
| `main:prediction-ledger.json` | 0 records | Empty canonical production-facing prospect ledger |
| `main:results-feed.json` | 0 records | Empty production-facing result ledger |
| `main:research-data.json` | Includes historical qualitative leads and flags `persistedPredictionCount:0` | Qualitative idea catalog, not numeric performance sample |

**All counted archived other-league finals** label `verification:TWO_SOURCE_REGULATION_TIME_FINAL` and `publication_gate:BLOCKED`, with ESPN and Sky Sports result receipt URLs/digests. Example archived forward model JSON reports `generated_at_utc:2026-11-02T19:22:23.645564Z` for November fixtures but also expressly sets `independent_timestamp_attested:false`, `source_first_availability_verified:false`, `forecast_eligible:false`, `odds:null` and `expected_value:null`. These are independent distinctions: result verification does not prove input historical availability, executable odds or post-freeze model eligibility.

## Preliminary historical model-quality numbers (these are real observations, NOT proof of edge)
Other-league 66 scored cases, pooled across heterogeneous leagues and model versions:
- Mean 1X2 log loss **1.016796389**.
- Mean multiclass Brier **0.609284871**.
- Breakdown: English Championship E1 n=24 LL **1.104493931**; UCL n=4 LL **0.795246815**; Bundesliga D1 n=9 LL **0.653671431**; Ligue 1 F1 n=9 LL **1.157193444**; Serie A I1 n=10 LL **0.992532006**; La Liga SP1 n=10 LL **1.119661611**.
- These are descriptive, from an uneven selection of fixtures, not comparable league rankings or evidence of profitable bets.

EPL result ledger by **different model record type**, NOT an identical-fixture head-to-head:
- `LEGACY_ARCHIVE` n=7, mean LL **0.922462617**, mean Brier **0.542649791**.
- `POISSON_BASELINE_2025_26_V1` n=8, mean LL **1.129777014**, mean Brier **0.687395131**.
- `POISSON_CURRENT_SEASON_SHRINKAGE_V1` n=3, mean LL **0.757163852**, mean Brier **0.426901832**.
- The apparent differences are NOT evidence one is better, because counts/fixture subsets/model provenance differ. EPL has 18 model records but only 16 strict fixture strings and possible name aliases (e.g. `Newcastle`/`Newcastle United`, `Man United`/`Manchester United`) needing canonicalization.

## Why existing material cannot instantly establish new prospective test success
1. Existing forecasts are **not the same frozen Poisson-vs-raw-form 0.025-alpha version** in `research/chelsea-arsenal-match-intelligence`. A fair, complete paired comparison cannot infer absent challenger predictions.
2. The earlier outcome records already exist; **we must not retrospectively manufacture an earlier freeze for the new model**. Existing predictions can be evaluated individually under their original identities and provenance, never relabeled as new Alpha 0.025 predictions.
3. Source `generated_at_utc`, GitHub commit timestamps, first-source availability, and actual pre-match historical information access require distinct verification; `independent_timestamp_attested:false` is explicit in archived snapshot records.
4. Existing outcome receipts are stronger than no outcome sources, but do not create independently verified bookmaker prices. Examples have `odds:null`, `expected_value:null`; no verified Sky Bet bookmaker edge or executed betting ROI exists.
5. Data is on `research/prospective-100`, while newly authored lab is on `research/chelsea-arsenal-match-intelligence` and the main canonical ledgers remain empty. No data should be copied, merged or overwritten without identity/provenance reconciliation.

## Recommended zero-loss recovery sequence
1. **Keep all original branches and 307+ source files untouched.**
2. Create a cross-branch **read-only discovery adapter** that inventories original snapshots, result ledgers, unique fixture identity aliases, forecast model version and timing status. No model upgrade or retrospective timestamp claims.
3. For the 66+18 outcome records, verify archive hash matches scored record, kickoff > recorded forecast/commit time where independent GitHub receipts exist, join each result to the exact frozen model forecast and check source/score probabilities. Distinguish unique fixtures and model-records.
4. Make a performance scorecard **per model family and identical fixture subset**, reporting missing records, source timestamps, confidence intervals and both log loss/Brier. Do NOT pool unrelated competitions or promote a tiny n=3 model as a winner.
5. Reuse the source and fixture collector architecture **for future genuinely frozen comparisons**, not to pretend newly introduced model predictions existed last week.
6. Continue producing versioned, signed or GitHub independently time-attested **new future** forecast comparisons under original prospective protocol. Until verified, publish no bets.

## Research state
**Existing outcomes recovered: YES. Missing actual future experiment observations for frozen alpha-0.025 vs Poisson: still ZERO.** This corrects the earlier misleading suggestion that all outcome datasets were empty.
