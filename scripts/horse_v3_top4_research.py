#!/usr/bin/env python3
"""V3 top-four research diagnostics and conditional Sky Bet place-term checks.

Strictly descriptive, research-only. Winner probabilities are NOT place
probabilities. Never infer current market availability, promotional terms or
profitability. Does not modify original model or archived forecasts.
"""
import math

STANDARD_SKYBET_HANDICAP = (
    (5, 7, 2, 0.25),
    (8, 11, 3, 0.20),
    (12, 15, 3, 0.25),
    (16, None, 4, 0.25),
)
STANDARD_SKYBET_NON_HANDICAP = (
    (5, 7, 2, 0.25),
    (8, None, 3, 0.20),
)

def standard_each_way_terms(starters, handicap):
    """Informational standard terms only; offers require evidence.

    Returns None when win-only. For 16+ runner handicaps the default is 1/4
    odds, four places. Nonrunners can alter terms at settlement.
    """
    if type(starters) is not int or starters<2 or type(handicap) is not bool:
        raise ValueError("Known positive starter count and handicap flag required")
    for low, high, places, fraction in (STANDARD_SKYBET_HANDICAP if handicap else STANDARD_SKYBET_NON_HANDICAP):
        if starters>=low and (high is None or starters<=high):
            return {"places":places,"place_odds_fraction":fraction,"basis":"STANDARD_RULES_NOT_OBSERVED_MARKET"}
    return None

def analyze_top_four(race, probabilities):
    """Compare predicted top-four horses with actual first four finishers.

    Race must have an explicit exact active field and unambiguous positions
    1..4. No place probabilities or EV are returned.
    """
    runners=race.get("runners")
    if not isinstance(runners,list) or len(runners)<4:
        raise ValueError("At least four runners with resolved results required")
    ids=[str(h.get("horse_id","")) for h in runners]
    if any(not x for x in ids) or len(set(ids))!=len(ids):
        raise ValueError("Invalid or duplicate horse identity")
    if set(map(str,probabilities))!=set(ids):
        raise ValueError("Probability identities must match the full field")
    values={}
    for horse_id,p in probabilities.items():
        if type(p) not in (int,float) or not math.isfinite(p) or not 0<p<1:
            raise ValueError("Invalid win probability")
        values[str(horse_id)]=p
    if abs(sum(values.values())-1)>1e-8:
        raise ValueError("Win probabilities must sum to one")
    # Positional result eligibility is strict; no guesses from missing
    # finish positions, withdrawn runners, dead heats or non-finishers.
    positions=[r.get("finish_position") for r in runners]
    if any(type(p) is not int or p<1 for p in positions):
        raise ValueError("Incomplete / ambiguous finishing positions")
    if len(set(positions))!=len(positions):
        raise ValueError("Dead heat or duplicate finishing position needs settlement review")
    if set((1,2,3,4))-set(positions):
        raise ValueError("Top-four finishing positions not fully observed")
    ranking=sorted(ids,key=lambda x:(-values[x],x))
    actual={ids[i] for i,p in enumerate(positions) if p in (1,2,3,4)}
    selected=ranking[:4]
    winner=ids[positions.index(1)]
    return {
        "research_only":True,"publication_gate":"BLOCKED",
        "race_id":str(race.get("race_id","")),
        "winner_predicted_first":ranking[0]==winner,
        "winner_in_predicted_top_4":winner in selected,
        "predicted_top_4_actual_top_4_count":sum(x in actual for x in selected),
        "top_four_recall":sum(x in actual for x in selected)/4,
        "predicted_horse_ids":selected,
        "actual_top_4_horse_ids":sorted(actual),
        "limitation":"Win-probability ranking overlap only; not estimated place probability, paid place or expected value"
    }

def fourth_place_payout_status(*, starters, handicap, market_terms=None):
    """No payout assertion without actual terms; standard eligibility only."""
    standard=standard_each_way_terms(starters,handicap)
    if market_terms is None:
        return {"status":"TERMS_UNVERIFIED","standard_four_places":bool(standard and standard["places"]>=4),
                "standard_terms":standard,"paid_fourth":None}
    if market_terms.get("source_url") is None or market_terms.get("observed_at_utc") is None:
        raise ValueError("Observed source and timestamp required")
    places=market_terms.get("places")
    if type(places) is not int or not 1<=places<=starters:
        raise ValueError("Invalid observed place count")
    return {"status":"OBSERVED_TERMS_REQUIRE_SETTLEMENT_CONFIRMATION",
            "places_observed":places,"fourth_place_in_observed_offer":places>=4,
            "paid_fourth":None}
