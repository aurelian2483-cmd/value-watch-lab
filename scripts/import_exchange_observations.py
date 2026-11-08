#!/usr/bin/env python3
"""Validate licensed exchange observation exports; never fetch or synthesize odds.

Private source exports must be supplied explicitly by an authorised operator.
Only aggregate, provenance-bearing research results are suitable for public release.
"""
import argparse
import json
from pathlib import Path
from scripts.racing_market_audit import audit_exchange, closing_line_value, breakeven


def compile_research(payload):
    if not isinstance(payload, dict) or payload.get("schema_version") != 1:
        raise ValueError("Unsupported exchange export schema")
    rows = payload.get("runners")
    if not isinstance(rows, list) or len(rows) > 10000:
        raise ValueError("Invalid runner collection")
    output = []
    seen = set()
    for row in rows:
        if not isinstance(row, dict):
            raise ValueError("Invalid runner record")
        race_id, runner_id = row.get("race_id"), row.get("runner_id")
        if not all(isinstance(x, str) and 0 < len(x) <= 200 for x in (race_id, runner_id)):
            raise ValueError("Missing stable race/runner identifiers")
        identity = (race_id, runner_id)
        if identity in seen:
            raise ValueError("Duplicate race/runner")
        seen.add(identity)
        observations = row.get("exchange_observations", [])
        if not isinstance(observations, list) or len(observations) > 1000:
            raise ValueError("Invalid observation history")
        # Never infer a trend from a single quote or different markets.
        market = audit_exchange(observations[0], observations[-1]) if len(observations) >= 2 else {
            "status": "UNKNOWN", "reason": "Fewer than two exchange observations"}
        capture = row.get("captured_quote") or {}
        sp = row.get("betfair_sp") or {}
        clv = closing_line_value(capture.get("decimal_odds"), sp.get("decimal_odds"),
                                 capture.get("observed_at_utc"), row.get("off_time_utc"),
                                 sp.get("source_url"))
        output.append({
            "race_id": race_id, "runner_id": runner_id,
            "market": market, "clv": clv,
            "captured_breakeven_pct": breakeven(capture.get("decimal_odds")),
            "publication_gate": "BLOCKED", "model_validation": "UNVALIDATED",
        })
    return {"schema_version": 1, "research_only": True,
            "publication_gate": "BLOCKED", "model_validation": "UNVALIDATED",
            "runner_audits": output}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="Licensed, operator-supplied private JSON")
    parser.add_argument("--output", required=True, help="Sanitised research JSON output")
    args = parser.parse_args()
    source = Path(args.input).resolve()
    destination = Path(args.output).resolve()
    if source == destination:
        parser.error("Input and output must be different files")
    payload = json.loads(source.read_text(encoding="utf-8"))
    result = compile_research(payload)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(result, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    print(f"Validated {len(result['runner_audits'])} runner research records; publication BLOCKED")


if __name__ == "__main__":
    main()
