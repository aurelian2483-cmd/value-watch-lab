# Post-merge Pages and anonymous source review

Reviewed 21 November 2026 (UK). GitHub Pages recorded PR #136 merge
`7763efde8950401d6699bada6a67d383b6ea7c2b` as built at 13:10:02 UTC. At
review the current build was `0b128098404e783a10ad08773f0bac5de0163a12`
after racing snapshot refreshes. The live homepage markup, overview CSS and
source scripts, compact CSS, and Sports Watch markup matched the approved
merge byte for byte.

The live check exercised the compact view at 1440, 820 and 390 px. The nine
lanes, design and phone table matched the PR #136 comparison, allowing for
newer source snapshots and the current time. A live interaction exposed a
gap in the PR test. On the first sport selection from All, the overview
tried to focus the evidence region while the desk's queued render still
had it hidden. The review branch defers scroll and focus until that
render has run and adds a keyboard regression at all three widths.
The compact design remains opt-in via `?view=visual-preview`.

## Source decisions

| Candidate and competition | Anonymous access, identity and timing | Reuse and decision |
| --- | --- | --- |
| OpenLigaDB, Bundesliga | The documented `/getmatchdata/bl1/2026/10` endpoint returned nine rows on 21 November at 13:17:59 UTC. Ordered team IDs, numeric match IDs and explicit UTC kickoff were present. The mutable `lastUpdateDateTime` had no offset and is excluded. | Data is ODbL 1.0 with attribution and applicable share-alike. Team names, logos and marks are outside the grant. The official examples describe revision checks to avoid unnecessary polling. A numeric rate limit and freshness guarantee remain unconfirmed. [API examples](https://github.com/OpenLigaDB/OpenLigaDB-Samples) · [Data terms](https://www.openligadb.de/lizenz) |
| OpenFootball, Premier League, Championship, La Liga, Serie A, Bundesliga, Ligue 1 | PR #136 verified anonymous season files and documented daily builds from community upstream. All six contain rounds, teams and dates, but no stable fixture IDs or zoned kickoff. | Public-domain data. Retain as a possible historical research source outside prospective fixture and result feeds. [JSON repository](https://github.com/openfootball/football.json) |
| OpenFootball and UEFA, Champions League and Europa League | OpenFootball documents a historical community text archive, with checked season directories through 2025–26. No current anonymous feed with stable IDs and zoned times verified. | OpenFootball dedicates its datasets to the public domain. UEFA's public site terms do not give the proposed feed reuse grant. [OpenFootball UEFA archive](https://github.com/openfootball/europe-champions-league) · [UEFA terms](https://www.uefa.com/termsconditions/) |
| StatsBomb, selected historic domestic and UEFA competitions | Public GitHub catalogue lists limited historical coverage, including Premier League 2015/16 and Europa League 1988/89. No current slate in scope. We reviewed the catalogue and agreement only. | The agreement asks users to register interest and provide name/email before access, restricts external raw-data distribution and commercial exploitation, and requires logo attribution for published analyses. No connector. [Catalogue and agreement](https://github.com/statsbomb/open-data) |
| GB/IRE racing, BHA and HRI | Public human-facing racing information. No authorized anonymous race/runner feed with stable identifiers and zoned revision times was confirmed. | BHA terms limit personal extracts. HRI expressly requires written consent for automated data collection. Existing snapshots remain subject to their current evidence limits. [BHA terms](https://www.britishhorseracing.com/terms-conditions/) · [HRI terms](https://www.hri.ie/terms) |
| Tennis, basketball, cricket and football, SportScore | PR #136 verified the anonymous widget response includes zoned times, response update time and match links. Durability of the opaque match URL and competition completeness are undocumented. | Widget terms specify attribution, permitted caching, approximately 10,000 requests/day/IP, no bulk redistribution and a 60-second edge cache. The legacy date-scoped route remains disconnected. WTA and NBA public terms do not establish a feed grant. [SportScore terms](https://sportscore.com/developers/terms/) · [WTA terms](https://www.wtatennis.com/terms-and-conditions) · [NBA terms](https://www.nba.com/termsofuse) |
| NFL, nflverse | The public release and field dictionary document game identity, schedule and score. The documented in-season schedule cadence is five minutes. | The exact export's storage/display grant, upstream rights and request limits remain unverified. [Schedule release](https://github.com/nflverse/nflverse-data/releases/tag/schedules) · [Update schedule](https://nflreadr.nflverse.com/articles/nflverse_data_schedule.html) |
| Cricket, Cricsheet | Anonymous public JSON and XML downloads supply historical match records, dates and filename references. Date precision cannot establish kickoff or prospective observation. | JSON is ODC Attribution and XML is CC BY 4.0. Refresh guarantee, request limit and durable fixture identity contract remain unconfirmed. [Download archive](https://cricsheet.org/downloads/) · [Licensing](https://cricsheet.org/licensing/) |
| Rugby, darts, golf | World Rugby, PDC and DP World Tour are human-facing. No anonymous machine contract with stable IDs, zoned times and update limits was established. | No applicable storage and display grant verified. [World Rugby terms](https://www.world.rugby/terms-and-conditions) · [PDC terms path](https://www.pdc.tv/terms-and-conditions) · [DP World Tour terms](https://www.europeantour.com/terms-of-use) |

See the [PR #136 source review](pr136-release-review.md) for the other
football candidates and probe details.

## Scope of the local reader

`python scripts/read_openligadb_bundesliga.py 2026 10` issues one anonymous
request for the selected Bundesliga matchday. It emits a local stdout
receipt with event/team IDs, UTC kickoff, provider finish flag, capture
time, response hash and attribution. The nine-row probe's SHA-256 was
`00bf32b28f05b6d21951072ddecc2f8da45612cb42a8fd1bc06fdf16e6b9f1cd`.
The reader rejects identity conflicts, unexpected scope, invalid timestamps
and broken responses. The source finish flag is not a corroborated final.
Scores, odds, team marks and the unzoned revision timestamp are omitted.
No probe data is committed.

The reader has no scheduler, browser integration, crosswalk, data write,
settlement or publication path. Bundesliga coverage is experimental.
Scheduled collection would require a documented acceptable polling cadence,
and any shared derivative requires ODbL attribution and share-alike review.
Cross-source joins still require explicit mapping and independent review.
No new forecast or outcome has become eligible. **UNVALIDATED / BLOCKED.**
