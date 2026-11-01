#!/usr/bin/env python3
"""Experiment 43: review-only prospective evidence ledger proposal.
Verifies Experiment 42 again, constructs hash-chained entries in a temporary artifact.
Never mutates repository, persistent ledger, website, publication or challenge count.
"""
import datetime as dt,hashlib,io,json,pathlib,sys,zipfile
from experiment42_completed_receipt_audit import (main as verify42,OUT as OUT42,api,REPO,RUN_ID,
    EXPECTED_SHA,EXPECTED_CANDIDATES,EXPECTED_BINDINGS,EXPECTED_MANIFEST,ARTIFACT)
from experiment39_training_inclusion_audit import canonical,sha
from experiment21_ledger import check_record,identity,timestamp

OUT=pathlib.Path("/tmp/experiment43")
def digest(obj):return sha(canonical(obj))
def build(existing,records,bindings,manifest,verified):
    if not isinstance(existing,list):raise ValueError("existing ledger must be list")
    previous="0"*64
    seen=set()
    for i,e in enumerate(existing):
        if not isinstance(e,dict) or e.get("sequence")!=i+1 or e.get("previous_entry_sha256")!=previous:
            raise ValueError("existing ledger sequence/chain mismatch")
        body={k:v for k,v in e.items() if k!="entry_sha256"}
        if e.get("entry_sha256")!=digest(body):raise ValueError("existing entry altered")
        key=tuple(e.get("fixture_identity",[]))
        if len(key)!=4 or key in seen:raise ValueError("duplicate or invalid existing fixture")
        seen.add(key);previous=e["entry_sha256"]
    indexed={tuple(b["fixture_identity"]):b for b in bindings}
    if len(records)!=4 or len(indexed)!=4 or len({identity(r) for r in records})!=4:
        raise ValueError("expected exactly four unique forecast records and bindings")
    entries=list(existing)
    for r in records:
        key=identity(r)
        if key in seen:raise ValueError("duplicate or overwrite attempt")
        b=indexed.get(key)
        if not b or b.get("candidate_original_sha256")!=digest(r):
            raise ValueError("candidate not bound to independently checked fixture")
        if b.get("binding_status")!="TWO_SOURCE_BOUND_REVIEW_ONLY":
            raise ValueError("fixture binding not verified")
        check_record(r,timestamp(verified["github_run_completed_at_utc"]))
        if timestamp(r["kickoff_utc"])<=timestamp(verified["github_run_completed_at_utc"]):
            raise ValueError("run not complete before kickoff")
        body={"schema":"experiment43-review-ledger-v1","sequence":len(entries)+1,
            "previous_entry_sha256":previous,"fixture_identity":list(key),
            "forecast_record_sha256":digest(r),"fixture_binding_sha256":digest(b),
            "training_input_snapshot_sha256":manifest.get("training_snapshot_sha256"),
            "model_source_sha256":manifest.get("model_source_sha256"),
            "pipeline_source_sha256":manifest.get("pipeline_source_sha256"),
            "experiment41_commit_sha":EXPECTED_SHA,"experiment41_run_id":RUN_ID,
            "experiment41_artifact_id":verified["artifact_id"],
            "experiment41_artifact_zip_sha256":verified["artifact_zip_sha256"],
            "experiment41_manifest_sha256":EXPECTED_MANIFEST,
            "github_server_run_created_at_utc":verified["github_run_created_at_utc"],
            "github_artifact_uploaded_at_utc":verified["artifact_uploaded_at_utc"],
            "github_run_completed_at_utc":verified["github_run_completed_at_utc"],
            "record_type":"REVIEW_ONLY_NOT_COMMITTED","challenge_eligible":0,
            "publication_gate":"BLOCKED","historical_cutoff_verified":False}
        if not isinstance(body["training_input_snapshot_sha256"],dict) or not body["training_input_snapshot_sha256"]:
            raise ValueError("training snapshot hashes absent")
        if any(not isinstance(body[k],str) or len(body[k])!=64 for k in
               ("model_source_sha256","pipeline_source_sha256")):
            raise ValueError("model or pipeline source hash missing")
        e={**body,"entry_sha256":digest(body)}
        entries.append(e);previous=e["entry_sha256"];seen.add(key)
    return entries
def main():
    OUT.mkdir(parents=True,exist_ok=True)
    report={"experiment":43,"status":"BLOCKED_PENDING","mode":"READ_ONLY_PROPOSED_LEDGER",
            "publishing_enabled":False,"challenge_eligible":0,"publication_gate":"BLOCKED",
            "persistent_ledger_modified":False,"immutable_committed_forecast_ledger":False}
    try:
        verify42()
        verified=json.loads((OUT42/"report.json").read_text())
        if verified.get("status")!="EXPERIMENT41_COMPLETED_ARTIFACT_VERIFIED_REVIEW_ONLY_CUTOFF_BLOCKED":
            raise ValueError("Experiment 42 did not verify target evidence")
        base="https://api.github.com/repos/"+REPO
        raw=api(base+"/actions/artifacts/"+str(verified["artifact_id"])+"/zip",10000000)
        if sha(raw)!=verified["artifact_zip_sha256"]:raise ValueError("artifact bytes changed since verification")
        with zipfile.ZipFile(io.BytesIO(raw)) as z:
            expected={"candidate-records-review.json","fixture-bindings-review.json",
                      "manifest-review.json","report.json"}
            if set(z.namelist())!=expected:raise ValueError("artifact member set changed")
            records=json.loads(z.read("candidate-records-review.json"))
            bindings=json.loads(z.read("fixture-bindings-review.json"))
            manifest=json.loads(z.read("manifest-review.json"))
        if digest(records)!=EXPECTED_CANDIDATES or digest(bindings)!=EXPECTED_BINDINGS or digest(manifest)!=EXPECTED_MANIFEST:
            raise ValueError("source evidence hash mismatch")
        # A future committed ledger must be verified separately. Do not silently
        # import or overwrite any repository ledger in this research dry run.
        entries=build([],records,bindings,manifest,verified)
        (OUT/"proposed-ledger-review.json").write_bytes(canonical(entries)+b"\n")
        report.update(status="FOUR_HASH_CHAINED_LEDGER_ENTRIES_PROPOSED_REVIEW_ONLY",
            proposed_entries=len(entries),ledger_sha256=digest(entries),
            chain_tip_sha256=entries[-1]["entry_sha256"],
            experiment41_artifact_zip_sha256=verified["artifact_zip_sha256"],
            experiment41_commit_sha=EXPECTED_SHA,
            github_receipt_reverified=True,
            missing_requirements=["No independently archived historical result availability timestamps",
                                  "Proposed ledger exists only in a downloadable Actions artifact",
                                  "No immutable committed forecast ledger or append-only enforcement",
                                  "Model remains unvalidated; publication and challenge blocked"])
    except Exception as exc:
        report["status"]="BLOCKED_AUDIT_ERROR";report["error"]=str(exc)
    finally:
        (OUT/"report.json").write_text(json.dumps(report,indent=2)+"\n")
        print(json.dumps({k:report.get(k) for k in ("status","proposed_entries","challenge_eligible","error")}))
    if report["status"]=="BLOCKED_AUDIT_ERROR":sys.exit(1)
if __name__=="__main__":main()
