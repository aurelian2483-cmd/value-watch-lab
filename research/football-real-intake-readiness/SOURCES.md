# Official documentation review · 21 November 2026

This table records a documentation review, without provider API requests,
accounts, signatures, token submissions, data extraction or fixture collection.
No provider, source pair, account or retention arrangement has been approved.

| Option | Documented capability | Unresolved for this study |
| --- | --- | --- |
| Football-data.org | Match schema shows numeric match/team IDs, zoned `utcDate`, `lastUpdated`, status and structured scores. Coverage lists the Premier League. Technical policy lists 10 requests/minute for registered free users. [Match schema](https://docs.football-data.org/general/v4/match.html) · [Coverage](https://www.football-data.org/coverage) · [Technical policy](https://docs.football-data.org/general/v4/policies.html) | Specific historical depth and actual free-tier access were not tested. A mutable `lastUpdated` field does not establish first availability or a full revision trail. Regulation-time semantics must be reviewed for the approved feed. Public `/terms` and `/legal` paths returned 404. Access, retention and attribution rights remain unverified. |
| OpenLigaDB | Official samples document `matchID`, scheduled start, ordered side objects and result entries, with warnings about relying on result-entry ordering. The operator's license page specifies ODbL 1.0 for supplied sports data and describes attribution and sharing obligations. [Samples](https://github.com/OpenLigaDB/OpenLigaDB-Samples) · [License](https://www.openligadb.de/lizenz) | Verified Premier League season completeness, explicit zone/settlement semantics for the required fields, match correction replay and suitable access limits were not established. Community submission may share an upstream source with another feed. Obtain a rights and lineage review for the exact archive. |
| Premier League official materials | The official terms identify database rights and permit limited private/personal uses. An official competition result can be a reviewer reference subject to the applicable rights. [Terms of use](https://www.premierleague.com/en/terms-and-conditions) | Automated rights, batch archive retention, stable IDs for a receipt, zone precision, earlier-result coverage and correction history are not established by the terms. No scraping or automated intake approved. |
| RFC 3161, approved TSA | A signed token covers a message imprint and TSA generation time. A reviewer verifies exact digest, nonce/policy as applicable, signature, trust chain, time, revocation evidence and long-term verification material. [RFC 3161](https://www.rfc-editor.org/rfc/rfc3161.html) · [FreeTSA documentation](https://www.freetsa.org/index_en.php) | A provider advertises a public RFC 3161 service, but its governance, availability, acceptable trust roots, certificate lifetime and retention suitability remain unapproved. The token bounds existence of the exact digest. It does not prove original data truth, independence, fixture identity or capture completeness. No token was requested. |
| OpenTimestamps | Official docs describe public verification of Bitcoin-backed timestamp proofs. An upgraded, independently verified proof can anchor a document digest to an earlier chain commitment. [Official OpenTimestamps documentation](https://opentimestamps.org/) | Pending attestations are insufficient. Block time and finalization latency do not establish a tight UTC kickoff boundary. Approve a conservative proof policy before considering it. It is outside this version of the readiness gate. No packet or hash was submitted. |

For either data provider, retain original response bytes when permitted,
a local receipt hash and acquisition log, provider ID and exact source UTC
metadata, and an append-only amendment log. An independent verifier must
review the provenance and timing. Two differently named sources can still
share the same upstream acquisition. Local clock logs, Git commit dates,
the journal hash chain and ordinary uploaded artifacts provide no approved
independent clock or proof that the exact packet existed before play.

A public Premier League fixture page was briefly fetched during the
documentation lookup. Its response was discarded without extracting,
inspecting or retaining fixture records, and it was excluded from this review.
