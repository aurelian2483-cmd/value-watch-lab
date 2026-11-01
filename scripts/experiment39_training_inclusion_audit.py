#!/usr/bin/env python3
"""Experiment 39: audit exact model training inclusion against independently matched results.
No publication, immutable forecast commit, or challenge eligibility.
"""
import collections,datetime as dt,hashlib,json,pathlib,sys
from experiment38_training_match_audit import main as run38,OUT as AUDIT
from experiment23_pipeline import main as run23,parse as parse_csv
from experiment21_ledger import check_record

OUT=pathlib.Path("/tmp/experiment39")
def sha(raw):return hashlib.sha256(raw).hexdigest()
def canonical(obj):return json.dumps(obj,sort_keys=True,separators=(",",":")).encode()
def main():
    OUT.mkdir(parents=True,exist_ok=True)
    report={"experiment":39,"mode":"READ_ONLY_FAIL_CLOSED","status":"BLOCKED_PENDING",
            "challenge_eligible":0,"publishing_enabled":False,"publication_gate":"BLOCKED",
            "server_receipt_gate":"BLOCKED_NO_IMMUTABLE_RECORD"}
    try:
        run38()
        audit=json.loads((AUDIT/"report.json").read_text())
        if audit.get("status")!="ALL_TRAINING_MATCHES_CROSSCHECKED_REVIEW_ONLY":
            raise ValueError("Experiment 38 audit did not pass")
        if audit.get("matched")!=audit.get("total_csv_rows") or audit.get("matched",0)<100:
            raise ValueError("not all historical results independently matched")
        run23()
        pipeline=json.loads(pathlib.Path("/tmp/experiment23/review.json").read_text())
        if pipeline.get("commit_enabled") is not False or pipeline.get("challenge_eligible")!=0:
            raise ValueError("upstream publication contract changed")
        actual_inputs={x["name"]:x["sha256"] for x in pipeline["inputs"]}
        source_inputs={x["url"].split("/")[-2]+"_"+x["url"].split("/")[-1]:x["sha256"]
                       for x in audit["sources"] if x.get("url","").startswith("https://www.football-data.co.uk/")}
        if set(source_inputs)!={"2526_E0.csv","2627_E0.csv"}:raise ValueError("unexpected source snapshots")
        for season in ("2526","2627"):
            if actual_inputs.get("E0_"+season+".csv")!=source_inputs[season+"_E0.csv"]:
                raise ValueError("AUDIT/PREDICTION CSV BYTES DIFFER; fail closed")
        rows=audit["rows"]
        if len(rows)!=audit["matched"] or any(r["status"]!="MATCHED" for r in rows):
            raise ValueError("independent row audit incomplete")
        now=dt.datetime.now(dt.timezone.utc)
        expected=[];actual=[];counts={}
        for season,weight in (("2526",0.5),("2627",1.0)):
            audited=[r for r in rows if r["season"]==season]
            filename=pathlib.Path("/tmp/experiment23")/("E0_"+season+".csv")
            parsed=parse_csv(filename.read_bytes())
            expected_season=[(dt.date.fromisoformat(r["date"]),r["home"],r["away"],
                              r["home_goals"],r["away_goals"],weight) for r in audited]
            actual_season=[(*r,weight) for r in parsed if season=="2526" or r[0]<now.date()]
            if collections.Counter(expected_season)!=collections.Counter(actual_season):
                raise ValueError("model training rows/weights do not equal audited rows for "+season)
            expected.extend(expected_season);actual.extend(actual_season)
            counts[season]={"audited_rows":len(audited),"included_rows":len(actual_season),"weight":weight,
                            "latest_match_date":max(r[0] for r in actual_season).isoformat()}
        if len(actual)!=audit["matched"]:raise ValueError("unexpected training count")
        # Exact input inclusion equality is proven from audited CSV snapshots and
        # the pipeline's explicit training construction, NOT a runtime model trace.
        model_source=pathlib.Path("scripts/model_integration_smoke.py")
        pipeline_source=pathlib.Path("scripts/experiment23_pipeline.py")
        report.update(status="TRAINING_ROWS_AND_WEIGHTS_RECONCILED_CUTOFF_UNVERIFIED",
                      audited_training_rows=len(expected),pipeline_training_rows=len(actual),
                      season_counts=counts,training_rows_sha256=sha(canonical([[
                          r[0].isoformat(),*r[1:]] for r in actual])),
                      audit_rows_sha256=audit.get("rows_sha256"),
                      model_source_sha256=sha(model_source.read_bytes()),
                      pipeline_source_sha256=sha(pipeline_source.read_bytes()),
                      input_sha256=actual_inputs,
                      candidate_count=len(pipeline.get("records",[])),
                      independent_training_cutoff_established=False,
                      cutoff_explanation="ESPN completed flag confirms current status, not historical result availability at forecast generation; CSV date-only records lack exact completion/ingestion timestamps.",
                      missing_requirements=[
                          "Independently prove exact result availability before forecast creation",
                          "Independently bind fixture evidence to final candidate fields",
                          "Commit immutable pre-kickoff records and audit server receipt",
                          "Validate append-only ledger uniqueness and full publication gates"])
        if report["candidate_count"]!=4:raise ValueError("unexpected forecast candidate count")
        for candidate in pipeline["records"]:check_record(candidate,dt.datetime.now(dt.timezone.utc))
    except Exception as exc:
        report["status"]="BLOCKED_AUDIT_ERROR";report["error"]=str(exc)
    finally:
        (OUT/"report.json").write_text(json.dumps(report,indent=2)+"\n")
        print(json.dumps({k:report.get(k) for k in ("status","audited_training_rows","pipeline_training_rows","candidate_count","challenge_eligible","error")}))
    if report["status"]=="BLOCKED_AUDIT_ERROR":sys.exit(1)
if __name__=="__main__":main()
