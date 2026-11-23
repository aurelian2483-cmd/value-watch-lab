# Bottleneck Lab — future NFL second-source original response preservation

This research-only stage extends the **disabled-by-default** private first-source capture in PR #160. It handles the two existing NFL second-source observation paths: TheSportsDB public NFL results API and the nflverse schedule CSV fallback. It does not invent any result, fetch historical lost bytes, verify publisher independence or enable betting.

## Implemented changes

- scripts/private_result_capture.py: new second-source retention method. It accepts an unverified NFL result observation and exactly matching original-response SHA-256 bytes from an allowlisted TheSportsDB NFL eventsday query or the canonical nflverse schedule CSV URL. The private manifest can reference both first_source and second_source receipts for the same prediction ID without a filename collision.
- scripts/collect_secondary_nfl_results.py: the normal reader now returns the parsed result, digest, **original unmodified response bytes** and response receipt time. The collector remains backward-compatible with injected two-item source fetchers when private capture is OFF.
- With private capture ON, a result claim is not appended unless the original body, capture time, allowed URL, original hash and private receipt write all succeed. Failure withholds that claim.
- An opt-in local storage root uses the existing environment variable BOTTLENECK_PRIVATE_RESULT_CAPTURE_ROOT; it must be an existing owner-only private directory outside the public checkout. No GitHub-hosted runner persistence is claimed.
- scripts/export_private_result_manifest.py now emits both source sides when available. The existing read-only SHA-256 auditor can use the manifest to compare **both original response bodies** to their saved claims.
- Synthetic tests exercise exact SportsDB observations, nflverse CSV fallback, conflicting first writes, source allowlists, timestamp validity, missing bytes, hash tampering, mixed first-and-second receipts, and previously supported collector interfaces.

## Offline acceptance

Run from the repository root on Python 3.12:

~~~sh
python -m unittest discover -s tests -p 'test_private_secondary_capture.py' -v
python -m unittest discover -s tests -p 'test_private_result_capture.py' -v
python -m unittest discover -s tests -p 'test_secondary_nfl_results.py' -v
python -m unittest discover -s tests -p 'test_result_observations.py' -v
python -m unittest discover -s tests -p 'test_result_reconciliation.py' -v
~~~

GitHub CI does not configure a private directory or fetch providers during these tests. Do not commit, upload or publish original response bodies unless source rights and storage controls are separately approved.

## Important limits and remaining work

- **Old results stay unchanged.** The 36 archived matched-source claims have no recovered original bytes from this implementation. New fetches must not be backdated or substituted for missing historical responses.
- The secondary support is **NFL only**. Tennis second-source claims include WTA PDF and ATP Finals reviewed-facts evidence; an authorised, rights-checked original-document capture process is still missing for those.
- Source hashes and distinct domains do not independently authenticate original publisher identities, actual collection times or upstream independence.
- Primary and secondary original response preservation relies on a private store that has **not been connected or activated**. Actual persistent storage, backups and appropriate data retention/usage rights must be reviewed first.
- The method-to-dropdown-engine identity remains unverified; no prospective head-to-head engine result comparisons can be promoted.
- No verified outcome is automatically added to results-feed.json; no automatic winner, live website update, price-based betting edge or 250-method tournament.
- The prior 1,000-entry mathematical catalogue threshold, quality reviews, independent validation and explicit release approval remain binding.

Keep this as a stacked draft PR pending tests, storage review and explicit approval to activate any real collector capture.
