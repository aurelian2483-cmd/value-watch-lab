# Prospective football evaluation boundary

Models are **UNVALIDATED**. Publication is **BLOCKED**.

| Repository interface | What exists and its limit |
| --- | --- |
| [Premier League and expanded snapshots](../../football-match/app.js) | Match Centre reads the Premier League research dashboard and expanded football snapshots. These provide fixture identity, schedules and experimental probability vectors. [Match Centre controls](../../football-match/core.js) withhold estimates with missing or late cutoffs or training receipts. The UI is a research display, with no prospective capture adapter. |
| [Reconstructed Poisson V1](../football-baseline-v1/README.md) | Two implemented variants use earlier-date score inputs and a normalized home/draw/away score grid, with and without the 0.025 recent-form factor. Their 608 paired vectors and outcomes are retrospective. The archived original Sky result was not reproduced. |
| [Expanded research](../football-result-provenance/README.md) | Pinned experimental league Poisson forecasts and 66 expanded 90-minute finals have available reference evidence. A recovered reference ID does not attest a pre-event freeze or resolve a candidate single-source result. The legacy and retrospective tiers remain separate. |
| [Market Intelligence](../../market-intelligence/app.js) | Historical regulation-time 1X2 price observations and completeness diagnostics are available separately from model probabilities. The new harness will validate optional quote metadata and will omit market scoring and value calculations. |
| [Prediction capture](../../scripts/capture_prospective_research.py) | The first-write-wins ledger uses versioned records with source/training fingerprints. Its current sport adapters cover Tennis and NFL. The pinned football prospective forecast count is zero. |
| [Legacy football verification](../../scripts/verify_football_results.py) | The script expects a different legacy ledger shape and a live provider. It is outside the new offline path. The current outcome feed has zero rows. |
| [Mathematical research plans](../MATHEMATICAL_RESEARCH_CENTRE_MASTER_PLAN.md) | Catalogue entries and research proposals are separate from prospectively captured, validated football variants. No end-to-end V1–V6 integration is established by these interfaces. |

The evaluator receives separately supplied future frozen forecasts, outcome
receipts and a hash-pinned review/split manifest. It will emit research
diagnostics to stdout. It will have no access to model generation, feeds,
holdouts, forecast selection or deployment. [Evidence operations](../football-result-provenance/OPERATIONS.md)
remain upstream research context with no promotion path into evaluation.
