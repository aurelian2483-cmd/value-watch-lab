#!/usr/bin/env python3
"""Experiment 37: independent result crosscheck and signed-by-hash review attestation.
No ledger commits, publication, or challenge eligibility.
"""
import csv,datetime as dt,hashlib,io,json,pathlib,sys,urllib.request
from experiment36_evidence_cutoff_audit import main as audit36,OUT as PREV,canonical,sha
from sky_espn_strict_crosscheck import parse_time
OUT=pathlib.Path("/tmp/experiment37")
def independent_results(day):
    url="https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?dates="+day.strftime("%Y%m%d")+"&limit=100"
    req=urllib.request.Request(url,headers={"User-Agent":"ValueWatchResearch/1.0"})
    with urllib.request.urlopen(req,timeout=25) as response:raw=response.read(3000000)
    return json.loads(raw),sha(raw),url
def main():
    OUT.mkdir(parents=True,exist_ok=True)
    report={"experiment":37,"mode":"READ_ONLY_FAIL_CLOSED","challenge_eligible":0,
            "publishing_enabled":False,"publication_gate":"BLOCKED",
            "server_receipt_gate":"BLOCKED_NO_IMMUTABLE_RECORD",
            "status":"BLOCKED_PENDING_REVIEW","independent_result_checks":[]}
    try:
        audit36()
        prior=json.loads((PREV/"report.json").read_text())
        if prior.get("status")!="FOUR_FIXTURES_BOUND_TO_REVIEW_EVIDENCE_PUBLICATION_BLOCKED" or prior.get("two_source_matches")!=4:
            raise ValueError("Experiment 36 prerequisites failed")
        candidates=json.loads((PREV/"candidates-review.json").read_text())
        evidence=json.loads((PREV/"evidence-review.json").read_text())
        if len(candidates)!=4 or len(evidence)!=4:raise ValueError("unexpected candidate/evidence count")
        generated=[parse_time(r["generated_at_utc"]) for r in candidates]
        if any(t>=parse_time(r["kickoff_utc"]) for t,r in zip(generated,candidates)):
            raise ValueError("candidate not pre-kickoff")
        report["candidate_records_sha256"]=sha(canonical(candidates))
        report["evidence_sha256"]=sha(canonical(evidence))
        report["training_inputs"]=prior["training_input_audit"]
        # Check last recorded result date in ESPN independently. ESPN API can
        # be incomplete, so any missing/ambiguous data fails closed.
        for row in prior["training_input_audit"]:
            day=dt.date.fromisoformat(row["latest_completed_match_date"])
            payload,hash_value,url=independent_results(day)
            events=payload.get("events",[])
            completed=[]
            for event in events:
                if not event.get("status",{}).get("type",{}).get("completed"):continue
                if any(len(c.get("competitors",[]))==2 for c in event.get("competitions",[])):
                    completed.append(event.get("id"))
            report["independent_result_checks"].append({
                "file":row["file"],"latest_csv_match_date":day.isoformat(),
                "espn_url":url,"espn_sha256":hash_value,
                "completed_events_on_date":len(completed),
                "status":"DATE_LEVEL_CORROBORATION_ONLY" if completed else "NO_COMPLETED_EVENTS_FOUND",
                "per_match_cutoff_verified":False})
        if not all(x["completed_events_on_date"]>0 for x in report["independent_result_checks"]):
            raise ValueError("independent completion-date corroboration missing")
        attestation={
            "schema":"value-watch-experiment37-review-v1",
            "generated_at_utc":dt.datetime.now(dt.timezone.utc).isoformat(),
            "forecast_records_sha256":report["candidate_records_sha256"],
            "fixture_evidence_sha256":report["evidence_sha256"],
            "training_audit_sha256":sha(canonical(report["training_inputs"])),
            "independent_result_checks_sha256":sha(canonical(report["independent_result_checks"])),
            "fixture_keys":[x["fixture_key"] for x in evidence],
            "status":"REVIEW_ONLY_NOT_PUBLICATION_AUTHORITY",
        }
        report["attestation_sha256"]=sha(canonical(attestation))
        (OUT/"attestation-review.json").write_bytes(canonical(attestation)+b"\n")
        report["status"]="DATE_CORROBORATED_ATTESTATION_REVIEW_ONLY"
        report["missing_requirements"]=[
            "Per-match training result timestamps and exact inclusion audit still unverified",
            "Attestation is a hash-linked review artifact, not a cryptographic signature or immutable GitHub commit",
            "Candidate source fields remain unbound to verified source evidence",
            "Independent GitHub Actions server receipt and committed bytes audit missing",
            "Append-only ledger publication checks not passed"]
    except Exception as exc:
        report["status"]="BLOCKED_AUDIT_FAILED";report["error"]=str(exc)
    finally:
        (OUT/"report.json").write_text(json.dumps(report,indent=2)+"\n")
        print(json.dumps({"status":report["status"],"challenge_eligible":0,"publishing_enabled":False,"error":report.get("error")}))
    if report["status"]=="BLOCKED_AUDIT_FAILED":sys.exit(1)
if __name__=="__main__":main()
