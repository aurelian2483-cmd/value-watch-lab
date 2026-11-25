# OpenLigaDB bounded historical source pilot — 25 November 2026

Based on accepted PR #183 revision bee3fcf2e88514d8f0fb4c04644d8ee1ad335d0a. Operator explicitly authorized a bounded read-only OpenLigaDB historical pilot. Scope selected: Bundesliga (bl1), 2025/26, matchday 1, one GET to https://api.openligadb.de/getmatchdata/bl1/2025/1. No other matchday, source, repeated polling, protected data, production execution or publication authorized.

## Documentary basis

Reviewed the authoritative German data licence and API terms (last updated 7 November 2026), English courtesy translations, ODbL 1.0 and the provider API documentation on 25 November 2026:

- https://www.openligadb.de/lizenz
- https://www.openligadb.de/nutzungsbedingungen
- https://www.openligadb.de/en/license
- https://www.openligadb.de/en/terms-of-use
- https://opendatacommons.org/licenses/odbl/1-0/
- https://api.openligadb.de/index.html
- https://github.com/OpenLigaDB/OpenLigaDB-Samples (explicit example resultTypeID 2 and resultName Endergebnis).

Data from OpenLigaDB (www.openligadb.de), licensed under ODbL 1.0. Database reuse is permitted subject to attribution, share-alike where applicable, and no technical restrictions on recipients' licensed rights. Individual third-party rights including logos and images are not granted. No images, trademarks, names, individual score values or match rows are retained in published receipts. The public repository issues URL is used as project contact in the User-Agent. No private contact details sent. No API keys needed. Historical seasons are not polled. Failure or rate limiting terminates the attempt; no retries or fallback. No future automatic retrieval.

## Implementation and boundaries

The existing scripts/read_openligadb_bundesliga.py reader is unchanged and reused. A capture wrapper permits exactly one fixed GET, adds the project contact, rejects redirects and retains response bytes only in memory for the one inspection. The existing limit is 256 KiB with a 12-second request timeout; CI has a three-minute job limit. Nine unique fixtures and eighteen unique provider team IDs must reconcile, all provider-reported finished, with UTC kickoff inside the season and before capture. Exactly one explicitly identified final result per fixture, matching both documented type and name, must contain valid integer scores. This does not certify score correctness or prove that a result was available at any earlier cutoff. It rejects unknown, partial, duplicate, ambiguous or contradictory metadata rather than inferring an outcome.

Offline unit tests run on PR updates; live retrieval is restricted to the initial opening of this exact branch against the pinned base, first attempt only, after offline checks pass. No scheduled trigger or automatic retry. Do not reopen a new PR or manually rerun the source retrieval without separate approval. The repository is public, so the only live artifact is an attributed aggregate count/hash receipt. The response body is not uploaded, committed, or printed. It is not an archive of individual result records and cannot substitute for an independently corroborated dataset. This choice preserves the existing no-publication boundary and means replay can only be done using synthetic fixtures, not the original live bytes.

No real-data fitting, protected splits, forecast scoring, financial actions, independently verified outcomes, catalogue qualification, or live producer dispatch. Research remains UNVALIDATED and publication BLOCKED. Existing branches, data files, source registers and collectors are unchanged. A successful pilot establishes source contract feasibility for one sample only; source independence, historical availability, representative coverage and applicable rights for other sources remain separate requirements.
