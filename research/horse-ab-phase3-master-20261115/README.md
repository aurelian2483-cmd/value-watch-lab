# Value Watch master research handover — Phase3

Start with EXECUTIVE_REPORT.md. Decision: KEEP BASELINE / CONTINUE RESEARCH. No new prospective paired forecasts or reviewed outcomes were captured. Production, existing scheduled collectors and betting selections are unchanged. Nothing is deployed or merged.

## Offline review

Python3.10+ and a real Europe/London timezone database are required. This Windows run used Python3.14 and Node26.13.0Intl as the IANA fallback because Python tzdata is absent. Exact versions are in RUNTIME.json. No paid dependency/service, account, authentication or installation was created.

From the extracted package root:

```text
python test_phase3.py
python test_endpoint.py
python software_review/test_review_fixes.py ReviewFixes
python audit/verify_raw76.py
python analysis/robustness.py
python analysis/behavior.py
python reproduction/run_reproduction.py
```

The reproduction command intentionally reruns Phase1/Phase2 as an audit, not a new parameter search. It changes timestamps in the copied reproduction snapshot; the exact original review ZIPs remain untouched in previous_archives/. SNAPSHOT_NOTICE.md explains the copied manifest/receipt distinction. Metrics, vectors, calibration and uncertainty are deterministic.

## Isolated prospective operation — one shot, not unattended

The included state/registration.json freezes source code, definitions, exclusion IDs and PHASE3_PROTOCOL.md. Do not edit the registered source/protocol and reuse that registration. Model changes require a new explicit version and review, never silent overwrite.

```text
python phase3_ab.py register
python collect_research.py --ref EXACT_40_HEX_COMMIT
python phase3_ab.py analyze
python evaluate_locked_endpoint.py
python phase3_ab.py dashboard
```

The collector only reads the existing public repository context feed; it never runs production collectors or changes schedules. Network access is needed for that optional read. For retained pinned input, use `--local acquisition/horse-predictions-data.json --local-receipt acquisition/connector_receipt.json --ref 9bdc35c9581744bb19495ab38663c585076445c0`. Old feeds will correctly fail freshness checks later; do not backdate the CLI clock to replay them as prospective.

Use `--probe` with the same inputs to run the real-clock intake against an empty disposable ledger with the existing registration. The JSON reports original source hashes, inspection time, newly generated disposable pairs and exclusion counts. The temporary store is removed on success or failure. A probe does not exercise revision conflicts against existing pairs. Run one real collection at a time against the registered store. Independent timestamp evidence must cover the actual paired forecast bytes.

The core analyze command gives the all-observed descriptive ledger view. **evaluate_locked_endpoint.py is the primary fixed-window analysis**, applying the first500pairs/minimum60dates/180day horizon without favourable stopping. It never approves deployment. No autonomous scheduler was installed and no background collection is promised.

Capture accepts complete original context records and verifies source SHA, exact parameters, original baseline parity, IDs, history, age, London cutoff, freshness and pre-off timing. Feed ingestion additionally requires fresh matching field/context checks. Changed start times for the same raceID are withheld for review. A-only past archives cannot become prospective A/B pairs after the event.

Result ingestion is deliberately a documented **manual-review contract**, not an automatic arbitrary-HTML truth parser. `python phase3_ab.py verify-result result_bundle.json` requires two allowlisted publisher snapshots, retained UTF8 bodies/hashes, post-event aware times, reviewed canonical identity mappings, matching final field/winner and explicit final-source review. Human-reviewed source extraction and editorial independence must be audited. See PHASE3_PROTOCOL.md and software_review/SECURITY_REVIEW.md. No real result bundle was available in this session.

## Package contents

- models/: frozen A/B definitions and registration links.
- state/: immutable spec/source snapshots, real one-shot coverage events, zero actual forecast/result objects, derived analyses.
- ledgers/: exported empty prospective forecasts/results and complete observed coverage events.
- acquisition/: exact GitHub source feed bytes, connector receipt, run output.
- audit/:76 original raw frozen records, immutable Git/source manifests, infrastructure audit, source/test copies and preserved logs.
- reproduction/: complete copied Phase2 package, independent16/21definition audit scripts, original-vs-reproduced receipts.
- previous_archives/: exact original Phase1/Phase2 ZIPs.
- analysis/: retrospective disagreement/robustness/behaviour diagnostics and planning precision. No new optimisation.
- dashboard/index.html: offline read-only comparison; zero observations and unavailable mean scores.
- software_review/: independent probes, repaired-failure regression checks and limits.
- test_logs/: earlier attempts, final endpoint tests; root test_stderr.log contains54passing pipeline tests.
- LOCKED_PRIMARY_STATUS.json and PROSPECTIVE_STATUS.json: zero-data status with explicit scope.
- PACKAGE_MANIFEST.json: SHA256/length of every included file except itself.

Browser preview and loopback HTTP were unavailable in this environment; offline HTML checks passed, but rendered layout is not claimed verified. No browser screenshot is included. Original collector regressions that need missing Python tzdata are explicitly recorded as environment-blocked, not passed.
