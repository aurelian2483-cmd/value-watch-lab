# Prospective paper shadow capture · Phases 51–58

**Real eligible captures: 0. Real eligible outcomes: 0. Insufficient data.**
The implementation admits synthetic fixtures only. Models remain
**UNVALIDATED** and publication remains **BLOCKED**.

| Candidate | Synthetic reproduction | Real intake |
| --- | --- | --- |
| Standalone baseline | READY, pinned standalone implementation and calculation trace | NOT READY |
| Standalone + earlier-five form (α = 0.025) | READY, same base with the fixed, separately identified multiplier | NOT READY |
| Expanded current-season formula | READY, exact pinned expanded kernel and current-season entry path | NOT READY |

The [candidate registry](candidates.json) binds original code commits,
source and runtime hashes, entry points and distinct configuration identities.
[Composition notes](../football-chronological-replay/README.md) describe the
unchanged denominators, clamp ordering and input requirements. The three
vectors use home/draw/away order. The registry grants no model approval or
prospective eligibility. The [preregistered protocol](PROTOCOL.md) governs
future paper intake.

## Commands

Use Python 3.11 or newer and an isolated journal outside the checkout. A
shallow clone can provision the exact source objects from this repository
before the offline rehearsal.

```sh
git fetch --no-tags --depth=1 origin 9898e7e7773878ec32a0bfd3c38197fddb566893 0ab96a96fd66608d931c4109392ee29fe2ba3650
python -B tests/football_shadow_capture_rehearsal.py
python -m unittest discover -s tests -p test_football_shadow_capture.py
python scripts/football_shadow_journal.py report --journal /tmp/value-watch-paper --as-of 2026-11-21T08:00:00Z
python scripts/football_shadow_journal.py append operation.json --journal /tmp/value-watch-paper
```

The end-to-end rehearsal builds the operation files from deterministic
synthetic fixtures, uses the real pinned calculation code, checks rejection
paths via the focused suite, and compares two byte-identical journals and
reports. On Windows choose a path such as `C:\Temp\value-watch-paper`
on a volume that supports hard links. The optional `--expect-head` checks a
separately retained 64-character SHA-256 before an append or report.

## Record format and state transitions

Use UTF-8 JSON, including explicit UTC offsets. The outer operation requires
`schema_version` (1), `kind`, `recorded_at` and `body`. Evidence is
restricted to synthetic namespaces and opaque `synthetic-` receipt
references. [Synthetic fixture generators](../../tests/test_football_shadow_capture.py)
show the complete record shapes.

- **Schedule** records the exact ordered Premier League fixture, zoned
  kickoff, source observation and provenance. The declared season must
  agree with kickoff. A different ID, date or alias cannot revise that
  season's ordered pairing. Exclude a changed fixture for review.
- **Capture** requires an exact UTF-8 packet and separately bound synthetic
  freeze proof. The packet includes exact history bytes, their SHA-256,
  the shared input cutoff and all three existing canonical forecast objects.
  Current-season result observations must precede or equal the input cutoff
  and concern UTC dates strictly earlier than the fixture. The command
  recomputes the fixed paths as an integrity check against supplied
  probabilities. Candidate records, chronology and shared history must
  match. The three records are appended atomically or all are rejected.
- **Outcome attachment** uses existing regulation-time receipt validation
  and the exact reviewed fixture linking procedure. Shared provenance,
  conflicts, missing review, nonfinal outcomes and future receipts withhold
  adjudication. A supersession links the active outcome envelope and retains
  every earlier receipt. An exclusion correction records an explicit reason
  and links the active record. No correction overwrites a forecast.
- **Report** gives scheduled, captured, kickoff-passed, pending-review,
  unresolved, adjudicated and excluded states at an explicit time. A
  synthetic adjudication demonstrates workflow behavior only. Each admitted
  fixture has one packet per path, preserving the common cohort. This
  milestone emits no real or synthetic scores or rankings.

## Immutability and readiness limits

The CLI reads local files and pinned Git objects. It uses no provider or
network path and writes only numbered records in an explicit external
journal. Exact request, packet and input text remain recoverable. Each
append takes an exclusive writer lock and publishes a fully written file
without replacement. Unsupported filesystems and stale writer locks fail
closed. If a crash leaves a lock or pending file, preserve the directory and
review its bytes and last externally retained hash before retrying.

A hash chain can expose edits when its head is independently retained.
It cannot prove the time of observation, prevent local deletion, or establish
independent acquisition. Synthetic labels, timestamps and receipts do not
provide that proof. Real readiness still requires a protected external
timestamp or equivalent pre-kickoff receipt for the exact bytes, verified
schedule and complete earlier result inputs, independently reviewed
regulation-time result receipts, an approved evaluation window and agreed
retention/immutability controls. The current command has no real intake mode.
