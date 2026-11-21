# Read-only football integration

The shadow report has **zero eligible real forecasts and zero adjudicated real
outcomes**. Status is **insufficient data**. Models remain **UNVALIDATED** and
publication remains **BLOCKED**.

| Source | Rows | Evaluation disposition |
| --- | ---: | --- |
| Premier League experimental dashboard | 40 | Ineligible. Observation, identity and configuration gaps remain. |
| Archived paper forecast projections | 7 | Ineligible. Their record digests point to archive entries. No independent freeze is established. |
| Expanded experimental dashboard forecasts | 0 | No rows. |
| Prospective football ledger / outcome feed | 0 / 0 | No rows. |
| Historical market references | 5 | Separate diagnostic count. No join or scoring. |
| Labelled evaluator example | 1 forecast and 2 receipts | Test fixture only. Zero records scored. |

The 66 expanded finals, 18 legacy history records, 608 retrospective Premier
League rows and 734 single-source rows retain their distinct evidence tiers.
Neither Phase 10 candidate links nor Phase 11 ledger rows enter the outcome
packet. The legacy bridge can round-trip the exact supported fields and diagnose
selection settlement, ID and chronology conflicts. Its output has no route into
canonical evaluation. The verifier is unchanged.

## Run locally

```sh
python scripts/football_shadow_report.py
python -m unittest discover -s tests -p "test_football*.py"
```

The report emits deterministic UTF-8 JSON to stdout and reads the exact
snapshot files identified by the [pinned manifest](manifest.json). A hash
mismatch fails before source adaptation. It preserves each row and its
canonical row hash, shows fields projected or omitted, and counts identity,
chronology and exclusions by source. Source generation and the fixed review
clock support freshness diagnostics. They cannot fill a missing freeze
timestamp or establish first availability. The evaluator receives only
complete canonical candidates. With these snapshots neither the forecast nor
outcome path has one.

[Producer trace](ARCHITECTURE.md) · [Model lineage](MODEL-LINEAGE.md)
· [Canonical evaluation contracts](../football-prospective-evaluation/SCHEMA.md)

## CI and review

The shared research workflow covers phase-stack PRs with a full Linux
regression and focused macOS and Windows Python 3.11/3.12 jobs. It provisions
one pinned repository Git object for the existing provenance audit. Report
generation, fixtures and tests run offline after provisioning. Exact-byte
attributes preserve source hashes on checkouts with CRLF conversion.

Adversarial checks covered leading-zero IDs, reordered or duplicated teams,
date-only kickoff, at-kickoff timestamps, stale and future snapshots, modified
snapshot and manifest bytes, injected canonical-looking fields, an inconsistent
legacy selection settlement, and unregistered or ambiguous model lineage.
No reviewed source supplies an admissible model/version/configuration pair yet.
