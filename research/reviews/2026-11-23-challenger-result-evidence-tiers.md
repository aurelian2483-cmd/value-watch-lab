# Horse-racing review — challenger result-evidence tiers

Date: 23 November 2026
Reviewed main: `92d06237`
Decision: **KEEP FORM BASELINE / CONTINUE RESEARCH**
Safety: **UNVALIDATED**, publication **BLOCKED**, no bets placed

## Current evidence

The 07:43 UTC snapshot contained 38 races, 366 collected runner records and four
explicit non-runners. Runner-state flags were internally consistent. It was
fresh when generated, but was about 58 minutes old by this review; the live
30-minute runner-freshness guarantee must therefore be rechecked before any
new observation is treated as current.

Integrity validation passed for 231 context, 149 form and 98 challenger frozen
records. Every forecast preceded the five-minute cutoff; runner observations
were at most 30 minutes old at freeze; active fields were unique and complete;
and no stored history date was on or after its target race. Since the previous
review, immutable forecast changes were additions only.

Phase 3 remains at zero genuinely pre-event A/B pairs and zero independently
reviewed outcomes. The fixed prospective endpoint has not started.

## Reversible improvement

The exact-freeze challenger-versus-form diagnostic previously reported all
single-source provisional outcomes together. It now also reports an explicit
two-publisher-corroborated subset. A corroborated result is accepted only when:

- the event identity and winner match exactly;
- both post-start receipts have valid hashes and distinct HTTPS publisher
  hosts;
- the primary receipt matches the scored result receipt; and
- all records remain research-only, `UNVALIDATED` and `BLOCKED`.

Missing corroboration remains missing. It is not converted to a loss, a zero,
or independent verification. The original all-provisional result is retained
for continuity, while the stronger subset is visibly separate.

## Descriptive comparisons

Lower scores are better; positive challenger-minus-form values favour the form
baseline.

| Exact-freeze subset | Races | Brier delta | Log-loss delta | 95% Brier interval | 95% log-loss interval |
| --- | ---: | ---: | ---: | --- | --- |
| All provisional results | 61 | +0.001712 | +0.010204 | [-0.020474, +0.021585] | [-0.084413, +0.101604] |
| Two-publisher-corroborated results | 59 | +0.006074 | +0.028837 | [-0.013390, +0.024895] | [-0.070676, +0.113525] |

Both subsets favour form on point estimates, while both intervals cross zero.
The challenger has not demonstrated improvement and must not be promoted.

The existing context-versus-form diagnostic now has 80 matched all-weather
races and favours context descriptively, but the models were captured at
different times, so conditions and field revisions can confound that result.
It is not prospective validation.

An existing read-only market diagnostic matched 129 context forecasts. Context minus
the normalized observed-price reference was +0.081578 Brier and +0.323759 log
loss. All 4,646 market captures remain `executable_verified: false`; none is an
auditable available or closing-price benchmark, so no EV, CLV or profit claim
is permitted.

## Remaining gates

1. Run the locked Phase 3 process prospectively with independently attested
   pre-event bytes and reviewed outcomes.
2. Establish publisher-origin independence rather than treating two domains as
   proof of independent data.
3. Capture auditable available and closing prices before market-value claims.
4. Do not retune the failed challenger on its already inspected evaluation
   period.
