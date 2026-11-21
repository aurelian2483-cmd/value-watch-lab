# Verified-results coverage pilot

Models **UNVALIDATED**. Publication **BLOCKED**.

Regenerate with `python scripts/audit_verified_results_pilot.py --write`. The pinned research commit must be available locally.
The audit reads the checked-in snapshots and Git objects offline.
The underlying Phase 8 audit logic is carried forward from PR #118 at `b5cbd5c8`.

| Single-source disposition | Rows |
| --- | ---: |
| ambiguous_identity | 10 |
| outside_centre_coverage | 72 |
| unmatched | 611 |
| verified_fixture_link_identity_insufficient | 41 |

Total: **734**. Verified coverage gained: **0**.

Reference pairs: **55** (ambiguous_identity: 10, duplicate_or_repeated: 4, verified_fixture_link_identity_insufficient: 41).

Reference receipt hosts and source labels are recorded for every pair. They establish claimed lineage, with fixture-level independence unresolved.
Single-source snapshot freshness at review: recent. This is a snapshot-age diagnostic.
The JSON includes every source row and reviewed reference. Input counts and tier dispositions cover the complete reference archives.
The date-only source rows supply neither kickoff times nor pre-match availability. The ESPN IDs bind only the archived reference side.
Legacy forecast hashes link research records. Those archives do not supply a stable provider fixture identity for these rows.

## External source assessment

- Published result schema has ordered names and a source label but no provider fixture ID. The private compilation pipeline combines providers and describes fuzzy name matching. This documentation cannot establish independent acquisition of a specific row. Retrieved 2026-11-21T03:27:36.520286Z. SHA-256 `aa0ececf267197edbc0ced75d28838131887906b3c1b69a95f427d633de217a1`. [Source](https://raw.githubusercontent.com/oladeeayo/open-matchday/master/README.md)
- The compilation specifies non-commercial use and attribution. Underlying provider rights still apply. Retrieved 2026-11-21T03:28:09.290310Z. SHA-256 `59928a4b47ce095391647fe63702ff8a000c54f8b0bbf3648d1727134d5b1ea5`. [Source](https://raw.githubusercontent.com/oladeeayo/open-matchday/master/DISCLAIMER.md)
- Candidate external API documents provider match IDs, UTC dates, participants and scores. Match retrieval requires an authentication token. No fixture payload was requested or captured. Retrieved 2026-11-21T03:27:36.316585Z. SHA-256 `869ede494eeef31b9e89f821fba22d791c01ceb3e2db6d84881767eaaa56dae2`. [Source](https://docs.football-data.org/general/v4/match.html)
- Coverage information alone does not demonstrate rights or availability for the exact historical fixture sample. Retrieved 2026-11-21T03:28:08.809181Z. SHA-256 `b2562b74430df44fdc0f6b85cfea8405ae092535eacb24da1cfcadac96bcc0ff`. [Source](https://www.football-data.org/coverage)
- Reviewed technical policies. Public terms URLs attempted returned 404. Historical access, retention rights and per-fixture upstream independence remain unconfirmed. Retrieved 2026-11-21T03:28:09.064775Z. SHA-256 `61a56e6a6a9563777008a9f3396eda9cb39b84d36163dc149992a0d56a45ff23`. [Source](https://docs.football-data.org/general/v4/policies.html)

No external fixture data was ingested. No source row was promoted.
A future crosswalk needs original fixture-level source records, explicit stable IDs or a collision-free reviewed mapping,
permission to retain the evidence, and independently sourced regulation-time results.
