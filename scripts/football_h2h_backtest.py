"""Paired, chronological evaluation of an experimental H2H probability challenger.

No coefficients are fitted here. Caller must supply a weight selected on a
separate earlier training period. Never use this module for betting publication.
"""
import math
from football_h2h import head_to_head
from expanded_football import norm


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
        evidence = head_to_head([{**row, "home": norm(row["home"]), "away": norm(row["away"])}
                                 for row in history if row.get("league") == f.get("league")],
                                norm(f["home"]), norm(f["away"]), generated, limit=10)
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
        "delta_brier_challenger_minus_baseline": (
            mean("challenger_brier") - mean("baseline_brier") if n else None
        ),
        "delta_log_loss_challenger_minus_baseline": (
            mean("challenger_log_loss") - mean("baseline_log_loss") if n else None
        ),
        "eligible_h2h_fixtures": sum(row["h2h_sample"] >= minimum for row in rows),
        "comparison_active": weight > 0 and any(row["h2h_sample"] >= minimum for row in rows),
        "status": "EXPERIMENTAL_PAIRED_BACKTEST_NOT_VALIDATED",
        "publication_gate": "BLOCKED",
        "records": rows,
    }


def chronological_weight_selection(calibration, evaluation, history,
                                   candidate_weights=(0.0, 0.05, 0.10, 0.15, 0.20, 0.25, 0.30),
                                   minimum=5):
    """Choose weight on earlier fixtures, evaluate once on later fixtures.

    The caller must supply genuinely out-of-sample archived forecasts.
    If insufficient evidence exists, the default zero-weight baseline wins.
    """
    if not calibration or not evaluation:
        raise ValueError("Both chronological periods must contain forecasts")
    last_calibration = max(f["kickoff"] for f in calibration)
    first_evaluation = min(f["kickoff"] for f in evaluation)
    if last_calibration >= first_evaluation:
        raise ValueError("Calibration must finish before evaluation begins")
    weights = tuple(candidate_weights)
    if not weights or 0.0 not in weights or len(set(weights)) != len(weights):
        raise ValueError("Candidate weights must be unique and include baseline")
    if any(type(w) not in (float, int) or not math.isfinite(w) or not 0 <= w <= 0.30 for w in weights):
        raise ValueError("Invalid candidate weight")
    trials = [paired_backtest(calibration, history, weight=w, minimum=minimum)
              for w in weights]
    # Require both adequate paired coverage and improvement on calibration;
    # otherwise retain baseline. The later evaluation is never used to tune.
    eligible = trials[0]["eligible_h2h_fixtures"]
    if eligible < 30:
        chosen = 0.0
        reason = "INSUFFICIENT_CALIBRATION_H2H_COVERAGE"
    else:
        ranked = sorted(trials, key=lambda t: (
            t["challenger_mean_log_loss"], t["challenger_mean_brier"], t["weight"]))
        best = ranked[0]
        baseline = next(t for t in trials if t["weight"] == 0.0)
        chosen = (best["weight"] if
                  best["challenger_mean_log_loss"] < baseline["baseline_mean_log_loss"] and
                  best["challenger_mean_brier"] < baseline["baseline_mean_brier"]
                  else 0.0)
        reason = "CALIBRATION_ONLY_SELECTION" if chosen else "NO_CALIBRATION_IMPROVEMENT"
    untouched = paired_backtest(evaluation, history, weight=chosen, minimum=minimum)
    return {
        "selected_weight": chosen,
        "selection_reason": reason,
        "calibration_fixtures": len(calibration),
        "evaluation_fixtures": len(evaluation),
        "calibration_h2h_eligible": eligible,
        "evaluation": {k: v for k, v in untouched.items() if k != "records"},
        "status": "EXPERIMENTAL_HOLDOUT_NOT_VALIDATED",
        "publication_gate": "BLOCKED",
    }
