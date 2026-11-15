#!/usr/bin/env python3
"""Read-only audited repository archive coverage of racing market benchmarks.

Provisional result amendments are excluded to avoid treating superseded winners
as settled. All original forecast and market records remain untouched.
"""
import json
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from horse_market_benchmark_v1 import evaluate,fingerprint

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"research/horse-v3/market-benchmark-reports"

def load(path):
    return json.loads(path.read_text())
def main():
    forecast_paths=sorted((ROOT/"research/horse-form-archive/v1").glob("*.json"))
    market_paths=sorted((ROOT/"research/horse-market-archive").glob("*/*/*.json"))
    result_path=ROOT/"research/horse-results/v1/provisional.json"
    forecasts=[load(p) for p in forecast_paths]
    markets=[load(p) for p in market_paths]
    ledger=load(result_path)
    if ledger.get("publication_gate")!="BLOCKED" or ledger.get("research_only") is not True or ledger.get("model_validation")!="UNVALIDATED":
        raise ValueError("Unsafe result ledger")
    excluded_amended={a["record_sha256"] for a in ledger.get("amendments",[])}
    outcomes=[r for r in ledger["entries"] if r["record_sha256"] not in excluded_amended]
    if len({x["record_sha256"] for x in outcomes})!=len(outcomes):
        raise ValueError("Duplicate results in source ledger")
    by_hash={x.get("record_sha256"):x for x in forecasts}
    # Only pre-event forecasts with a non-amended observed outcome enter the pool;
    # avoid selecting multiple revisions of a race because of repeated captures.
    selected={}
    for record in forecasts:
        record_hash=record.get("record_sha256")
        if record_hash not in {r["record_sha256"] for r in outcomes}:continue
        key=(str(record["race_id"]),record["startUTC"],record["model"])
        old=selected.get(key)
        if old is None or record["generated_at_utc"]>old["generated_at_utc"]:
            selected[key]=record
    chosen=list(selected.values())
    results={r["record_sha256"]:r for r in outcomes}
    chosen_results=[results[r["record_sha256"]] for r in chosen]
    OUT.mkdir(parents=True,exist_ok=True)
    summary={}
    for method in ("proportional","power"):
        report=evaluate(chosen,markets,chosen_results,method)
        report["source_coverage"]={"archived_forecasts":len(forecast_paths),"source_market_captures":len(market_paths),
                                   "provisional_entries":len(ledger["entries"]),"amended_forecast_receipts_excluded":len(excluded_amended),
                                   "candidate_forecasts_with_unamended_result":len(chosen),
                                   "ignored_forecast_revisions":len(forecasts)-len(chosen)}
        report["report_sha256"]=fingerprint({k:v for k,v in report.items() if k!="report_sha256"})
        (OUT/(method+".json")).write_text(json.dumps(report,indent=2)+"\n")
        summary[method]={"matched":report["eligible_rows"],"exclusions":report["exclusions"]}
    (OUT/"README.md").write_text(
        "# Racing market benchmark — research only\n\n"
        "Proportional and power margin adjustments are evaluated on exactly matched archived "
        "model forecasts, unamended provisional race results, and publisher-observed Sky Bet "
        "price snapshots captured no later than the model freeze. The reports never represent "
        "Betfair BSP, executable bets, CLV, independent backtests or profit evidence.\n\n"
        "Frozen V1 and the market may have limited contemporaneous overlap; zero eligible pairs "
        "is a useful coverage finding. Experimental V3 has no qualifying frozen records in this "
        "source archive, so no V3 market comparison is invented.\n"
    )
    print(json.dumps({"model":"HORSE_MARKET_BENCHMARK_V1","status":"UNVALIDATED",
                      "publication_gate":"BLOCKED","coverage":summary},indent=2))

if __name__=="__main__":main()
