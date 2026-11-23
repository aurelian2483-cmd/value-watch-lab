# Bottleneck Lab — exact method-to-model identity audit

This is the next **read-only** research stage following the Bottleneck selector and evidence bridge. It checks the actual website method source files, the recorded version names, and the saved prospective forecast ledger without assuming that a source model equals a dropdown method.

Run at the repository root using Node.js 22:

~~~sh
node --test research/bottleneck-selector/selector.test.mjs research/bottleneck-selector/evidence-bridge.test.mjs research/bottleneck-selector/method-identity.test.mjs
node research/bottleneck-selector/method-identity-cli.mjs > /tmp/bottleneck-method-identity.json
~~~

## Six choices, one controller

- **Current Engine 2.5:** event and model feed logic exists. Forecasts labelled FIXED_ELO_K24_V1 in the separately archived prospective ledger are kept *unattributed* until an exact version-to-deployment link is independently verified.
- **Experimental Engine 3.0:** marketCandidate in experimental.js is an experimental calculation. The football snapshot's POISSON_BASELINE_2025_26_V1 forecasts must not be automatically assumed to be an Engine 3.0 as-issued record.
- **Hybrid Engine 3.1 (Football):** references CURRENT_SEASON_POISSON_COMPARISON_V1 as an **input**, not an independently timestamped frozen hybrid output.
- **Side-by-Side Compare:** comparison interface, not a model.
- **Historical Reliability Model:** a form-pattern filter, not a probability generator without supporting model.
- **Racing Top Four · V1:** a top-four probability transformation using racing input estimates; the current feed may have no eligible forecast.
  
The code computes source-file SHA-256s, validates pre-event chronology, model-version identities, duplicate prediction IDs, provenance digests, normalized vectors, and research-only gates. Its exact model+sport+market+event lookup returns evidence metadata only, never claims a method belongs to an engine. Ambiguous same-event receipts are rejected.

The canonical sources as inspected on 23 November 2026 contained 74 ledger forecasts (tennis and NFL) under FIXED_ELO_K24_V1, zero independently verified outcome records, 40 experimental football snapshot records under POISSON_BASELINE_2025_26_V1 and zero current race forecasts. Counts are **not hard-coded** and can change on later audits. The historical 608 reconstructed football forecasts remain separate from live model mapping.

**No automatic engine choice, real-money betting, optimistic value/ROI claims, live UI change, scheduled tournament, model deployment, or evidence promotion.** The 1,000-item catalogue, provenance audit, and explicit review gate remain in effect. Any method can legitimately remain unselected when its evidence is absent.

## Remaining before any real selection

1. Attest actual source-to-deployed-engine version mapping, including exact forecast IDs and generated code hashes.
2. Collect independently reviewed prospective final results on identical markets and matched events.
3. Run untouched chronological and prospective paired model comparisons with uncertainty and selection-bias controls.
4. Complete the previously agreed catalogue/readiness review and obtain explicit release approval.
