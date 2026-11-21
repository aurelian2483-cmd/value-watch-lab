# Football result provenance

Research only. Models **UNVALIDATED**. Publication **BLOCKED**.

Rebuilt 734 single-source rows, 66 expanded finals, 18 legacy rows and 608 retrospective rows. The broader ledger contains 64 records, with 0 prospective football forecasts and 0 outcome-feed rows.

| Single-source disposition | Rows |
| --- | ---: |
| ambiguous_identity | 10 |
| duplicate | 0 |
| exact_independent_corroboration | 0 |
| linked_identity_insufficient | 41 |
| outside_centre_coverage | 72 |
| score_or_source_conflict | 0 |
| source_independence_unknown | 0 |
| unmatched | 611 |

Of the 51 distinct candidates, 41 map to expanded references and 10 to the legacy sample. Four repeated legacy reference pairings are recorded separately. No retrospective row was paired.

Found stable ESPN IDs for all 66 expanded reference fixtures. No single-source row carries a namespaced fixture ID or fixture-level receipt. No row gained verified coverage. The 25 newly inventoried IDs are on reference fixtures outside the 41 expanded candidate links. All 55 pairings still lack independent acquisition evidence.

The 72 Europa League results are outside current Centre result coverage.
Date-only results retain calendar-date precision. They establish neither kickoff nor pre-match availability.

| Evidence tier | Competition | Season | Rows | Date range | Teams |
| --- | --- | --- | ---: | --- | ---: |
| LEGACY_SCORED_ARCHIVE | PL | 2026/27 (inferred) | 18 | 2026-11-02 to 2026-11-08 | 24 |
| RETROSPECTIVE_RECONSTRUCTION | PL | 2024-25 | 320 | 2024-10-05 to 2025-05-25 | 20 |
| RETROSPECTIVE_RECONSTRUCTION | PL | 2025-26 | 288 | 2025-10-04 to 2026-05-24 | 20 |
| SINGLE_SOURCE_UNVERIFIED | D1 | 2026/27 | 81 | 2026-08-28 to 2026-11-08 | 18 |
| SINGLE_SOURCE_UNVERIFIED | E1 | 2026/27 | 180 | 2026-08-14 to 2026-11-07 | 24 |
| SINGLE_SOURCE_UNVERIFIED | I1 | 2026/27 | 110 | 2026-08-22 to 2026-11-08 | 20 |
| SINGLE_SOURCE_UNVERIFIED | PL | 2026/27 | 100 | 2026-08-21 to 2026-11-08 | 20 |
| SINGLE_SOURCE_UNVERIFIED | SP1 | 2026/27 | 119 | 2026-08-15 to 2026-11-08 | 20 |
| SINGLE_SOURCE_UNVERIFIED | UCL | 2026/27 | 72 | 2026-09-08 to 2026-11-04 | 36 |
| SINGLE_SOURCE_UNVERIFIED | UEL | 2026/27 | 72 | 2026-09-16 to 2026-11-05 | 36 |
| TWO_SOURCE_EXPANDED_FINAL | D1 | 2026/27 (inferred) | 9 | 2026-11-06 to 2026-11-08 | 18 |
| TWO_SOURCE_EXPANDED_FINAL | E1 | 2026/27 (inferred) | 24 | 2026-11-03 to 2026-11-07 | 24 |
| TWO_SOURCE_EXPANDED_FINAL | F1 | 2026/27 (inferred) | 9 | 2026-11-06 to 2026-11-08 | 18 |
| TWO_SOURCE_EXPANDED_FINAL | I1 | 2026/27 (inferred) | 10 | 2026-11-06 to 2026-11-08 | 20 |
| TWO_SOURCE_EXPANDED_FINAL | SP1 | 2026/27 (inferred) | 10 | 2026-11-06 to 2026-11-08 | 20 |
| TWO_SOURCE_EXPANDED_FINAL | UCL | 2026/27 (inferred) | 4 | 2026-11-03 to 2026-11-04 | 8 |

## Source chain

Scanned 68 reachable revisions of Open Matchday at `a6ffb2631e0da9d5b4ec64b97c7860eb91ae5592`. Value Watch snapshot last changed in `178cdec07135398a8d2f44ecf3277251998c84c8`.

Open Matchday distributes and deduplicates the CSVs. Its public documentation describes a private builder with merge priority OpenLigaDB, FixtureDownload, ESPN, football-data.co.uk, then Soccerway. The winning row label accounts for 653 FixtureDownload and 81 OpenLigaDB rows. The builder does not publish per-fixture upstream acquisition receipts or provider IDs. Documentation of provider priority cannot establish whether a particular score originated independently of ESPN or Sky Sports.

The expanded sample has 66 ESPN, 63 Sky Sports and 3 football-data.co.uk receipt entries. The legacy sample has 18 ESPN and 18 football-data.co.uk receipt entries across 14 distinct archived fixtures. Open Matchday also uses ESPN and football-data.co.uk elsewhere in its build. None of the audited rows claims those two labels, but the source chain cannot exclude shared upstream evidence. The retrospective archive points to a separate historical source commit. The record-level inventory retains each receipt URL and hash.

7 of 7 stored collector digests match decoded-text hashes at pinned upstream revisions. The manifest separately records the raw byte hashes. During this review all seven raw-byte hashes agreed and collector replay reproduced all 734 checked-in rows. The original URL uses mutable `master`. The collector records a snapshot-wide generation time and no original per-CSV retrieval time, HTTP receipt or upstream revision. A recovered equal blob does not prove when the original fetch happened.

| Competition | CSV rows | Claimed provider | Pinned CSV |
| --- | ---: | --- | --- |
| Premier League | 100 | fixturedl | [e1ec9773df80](https://raw.githubusercontent.com/oladeeayo/open-matchday/e1ec9773df8030a3e0c613f52eb3bd85437c21ab/data/ENG_1_premier-league/results_2627.csv) |
| Championship | 180 | fixturedl | [e1ec9773df80](https://raw.githubusercontent.com/oladeeayo/open-matchday/e1ec9773df8030a3e0c613f52eb3bd85437c21ab/data/ENG_2_championship/results_2627.csv) |
| La Liga | 119 | fixturedl | [e1ec9773df80](https://raw.githubusercontent.com/oladeeayo/open-matchday/e1ec9773df8030a3e0c613f52eb3bd85437c21ab/data/ESP_1_la-liga/results_2627.csv) |
| Bundesliga | 81 | openligadb | [e1ec9773df80](https://raw.githubusercontent.com/oladeeayo/open-matchday/e1ec9773df8030a3e0c613f52eb3bd85437c21ab/data/GER_1_bundesliga/results_2627.csv) |
| Serie A | 110 | fixturedl | [e1ec9773df80](https://raw.githubusercontent.com/oladeeayo/open-matchday/e1ec9773df8030a3e0c613f52eb3bd85437c21ab/data/ITA_1_serie-a/results_2627.csv) |
| Champions League | 72 | fixturedl | [6c3f5d233442](https://raw.githubusercontent.com/oladeeayo/open-matchday/6c3f5d233442b983857d5ebfaea74b5160a15a50/data/UEFA_1_champions-league/results_2627.csv) |
| Europa League | 72 | fixturedl | [e998bffc5f54](https://raw.githubusercontent.com/oladeeayo/open-matchday/e998bffc5f54f781c9642836461bd5b96b9e9523/data/UEFA_1_europa-league/results_2627.csv) |

The trace manifest gives document hashes and original and pinned URLs. Open Matchday specifies non-commercial attribution and leaves provider rights with the providers. This audit stores hashes, links and derived decisions. The raw CSVs remain at their upstream source.

- Terms limit redistribution and require express permission for wider distribution. No fixture-level source chain was identified. [Provider document](https://fixturedownload.com/terms)
- Describes a community project with registered contributors updating results. It does not give acquisition receipts for the exact archived fixtures. [Provider document](https://www.openligadb.de/)

## Reproduce offline

Make the Value Watch research commit `0ab96a96fd66608d931c4109392ee29fe2ba3650` available in the local Git object store. The command fails if the pinned expanded archive is missing or the checked-in snapshots differ.

```sh
python scripts/audit_football_provenance.py --check
python scripts/audit_football_provenance.py --json > /tmp/football-provenance.json
python scripts/audit_football_provenance.py --check --upstream-git /path/to/open-matchday
```

The optional local upstream clone must contain the pinned CSV blobs. That mode rehashes the original bytes and verifies exact collector replay. The regular offline mode rebuilds the decisions from pinned repository files and identifies the raw-source findings as a recorded trace. No command makes a network request.

To establish independence in future, obtain lawfully retained fixture-level receipts with event identifiers, settlement scope and auditable acquisition lineage, then manually review the crosswalk. A shared ID only establishes identity. Eight-digit dates, matching names and identical scores cannot prove independence.
