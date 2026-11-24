# Alpha Hunt — Independent system scope decision

**Decision context:** Value Watch project audit, Issue 1 (project boundaries).

## Agreed
- The user explicitly chose **Alpha Hunt as a separate system**, not a method inside Bottleneck Lab.
- The user subsequently agreed Alpha Hunt may **read only** Value Watch's historical results, bookmaker odds and model predictions for separate research. This is approval for a future read-only data boundary, not evidence that such a link has been built, tested or activated. Value Watch's records must not be altered by Alpha Hunt.
- The user asked to add that decision to the live Value Watch website before continuing the audit issue-by-issue.
- A standalone website research workspace at \`alpha-hunt/\` is an informational entry point, not an assertion that the Bayesian model, collectors or decisions are implemented.
- Keep all existing Value Watch and Bottleneck methods unchanged; do not imply that Alpha Hunt is already connected to a live dataset or used to grade betting opportunities.

## Audit Issue 2 — agreed system responsibilities
- **Value Watch:** Continue developing mathematical methods to predict sports outcomes.
- **Bottleneck Lab:** Investigate weaknesses and possible improvements in the methods.
- **Alpha Hunt:** Independently investigate whether apparent betting advantages are genuine, using Value Watch's historical results, bookmaker odds and model predictions **read-only**.
- These are agreed purpose boundaries, not acceptance of model accuracy or evidence that Alpha Hunt's data-sharing interface has been implemented.
- Future architecture, data-access controls, specific methods, validation criteria, ownership and delivery remain subject to the remaining audit decisions.

## Audit Issue 3 — approved research architecture
- The user explicitly agreed that **Alpha Hunt v5** is the architecture going forward.
- **ACME (initial architecture)** and **Zero-Based Reconstruction** are retained as historical research designs, not alternative active blueprints.
- The approved v5 sequence from the supplied research handover is: **Market Data → Prediction Model → Calibration → Disagreement Detection → False Edge Laboratory → Bayesian Posterior Engine → PEP → Decision Layer → Capital Allocation**.
- "Approved" applies to the **design direction only**. It does **not** establish deployed code, data integration, training, probability calibration, model validity, decision thresholds, or authority to allocate capital or place bets.
- Still to be decided: the canonical PEP evidence features and definitions, dependencies, input and output contracts, ethical and technical controls, model validation methodology, operational ownership and implementation schedule.

## Still undecided — do not infer approval
- Which specific historical result fields, odds markets and model-output formats should be exposed through the approved read-only interface.
- Whether Alpha Hunt will own independent data collectors and models.
- How read-only access will be technically enforced and independently tested: interfaces, identity/access controls, authentication, audit logs, provenance, refresh, retention and failure behaviour. No credential or data access is granted merely by publishing this decision.
- Which of the multiple proposed PEP feature vectors is canonical.
- Research validation rules, posterior thresholds, priors, owners, budget and delivery milestones.

## Research position from the supplied handover
The source named **"Alpha Hunt Project Summary (Full Research Handover)"**, supplied as \`Pasted text(9).txt\`, frames Alpha Hunt as an independent Bayesian edge-validation *research hypothesis*, not a validated betting model. Its central variable is Posterior Edge Probability (PEP), \`P(Real Edge | Evidence)\`. The handover explicitly warns that its synthetic simulation assumptions can favour success because some features are conditional on hidden truth. Proposed research stages are listed under "Final Alpha Hunt Architecture (v5)"; operational evidence, effectiveness and real-money capabilities have not been approved.

## Release boundaries
- Publish only an accessible static project page, accompanying CSS and homepage links.
- Do not connect to bookmaker APIs, modify bets, scoring models or existing archived results.
- Review the remaining audit findings with the user one at a time before deciding unresolved implementation details.
