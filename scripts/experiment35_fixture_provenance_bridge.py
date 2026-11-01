#!/usr/bin/env python3
"""Experiment 35: bind independently checked fixtures to real model candidates.
READ-ONLY: evidence review, not an attestation, publication, or challenge entry.
"""
import datetime as dt
import hashlib
import json
import pathlib
import sys

from sky_espn_strict_crosscheck import Sky, fetch, get_espn, sky_match, espn_match, parse_time, URL
from experiment23_pipeline import main as build_forecasts
from experiment21_ledger import check_record

OUT = pathlib.Path("/tmp/experiment35-fixture-provenance-review.json")

def main():
    now = dt.datetime.now(dt.timezone.utc)
    report = {
        "experiment": 35,
        "checked_at_utc": now.isoformat(),
        "mode": "READ_ONLY_FAIL_CLOSED",
        "fixture_source": URL,
        "fixtures": [],
        "two_source_matches": 0,
        "candidate_records_checked": 0,
        "publication_gate": "BLOCKED",
        "server_receipt_gate": "BLOCKED",
        "challenge_eligible": 0,
        "publishing_enabled": False,
        "missing_requirements": [
            "Independently establish training input completion cutoff",
            "Bind source verification to each candidate's fixture_source and verified timestamp",
            "Create an immutable forecast record before kickoff (not performed here)",
            "Audit GitHub Actions server run receipt and exact committed record bytes",
            "Review append-only ledger uniqueness and all publication gates",
        ],
    }
    try:
        sky_raw = fetch()
        report["sky_sha256"] = hashlib.sha256(sky_raw).hexdigest()
        sky = Sky()
        sky.feed(sky_raw.decode("utf-8", "replace"))
        build_forecasts()
        upstream = json.loads(pathlib.Path("/tmp/experiment23/review.json").read_text())
        if upstream.get("commit_enabled") is not False or upstream.get("challenge_eligible") != 0:
            raise ValueError("upstream safety contract changed")
        rows = upstream.get("records")
        if not isinstance(rows, list) or len(rows) != 4:
            raise ValueError("expected exactly four model candidate records")
        report["candidate_records_checked"] = len(rows)
        report["model_input_hashes"] = upstream.get("inputs")
        for record in rows:
            item = {k: record[k] for k in ("league", "home", "away", "kickoff_utc")}
            try:
                check_record(record, now)
                kickoff = parse_time(record["kickoff_utc"])
                if kickoff <= now:
                    raise ValueError("kickoff not in future")
                sky_event = sky_match(sky, record["home"], record["away"], kickoff)
                espn_raw = get_espn(kickoff)
                espn_match(record["home"], record["away"], kickoff, espn_raw)
                item.update({
                    "fixture_crosscheck": "TWO_SOURCE_MATCH",
                    "sky_heading": sky_event["date_heading"],
                    "sky_teams": sky_event["teams"],
                    "sky_time": sky_event["time"][0],
                    "sky_sha256": report["sky_sha256"],
                    "espn_sha256": hashlib.sha256(espn_raw).hexdigest(),
                    "model_sha256": record["model_sha256"],
                    "data_sha256": record["data_sha256"],
                    "candidate_generated_at_utc": record["generated_at_utc"],
                    "candidate_fixture_source": record["fixture_source"],
                    "publication_gate": "BLOCKED_UNBOUND_ATTESTATION_AND_PROVENANCE",
                    "server_receipt_gate": "BLOCKED_NO_IMMUTABLE_RECORD",
                    "challenge_eligible": False,
                })
                report["two_source_matches"] += 1
            except Exception as exc:
                item.update(fixture_crosscheck="BLOCKED", reason=str(exc), challenge_eligible=False)
            report["fixtures"].append(item)
        if report["two_source_matches"] != 4:
            report["status"] = "BLOCKED_INCOMPLETE_TWO_SOURCE_VERIFICATION"
        else:
            report["status"] = "FOUR_FIXTURES_CROSSCHECKED_PUBLICATION_BLOCKED"
    except Exception as exc:
        report["status"] = "BLOCKED_PIPELINE_ERROR"
        report["error"] = str(exc)
    finally:
        OUT.write_text(json.dumps(report, indent=2) + "\n")
        print(json.dumps({"status": report.get("status"), "two_source_matches": report["two_source_matches"], "challenge_eligible": 0, "publishing_enabled": False}))
    if report["status"] != "FOUR_FIXTURES_CROSSCHECKED_PUBLICATION_BLOCKED":
        sys.exit(1)

if __name__ == "__main__":
    main()
