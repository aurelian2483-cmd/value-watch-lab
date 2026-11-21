# Phases 59–64 | Real-intake decision

**NO-GO.** All three pinned candidate paths remain **NOT READY** for real paper intake. Candidate identities match the existing registry. The seven externally dependent gates in the checked-in manifest are missing. There are zero eligible real captures and outcomes, zero verified coverage gained, and no scores or rankings. Models remain **UNVALIDATED** and publication **BLOCKED**.

| Gate | Evidence required for review |
| --- | --- |
| Source approval | Written, retained permission for each role and retention period, with documented retrieval and upstream lineage for the independent outcome sources. |
| Schedule | Preserved provider receipt, stable event ID in its approved namespace, ordered teams, competition and season, and a separately reviewed history establishing the earliest known zoned kickoff. Pending or rescheduled identity/chronology that the current packet cannot represent must be held out. |
| Earlier inputs | Exact retained input bytes and a signed-off availability record establishing completeness, non-duplicated event identities and pre-cutoff availability of each receipt. |
| Timestamp | Exact forecast packet, its RFC 3161 token, and independent verification receipt covering the message imprint, trusted signature and chain, policy, revocation checks, and UTC time against the approved cutoff. |
| Outcome review | Reviewed regulation-time settlement and corrections procedure, documented reviewer, and a demonstration of independent two-source adjudication with disagreement preserved. Real per-fixture receipts remain required after kickoff. |
| Retention | Approved custody, access and deletion policy, archival control check and provider permissions covering the review and retention period. |
| Registration | Approved, immutable protocol, UTC capture and outcome-review windows, buffer, accounting denominators, and sample and reporting rules registered before collection. |

[Requirements and responsibility matrix](REQUIREMENTS.md) · [Official source and timestamp documentation assessed](SOURCES.md) · [Proposed study protocol](STUDY.md)

## Reproduce

From the repository root:

```sh
python scripts/football_intake_readiness.py
python -m unittest discover -s tests -p 'test_football_intake_readiness.py'
python -m unittest discover -s tests -p 'test_football*.py'
python scripts/audit_football_provenance.py --check
python scripts/football_evidence_ledger.py check
```

The default report is deterministic JSON on stdout. `NOT READY` is a valid report and exits zero. Malformed manifests or unreadable explicit paths cause a nonzero CLI error. Optional local files are `--manifest <path> --packet <path> --inputs <path> --token <path>`. Version 1 accepts the exact fields enforced by the validator. The test module shows the full shape with fictional fields and bytes. No fixture, forecast, receipt, or score is written by the CLI.

A structural check verifies hashes, exact packet inputs and token identity, candidate model pins, chronology, documented roles, declared independence and retention. It cannot derive permissions, inspect unseen rescheduling history, prove source independence, reproduce probabilities from an external input format, or verify an RFC 3161 signature. Independently review these and verify all original evidence bytes before considering an exact manifest digest for approval in source review. The allowlist starts empty. There is no runtime override. A reviewed manifest can at most say `READY FOR AUTHORIZATION REVIEW` with intake disabled. No approved-source adapter or external capture workflow is enabled by this change.

Once decisions and evidence are independently supplied, engineering can implement a permitted adapter, re-derive the three vectors from the exact approved input bytes, integrate independent token verification, and test custody, cutoff and correction handling with local test vectors. The gate is a review aid for that step. It does not authorize an external submission or create a capture.

## Decisions needed

1. Choose a permitted schedule and input source and two genuinely independent permitted outcome sources. Confirm access, rights and provenance with the appropriate rights holders and name an independent reviewer.
2. Approve a timestamp authority and verification policy, and assign archive custody and retention terms consistent with source permissions.
3. Approve and register the paper-only study protocol, fixed UTC dates, buffer, and proposed coverage and sample thresholds before real intake.
