# Racing market identity review — 15 November 2026

Reviewed main 54e6143aad11ad28a17ef49e73721ad903645911, the context pipeline, source refresh audit, immutable archives, settlement corroboration, evaluation output and retrospective challenger documentation.

## Reproduced defect and reversible fix
`quoted_market` converted raw race/market IDs to strings before checking presence. A null ID became the nonempty string `None`; identical missing IDs across runners could therefore produce COMPLETE_SOURCE_OBSERVATION and favourite IDs. Blank, boolean and structured IDs were also not consistently rejected.

Validate all three raw quote identities (race, market, selection) as nonblank strings or integer IDs before conversion. Invalid identity returns MISSING_MARKET_ID with empty quotes/favourites and executable_verified=false. Valid string and integer identifiers remain supported. This is evidence-quality hardening, not a change to model weights or a claim that current published favourites were affected.

Regression test first failed on the original code (17 subtest failures). After the fix all 125 test_horse_*.py tests passed. Existing tests cover non-runner exclusion, complete same-market favourites and rounded price consistency. No archives, settlement entries or public feeds changed.

## Current evidence
- Context feed generated 15 November at 07:17:14 UTC; racecard feed 07:16:38 UTC. These snapshots were over one hour old at review, not fresh live quotes. Existing runner freshness remains 30 minutes and pre-event buffer five minutes.
- 111 context archive files passed existing integrity/vector/pre-event validation; this does not independently attest first publication.
- 75 context settlements; 60 have two-publisher result corroboration, not proof of independent underlying origins.
- Uniform comparison remains descriptive: mean Brier delta -0.0072712 and log-loss delta -0.0330979. No retuning used these results.
- Context vs original form baseline now has 34 paired all-weather races. Both exploratory paired bootstrap intervals include zero (Brier [-0.0025033, 0.0010264]; log loss [-0.0134465, 0.0025565]). No established improvement over the form baseline.
- Same-day/future history is excluded by the context cutoff; active status and withdrawal controls remain unchanged. Horse regression suite exercises those controls.
- Retrospective challenger still failed its 26-race held-out comparison; cards were collected after outcomes. This is separate from prospective frozen records.
- Inspected market archive explicitly marks prices unverified/non-executable and opening/closing/SP/BSP coverage unestablished. No ROI or closing-line edge can be claimed from this review. A complete matched market-baseline re-evaluation was not performed.

Models remain UNVALIDATED, betting publication BLOCKED, and paper-only. Change is prepared for review, not merged or deployed; no live website publication claim.
