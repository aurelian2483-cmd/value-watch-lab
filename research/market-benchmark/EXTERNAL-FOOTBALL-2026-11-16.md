# First observed football closing-market benchmark — 16 November 2026

**Status: external retrospective benchmark only, not a Value Watch model comparison.**

## Source and reproducibility

- Publisher: TipsAudit, https://tipsaudit.com
- Public repository: https://github.com/tipsaudit/track-record-public
- File: `datasets/tipsaudit-predictions-all.csv`
- License stated by publisher: CC BY 4.0 (attribution required).
- Git blob SHA inspected: `d846f87991977b062a8250a61572e1c0075be3db`
- This research note includes only aggregate calculated metrics, not the underlying historical prices.

## Observed raw-file census

| Metric | Value |
|---|---:|
| CSV records | 8,124 |
| Scorable complete 1X2 closing-market records | 8,079 |
| Rows with a void reason | 44 |
| Rows with unusable closing odds | 1 |
| Reported league names represented by scorable records | 86 |

## Calculation from source-reported settled outcomes

Using Pinnacle closing odds (`pin_close_home/draw/away`), proportional removal of the 1X2 overround, and the full-time outcome (`result` mapping 1/X/2 to home/draw/away):

| Measure | Observed aggregate |
|---|---:|
| Market multiclass log loss | 0.99491433 |
| Market multiclass Brier score | 0.59388356 |
| Mean raw closing overround | 5.7955% |

**Important:** Lower log loss is preferable when comparing the *same* historical events. These numbers **do not** compare our model against this market yet.

## Limitations

- This is an **external published prediction track record**, not the full population of all football fixtures; selection effects may exist.
- The dataset provides closing prices and reported outcomes but does not provide independently verified exact quote timestamps in the CSV.
- TipsAudit indicates that its snapshots and some historical records have timing and correction caveats (including previously reversed teams and delayed price attachment). No claim of original real-time availability follows from this CSV.
- No Value Watch model forecast has yet been mapped to an identical fixture, market, settlement and genuinely pre-event archived probability vector.
- Source licensing is stated by TipsAudit; underlying market quotation rights and source authenticity have not been independently audited by Value Watch.
- Nothing here supports claims of positive EV, a profitable betting strategy, or activating Grade A/B picks.

**Gate:** `research_only=true`, `model_validation=UNVALIDATED`, `publication_gate=BLOCKED`.

## Follow-on validation

Preserve immutable snapshot receipts, verify market and fixture identities, and pair any of our own archived forecasts only when genuinely pre-event. Do not compare metrics from unmatched samples; do not use closing odds as an earlier decision-time input. Keep all model challengers separate from this market-only baseline pending paired evaluation.
