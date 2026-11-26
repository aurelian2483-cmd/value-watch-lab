"""Generate an offline inventory for a pinned Value Watch repository revision."""
import argparse
import hashlib
import json
import subprocess
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_REF = "f684c28d967e10d95f96c8df2a86cd0a97fad1f2"


def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT)


def load(ref, path):
    raw = git("show", f"{ref}:{path}")
    doc = json.loads(raw)
    meta = {"path": path, "revision": git("log", "-1", "--format=%H", ref, "--", path).decode().strip(),
            "sha256": hashlib.sha256(raw).hexdigest()}
    if isinstance(doc, dict):
        meta["collected_at_utc"] = doc.get("generated_at_utc") or doc.get("observed_at_utc")
        for key in ("source_receipts", "source_audits"):
            receipts = doc.get(key)
            if isinstance(receipts, list) and receipts:
                meta[f"{key}_count"] = len(receipts)
                meta[f"sample_{key}"] = receipts[0]
    return doc, meta


def grouped(rows, group, identity, timestamp, result=lambda row: None,
            forecast=lambda row: False, corroborated=lambda row: False):
    groups = defaultdict(list)
    for row in rows:
        groups[group(row)].append(row)
    output = {}
    for name, records in sorted(groups.items()):
        by_identity = defaultdict(list)
        times = []
        for row in records:
            by_identity[identity(row)].append(row)
            value = timestamp(row)
            if value:
                times.append(value)
        complete = {key: claims for key, claims in by_identity.items() if key and all(key)}
        conflicts = sum(len({result(row) for row in claims}) > 1 for claims in complete.values())
        output[str(name)] = dict(
            raw=len(records), distinct_complete_keys=len(complete),
            missing_key=sum(len(claims) for key, claims in by_identity.items() if not key or not all(key)),
            repeated_keys=sum(len(claims) > 1 for claims in complete.values()),
            excess_rows=sum(len(claims) - 1 for claims in complete.values()), conflicting_keys=conflicts,
            earliest=min(times, default=None), latest=max(times, default=None),
            forecast_rows=sum(bool(forecast(row)) for row in records),
            explicitly_corroborated_rows=sum(bool(corroborated(row)) for row in records),
        )
    return output


def outcome(row):
    return (row.get("actual_outcome"), row.get("score_home"), row.get("score_away"))


def inventory(ref):
    entries = {}

    def add(path, rows_key, group, identity, timestamp, **kwargs):
        doc, meta = load(ref, path)
        rows = doc[rows_key] if isinstance(rows_key, str) else rows_key(doc)
        meta["groups"] = grouped(rows, group, identity, timestamp, **kwargs)
        entries[path] = meta
        return doc

    def fixture_key(row):
        return row.get("home"), row.get("away"), row.get("kickoff_utc")

    for path, label in [
        ("research-dashboard-data.json", "Premier League"),
        ("football-expanded-data.json", "Expanded"),
        ("international-football-data.json", "International"),
    ]:
        doc = add(path, "upcoming_fixtures", lambda r: r.get("league_name") or r.get("competition") or label,
                  fixture_key, lambda r: r["kickoff_utc"], forecast=lambda r: r.get("has_experimental_model_forecast"))
        entries[path]["separate_forecast_array"] = len(doc["experimental_model_forecasts"])
        entries[path]["competition_audits"] = doc.get("league_audits") or doc.get("competition_audits")

    expanded, _ = load(ref, "football-expanded-data.json")
    stats = expanded["performance"]["entries"]
    entries["football-expanded-data.json"]["archived_performance"] = grouped(
        stats, lambda r: r["league"], fixture_key, lambda r: r["kickoff_utc"],
        result=outcome, corroborated=lambda r: r.get("verification") == "TWO_SOURCE_REGULATION_TIME_FINAL")
    entries["football-expanded-data.json"]["sample_archived_receipts"] = stats[0]["source_receipts"]

    add("historical-reliability-data.json", "results", lambda r: r["competition"], fixture_key,
        lambda r: r["kickoff_utc"][:10], result=outcome)
    add("research-history.json", "entries", lambda _: "Legacy Premier League", fixture_key,
        lambda r: r["kickoff_utc"], result=outcome)

    replay = add("research/football-baseline-v1/608-reconstructed-forecasts.json", "rows",
                 lambda r: r["season"], lambda r: (r["id"],), lambda r: r["id"].split("|")[1],
                 result=lambda r: r["winner_index"], forecast=lambda _: True)
    entries["research/football-baseline-v1/608-reconstructed-forecasts.json"]["source_split"] = replay["counts"]
    entries["research/football-baseline-v1/608-reconstructed-forecasts.json"]["source_pin"] = replay["meta"]["historical_source_commit"]

    add("other-sports-data.json",
        lambda d: [dict(row, sport=sport) for sport, value in d["sports"].items() for row in value["events"]],
        lambda r: f'{r["sport"]}: {r["competition"]}', lambda r: (r["id"],),
        lambda r: r["startUTC"], forecast=lambda r: r["forecast"])
    add("prediction-ledger.json", "records", lambda r: r["sport"],
        lambda r: (r["prediction_id"],), lambda r: r["event_start_utc"], forecast=lambda _: True)
    for path in ("research/provider-result-observations.json", "research/secondary-result-evidence.json"):
        add(path, "observations", lambda r: r["sport"], lambda r: (r["event_id"],),
            lambda r: r.get("source_observed_at_utc") or r.get("observed_at_utc"),
            result=lambda r: r["actual_outcome"], corroborated=lambda r: r.get("independently_verified") is True)

    for path in ("racing-research-data.json", "racing-future-data.json"):
        add(path, "races", lambda r: r.get("racecourse") or "Unspecified", lambda r: (r.get("race_id"),),
            lambda r: r.get("startUTC"), forecast=lambda r: r.get("prediction"))
    for path, key in (("horse-predictions-data.json", "forecasts"),
                      ("horse-model-data.json", "form_forecasts"), ("horse-challenger-data.json", "forecasts")):
        add(path, key, lambda r: r["racecourse"], lambda r: (r["race_id"],),
            lambda r: r["startUTC"], forecast=lambda _: True)
    for path in ("research/horse-results/v1/provisional.json", "research/horse-context-results/v1/provisional.json",
                 "research/horse-challenger/results-v1.json"):
        add(path, "entries", lambda r: r["racecourse"], lambda r: (r["race_id"],),
            lambda r: r["startUTC"], result=lambda r: r["winner_horse_id"],
            corroborated=lambda r: r.get("independently_verified") is True)

    secondary = git("ls-tree", "-r", "--name-only", ref, "research/horse-secondary-results/v1").decode().splitlines()
    rows = json.loads(git("cat-file", "blob", f"{ref}:{secondary[0]}"))
    entries["research/horse-secondary-results/v1"] = dict(
        raw_files=len(secondary), sample_path=secondary[0],
        sample_receipt={key: rows["receipt"][key] for key in ("url", "sha256", "observed_at_utc")
                        if key in rows["receipt"]})

    rugby = add("rugby-research-data.json", "upcoming_fixtures",
                lambda r: f'{r["code"]}: {r["competition_name"]}', lambda r: (r["event_id"],),
                lambda r: r["kickoff_utc"])
    entries["rugby-research-data.json"]["source_health"] = rugby["source_health"]
    entries["rugby-research-data.json"]["nrl_calendar"] = {k: len(v) if k == "fixtures" else v
                                                            for k, v in rugby["nrl_calendar"].items()}
    add("rugby/pro-d2-results.json", "results", lambda _: "Pro D2", lambda r: (r["source"],),
        lambda r: r["date"], result=lambda r: (r["home_points"], r["away_points"]))
    darts = add("darts/feed.json", "results", lambda _: "Delayed historical sample",
                lambda r: (r["id"],), lambda r: r["played_at"][:10], result=lambda r: r["winner_id"])
    entries["darts/feed.json"]["schedule"] = grouped(darts["fixtures"],
        lambda r: r["competition"], lambda r: (r["id"],), lambda r: r["start_utc"])
    entries["darts/feed.json"]["coverage"] = darts["coverage"]
    analysis, metadata = load(ref, "darts/analysis.json")
    entries["darts/analysis.json"] = dict(metadata, forecast_rows=len(analysis["fixtures"]),
                                       unpublished_training_count=analysis["training_matches"])

    results, meta = load(ref, "results-feed.json")
    entries["results-feed.json"] = dict(meta, verified_outcome_feed_records=len(results["records"]))
    report, meta = load(ref, "research/performance-report-latest.json")
    entries["research/performance-report-latest.json"] = dict(meta, **{
        k: report[k] for k in ("forecast_records", "outcome_archive_records", "contract_matched_pairs")})
    return {"input_revision": ref, "scope": "Tracked research inputs; counts are not additive across tiers or files.",
            "datasets": entries}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("revision", nargs="?", default=DEFAULT_REF)
    ref = git("rev-parse", parser.parse_args().revision).decode().strip()
    print(json.dumps(inventory(ref), indent=2, sort_keys=True))
