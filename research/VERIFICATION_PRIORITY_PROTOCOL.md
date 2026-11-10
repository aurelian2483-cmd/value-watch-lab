# Verification priority: standalone synthetic experiment

Status: implemented arithmetic prototype only. **UNVALIDATED**, publication
**BLOCKED**, research only. It is not loaded by the website, scheduled by a
collector, or used to change a horse's forecast, price or paper eligibility.

## Question and mechanism

Which unresolved evidence fact is most informative to verify, given a fixed
research budget? The prototype takes an explicitly supplied set of synthetic
full-field probability vectors. Each vector represents an alternative
interpretation of provenance or timing, not an independently trained model.
The tool does not invent interpretations, infer source independence, convert
tip counts into probabilities, or claim that the scenario set contains reality.

For vectors `p` and `q`, total variation distance is
`TV(p,q) = sum(abs(p[i]-q[i])) / 2`. The diameter `W` is the largest pairwise TV
distance in the supplied scenario set. Each check partitions that set into
the scenarios compatible with each possible answer. The largest remaining
diameter over answers is `W_after`. Priority is `(W - W_after) / cost`.
All costs must use the declared `cost_unit`; this is not an estimated financial
return. A check which can return an unknown/inconclusive answer retains the
whole set in that case and therefore has zero guaranteed reduction.

The guarantee is conditional on the **supplied** scenario set and a truthful,
exhaustive answer partition. It is not a confidence interval, calibration
claim or lower bound on winning probability. A lower diameter may accompany
a worse forecast if the chosen scenarios or verification answer are wrong.
No automatic decision should be based on this quantity alone.

## Run and reproduce

Save an explicit synthetic input JSON and run:

```sh
python scripts/research_verification_priority.py synthetic-input.json
python -m unittest discover -s tests -p test_research_verification_priority.py
```

Example input (all numbers invented for arithmetic testing):

```json
{
  "mode": "SYNTHETIC",
  "cost_unit": "synthetic audit units",
  "runner_ids": ["A", "B"],
  "scenarios": [
    {"id": "0", "probabilities": {"A": 0.12, "B": 0.88}},
    {"id": "1", "probabilities": {"A": 0.13, "B": 0.87}},
    {"id": "2", "probabilities": {"A": 0.18, "B": 0.82}},
    {"id": "3", "probabilities": {"A": 0.19, "B": 0.81}}
  ],
  "checks": [
    {"id": "origin", "cost": 1, "can_return_unknown": false,
     "answers": {"copied": ["0", "1"], "distinct": ["2", "3"]}},
    {"id": "time", "cost": 1, "can_return_unknown": false,
     "answers": {"earlier": ["0", "2"], "later": ["1", "3"]}}
  ]
}
```

This yields diameter 0.07, origin reduction 0.06 and time reduction 0.01.
Allowing an unknown answer makes that check's guaranteed reduction zero.
Raising origin's cost to 10 reverses the per-cost ranking. The input SHA-256
binds the output to all supplied assumptions; it is not independent timestamp
attestation. The command writes only to stdout and does not edit archives.

## Prerequisites before a real racing experiment

1. Define and validate a model that maps captured evidence to full-field
   probabilities. Current contextual weights are not calibrated probabilities.
2. Record explicit origin/timing alternatives with supporting receipts. A
   shared domain does not establish a shared origin, and different domains
   do not establish independent evidence. Unknown relationships stay unknown.
3. Preserve publication time precision separately from first collector receipt.
   Do not reconstruct missing pre-race prices, timestamps or opposing opinions.
4. Establish reliable answer verification and actual audit costs. Real checks
   may be inconclusive; the synthetic example's guaranteed-answer assumption
   must not silently carry into production.
5. Keep mandatory freshness, active-runner and race-status checks outside the
   discretionary research budget. No provenance search delays those checks.

## Proposed prospective evaluation (not run)

Predeclare the fixed forecasting model, scenarios, time cutoff, sample design,
stopping rule, exclusions, cost unit and primary metric. Randomise the
discretionary provenance-check budget by race to targeted verification,
oldest-first and random-check policies; use equal budgets. Freeze each
forecast and all available inputs before the event. Log attempted checks,
unknown answers, changed runner fields, missing prices and exclusions.

Use chronological training/tuning and a new untouched evaluation period.
Compare proper scores on the same eligible races against uniform, the existing
form baseline, market-only (when complete matched auditable observations exist)
and no-additional-verification controls. Report paired score differences,
calibration, sample size, coverage and audit cost; uncertainty analysis should
account for shared race-day information. Do not cherry-pick horizons or
sources after viewing outcomes. Smaller scenario spread by itself is not
success. A claim of improved prediction fails if no forecast improvement is
demonstrated; a narrower efficiency claim requires demonstrated cost savings
at a prespecified comparable accuracy/coverage level.

Financial evaluation is a separate experiment requiring observable available
prices, market-specific settlement rules and costs. Winner accuracy, price
shortening and scenario stability are not proof of profitability. An inactive
financial policy can be a zero-exposure control, not a probability forecast.

## Repository evidence inspected before implementation

Reviewed the challenger README, second-source setup, source implementation
audit, context/form archives, provisional context settlements, secondary
results and a captured market record in the checkout based on `f31c3ac`.

- The retrospective challenger uses 14 training, 18 tuning and 26 later test
  races. It failed both original-form and uniform baselines. It stays unchanged
  and cannot be retuned against that same test period to claim validation.
- The most recent context archive by capture time in that checkout was
  10 November 2026 at 09:45:31 UTC for race 947996 at 14:30 UTC. This confirms
  the sampled record's pre-event chronology, not all records' correctness.
- The context settlement file contained 58 entries, all marked
  `SINGLE_SOURCE_PROVISIONAL`; independently verified-result count in its
  published performance block was zero. Cross-publisher corroboration is a
  separate category and does not establish independent underlying origins.
- The sampled market archive preserved field identities, publisher/provider,
  observation time and hash, with `executable_verified: false`. Its stated
  limitation does not establish opening/closing/SP/BSP coverage. These records
  must not be relabelled executable prices or a closing-price benchmark.

No historical forecast, settlement, market archive or model parameter is
modified by this prototype. Current snapshots can become stale even after a
successful download. This tool neither repairs feed freshness nor promotes a
model. Production activation and a website research panel for these priorities
remain blocked on the prerequisites above.

## Prior work and originality

The ingredients have precedents: robust forecast aggregation, active
verification using data provenance, and racing-agent evidence acquisition.
This is a project-specific experimental application, not a world-first claim.

- Robust forecast aggregation: https://pmc.ncbi.nlm.nih.gov/articles/PMC6310790/
- ActivePDB: https://doi.org/10.14778/3554821.3554863
- JockeyBench preprint: https://arxiv.org/abs/2610.19589
