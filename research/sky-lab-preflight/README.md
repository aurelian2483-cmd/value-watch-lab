# Sky Lab — evidence-first preflight (research only)

This isolated tool **does not** start the 250-at-a-time tournament, generate bets, refit models, select a winner or modify the website. It checks an existing reconstructed football experiment and reports its limitations. It is a preparatory validation component for the user-approved mathematical research centre.

The agreed **1,000-entry catalogue gate remains binding**. The current versioned library has 286 entries and 0 empirically qualified entries. Reaching 1,000 alone will not open a tournament: schema/provenance review and explicit user approval are still required. Counts are recomputed from the live catalogue manifest, not hard-coded.

From the repository root, on Node 18+:

```sh
node --test research/sky-lab-preflight/paired-audit.test.mjs
node research/sky-lab-preflight/cli.mjs > /tmp/sky-lab-preflight-report.json
```

The CLI reads the pinned `research/football-baseline-v1/608-reconstructed-forecasts.json` (or an explicit local path), validates its research-only and blocked flags, verifies event identities and 1X2 vectors, and recomputes log loss, multiclass Brier and top-1 accuracy for **two existing historical reconstructions**, not 250 proposed candidates. The generated JSON includes a content SHA-256 and deterministic season-stratified match-date cluster bootstrap intervals for *paired* score differences. It does not write to the repo, change any model, call the network or infer betting value.

Lower log loss/Brier is better, but an observed small difference may be noise. The bootstrap treats same-day matches as a cluster and preserves season strata; it **does not** remove dependence from repeated teams, unverified forecast-time provenance, retrospective selection or reused exposed evaluation data. Nothing here certifies out-of-sample skill, ROI, Sky Bet odds, positive EV, or validation. Negative findings must be retained as prominently as positive ones.

## Subsequent controlled steps — not yet authorised for execution

1. Complete the missing qualified catalogue entries without synonyms, fictitious provenance or misleading implementation status.
2. Audit source rights, input-time availability, duplicate mechanisms, and method implementation coverage.
3. Pre-register compatible candidate families, controlled training windows, compute limits, a genuinely untouched test plan and multiple-comparison safeguards.
4. With explicit review approval, begin bounded 250-candidate **maximum** batches where the evidence actually supports that many; log all exclusions, unsuccessful trials, code/data hashes, complete losses and uncertainty.
5. Freeze selected candidates and compare prospectively on real as-issued predictions; retain separate verified market evidence and never equate prediction metrics with betting profitability.