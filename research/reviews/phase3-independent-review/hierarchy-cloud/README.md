# Multi-tier timestamp and cloud acceptance handover

Draft PR 143 is pinned to `e03ff8668330a4c2020f4ccc364f935e38741db8`. The separate external dependency evidence at `360476ca310865308c95eae9c8a751cf36f24ab0` is the direct baseline for this work. The hierarchy and hosted fixture code ran at `b2871d43cb587dbd0c959814bcd69309c03ca325`. This branch neither merges PR 143 nor deploys. All 612 pinned forecasts, registered protocol, model and historical evidence were verified by unchanged repository safeguards. **UNVALIDATED. Betting publication BLOCKED. Registered live Phase 3 DISABLED.**

## Reproduce the engineering acceptance

Run from a full-history checkout with Python 3.12 and OpenSSL 3.x.

```sh
base=research/reviews/phase3-independent-review
sha256sum -c "$base/hierarchy-cloud/SHA256SUMS"
python "$base/final-qualification/verify_integrated_pins.py"
python -m unittest discover -s research/phase3-hierarchy -v
python "$base/hierarchy-cloud/missingness_bounds.py" | cmp "$base/hierarchy-cloud/missingness-bounds.json" -
```

The [hosted Ubuntu run](https://github.com/aurelian2483-cmd/value-watch-lab/actions/runs/45867536733) passed ten new tests and reproduced all 27 transactional, 24 evidence and 15 lifecycle test receipts byte for byte. It also recorded all 612 applicable forecast hashes. Local Python regression passed 348 repository and 67 registered Phase 3 tests, and the five targeted Operations Centre/racing JavaScript checks passed. Two real Chromium suites also passed for the responsive dashboard shell and controlled football, tennis and NFL odds display. The existing protections cover concurrent writers, duplicate receipts, replay and restarts. The new module is stateless and has no production caller. External human technical and statistical review remains outstanding.

## Timestamp hierarchy and revocation

The offline adapter verifies only synthetic inputs. It trusts a caller-pinned single root and signer fingerprint under a named profile, treats intermediates as untrusted path inputs, validates timestamps at signed generation time with timestamp EKU, and binds a SHA-256 imprint plus nonce separately to the original query and exact bytes. Rollover requires a newly pinned profile. Prior profiles can be retained for offline replay; no trust settings update automatically. The verified upper bound is `signed generation + signed accuracy`. It must be strictly before the registered scheduled start minus five minutes. Fractional tests exercise equality and a one-microsecond difference.

Every non-root level needs signed integrity and issuer authorisation. For CRLs, the publication window must satisfy `generation ≤ thisUpdate ≤ observed < nextUpdate`. For issuer-signed OCSP observations, require `generation ≤ thisUpdate ≤ producedAt ≤ observed < nextUpdate`. A matching observed serial with `good` text is insufficient. A negative fixture demonstrated why the explicit OpenSSL signature verdict is required. The suite covers revoked intermediate compromise, wrong responder, invalid signature, wrong serial, missing or stale status, expired signer certificates and wrong pins. Independent review must qualify any actual delegated responder and the collection of observation times. Rechecking an archived receipt depends on retained status and subsequent compromise information. This is not a permanent proof against future revocation or a renewable long-term evidence record. [RFC 3161](https://www.rfc-editor.org/rfc/rfc3161) · [OCSP RFC 6960](https://datatracker.ietf.org/doc/html/rfc6960)

The two actual Open TSA synthetic receipts now verify through the new adapter with the provider-supplied intermediates and the locally measured fingerprints from the offline diagnostic. Neither supplies independent anchor approval or qualifying signed revocation evidence. The two prior FreeTSA receipts lack signed accuracy. All four remain outside registered intake. No further requests were issued to either provider.

## Evidence preservation and expiry

The original synthetic input bytes and client-generated RFC 3161 query bytes are retained in [the restoration record](disposable-restoration.json) as base64, with matching SHA-256, original receipt and chain fingerprints, host deadlines and restoration verdicts. The [external observations](../external-dependencies/timestamp-observations.json) retain transport timings and verification metadata. The binary provider responses, chains, and status material remain in the existing GitHub artifacts and permitted transient copies. There is no permanent publication of raw provider material in this branch. Published terms and review restrictions remain as documented. Open TSA archival redistribution permission is unresolved, and approving long-term handling requires the evidence owner's terms as well as secure approved storage.

Both original ZIPs were checked against their published SHA-256, processed via the existing disposable evidence vault, restored to a separate disposable workspace, checked for exact equality and parsed offline. Both Open TSA attestations then verified from restored bytes. Fixture storage used the original hosted expiry and left no new external copies. Hosted binaries are due to expire on **26 December 2026 at 17:07 UTC**. The durable owner bytes and hashes cannot, alone, reconstruct expired provider-signed bodies. To independently reproduce the custody rehearsal before expiry, download the original authorised ZIPs from the [artifact index](../external-dependencies/README.md), then run:

```sh
base=research/reviews/phase3-independent-review/hierarchy-cloud
python "$base/replay_artifacts.py" /path/to/ubuntu.zip /path/to/windows.zip | cmp "$base/disposable-restoration.json" -
```

If a provider grants longer retention, capture that grant and the authorised reviewer/storage roles before promoting any raw materials to a private evidence store. Any replacement copy must preserve original exact hashes, dated status and expiry information. Keep source and transport claims distinct from the timestamp trust decision.

## Scientific result

The new exact enumeration asks whether the sign of the all-race mean is identifiable when large dates are missing. An artificial 12-date design observes 70 of 120 races and gives the observed mean as −15.743 milli-units. When the missing 50 race effects take either endpoint of the imposed [−120,+120] range, two compatible full-population means are −59.183 and +40.817 milli-units. Repeating the design to 1,200 dates leaves the range unchanged. These bounds are conditional on the artificial support and data design. They demonstrate an identification limit and supply no performance claim. No random draws, earlier racing results or registered data were used. The locked run rules and earlier bootstrap/HAC study remain intact. [Experiment receipt](missingness-bounds.json)

## Integration and dependencies

The current upstream `main` observed during review was `93cf4ce2e2dd635cb9dea7bf5ee410b9ce1feaa8`. A local merge-tree dry run completed without conflicts against the hierarchy code. The experimental branch keeps the timestamp connectivity workflow and hosted regression limited to their feature branches. The order for any approved later integration is the pinned diagnostic and provenance history, isolated hierarchy acceptance, and the manifest-linked reviewer handover. PR 143 stays at its pinned head during this work.

[Cloud, data sources, provenance and Genesis assessment](cloud-and-sources.md) records the distinct runtime limits, new research-source candidates and enquiry addendum. Reuse the [independent reviewer checklist](../external-dependencies/reviewer-checklist.md) with the new OCSP, multi-tier and custody receipts. Necessary external decisions remain authorisation to send provider enquiries, source and archival permissions, independent root/status qualification, and appointment of external reviewers. Actual GitHub default-branch cron or a permanent runtime needs separate approval. A local Windows environment is optional to the cloud engineering work.
