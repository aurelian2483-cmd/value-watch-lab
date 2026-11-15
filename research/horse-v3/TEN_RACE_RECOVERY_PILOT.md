# V3 ten-race historical form recovery pilot — 15 November 2026

This is a diagnostic, not a model evaluation. The original 2025 autumn collection, V1, V2, and production website remain unchanged. Data source: user-supplied `horse-v3-2025-autumn-retrospective.zip` dataset. Pilot targets the first ten chronological race records.

## Verified archive counts
- 10 races, 94 runners.
- 55 runners have zero stored previous-result rows.
- 66 runners have fewer than three valid, earlier Flat finishes.
- 0/10 races meet the full-field V1 history-count requirement.

These values describe *stored* records and do not establish that horses had never raced.

## Source checks
- Race 877817, Ebendi (horse 968902): zero stored history; dated earlier results are visible at https://www.sportinglife.com/racing/profiles/horse/968902.
- Race 877820, Jewel Maker (horse 856295): zero stored history; earlier Flat runs appear at https://www.sportinglife.com/racing/profiles/horse/856295.
- Race 877820, Electric Avenue (horse 1105875): zero stored history; earlier Flat runs appear at https://www.sportinglife.com/racing/profiles/horse/1105875.

This demonstrates a missing-history coverage gap. It does not confirm the cause in the source JSON parser, nor establish that any candidate past performance contains the complete fields required for training. Profile pages are retrieved after the target race and cannot establish historical first availability.

## Recovery procedure
1. For each missing horse, inspect the profile by exact horse ID and verify identity.
2. Independently match each candidate prior finish to a dated historical race ID, discipline, field size, outcome, and source URL.
3. Require prior race date strictly before target date; exclude ambiguities and duplicates; verify racecourse/horse identity.
4. Record source SHA-256 receipt and observation time, without mislabeling post-event capture as pre-event proof.
5. Write a new V3 enrichment layer; never edit original archive rows. Rerun frozen V1 full-field eligibility rules and quantify coverage.
6. Preserve exclusions and compare any qualified research models only on appropriately held-out chronological data.

**Current status:** Pilot diagnosis completed. No validated recovered rows, training changes, or website changes are claimed.
