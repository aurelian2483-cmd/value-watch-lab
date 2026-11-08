#!/usr/bin/env python3
"""Pure, fail-closed racing market evidence audit. No network, betting or fabricated data."""
from datetime import datetime
from math import isfinite
from urllib.parse import urlsplit


def _timestamp(value):
    if not isinstance(value, str):
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return parsed if parsed.tzinfo is not None else None
    except ValueError:
        return None


def _price(value):
    return isinstance(value, (float, int)) and not isinstance(value, bool) and isfinite(value) and value > 1


def breakeven(decimal_odds):
    """Percent win rate required before fees and commissions."""
    return round(100.0 / decimal_odds, 2) if _price(decimal_odds) else None


def audit_exchange(opening, latest, minimum_matched_gbp=1000):
    """Compare same-runner, same-market exchange observations with source receipts.

    Drift = (latest/opening - 1)*100. This is a decimal-price movement,
    not implied-probability movement. Volume is a quality gate, not evidence of EV.
    """
    required = ("runner_id", "market_id", "decimal_odds", "observed_at_utc",
                "matched_volume_gbp", "source_url")
    if not all(isinstance(row, dict) and all(k in row for k in required)
               for row in (opening, latest)):
        return {"status": "UNKNOWN", "reason": "Missing market evidence fields"}
    if (opening["runner_id"] != latest["runner_id"] or
            opening["market_id"] != latest["market_id"]):
        return {"status": "UNKNOWN", "reason": "Market or runner mismatch"}
    if not all(_price(row["decimal_odds"]) and
               isinstance(row["matched_volume_gbp"], (int, float)) and
               not isinstance(row["matched_volume_gbp"], bool) and
               isfinite(row["matched_volume_gbp"]) and row["matched_volume_gbp"] >= 0 and
               urlsplit(str(row["source_url"])).scheme == "https" and
               bool(urlsplit(str(row["source_url"])).hostname)
               for row in (opening, latest)):
        return {"status": "UNKNOWN", "reason": "Invalid prices, volume or provenance"}
    t0, t1 = _timestamp(opening["observed_at_utc"]), _timestamp(latest["observed_at_utc"])
    if not t0 or not t1 or t1 <= t0:
        return {"status": "UNKNOWN", "reason": "Unordered or unverified timestamps"}
    if latest["matched_volume_gbp"] < opening["matched_volume_gbp"]:
        return {"status": "UNKNOWN", "reason": "Cumulative matched volume decreased"}
    delta = (latest["decimal_odds"] / opening["decimal_odds"] - 1) * 100
    liquid = latest["matched_volume_gbp"] >= minimum_matched_gbp
    return {"status": "OBSERVED" if liquid else "LOW_LIQUIDITY",
            "trend": "Drifter" if delta > 0 else "Steamer" if delta < 0 else "Stable",
            "decimal_price_change_pct": round(delta, 2),
            "drift_20pct_warning": bool(liquid and delta >= 20 - 1e-9),
            "volume_gbp": latest["matched_volume_gbp"],
            "source_urls": [opening["source_url"], latest["source_url"]],
            "note": "Price movement is not a win-probability or positive-value estimate."}


def closing_line_value(captured_decimal, betfair_sp, captured_at_utc, off_time_utc,
                       sp_source_url=None):
    """Paper-only decimal-price CLV: captured / BSP - 1; no return inference."""
    if not (_price(captured_decimal) and _price(betfair_sp)):
        return {"status": "UNKNOWN", "reason": "Captured odds or BSP missing"}
    captured_at, off_time = _timestamp(captured_at_utc), _timestamp(off_time_utc)
    if not captured_at or not off_time or captured_at >= off_time:
        return {"status": "UNKNOWN", "reason": "No provable pre-off capture"}
    url = urlsplit(str(sp_source_url or ""))
    if url.scheme != "https" or not url.hostname:
        return {"status": "UNKNOWN", "reason": "Missing attributable BSP source"}
    return {"status": "RESEARCH_ONLY", "clv_pct": round((captured_decimal / betfair_sp - 1) * 100, 2),
            "benchmark": "Betfair SP", "source_url": sp_source_url,
            "note": "BSP comparison is not ROI or a guarantee of executable value."}
