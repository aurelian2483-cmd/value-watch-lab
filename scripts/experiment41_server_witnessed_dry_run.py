#!/usr/bin/env python3
"""Experiment 41: fail-closed, GitHub Actions witnessed prospective forecast DRY RUN.
An Actions environment is not a server receipt; API verification is separate.
Never publishes or modifies a ledger. Historical result availability is unproven.
"""
import datetime as dt,hashlib,json,os,pathlib,sys,urllib.request
from experiment40_cutoff_fixture_provenance import main as run40,OUT as P40
from experiment39_training_inclusion_audit import sha,canonical
from experiment21_ledger import identity,check_record,timestamp
from sky_espn_strict_crosscheck import parse_time

OUT=pathlib.Path("/tmp/experiment41")
def now():return dt.datetime.now(dt.timezone.utc)
def gh_run(owner,repo,run_id):
    url=f"https://api.github.com/repos/{owner}/{repo}/actions/runs/{run_id}"
    req=urllib.request.Request(url,headers={"Accept":"application/vnd.github+json","User-Agent":"ValueWatchResearch/1.0"})
    with urllib.request.urlopen(req,timeout=25) as response:
        if response.status!=200:raise ValueError("GitHub API receipt unavailable")
        return json.loads(response.read(300000))
def main():
    OUT.mkdir(parents=True,exist_ok=True)
    report={"experiment":41,"mode":"READ_ONLY_SERVER_WITNESSED_DRY_RUN","status":"BLOCKED_PENDING",
            "challenge_eligible":0,"publishing_enabled":False,"publication_gate":"BLOCKED",
            "immutable_forecast_commit":False,"server_receipt_gate":"BLOCKED",
            "independent_training_cutoff_established":False}
    try:
        if os.environ.get("GITHUB_ACTIONS")!="true":raise ValueError("not executing on GitHub Actions")
        repository=os.environ.get("GITHUB_REPOSITORY")
        run_id=os.environ.get("GITHUB_RUN_ID")
        head_sha=os.environ.get("GITHUB_SHA")
        ref=os.environ.get("GITHUB_REF")
        if repository!="aurelian2483-cmd/value-watch-lab" or ref!="refs/heads/research/prospective-100":
            raise ValueError("unexpected repository or branch")
        if not run_id or not run_id.isdecimal() or not head_sha or len(head_sha)!=40:
            raise ValueError("GitHub Actions run identity missing")
        run40()
        upstream=json.loads((P40/"report.json").read_text())
        if upstream.get("status")!="FOUR_FIXTURE_BINDINGS_REVIEWED_HISTORICAL_CUTOFF_BLOCKED":
            raise ValueError("Experiment 40 prerequisites failed")
        if upstream.get("two_source_fixture_bindings")!=4:
            raise ValueError("not all four fixtures independently checked")
        pipeline=json.loads(pathlib.Path("/tmp/experiment23/review.json").read_text())
        if pipeline.get("commit_enabled") is not False or pipeline.get("challenge_eligible")!=0:
            raise ValueError("upstream publish flag changed")
        records=pipeline.get("records")
        bindings=upstream["fixture_bindings"]
        if not isinstance(records,list) or len(records)!=4 or len(bindings)!=4:
            raise ValueError("unexpected candidate/binding count")
        indexed={tuple(b["fixture_identity"]):b for b in bindings}
        if len(indexed)!=4 or len({identity(r) for r in records})!=4:
            raise ValueError("ambiguous or duplicated fixtures")
        completed_at=now()
        for record in records:
            check_record(record,completed_at)
            key=identity(record)
            b=indexed.get(key)
            if not b or b.get("binding_status")!="TWO_SOURCE_BOUND_REVIEW_ONLY":
                raise ValueError("unbound fixture evidence")
            if b["candidate_original_sha256"]!=sha(canonical(record)):
                raise ValueError("candidate hash mismatch")
            if b["model_sha256"]!=record["model_sha256"] or b["data_sha256"]!=record["data_sha256"]:
                raise ValueError("candidate model/input hash mismatch")
            if parse_time(record["kickoff_utc"])<=completed_at:
                raise ValueError("forecast finished after kickoff")
        receipt=gh_run(*repository.split("/"),run_id)
        if receipt.get("head_sha")!=head_sha or receipt.get("head_branch")!="research/prospective-100":
            raise ValueError("GitHub API head revision mismatch")
        if receipt.get("event") not in ("push","workflow_dispatch"):
            raise ValueError("GitHub API event unexpected")
        if receipt.get("status") not in ("in_progress","queued"):
            raise ValueError("unexpected workflow status at inspection")
        if str(receipt.get("id"))!=run_id:
            raise ValueError("run ID mismatch")
        created=timestamp(receipt["created_at"])
        if created>completed_at:raise ValueError("GitHub server creation time in future")
        if any(created>=timestamp(r["kickoff_utc"]) for r in records):
            raise ValueError("GitHub run created after kickoff")
        manifest={"schema":"experiment41-review-only-v1","repository":repository,"branch":"research/prospective-100",
                  "run_id":int(run_id),"head_sha":head_sha,"github_server_run_created_at_utc":receipt["created_at"],
                  "forecast_completed_before_utc":completed_at.isoformat(),
                  "training_snapshot_sha256":upstream.get("training_snapshot_hashes"),
                  "model_source_sha256":sha(pathlib.Path("scripts/model_integration_smoke.py").read_bytes()),
                  "pipeline_source_sha256":sha(pathlib.Path("scripts/experiment23_pipeline.py").read_bytes()),
                  "candidate_records_sha256":sha(canonical(records)),
                  "fixture_bindings_sha256":sha(canonical(bindings)),
                  "candidate_count":4,"publication_gate":"BLOCKED","challenge_eligible":0,
                  "historical_result_availability_verified":False}
        (OUT/"candidate-records-review.json").write_bytes(canonical(records)+b"\n")
        (OUT/"fixture-bindings-review.json").write_bytes(canonical(bindings)+b"\n")
        (OUT/"manifest-review.json").write_bytes(canonical(manifest)+b"\n")
        report.update(status="SERVER_RUN_CREATED_PREKICKOFF_DRY_RUN_CUTOFF_BLOCKED",
                      candidate_count=4,manifest_sha256=sha(canonical(manifest)),
                      candidate_records_sha256=manifest["candidate_records_sha256"],
                      fixture_bindings_sha256=manifest["fixture_bindings_sha256"],
                      github_run_id=int(run_id),github_head_sha=head_sha,
                      github_server_created_at_utc=receipt["created_at"],
                      forecast_completed_at_utc=completed_at.isoformat(),
                      server_receipt_gate="PARTIAL_RUN_CREATION_ONLY_FINAL_API_RECEIPT_NOT_AUDITED",
                      missing_requirements=["Historical first-available training results not independently proven",
                                            "GitHub run completion/conclusion and artifact bytes require independent post-run audit",
                                            "No immutable committed forecast records",
                                            "No append-only ledger publication checks"])
    except Exception as exc:
        report["status"]="BLOCKED_AUDIT_ERROR";report["error"]=str(exc)
    finally:
        report["finished_at_utc"]=now().isoformat()
        (OUT/"report.json").write_text(json.dumps(report,indent=2)+"\n")
        print(json.dumps({k:report.get(k) for k in ("status","candidate_count","github_run_id","challenge_eligible","error")}))
    if report["status"]=="BLOCKED_AUDIT_ERROR":sys.exit(1)
if __name__=="__main__":main()
