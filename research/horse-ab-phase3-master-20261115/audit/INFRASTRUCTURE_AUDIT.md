# Racing infrastructure audit and adapter contract

Audit source pin: `9bdc35c9581744bb19495ab38663c585076445c0`; 19 source/test files in `source_manifest.json`, all exact Git blobs verified in `source_integrity.json`. No production files, scheduled collectors, credentials or workflows changed.

## Original data recovery

Recovered all76 original full context frozen JSON records from original experiment source commit `69582ebc3d2196e2fb35276d8233c0e1f0d826bc` into `raw76/`. These are original repository records, not reconstructed history. `verify_raw76.py` executed:76/76 original Git blob byte hashes and canonical record SHA256 digests match. `raw76_integrity.json` lists file SHA256 and Git hashes. Raw publisher HTML is not recovered by this step; receipt hashes alone cannot reconstruct it.

## Existing reusable components

- Discovery parses one explicit Next.js structured object, checks UK/Ireland/date/meeting/race identity, rejects duplicate races and unsupported schema, and reports source hashes. Runner enrichment checks date/start identity, active/withdrawn/doubtful status, duplicate horse identities, history dates and discipline provenance. HTTP source responses are bounded to3MB and verified against expected URLs in runner/result fetchers.
- `stamp()` rejects naive timestamps and normalizes explicit offsets to UTC. Race-day cutoffs use Europe/London. Context eligibility requires three to six resolved same-discipline histories before cutoff, max730days, no same-day history, explicit pre-event stage, more than5min buffer, runner observations within30min. Known nonfinishers scorezero; unresolved recent outcomes block rather than silently inflate form.
- Frozen context archives use canonical record hashes, append-exclusive `open('x')`, model/gate checks, normalized complete vectors and unique horse IDs. Changed contexts create revisions. `field_checks` compares full active field/context signatures to frozen records. The API/UI consumes current context weights, not the separate fixed V3 pilot.
- Result parser requires explicit WEIGHEDIN, matching race/course/start, duplicate-free full final field and exactly one winner. Changed final fields/nonrunners void scoring; dead heats withhold. Initial outcomes remain SINGLE_SOURCE_PROVISIONAL. Correction chain stores previous state/hash, replacement or withholding, and chronology. Evaluate materialized amendments, never original ledger entries alone. Existing default selects latest eligible forecast revision per race/model; A/B adapter must instead bind an explicit shared pair hash.
- Optional documented free second-publisher endpoints are `/v1/racecards/free` and `/v1/results/today/free`, credentials read from environment only, redirects rejected, bounded pagination/rate-limit handling. Missing credentials produces MISSING_CREDENTIALS rather than invented verification. Corroboration requires unique time/course match, normalized full field and winner agreement, plus source receipt. This is two-publisher agreement, not proof of independent upstream data origin or official finality.

## Important limitations and concrete gates for new A/B adapter

1. Freeze one explicit specification/source hash per A/B model and one shared raw-input hash. Existing context validation checks record self-integrity/model identifier but does not pin parameters to a prospectively registered specification. An internally rehashed changed parameter file is not proof of the intended model version.
2. Require aware forecast, runner-source and result-receipt timestamps; generation < start minus5min, source observation <= generation and <= start, runner age <=30min. Existing secondary `corroborate()` validates URL/hash but does not itself validate receipt timestamp chronology; new adapter must add it and retain verification scope.
3. Normalize race/horse IDs to strings before duplicate detection; preserve ordered identity vectors and both probability vectors. Reject duplicate race keys, duplicate runners, missing runners, nonfinite values and incomplete or non-normalized vectors. Record every exclusion in coverage, including stale/unknown going/discipline, changed fields and unavailable result verification.
4. Bind final result to exact race/start and the entire frozen active field. Post-freeze withdrawal means exclusion, not renormalization. Changed start/going/field before freeze requires a new immutable pair; the statistical policy must preselect which pair/revision is used, independent of result.
5. Apply append-only result amendments to a materialized view and retain withheld/corrected cases in coverage. Existing48h rechecks are a bounded operational policy, not a guarantee no later amendment exists. Never silently relabel provisional outcomes independently verified.
6. Existing public feed and provisional ledger write_text operations overwrite snapshots without atomic replacement. Forecast archives are exclusive-create but not crash-atomic. New research directory should use temporary-file+atomic exclusive publication, durable immutable ledger entries, locking/dedup and a distinct namespace. Do not reuse production output paths or invoke publishing cycle scripts.
7. Raw collector files named by race ID overwrite within temporary cycles; permanent evidence receipts preserve hashes/run references, but raw HTML is CI-artifact retention90days and can expire. Preserve needed immutable inputs in research artifacts, distinguish absent raw bytes, and never claim a refreshed page is original pre-event evidence.
8. Source access reuse is limited to existing public pages/documented free endpoints under existing access. No bypass, subscription creation, credential printing or authenticated response publication. This audit did not establish publisher licence/terms permissions; do not infer legal authorization simply from public accessibility.
9. Existing schedules are best-effort cron with bounded retries/sessions, not guaranteed timely capture. Separate research is an executable one-shot pipeline unless a distinct workflow is explicitly installed; this audit installed none.

## Current snapshot feasibility

At audit pin, context feed generated2026-11-15T20:00:52.797987+00:00 contains zero current forecasts. Nineteen current racecards fail pre-event buffer and one unknown discipline; no usable new A/B captures were made in this audit. Earlier scored76 already examined and cannot become untouched validation.

## Executed regression status

- Raw76 byte/hash verification:76/76 passed.
- New archive-contract tests:7/7 passed, covering all76 original vectors, naive timestamp rejection, equivalent offsets, tampering, duplicate runners, normalization and post-event generation; see archive_contract_test.log. Recovered records contain730 runner appearances; these are not730 independent observations.
- Existing evidence6/6, refresh-gate8/8 and bounded-session4/4 passed.
- Existing context18 and model17 test runs were attempted;13 and16 errors respectively due missing local `tzdata`/Europe-London database on Windows Python3.14. Secondary19-test run reports8failures/22subtest errors: timezone lookup is swallowed during candidate matching, then expected secondary fields are absent. These cannot be described as passing. Full logs retained. No fake UTC fallback used. Install/provide a valid pinned tzdata dependency before claiming cross-platform collector execution.

The Linux CI source uses Python3.12 with system timezone data. This audit's local environment limitations do not by themselves establish production defects, but the new portable package should declare and test its timezone dependency.
