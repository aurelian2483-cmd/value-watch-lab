# Alpha Hunt — Independent system scope decision

**Decision context:** Value Watch project audit, Issue 1 (project boundaries).

## Agreed
- The user explicitly chose **Alpha Hunt as a separate system**, not a method inside Bottleneck Lab.
- The user asked to add that decision to the live Value Watch website before continuing the audit issue-by-issue.
- A standalone website research workspace at \`alpha-hunt/\` is an informational entry point, not an assertion that the Bayesian model, collectors or decisions are implemented.
- Keep all existing Value Watch and Bottleneck methods unchanged; do not imply that Alpha Hunt is already connected to a live dataset or used to grade betting opportunities.

## Still undecided — do not infer approval
- Whether Alpha Hunt should ingest Value Watch's historical results, models or prices at all.
- Whether Alpha Hunt will own independent data collectors and models.
- The API/interface, permissions, data ownership and refresh requirements for any future optional integration.
- Which of the multiple proposed PEP feature vectors is canonical.
- Research validation rules, posterior thresholds, priors, owners, budget and delivery milestones.

## Research position from the supplied handover
The source named **"Alpha Hunt Project Summary (Full Research Handover)"**, supplied as \`Pasted text(9).txt\`, frames Alpha Hunt as an independent Bayesian edge-validation *research hypothesis*, not a validated betting model. Its central variable is Posterior Edge Probability (PEP), \`P(Real Edge | Evidence)\`. The handover explicitly warns that its synthetic simulation assumptions can favour success because some features are conditional on hidden truth. Proposed research stages are listed under "Final Alpha Hunt Architecture (v5)"; operational evidence, effectiveness and real-money capabilities have not been approved.

## Release boundaries
- Publish only an accessible static project page, accompanying CSS and homepage links.
- Do not connect to bookmaker APIs, modify bets, scoring models or existing archived results.
- Review the remaining audit findings with the user one at a time before deciding unresolved implementation details.
