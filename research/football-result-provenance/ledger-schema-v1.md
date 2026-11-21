# Football evidence ledger schema v1

UTF-8 JSON with a top-level object. The executable schema and validator are
`validate` and `validate_row` in `scripts/football_evidence_ledger.py`.
Unknown fields and JSON duplicate member names are rejected. SHA-256 values are lowercase
64-character hex strings. Exact serialized bytes use LF and no BOM.

| Field | Contract |
| --- | --- |
| `schema_version` | Integer 1. |
| `rule_version`, `rules_sha256` | Rule label and digest of the four implementation files, with LF-normalized code bytes. |
| `manifest_sha256`, `archive_commit` | Exact manifest hash and pinned Value Watch Git commit. |
| `model_validation`, `publication_gate`, `verified_coverage_gained` | Constants `UNVALIDATED`, `BLOCKED`, integer zero. |
| `inputs` | Map keyed by `single`, `expanded`, `legacy`, `retrospective`, `ledger`, and `outcomes`. Each value has its fixed repository-relative `file`, exact byte `sha256`, integer `rows`, and fixed evidence `tier`. |
| `references` | Candidate reference index keyed by `expanded:<record_sha256>` or `legacy:<record_sha256>`. Each value has matching `input`, `tier`, `record_sha256`, and a one-based `locator` such as `expanded:30` within the pinned snapshot. |
| `counts` | `dispositions` histogram plus integer `candidate_rows` and `repeated_pairings`. Recomputed from rows. |
| `rows` | Array with one item per source observation. Ordered by stable key in committed output. |

Every row has:

- `key`, `tier` and `input`. The tier and input are always `SINGLE_SOURCE_UNVERIFIED` and `single`. The key is `source-v1:` followed by SHA-256 over a canonical UTF-8 JSON array of the source filename, source competition, calendar date and original ordered participants. It points into the pinned file through the original identity. A source-side naming or date edit causes removal and addition. A score, provider label or reviewed alias edit keeps the key. The key never serves as a stable fixture identifier.
- `competition`, `source_competition`, `season`, `date`, `date_precision` and `source_participants`. `date` is YYYY-MM-DD and precision is always `DATE_ONLY_END_OF_DAY`. Participants are the two original strings in home/away order.
- `score`, two nonnegative integers, and `upstream_provider`, `source_url` and `source_csv_sha256`, which preserve the reported source provenance. The snapshot file hash is at `inputs.single.sha256`.
- `disposition`, `reason`, `evidence_needed` and `candidates`. Allowed states and exact reason/evidence strings are defined by the versioned `POLICY` map. Each candidate has a `reference` key and a `disposition`. A nonempty list has one primary candidate, and any other entries are explicitly marked legacy repeats. Verification claims are rejected in v1.

Structural validation checks shape, references, safety and internal totals. Pinned
validation additionally checks the accepted Phase 10 totals. The `check` command rebuilds
from original pinned repository inputs and checks the exact committed artifact bytes.
A ledger that only passed structural validation remains an untrusted comparison input.
