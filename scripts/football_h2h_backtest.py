"""Paired, chronological evaluation of an experimental H2H probability challenger.

No coefficients are fitted here. Caller must supply a weight selected on a
separate earlier training period. Never use this module for betting publication.
"""
import math
from football_h2h import head_to_head


def _metrics(probabilities, outcome):
    if outcome not in (0, 1, 2):
        raise ValueError("Outcome must be 0, 1 or 2")
    if len(probabilities) != 3 or any(not math.isfinite(x) or x <= 0 or x >= 1 for x in probabilities):
        raise ValueError("Invalid probability vector")
    if abs(sum(probabilities) - 1) > 1e-8:
        raise ValueError("Probability sum mismatch")
    return (sum((p - int(i == outcome)) ** 2 for i, p in enumerate(probabilities)),
            -math.log(probabilities[outcome]))


def challenger_probabilities(base, evidence, weight=0.0, minimum=5, prior=6.0):
    """Shrink H2H empirical outcomes towards the base probabilities.

    weight must be established on an earlier, separate period. Default zero
    ensures no unvalidated adjustment is silently enabled.
    """
    _metrics(base, 0)
    if not 0 <= weight <= 1 or prior <= 0 or minimum < 1:
        raise ValueError("Invalid challenger parameters")
    n = evidence["sample_size"]
    if n < minimum or weight == 0:
        return tuple(base)
    counts = (evidence["home_team_wins"], evidence["draws"], evidence["away_team_wins"])
    if any(type(v) is not int or v < 0 for v in counts) or sum(counts) != n:
        raise ValueError("Inconsistent H2H counts")
    h2h = tuple((counts[i] + prior * base[i]) / (n + prior) for i in range(3))
    return tuple((1 - weight) * base[i] + weight * h2h[i] for i in range(3))


def paired_backtest(forecasts, history, weight=0.0, minimum=5):
    """Compare the same scored fixtures without using future H2H matches.

    forecasts must be out-of-sample, generated before kickoff, and contain
    home/away, kickoff (timezone-aware datetime), generated_at (timezone-aware),
    probabilities, and actual outcome (0 home, 1 draw, 2 away).
    """
    rows = []
    for f in forecasts:
        kickoff, generated = f["kickoff"], f["generated_at"]
        if kickoff.tzinfo is None or generated.tzinfo is None or generated >= kickoff:
            raise ValueError("Forecast must be timestamped before kickoff")
        evidence = head_to_head([row for row in history if row.get("league") == f.get("league")], f["home"], f["away"], generated, limit=10)
        base = tuple(f["probabilities"])
        challenger = challenger_probabilities(base, evidence, weight, minimum)
        b, l = _metrics(base, f["outcome"])
        cb, cl = _metrics(challenger, f["outcome"])
        rows.append({"baseline_brier": b, "challenger_brier": cb,
                     "baseline_log_loss": l, "challenger_log_loss": cl,
                     "h2h_sample": evidence["sample_size"]})
    n = len(rows)
    def mean(field):
        return sum(row[field] for row in rows) / n if n else None
    return {
        "sample_size": n, "weight": weight, "minimum_h2h": minimum,
        "baseline_mean_brier": mean("baseline_brier"),
        "challenger_mean_brier": mean("challenger_brier"),
        "baseline_mean_log_loss": mean("baseline_log_loss"),
        "challenger_mean_log_loss": mean("challenger_log_loss"),
        "status": "EXPERIMENTAL_PAIRED_BACKTEST_NOT_VALIDATED",
        "publication_gate": "BLOCKED",
        "records": rows,
    }
