# Bottleneck Lab — complete connected research pipeline, release gates preserved

The research architecture is now linked end to end:

1. Six peer-level website options (five prediction-oriented methods plus one compare utility; Bottleneck Lab is the parent controller)
2. Evidence-first method screen, including sport/market compatibility
3. Canonical model-version and immutable as-issued forecast identity inventory
4. 608 historical match reconstruction kept separate from the prospective ledger
5. Primary/secondary result claim pairing against exact saved event, market and participants
6. First- and second-source evidence review, with source independence explicitly unknown
7. Original-response SHA-256 byte-consistency checks using *optional private original files*
8. Private hash-linked human-review journal, with no automatically verified outcome
9. End-to-end research readiness audit showing every remaining evidence and approval blocker

## Commands

Node 22 and Python 3.12; from repository root:

~~~sh
node --test research/bottleneck-selector/*.test.mjs
python -m unittest discover -s tests -p 'test_private_tennis_capture.py' -v
python -m unittest discover -s tests -p 'test_private_secondary_capture.py' -v
python -m unittest discover -s tests -p 'test_private_result_capture.py' -v
python -m unittest discover -s tests -p 'test_secondary_nfl_results.py' -v
python -m unittest discover -s tests -p 'test_result_observations.py' -v
python -m unittest discover -s tests -p 'test_result_reconciliation.py' -v
node research/bottleneck-selector/completion-audit.mjs > /tmp/bottleneck-readiness.json
~~~

The audit can optionally inspect private evidence files using --private-manifest followed by an absolute path to an existing local manifest. --private-journal can similarly point to an existing private review journal. These must remain outside the public repository.

## Tennis second-source private evidence

The private store now accepts a locally retained original **WTA PDF** or **ATP Finals result webpage** through a strict, read-only, exact-receipt ingest. For example:

~~~sh
python scripts/ingest_private_tennis_secondary.py \
  --private-root /authorised/private/evidence \
  --source-file /authorised/private/original-wta-result.pdf \
  --prediction-id EXACT_EXISTING_TENNIS_PREDICTION_ID
~~~

These paths and IDs are placeholders. The user must already possess genuine originally retained bytes whose SHA-256 digest matches the exact saved unverified secondary receipt. The program **does not download, reconstruct, backdate, reassign or certify** missing original responses. It rejects wrong formats, mismatched hashes, incorrect sports/markets, unsafe source paths, unsupported URLs and conflicting first-write receipts.

The existing future private NFL capture covers SportsDB and nflverse. Primary ESPN original response capture is supported. All future private capture features are OFF unless an authorised, durable private directory is explicitly provided. No live collector integration, personal data, licence-restricted source body, user credential or private source bytes may be published through public GitHub or Actions.

## Honest current readiness

At the inspected repository snapshot:
- 74 frozen tennis/NFL predictions, with zero independently verified result rows.
- 36 result claims ready for *human review only* (23 tennis; 13 NFL).
- Two original responses per review packet would be 72; no original bytes were supplied to the canonical audit, hence 72 missing.
- The historical 608-match football Poisson data are **reconstructed**, not authenticated as as-issued dropdown engine output.
- The versioned mathematical library has 286 of the agreed 1,000 entries, zero empirically qualified, 714 outstanding. Entries are not fabricated or counted solely for quantity.
- The six website options remain distinct, but no exact independently authenticated dropdown engine-to-forecast identity has been established.
- No prospective, independently verified matched-event scoring comparison exists; no live winning engine, approved odds/value pick or betting output.

The new completion-audit.mjs prints one immutable-source-based JSON report and exits with a failure if any existing source contract disagrees. It intentionally displays the missing real-world evidence rather than declaring research complete from synthetic tests alone. An evidence and implementation report is a necessary precursor but **not proof of achieved prediction accuracy**.

## Hard release requirements

1. Obtain lawful permission to retain actual primary and secondary source responses in a persistent private store; preserve bytes as collected, not as later reconstructions.
2. Authenticate upstream independence and exact final settlement against the appropriate sport/market, recording a reviewable human decision and all unresolved discrepancies.
3. Independently attest which code version and as-issued timestamped forecast belongs to each website engine; never infer an engine from a generic model family.
4. Obtain sufficiently large, fair, same-event, untouched chronological/prospective paired test results and account for uncertainty, multiple testing and selection bias.
5. Complete and independently audit the 1,000-entry library, including proper definitions, source provenance, duplicates and reproducibility; then seek a separate explicit authorisation for any tournament.
6. Conduct cross-module browser/integration QA, private retention/backup/rollback checks and a separate release review before touching main, GitHub Pages, or real-money betting.

All connected research modules and tests may be complete **as a safe, isolated prototype** while these external evidence tasks are outstanding. Keep the stacked PRs unmerged. No fake approvals, bets, live engine highlighting or promises of improved return.

### Scope of this final development branch

- Adds WTA PDF / ATP Finals HTML local ingestion for the *unverified* secondary tennis source ledger.
- Adds no-network tests for tennis identity, private storage, conflict handling and no-certification.
- Adds one end-to-end completion/readiness audit and CI across all existing Bottleneck Node tests and the full relevant Python result-collector suites.
- Does not alter the user-facing layout, any prediction algorithms or any live forecasts.
