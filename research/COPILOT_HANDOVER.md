# Copilot handover: evidence integrity and research prototype

## Prepared changes
- Community Evidence panel: raw exact-race matching includes explicit opposing stances; safe source links, explicit origin grouping, missing-data labels and separate publication/observation times. OLBG legacy publication_date is a race date and is excluded from publication summaries. Existing support-only badge/model matching remains unchanged.
- Paper journal: settlement summaries require pre-event snapshot saving and price observations no later than saving. Legitimate quotes entered after initial selection but before save remain eligible. Invalid legacy settlements are retained but excluded from monetary summaries.
- Standalone synthetic verification-priority prototype and protocol: worst-case scenario sensitivity reduction per audit cost. No live prediction integration or proven novelty/edge claim.

## Validation at handover
Passed node tests/test_community_evidence.cjs, node tests/test_paper_journal.cjs, node tests/test_paper_engine.cjs and python -m unittest discover -s tests -p test_research_verification_priority.py (15 tests).
Earlier broad JavaScript checks passed; rerun on the final integrated branch. Final browser/mobile review and deployment verification remain outstanding. No website publication is claimed.

## Next tasks
1. Review the complete diff and rerun relevant integration tests.
2. Check mobile racing cards, sport filters, collapsed evidence details, missing-data states and saved paper selections. Verify latest-publication exclusions in real captured records.
3. Review cache-busting of changed desk, journal and style assets in both entrypoints before release.
4. Reconcile any newer main changes without rewriting frozen archives or collector feeds.
5. Only after review, prepare publication and verify the live site actually serves the change.

## Invariants
Preserve frozen historical forecasts, original snapshots and settlement corrections. Separate retrospective from prospective evidence. Models remain UNVALIDATED; betting publication BLOCKED; product paper-only. Do not backfill prices, invent performance or turn a win without a captured price into profit. No real bets.

## Known evidence gaps
The reviewed context settlement set contained 58 single-source provisional records and no independently verified results. Sample market captures did not establish executable price availability or closing-price coverage. The retrospective challenger failed comparison baselines. The synthetic prototype needs defensible real scenario construction and prospective evaluation before activation; see VERIFICATION_PRIORITY_PROTOCOL.md.
