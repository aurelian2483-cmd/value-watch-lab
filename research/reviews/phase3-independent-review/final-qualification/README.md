# Phase 3 reviewer handover

Model status is **UNVALIDATED**. Betting publication is **BLOCKED**. Registered live collection is disabled. External reviewer sign-off and qualifying independent evidence remain outstanding. This handover consolidates preserved experiments and adds a disposable lifecycle acceptance suite and external transport observations.

## Integrated branch and protected files

The pinned draft is `e4d461399f39f5bddd0a4b686de68281c11c9088`. Current main at integration was `13d730a621790d5f6125b16818856b645e612992`. A content-only merge test produced tree `e7f383683f8f4c68b2d244494360d6d10e0c8c40` without conflicts. The API reported an open draft with a clean merge and returned test merge `c252e27a14f5c6fc6f213944a6b690ba5fbf7644`, which pointed at older main `fa350b91abfe0ded8518aff8f7dd5a9d31b6e2fb`. GitHub blocks merging drafts. The reported non-mergeability could be explained by draft status or stale merge metadata. A file conflict could not be reproduced. [GitHub draft pull requests](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/about-pull-requests#draft-pull-requests)

Verify against the archive pin `e2ec193c195c68e8a3337ccd7e2c7cfb59c6ae51`. The draft's 478 archived paths all match pinned blobs. The integrated tree contains all 612 pinned forecasts byte for byte and 24 additional main forecasts across the same directories. The current-main result index expands 61 draft rows to 88 while retaining every prior result row. Counters and latest rechecks advance, with earlier versions reachable from the draft parent. The sorted, per-forecast SHA-256 manifest has SHA-256 `ab0aafcf01ca6098f43a4368d720d157947583af765d1d14c851690a7b751b9e`. The verifier also compares the registered files, model and existing reviews against the draft baseline and checks that the workflow inventory has no registered Phase 3 intake invocation.

## Statistical review

- [Date-cluster audit and dependence study](../README.md) gives algorithms, oracle assumptions, seeds and commands. London civil dates are the resampling units. The ratio of resampled score sums to resampled race counts weights races in the target while preserving the date cluster. Unequal clusters affect precision and effective sample size.
- Strong serial dependence in the balanced 60-date synthetic scenario reduced nominal 95% IID date interval coverage to 50.6%. Moving and stationary blocks reached 74.1–77.2% and 76.7–77.5% across the tested lengths. Bartlett HAC/t reached 78.0%. Estimated effective sample size averaged 21.99 against the oracle's 9.49. These are conditional coverage results for generated scenarios. Short dependent records, block length sensitivity and calendar outages limit generalisation.
- At 120 dates with informative missingness the point estimate's bias against the full target was −0.0305. The observed and full targets differed. Wider intervals left the selection bias unresolved. The experiments read no protected forecasts or outcomes and supply no basis for method selection from protected data. The locked endpoint and its evaluation protocol remain pinned. [Raw results](../synthetic-results.json)

## Transactional and cryptographic evidence

The [transactional repair package](../transactional-repair/README.md) includes the original three defect reproductions, concurrency and interruption coverage, per-record freshness and cutoff, and atomic forecast and audit writes. The [evidence qualification package](../evidence-qualification/README.md) covers pinned source acquisition, signed digest, nonce and accuracy, isolated backup/restore and exact-byte replay. An acceptable timestamp still requires the signed generation time plus signed accuracy to fall **strictly before** scheduled off minus five minutes. No fallback changes that inequality.

The new disposable vault pins the acquisition permit, record types, maximum evidence age, provider deadline and recipient list. At the earlier of age expiry or the provider deadline it blocks access. A bounded warning window reports upcoming expiries. Transfer checks every provider in the bundle, pins an idempotent approval and applies the earliest member deadline. Restore checks the externally retained bundle hash and every member before committing, and preserves original deadlines. Logical disposal removes expired bodies and their managed transfer copies atomically, with tombstones and a hash-chained audit. The audit checkpoint can be pinned independently to detect truncation. The vault requires an isolated workspace capability and has no production entry point or scheduled workflow.

An archival fixture restores the exact forecast, nonce-bearing request, response and signed issuer CRL to fresh disposable storage and verifies the same result. It rejects revoked signers, malformed CRLs and CRLs outside the checked interval. Keep the certificate chain and an independent anchor pin alongside the query, token, policy, revocation observation and the exact bytes or approved hash binding. Reviewer independence, trustworthy custody timestamps, genuine identities and authority records must come from the operating environment. Fixture controls establish logical disposal inside the managed vault. Recipient copies, independent backups, forensic erasure, jurisdictional rights, sustained clock accuracy and production storage durability require separate qualification. The CRL check covers a direct issuing anchor. Multi-tier chain revocation, OCSP, retrospective key compromise and archival renewal are open. [RFC 3161](https://www.rfc-editor.org/rfc/rfc3161) · [RFC 4998 evidence record syntax](https://www.rfc-editor.org/rfc/rfc4998)

## Independent authority candidates

| Authority | Permitted use and observed availability | Trust, accuracy and archival conditions |
| --- | --- | --- |
| FreeTSA | Public service permits commercial incorporation and limits traffic to one request per second per IP. The earlier synthetic request timed out at 4.002751 seconds before any HTTP response. Direct hostname resolution failed in this runner while normal transport used a configured HTTPS proxy. That observation cannot identify where the prior proxied attempt stalled. No new POST was made. | Provider publishes root and signer hashes, advertises a P-384 signer for March 2026 onward through February 2040, and lists CRL and OCSP services. These are provider claims. Verify the actual pinned chain, signer validity at generation, token accuracy, signed revocation status and distribution rights. No successful issuance latency or live revocation check was measured. [Usage](https://www.freetsa.org/freetsa.html) · [Certificate notice](https://www.freetsa.org/index_en.php) · [Practice statement](https://www.freetsa.org/freetsa_cps.html) |
| Open TSA | Public documentation invites researchers to test with a SHA-256 document imprint at up to 60 requests/minute/IP. One nonce-bearing synthetic request failed at 4.003134 seconds, with no observed proxy CONNECT success, TCP completion, TLS or HTTP response. The linked general terms page returned HTTP 404 during review. Production use terms and any service guarantee require confirmation. | Operator documents a private four-tier hierarchy, a signer listed through 2028, and 2051 root expiry. Pin the root through an independent channel and validate current signer, signed accuracy and revocation for relevant tiers. Issuance latency, current chain validation and independent accuracy evidence are unmeasured there. [Research invitation](https://git.open-tsa.eu/open-tsa/server/src/branch/main/README.md) · [Endpoint](https://open-tsa.eu/docs/tsr-endpoint/) · [Certificates](https://open-tsa.eu/docs/certificates/) |
| Stamper | Public no-charge service requires accepting its full terms including confidentiality exclusions and indemnity. No request was attempted. | Publishes provider certificates and a daily PGP history of issued responses. A daily commitment alone cannot supply the registered race cutoff. Current trust anchor, signer, signed accuracy, revocation and measured latency remain to be verified. [Terms](https://stamper.itconsult.co.uk/terms.html) · [RFC 3161 interface](https://stamper.itconsult.co.uk/stamp-tsa.html) · [Trust](https://stamper.itconsult.co.uk/trust.html) |

[External transport observations](external-timestamps.json) contain zero verified receipts. The fixture receipts remain in the isolated acceptance reports. Any later production selection also needs retention rights for revocation material, notification and rollover procedures, a latency budget measured before cutoff and a renewal plan independent of continued online availability. The [prior review](../evidence-qualification/README.md) also covers DigiCert, Sectigo and the limitations of using Bitcoin block time for OpenTimestamps.

## Racing data qualification

| Source path | What can already be established | Evidence required for eligibility |
| --- | --- | --- |
| British official return through BHA, Weatherbys and PA | BHA describes shared official distribution and a process for appeals and corrections. The official provenance is valuable. Multiple displays of that return count as a single lineage. BHA website and administration terms control reuse. [Official distribution](https://www.britishhorseracing.com/faqs/how-is-the-official-full-race-result-distributed/) · [Rules compliance](https://www.britishhorseracing.com/about/the-bha/what-we-do/rules-compliance/) · [Website terms](https://www.britishhorseracing.com/terms-conditions/) · [Racing Admin terms](https://support.racingadmin.co.uk/opencms/opencms/racing-admin-support/help-and-support/faqs/general-usage/terms/) | Secure written machine access and approval to retain and transfer the exact versions. Obtain a licensed coverage denominator, event status and full fields, native race and runner IDs, actual off time, original publication and amendment timestamps, and dated correction records. Public terms alone do not establish these. |
| Racecourse Media Group / PA | Licensed raceday products include status, withdrawals and results for its 37 listed venues. PA delivery can share the official lineage even across distinct publishers. [Race-day data](https://racecoursemediagroup.com/structure-area/race-day-data/) | Reconcile venues, sample dates, withdrawals, stable crosswalks, race cancellations, coverage holes and amendments. Confirm review and backup rights, expiry and disposal constraints in writing. |
| IHRB rulings and appeals | Public Irish regulatory material can verify a specific adjudication. Amended placings are possible under the published rules. [IHRB Rules of Racing](https://www.ihrb.ie/getattachment/4ca298aa-ab9b-4de2-b35e-4351646ee837/260424-MASTER-RULEBOOK-_-as-Amended.pdf?lang=en-US) | Secure rights for bulk retention and reviewer access, a complete licensed result feed and version identity. Establish the upstream for each evidence line. Document publication and independent receipt time separately. |
| Betfair Exchange historical product | Offers market data with package-dependent granularity and stream publication times. Exchange settlement and official racing adjudication are separate evidence events. No package was purchased. [Historical feed specification and terms](https://historicdata.betfair.com/Betfair-Historical-Data-Feed-Specification.pdf) | Verify entitlement, sample coverage, market and selection mappings, publication/off/receipt time distinctions, revisions, separate retention and reviewer-transfer rights. Keep retrospective market analyses outside prospective validation. |

The [original source review](../source-verification.md) also records aggregator limitations. A qualifying sample must enumerate races and the full declared field with withdrawals, abandoned races and revisions. It must reconcile namespaced meeting, race, runner and market IDs. Preserve distinct scheduled off, actual off, publication, observation and attestation timestamps. Verify official lineage and the secondary source's independent acquisition or adjudication before reconciling. No official racing data product qualified for live Phase 3 intake in this review.

## Reproduce

Use a full-history checkout, Python 3.12, OpenSSL 3.x, Node and Chromium. These commands run with no live TSA or racing source:

```sh
git rev-parse HEAD
base=research/reviews/phase3-independent-review
handover="$base/final-qualification"
for manifest in "$base" "$base/transactional-repair" "$base/evidence-qualification" "$handover"; do
  sha256sum -c "$manifest/SHA256SUMS" || exit
done
evidence="$(mktemp -d)"
python "$handover/verify_integrated_pins.py" --archive-manifest "$evidence/protected-forecasts.sha256"
sha256sum -c "$evidence/protected-forecasts.sha256"
python scripts/audit_phase3_isolation.py "$evidence/intake.json"
cmp "$evidence/intake.json" "$base/intake-audit.json"
python research/phase3-transactional/acceptance.py "$evidence/transactional.json"
cmp "$evidence/transactional.json" "$base/transactional-repair/acceptance.json"
python research/phase3-evidence/acceptance.py "$evidence/evidence.json"
cmp "$evidence/evidence.json" "$base/evidence-qualification/acceptance.json"
python research/phase3-lifecycle/acceptance.py "$evidence/lifecycle.json"
cmp "$evidence/lifecycle.json" "$handover/acceptance.json"
python -m unittest discover -s tests
python -m unittest discover -s research/horse-ab-phase3-master-20261115 -p 'test_*.py'
for test in tests/*.cjs; do node "$test" || exit; done
npm ci --ignore-scripts --no-audit --no-fund
npx playwright install chromium
npm run test:browser
```

Use the [original statistical commands](../README.md) at the historical checkout when running the earlier exact-set `verify_pins.py`. Use the integrated verifier here because main added archived paths. The PR's [full regression](../../../../.github/workflows/research-regression.yml) and [browser workflow](../../../../.github/workflows/pr-browser-qa.yml) list the complete suites. See [local regression evidence](local-regression.json) for command outcomes. Use the PR checks for hosted evidence and the exact final head. Reviewer sign-off, written data permissions, independent clock/accuracy and provenance qualification, and operational end-to-end authorization remain required for registered Phase 3.
