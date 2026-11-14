# Stage 13 — Market-aware calibration and evidence gate

**Research date:** 2026-11-14. **Status:** executed, exploratory only. UNVALIDATED for live forecasts, betting publication BLOCKED.

## Frozen comparison
- Original five-match recent-form challenger selected in Stage 2: alpha=0.025.
- Archived PSH/PSD/PSA quote triplets are converted to margin-normalized 1X2 probabilities. This is **not Sky Bet** and no evidence proves that the archive opening prices were offered at a specific decision time.
- Market/model convex blend: `p_blend=(1-w)*p_market+w*p_recent_form`.
- Locked candidate market-to-model weights `w=[0,0.1,0.25,0.5,0.75,1]`; **zero** is market-only.
- Calibration 2023/24, 314 eligible priced fixtures.
- Later 2024/25 and 2025/26 diagnostic 640 eligible fixtures, 470 with complete archived opening price triplets, 170 missing.
- No lineup features or player-level adjustment were used.

| Weight on own model | 2023/24 calibration mean 1X2 log loss |
|---:|---:|
| 0 | **0.924342158** |
| 0.10 | 0.926619793 |
| 0.25 | 0.931359385 |
| 0.50 | 0.942581013 |
| 0.75 | 0.957927737 |
| 1.00 | 0.977769131 |

**Winner: w=0**, market-only.

On 470 priced later diagnostic fixtures, selected blend log loss **0.980710726**, identical to archived market-only opening estimate. Raw recent-form model on these fixtures **1.012831126**. The selected blend's zero difference is an algebraic equality, **not an independently validated zero uncertainty interval for the general effect of model blending**.

Historical seasons previously examined, so this is **not fresh untouched validation**. Source completeness, selection effects, opening-quote timing, collection methodology and market rules remain unverified.

## Stage 13 source-evidence check
`research/match-intelligence/stage13-market-blend.cjs` additionally provides `auditFutureQuote`:
- requires fixture ID, offset-aware kickoff and forecast cutoff, forecast cutoff strictly before kickoff;
- verifies source provider and record identity fields, HTTPS evidence URI, 1X2 full-time settlement label, regulation-time label and three valid decimal prices;
- requires both provider quoted-at and capture timestamps not later than forecast cutoff, chronological order and declared independent receipt status;
- rejects/fails incomplete metadata. Even apparently complete metadata produces `EVIDENCE_READY_FOR_MANUAL_REVIEW`, not confirmed bookability or accepted real odds.
- output always declares `executable_bet_verified:false` and `publication_gate:BLOCKED`.

The gate **cannot prove authentic captures merely because source fields say they exist**. Further independent verification and real browser/publisher workflow receipt validation are required. Actual betting slips and the production website are unchanged.

## Engineering evidence
- Source: `research/match-intelligence/stage13-market-blend.cjs`.
- Regression tests: `tests/test_match_intelligence_stage13.cjs` (10 test cases).
- GitHub Actions: https://github.com/aurelian2483-cmd/value-watch-lab/actions/runs/43642725170
- Unit/regression suite 113/113 passed, zero failures; archived benchmark job also passed.

## Verdict and next direction
Adding model probabilities to bookmaker probabilities **worsened** calibration for all tested nonzero weights. Do not promote this blend.

Focus the next stage on **genuinely independent, timestamped prospective odds snapshots**, source-attributed pre-match predictions and strictly chronological unseen results. Compare market-only calibration against novel, predeclared disagreement conditions with adequate coverage, uncertainty and a bookmaker-specific decision timestamp. A future positive log-loss or ROI claim must be supported by fresh untouched evidence. Do not force positive EV or publish candidates without verified source receipts.
