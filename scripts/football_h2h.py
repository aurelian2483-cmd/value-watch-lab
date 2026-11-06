"""Leakage-safe head-to-head evidence for experimental football forecasts.

This module does not change published probabilities or betting gates.
Historical records must have an unambiguous completed date before the forecast cutoff.
"""
import datetime as dt
import math
import unicodedata
import re


def team_key(value):
    text = unicodedata.normalize("NFKD", str(value)).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]", "", text)


def head_to_head(rows, home, away, cutoff, limit=10):
    """Return historical H2H counts from the prospective home team's perspective.

    rows: completed matches with home, away, date (YYYY-MM-DD), score_home,
    score_away. Day-level dates are conservatively excluded on cutoff day.
    """
    if cutoff.tzinfo is None:
        raise ValueError("Timezone-aware cutoff required")
    if not 1 <= limit <= 50:
        raise ValueError("Invalid history limit")
    hk, ak = team_key(home), team_key(away)
    if not hk or not ak or hk == ak:
        raise ValueError("Invalid team identity")
    selected = []
    seen = set()
    for row in rows:
        rh, ra = team_key(row["home"]), team_key(row["away"])
        if {rh, ra} != {hk, ak} or rh == ra:
            continue
        date = dt.date.fromisoformat(row["date"])
        if date >= cutoff.date():
            continue
        hg, ag = row["score_home"], row["score_away"]
        if type(hg) is not int or type(ag) is not int or min(hg, ag) < 0:
            raise ValueError("Invalid historical result")
        identity = (date, rh, ra)
        if identity in seen:
            raise ValueError("Duplicate historical fixture across source seasons")
        seen.add(identity)
        selected.append((date, row, rh == hk))
    selected.sort(key=lambda x: x[0], reverse=True)
    recent = selected[:limit]
    wins = draws = losses = venue_wins = venue_draws = venue_losses = 0
    for _, row, home_venue in recent:
        h, a = row["score_home"], row["score_away"]
        ours, theirs = (h, a) if home_venue else (a, h)
        if ours > theirs:
            wins += 1
        elif ours == theirs:
            draws += 1
        else:
            losses += 1
        if home_venue:
            if h > a:
                venue_wins += 1
            elif h == a:
                venue_draws += 1
            else:
                venue_losses += 1
    return {
        "sample_size": len(recent), "home_team_wins": wins, "draws": draws,
        "away_team_wins": losses,
        "at_current_home_venue": {
            "sample_size": venue_wins + venue_draws + venue_losses,
            "home_wins": venue_wins, "draws": venue_draws,
            "away_wins": venue_losses,
        },
        "most_recent_match_date": recent[0][0].isoformat() if recent else None,
        "cutoff_date_exclusive": cutoff.date().isoformat(),
        "probability_adjustment": None,
        "status": "DESCRIPTIVE_ONLY_NOT_VALIDATED",
    }


def conflict_with_forecast(evidence, p_home, p_draw, p_away, minimum=5):
    """Signal disagreement only; never override a model or invent confidence."""
    values = (p_home, p_draw, p_away)
    if not all(isinstance(p, (int, float)) and math.isfinite(p) and 0 <= p <= 1 for p in values):
        raise ValueError("Invalid probabilities")
    if abs(sum(values) - 1) > 1e-8:
        raise ValueError("Probabilities do not sum to one")
    if evidence["sample_size"] < minimum:
        return "INSUFFICIENT_H2H_SAMPLE"
    n = evidence["sample_size"]
    if p_home > max(p_draw, p_away) and evidence["away_team_wins"] / n >= 0.6:
        return "H2H_DISAGREES_WITH_HOME_FAVOURITE"
    if p_away > max(p_draw, p_home) and evidence["home_team_wins"] / n >= 0.6:
        return "H2H_DISAGREES_WITH_AWAY_FAVOURITE"
    return "NO_STRONG_H2H_CONFLICT"
