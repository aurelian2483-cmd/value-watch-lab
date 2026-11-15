# V3 historical top-four dataset audit — 15 November 2026

Source: user-supplied `horse-v3-2025-autumn-retrospective.zip` (dataset.json SHA-256 `92a061307e66fef95cad900cb47ba9034dceee34d4a0a14e78a2e9f09a26af86`).

## Executed findings
- Collected historical race records: **117**; runner records **1,093**.
- **111** races have complete positive, unique finishing positions for all recorded horses; **6** races require separate result/settlement review.
- **116** races contain recorded finishers in each of first, second, third and fourth positions. This does **not** imply prediction accuracy.
- Race field sizes: 5–14. **0** races have 16+ recorded runners, therefore no race in this archive qualifies by recorded field size for standard four-place handicap terms; actual starters and any extra-place offers remain unverified.
- **761** runner records have no stored prior results. **0** races meet frozen V1's minimum three usable previous Flat results for every horse.
- **0** pre-event full-field ranked forecasts are present in this archive. **No historical top-four accuracy, EV, or V1/V3 improvement can be inferred**.
- **0** Sky Bet promotional extra-place offers have independent quoted odds, timestamps, terms and eventual settlement evidenced.

## Exceptions
- `880298`, `886412`, `886418`, `892147`: non-positive/missing finishing positions (0).
- `883542`: repeated finishing position (potential dead heat or record inconsistency).
- `886422`: duplicate position plus incomplete recorded top-four set.

These are *exceptions*, not proven corruption or incorrect results; investigate against publisher results and official settlement.

## Next gates
1. Recover missing full-field pre-target Flat performances; preserve original archive, re-audit chronological provenance and candidate exclusions.
2. Obtain genuinely pre-event archived predictions or produce chronologically held-out V3 rankings only once data is sufficient.
3. Separately obtain source-backed actual runner counts, observed Sky Bet each-way terms / prices / timestamps and settled results before evaluating fourth-place payouts.
4. Compare genuine win and top-four ranking performance against frozen V1 only on same independently held-out races. Model publication remains blocked.

**Research-only; unvalidated; frozen V1/V2 and production unchanged.** Audit script and CSV available in user-facing `horse-v3-top4-historical-audit.zip`.
