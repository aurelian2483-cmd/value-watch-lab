# Racing schedule evidence review

Use this checklist alongside the [Phase 3 integration and reference review](phase3-integration-and-reference-review.md#racing-schedule-and-integration).

- [ ] Distinguish the scheduled start, the planned time shown on a captured card, from the actual off time, when the race began. For example, a card changing from 14:00 to 14:05 establishes a schedule revision. Confirm the actual off time only from evidence that explicitly records it.
- [ ] Retain the earlier receipt as an immutable record. Preserve its original scheduled time, source hash, receipt identifier, selection and observation history.
- [ ] Match the race and runner IDs and verify the earlier source hash. Require the exact successor receipt for the revised scheduled start on the current card. A matching time alone is insufficient. Once verified, record `HISTORICAL_SCHEDULE_SUPERSEDED` for the earlier record and link it to that exact successor receipt.
- [ ] Leave input untouched if any required match is missing, conflicting or ambiguous.

Retain the existing `UNVALIDATED` and `BLOCKED` statuses. Limit the review to schedule evidence and receipt provenance.
