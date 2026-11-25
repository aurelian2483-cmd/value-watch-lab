# Historical evidence rights and provenance review — 25 November 2026

Scope: documentary and Git tree metadata inspection only. No source data rows, protected partitions, prediction vectors, provider feeds or outcome data were opened or fetched for this review. This is a technical review of public terms, not legal advice or a grant of access.

## Existing evidence checkpoint

PR #172, source branch commit 405136090977aecedffa096d2118f683a3c7669f, accepted workflow 45458157425, artifact 14950762722, archive SHA-256 a7bbd094720c3c3daf1c3ce0759563ffee2802f1da001b6259f355c6e9d6ce34. Report checkout cb8ca042a91c7127361ec0277caf467766d3fab2; manifest SHA-256 6d897815e295ce795b1f06eb640cf4c3391c16d3fa44c084f3bfb733f9bee1f7. All nine source Git blob identities and byte lengths match the inspected PR #182 revision 38378e3c66f26a43b019314586fdbd03ec97b2ab. These are Git metadata matches, not recomputed SHA-256 of data contents or a current-main inspection.

Historical: 782 accepted structurally, single-source unverified, date-only end-of-day precision. Prospective: 80 accepted structurally; 36 ready for human review, 20 awaiting independent source, 2 awaiting primary final, 22 awaiting event; verified outcome feed count zero. These are distinct overlapping inventories, not 862 certified events. Nine documentary claims absent. No protected split or source-use authorization.

## Public documentary findings

Accessed 25 November 2026. Collector code and design documents identify possible origins; they do not prove every archived row's provider, account tier, timestamp, authenticity or legal permission. Current terms may not be the terms applicable when older bytes were obtained.

| Provider / document | Observed public terms and implications |
|---|---|
| [open-matchday README](https://github.com/oladeeayo/open-matchday), [disclaimer](https://github.com/oladeeayo/open-matchday/blob/master/DISCLAIMER.md) | Non-commercial informational use with attribution, no sale or paid data-feed redistribution. Compilation mixes upstream sources with separate rights. Its terms do not clear all upstream reuse. |
| [Football-Data.co.uk fair usage](https://football-data.co.uk/contact.php) | Personal or academic research only, manual or light automated download no more than twice weekly. Commercial and AI training projects with heavy automation are not permitted by the stated policy. Do not treat the aggregator as an exception. |
| [ESPN terms link](https://support.espn.com/hc/en-us/articles/360035445091-Terms-of-Use), [Disney general terms](https://disneytermsofuse.com/), [Disney US terms](https://disneytermsofuse.com/english/), [Disney UK data-mining opt-out](https://tv.disney.co.uk/ai-opt-out) | ESPN directs users to Disney terms. Automated extraction/data mining restrictions and an AI opt-out create a material permission question; exact product, region, account and supplemental terms still require review. Do not collect or train using ESPN-derived material on this review alone. |
| [TheSportsDB terms](https://www.thesportsdb.com/docs_terms_of_use.php) (17 September 2026) | Official API content reuse permitted subject to third-party rights and plan restrictions; free tier intended for development, no app-store publication without paid subscription, no resale absent specific permission. Provider independence and historical scope unverified. |
| [Darts API terms](https://dartsapi.com/terms) (9 October 2026, v1.1) | Active-plan API use in own products, research and models, caching allowed; bulk republication/resale and circumventing limits disallowed. Verify actual account/plan, acquisition-date terms and feed lineage. |
| [OpenLigaDB data licence](https://www.openligadb.de/en/license), [API terms](https://www.openligadb.de/en/terms-of-use) | ODbL 1.0 for database data, attribution and share-alike where applicable, no coverage of external imagery or trademarks. Community supplied, no public immutable historical snapshots; fair-use and caching requirements. Stronger candidate for a separately approved bounded pilot; not a declaration of independently verified results or data-use authorization. German terms authoritative. |

## File-level documentary leads (not certifications)

- historical-reliability-data.json: scripts/collect_reliability_history.py downloads open-matchday master CSVs and sets date-only conservative cutoff. Unpinned upstream URL and upstream-specific rights remain unresolved. It identifies the source at a file level, not verified per-row lineage.
- prediction-ledger.json: research/PROSPECTIVE_CAPTURE_README.md describes existing Tennis/NFL ledger capture from other-sports-data.json. Upstream rights and pre-event independent retention need review.
- results-feed.json: original outcome contract; no stored outcomes in this checkpoint.
- research/result-review-status.json: research/RESULT_REVIEW_README.md and research/SECOND_PROVIDER_NFL_README.md describe ESPN primary and TheSportsDB secondary claims. Matching claims do not certify outcomes; no new settlement created.
- international-football-data.json and other-sports-data.json: respective collector scripts identify ESPN as a connection; actual bytes and rights remain unverified.
- darts/feed.json: scripts/collect_darts_research.py and darts/README.md identify Darts API. No actual account entitlement or date-specific terms established.
- rugby-research-data.json: scripts/collect_rugby.py identifies TheSportsDB and NRL calendar; calendar terms and additional upstream sources remain unresolved.
- football-expanded-data.json: origin not established in this review. Do not infer source from a filename.

## Reuse, not duplicate

scripts/read_openligadb_bundesliga.py already provides bounded, attributed one-matchday fixture receipts and is the appropriate candidate adapter to review first. Do not run it in this branch or broaden it into a collector before explicit permission and protocol review. It does not certify outcomes, historical availability or source independence. Existing main-branch collectors are not changed, triggered or stopped by this draft.

## Decision

All nine source review tasks remain unapproved. Real-data evaluation requires independently documented applicable rights, authenticated data lineage, outcome corroboration and separately approved chronological partitions. No source register claim is created by this note. Synthetic chronological controls may be tested without accessing real data. No financial, prediction or publication action is authorized.
