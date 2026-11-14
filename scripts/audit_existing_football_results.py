#!/usr/bin/env python3
"""Read-only audit of already-existing Value Watch scored forecast ledgers.
Separate model versions / competitions / overlapping fixtures. No ROI assertions.
"""
import collections, json, math, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCES = {
 "primary":"research/results-ledger/v1/verified-results.json",
 "expanded":"research/football-expanded-results/v1/verified.json",
}
def audit(source):
    entries = source.get("entries", [])
    ids=set(); fixture_versions=collections.defaultdict(set); models=collections.defaultdict(list)
    issues=[]
    for index, r in enumerate(entries):
        key=r.get("record_sha256")
        if not isinstance(key,str) or len(key)!=64 or key in ids: issues.append({"row":index,"reason":"MISSING_OR_DUPLICATE_RECORD_HASH"})
        ids.add(key)
        model=r.get("model","MISSING")
        fixture=(r.get("league","E0_UNSTATED"),r.get("kickoff_utc"),str(r.get("home","")).casefold(),str(r.get("away","")).casefold())
        fixture_versions[fixture].add(model)
        ll=r.get("log_loss");brier=r.get("multiclass_brier_score")
        if not isinstance(ll,(int,float)) or not math.isfinite(ll) or ll<0 or not isinstance(brier,(int,float)) or not math.isfinite(brier) or not 0<=brier<=2:
            issues.append({"row":index,"reason":"INVALID_SCORE"});continue
        models[(r.get("league","UNSTATED"),model)].append((ll,brier))
    return {
      "scored_records":len(entries),
      "unique_exact_fixture_keys":len(fixture_versions),
      "fixtures_with_multiple_model_records":sum(len(v)>1 for v in fixture_versions.values()),
      "independently_attested_record_count":sum(r.get("timestamp_independently_attested") is True for r in entries),
      "score_groups":[{"league":league,"model":model,"records":len(samples),
        "mean_log_loss":sum(x[0] for x in samples)/len(samples),
        "mean_brier":sum(x[1] for x in samples)/len(samples)}
        for (league,model),samples in sorted(models.items())],
      "audit_issues":issues
    }
def main():
    report={"research_only":True,"publication_gate":"BLOCKED","confirmed_profitability":False,
      "matched_pairwise_challenger_comparison":"NOT ESTABLISHED",
      "sources":{},"scope_caveat":"Legacy and expanded ledgers have different models and competitions; counts cannot establish improvement or be combined as independent bets."}
    for name,path in SOURCES.items():
        file=ROOT/path
        if not file.is_file():raise FileNotFoundError(str(file))
        data=json.loads(file.read_text())
        if data.get("publication_gate")!="BLOCKED":raise ValueError("Unsafe ledger "+name)
        report["sources"][name]={"path":path,**audit(data)}
    print(json.dumps(report,indent=2))
    if any(x["audit_issues"] for x in report["sources"].values()):raise SystemExit(1)
if __name__=="__main__":main()
