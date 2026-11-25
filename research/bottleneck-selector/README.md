# Bottleneck Lab — evidence-first method selector (research-only prototype)

This isolated module defines the **six peer-level options** from the existing Value Watch method switcher: Current Engine 2.5, Experimental Engine 3.0, Hybrid Engine 3.1: Football, Side-by-Side Compare, Historical Reliability Model, and Racing Top Four · V1. Side-by-Side Compare is intentionally a **tool**, not a forecasting model. Bottleneck Lab itself is the parent controller, not a seventh candidate.

## Why this exists

Bottleneck Lab currently reports sport-level model readiness. It cannot objectively choose a more accurate engine from unvalidated forecasts. This module adds a deterministic **research-only selection policy** for future independently reviewed comparable evidence. It is not connected to the website, does not change dropdown behaviour, does not place bets, and deliberately does not highlight any live model as a winner.

### Selection gates

- Sport, exact event and market must match.
- A forecast must predate the event, be observed before evaluation, and have code/forecast digests.
- A prospective evaluation must have independently checked inputs and outcomes, comparable baseline, an immutable paired-set identity and traceable review receipt. **These metadata fields are assertions, not external proof; an external audit remains essential.**
- For this preliminary screening policy, at least 100 event-matched pairs, lower paired log loss than baseline, and an exploratory 95% interval excluding zero improvement are required. These are intentionally strict *screening defaults*, not statistical guarantees or a universally sufficient sample size.
- Multiple eligible methods must be scored on the **same historical/prospective event set and baseline**; otherwise selection is withheld.
- The original **1,000-entry library requirement**, provenance review and subsequent **explicit user approval** are mandatory before choosing a research method. The actual library remains at 286 entries; there are zero empirically qualified entries.
- No report is a guarantee of positive betting value. Sky Bet prices, ROI, probability calibration and execution economics are separate evidence layers.

## Run tests

```bash
node --test research/bottleneck-selector/selector.test.mjs
```

The test fixtures are deliberately synthetic; passing them confirms program logic rather than predictive performance, data authenticity or readiness for production. The true live status remains **UNVALIDATED / BLOCKED**. Do not merge or deploy without independent review, broader integration testing, and a separate release decision.