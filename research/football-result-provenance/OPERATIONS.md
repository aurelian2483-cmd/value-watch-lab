# Football evidence operations, Phases 11–16

The [Phase 10 audit](README.md) remains pinned. The [ledger summary](ledger-summary.md)
and [schema](ledger-schema-v1.md) describe its row-level projection. The ledger
is a research artifact with no consumers in the Centre, forecast pipeline or result feeds.
Models remain **UNVALIDATED** and publication remains **BLOCKED**.

## Reproduce and compare

A clean checkout needs the Value Watch Git object
`0ab96a96fd66608d931c4109392ee29fe2ba3650`. If it is missing, provision that
specific repository object first. A shallow checkout without the archive
fails with an archive error. The fetch is a one-time repository setup step.
The reporting commands use only local inputs and run offline after provisioning.

```sh
git fetch --no-tags --depth=1 origin 0ab96a96fd66608d931c4109392ee29fe2ba3650
python scripts/audit_football_provenance.py --check
python scripts/football_evidence_ledger.py check
python scripts/football_evidence_ledger.py validate research/football-result-provenance/ledger.v1.json
python scripts/football_evidence_ledger.py compare "old ledger.json" "new ledger.json"
python scripts/football_evidence_intake.py research/football-result-provenance/intake.empty.json
```

Use `emit` for canonical JSON and `summary` for Markdown. The CLI emits bytes
to stdout and has no file-writing option. POSIX shell redirection can save an
artifact to a new explicitly chosen path. On Windows use `py -3.11` or
`py -3.12` in the commands above. For byte-exact artifacts on Windows, use
`cmd.exe` redirection or a binary pipe. Older PowerShell text redirection
can change encoding and line endings. Structural validation accepts UTF-8
with BOM or CRLF. Pinned checks enforce canonical UTF-8 with LF. Git attributes
preserve committed snapshot and report bytes even when `core.autocrlf=true`.

Comparison matches stable source keys and reports additions, removals, field
changes and reclassifications in deterministic order. It lists relevant changed
input hashes and old/new rule fingerprints. If several pins changed, the tool
reports them for review and makes no causal claim. A change without a
reported changed pin is identified separately. Positional reference locators
are tied to the pinned files and changes to their ordering alone are ignored
during drift comparison. `validate` checks internal consistency of a supplied
ledger. `check` also checks the immutable Phase 10 pins, rebuilds decisions,
compares committed bytes, and checks for drift.

## Future receipt intake

The [intake contract](intake-schema-v1.md) defines provider and acquisition lineage,
namespaced event IDs, ordered fixtures, timestamp precision, settlement, retrieval
time, source references, content hashes, and licence/retention claims. Explicit
unknown and unavailable fields keep missing evidence visible. The validator opens
only the supplied metadata file. It has no ledger integration, classification
write path, or fetch operation. Empty, partial and complete synthetic inputs all
produced zero verified results and zero automatic classification changes.

## Integration review

| Draft | Finding |
| --- | --- |
| #116, Team & Competition Centre | Actual snapshots produce 608 retrospective matches and 66 expanded finals. Exact event URLs pass the existing handoff test. Missing expanded snapshots yield zero expanded results and leave retrospective coverage intact. |
| #117, season-aware trends | The same inputs yield 320 and 288 retrospective matches in separate seasons. The current schedule has its own zero-history Premier League bucket. The seven supported competition codes exclude Europa League. Aliases and positional names are UI aids. They establish no provider crosswalk. |
| #118, initial reconciliation | Its 51 likely overlaps and four repeats reconcile with the ledger. The 51 are candidates. No independently confirmed fixture is established by that report. |
| #119, verification pilot | Its 41 expanded links, 10 ambiguous legacy candidates, 611 unmatched and 72 outside coverage reconcile exactly after mapping its expanded-link label to the ledger label. |
| #120, pinned provenance | Original Phase 10 report bytes regenerate to the pinned digest. No tracked match, feed, forecast or UI data changed in this branch. |

Both Centre builds flag stale schedules at 48 hours. Future fixtures can
remain visible with a stale notice. Current snapshot age does not upgrade
historical evidence. The descriptive views are gated on their existing
retrospective and two-source metadata. Those metadata checks rely on
recorded receipts and cannot independently establish acquisition lineage.
The legacy and single-source tiers do not enter those views.

The review exercised duplicate JSON members, duplicate rows, collisions
within and across candidate lists, exact byte drift, corrupted pins, reversed
participants, alias collisions, conflicting scores, missing archive inputs,
date-only precision and platform-sensitive paths and encodings. A valid
structure cannot override the pinned regeneration check. Ledger v1 prohibits
all verification dispositions because this evidence tranche has no new
fixture-level independent evidence. A future review would need a separately
designed schema and policy update before accepting such evidence.

The clean-checkout review with `core.autocrlf=true` also exposed an existing
catalogue SHA-256 failure when Git converted archived bytes to CRLF. Exact-byte
attributes now cover the pinned catalogue and the 76 Sky 81 replay blobs.
The hash checks and archive contents are unchanged.


## Adversarial tests

A review found that a locator such as `expanded:01` could alias `expanded:1`
while appearing distinct in the structural validator. Locators now require
canonical decimal ordinals. Source URLs reject ambiguous delimiters, embedded
whitespace, credentials and invalid ports. Byte-exact regeneration still
detects artifact substitutions that a structural check cannot adjudicate.

In temporary copies, targeted tests caught six deliberate mutations: bypassing
home/away order, accepting a swapped evidence tier, skipping a CSV hash
comparison, skipping count reconciliation, claiming one verified result, and
allowing leading-zero locators. The mutations were discarded. These checks
exercise the stated guards. They cannot establish source independence or
prove any real fixture identity.

The final review ran the Phase 6/7 tests against their checked-out heads and
loaded the pinned Phase 10 snapshots into both views. Supplying the single-source
snapshot as an extra input left both views unchanged. Phase 8/9 counts reconciled
with the ledger and Phase 10 regenerated against its original report hash.
