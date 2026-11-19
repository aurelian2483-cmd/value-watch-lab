# Value Watch team coordination

Use `research/team-coordination` as the shared handover branch. Start each experiment on its own `research/<sport>-<topic>` branch and open a draft PR against this branch. The integration lead checks evidence and resolves overlap. Production releases require separate approval.

| Area | First assignment |
|---|---|
| Racing | Verify Phase 3 paired pre-off capture after the feed refresh. Retain the 30-minute freshness gate. Track top-four as a separate endpoint. |
| Football | Recover the 14 November V1–V6 work and reconcile the H2H ledger before changing weights. |
| Tennis and NFL | Improve independent results coverage and test the existing baselines on later events. |
| Expansion | Review darts and rugby coverage, then scope a paper-only cricket pilot. |
| Website and QA | Reproduce the legacy feed dependency and define coverage status per sport. |
| Literature and methods | Use the Research Onion for study design, review primary sources and challenge claims of novelty. |

Each handover records the question, starting commit, evidence and dates, tests actually executed, outcome, limitations and next action. Preserve historical and prospective evidence distinctions. Keep models UNVALIDATED and publication BLOCKED while research is pending.

This repository is public. Record public or publishable research only. Keep credentials and private data out of branches, issues and PRs. Teams are ownership roles. A branch does not start a worker or automation.
