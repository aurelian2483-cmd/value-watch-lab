#!/usr/bin/env python3
"""Experiment 40: result-availability cutoff and two-source fixture evidence provenance.
Review-only, fail-closed. Does not publish, commit forecasts, or count challenges.
"""
import datetime as dt,hashlib,json,pathlib,sys
from experiment39_training_inclusion_audit import main as audit39,OUT as P39,canonical,sha
from experiment38_training_match_audit import OUT as P38
from sky_espn_strict_crosscheck import Sky,fetch,get_espn,sky_match,espn_match,parse_time,URL
from experiment21_ledger import check_record,identity

OUT=pathlib.Path("/tmp/experiment40")
def utcnow():return dt.datetime.now(dt.timezone.utc)
def main():
    OUT.mkdir(parents=True,exist_ok=True)
    report={"experiment":40,"mode":"READ_ONLY_FAIL_CLOSED","status":"BLOCKED_PENDING",
            "challenge_eligible":0,"publishing_enabled":False,"publication_gate":"BLOCKED",
            "server_receipt_gate":"BLOCKED_NO_IMMUTABLE_RECORD","fixture_bindings":[],
            "historical_result_availability_verified":False,
            "independent_training_cutoff_established":False}
    try:
        audit39()
        training=json.loads((P39/"report.json").read_text())
        audit=json.loads((P38/"report.json").read_text())
        if training.get("status")!="TRAINING_ROWS_AND_WEIGHTS_RECONCILED_CUTOFF_UNVERIFIED":
            raise ValueError("Experiment 39 reconciliation not passed")
        if audit.get("status")!="ALL_TRAINING_MATCHES_CROSSCHECKED_REVIEW_ONLY":
            raise ValueError("Experiment 38 historical crosscheck not passed")
        if training.get("audited_training_rows")!=460 or training.get("pipeline_training_rows")!=460:
            raise ValueError("unexpected training row count")
        rows=audit.get("rows",[])
        if len(rows)!=460 or any(r.get("status")!="MATCHED" or not r.get("espn_event_id") for r in rows):
            raise ValueError("historical rows lack independent ESPN match evidence")
        report["training_audit_sha256"]=sha(canonical(training))
        report["historical_match_evidence_sha256"]=sha(canonical(rows))
        report["historical_completed_matches"]=len(rows)
        report["latest_training_date"]=max(r["date"] for r in rows)
        report["training_snapshot_hashes"]=training.get("input_sha256")
        # ESPN's current completed flag and kickoff time are NOT archived
        # result-publication timestamps. Never treat kickoff as final whistle.
        report["historical_cutoff_review"]={
            "completed_match_count":len(rows),
            "kickoff_timestamps_present":sum(bool(r.get("espn_kickoff_utc")) for r in rows),
            "verified_historical_result_publication_timestamps":0,
            "cutoff_status":"BLOCKED_NO_HISTORICAL_RESULT_AVAILABILITY_RECEIPTS",
            "explanation":"ESPN provides current completion state and kickoff, but not an independently archived first-available final-score timestamp. CSV date-only results cannot establish exact ingestion/completion time."}
        pipeline=json.loads(pathlib.Path("/tmp/experiment23/review.json").read_text())
        if pipeline.get("commit_enabled") is not False or pipeline.get("challenge_eligible")!=0:
            raise ValueError("upstream publication safety contract changed")
        candidates=pipeline.get("records")
        if not isinstance(candidates,list) or len(candidates)!=4:
            raise ValueError("expected exactly four real candidate records")
        if len({identity(r) for r in candidates})!=4:
            raise ValueError("duplicate candidate identities")
        sky_raw=fetch()
        sky_hash=sha(sky_raw)
        sky=Sky();sky.feed(sky_raw.decode("utf-8","replace"))
        checked=0
        for record in candidates:
            now=utcnow()
            check_record(record,now)
            when=parse_time(record["kickoff_utc"])
            if when<=now:raise ValueError("fixture already started: "+record["home"])
            sky_event=sky_match(sky,record["home"],record["away"],when)
            espn_raw=get_espn(when)
            espn_match(record["home"],record["away"],when,espn_raw)
            verified_at=utcnow().isoformat()
            # A separate evidence-bound REVIEW candidate is constructed.
            # Never mutate the upstream model record or assert its generated_at
            # was independently witnessed by a GitHub server.
            bound=dict(record)
            bound["fixture_source"]=URL
            bound["source_verified_at_utc"]=verified_at
            binding={
                "fixture_identity":list(identity(record)),
                "candidate_original_sha256":sha(canonical(record)),
                "candidate_bound_review_sha256":sha(canonical(bound)),
                "fixture_source_bound_review_only":bound["fixture_source"],
                "source_verified_at_utc_review_only":verified_at,
                "original_candidate_generated_at_utc_unwitnessed":record["generated_at_utc"],
                "sky_source_url":URL,"sky_response_sha256":sky_hash,
                "sky_match_heading":sky_event["date_heading"],
                "sky_match_teams":sky_event["teams"],
                "sky_match_local_time":sky_event["time"][0],
                "espn_source_url":"https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?dates="+when.strftime("%Y%m%d")+"&limit=100",
                "espn_response_sha256":sha(espn_raw),
                "verified_kickoff_utc":when.isoformat(),
                "model_sha256":record["model_sha256"],
                "data_sha256":record["data_sha256"],
                "binding_status":"TWO_SOURCE_BOUND_REVIEW_ONLY",
                "publication_gate":"BLOCKED"}
            report["fixture_bindings"].append(binding)
            checked+=1
        if checked!=4:raise ValueError("four fixture bindings not established")
        report["two_source_fixture_bindings"]=checked
        report["fixture_bindings_sha256"]=sha(canonical(report["fixture_bindings"]))
        report["candidate_records_sha256"]=sha(canonical(candidates))
        report["status"]="FOUR_FIXTURE_BINDINGS_REVIEWED_HISTORICAL_CUTOFF_BLOCKED"
        report["missing_requirements"]=[
            "Historical first-available final-score receipts for training matches",
            "Independently witnessed model execution and final candidate creation time",
            "Immutable pre-kickoff committed forecast records and GitHub Actions server receipt",
            "Append-only ledger and complete publication gate verification"]
        (OUT/"fixture-bindings-review.json").write_bytes(canonical(report["fixture_bindings"])+b"\n")
    except Exception as exc:
        report["status"]="BLOCKED_AUDIT_ERROR";report["error"]=str(exc)
    finally:
        report["checked_at_utc"]=utcnow().isoformat()
        (OUT/"report.json").write_text(json.dumps(report,indent=2)+"\n")
        print(json.dumps({k:report.get(k) for k in ("status","historical_completed_matches","two_source_fixture_bindings","independent_training_cutoff_established","challenge_eligible","error")}))
    if report["status"]=="BLOCKED_AUDIT_ERROR":sys.exit(1)
if __name__=="__main__":main()
