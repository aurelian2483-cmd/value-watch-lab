# V3 verification / website implementation checkpoint — 2026-11-15

## Completed
- Reopened user-provided `horse-v3-18-historical-result-links.zip` and `horse-v3-2025-autumn-retrospective.zip`. Exact 18 leads cover 6 horses on 2 target races (890908 and 894962); 16 unique source-result URLs.
- Static consistency audit: 18/18 have strictly prior dates, unique race-ID triples, plausible prior finishing positions and field counts; mapped URLs match dates/race IDs. This is **not** publisher structured-source verification.
- Applying the leads *provisionally* to the original unchanged archive gives at least 3 unique earlier Flat positions to every recorded runner in the two races. This passes a **count-only** check, not source-authenticity, full-feature or pre-event availability gate.
- Added `research/horse-v3/next-two-exact-result-urls.json`, `scripts/horse_v3_verify_next_two.py` and GitHub workflow `horse-v3-verify-next-two.yml`; runs source-by-source structured checks, captures SHA-256 observation receipts, fails closed and saves report even on failure.
- Added `v3-research/index.html`: isolated static V3 Lab presenting 117 historical races, 1 completed retrospective comparison (V1 better than all 3 fixed V3 variants), two further races pending 18-row verification, and warnings for unvalidated model, payout terms and lack of pre-event evidence.
- Added V3 Lab research link to `index.html` **on the isolated branch only**. No betting-slip scoring, real-money picks, main branch deployment, or V1/V2 model edits.
- Source and website linkage self-audit verified 18/18 URLs, 16 unique target pages, navigation link, research-only page gates, and expected strict verifier checks. These are *static checks*, not browser tests.

## Outstanding and blocked
1. GitHub Actions verification workflow execution (pass/fail) **not confirmed**. This connector cannot currently list workflow runs through supported endpoints; manual GitHub Actions run/artifact inspection needed.
2. Publisher structured checks of exact horse ID, finish, starter count, distance/going and observation SHA receipts must pass. Some original profile leads do not contain distance or going; **never substitute zero or a neutral adjustment and call it a valid V3 test**.
3. Only then create append-only verified enrichment and run frozen V1 plus V3 ablations on identical full fields, labeling scores retrospective demonstration, never untouched prospective validation.
4. Cross-publisher corroboration for remaining rows, untouched chronological holdout and verified betting prices/each-way terms remain missing.
5. Website publication to main/deployment remains blocked pending explicit user approval and quality/regression review. Isolated research page does not modify production.

## Safety
`UNVALIDATED` · `publication_gate=BLOCKED` · no winning edge asserted.
