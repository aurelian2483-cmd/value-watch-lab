#!/usr/bin/env python3
"""Experiment 49: read-only verification of persistent ledger and guarded append proposal.
No writes or real forecasts; demonstrates compare-and-swap preconditions, not immutable storage.
"""
import base64,copy,hashlib,json,os,pathlib,subprocess,sys
from experiment44_anchor_integrity_audit import validate
from experiment47_append_only_enforcement import check_chain,enforce_append,make_new
from experiment43_proposed_evidence_ledger import digest
from experiment39_training_inclusion_audit import canonical
OUT=pathlib.Path("/tmp/experiment49")
REPO="aurelian2483-cmd/value-watch-lab"
BRANCH="research/prospective-100"
PATH="research/persistent-forecast-ledger.json"
def remote_file():
    p=subprocess.run(["gh","api","-X","GET",f"repos/{REPO}/contents/{PATH}","-f",f"ref={BRANCH}"],
                     text=True,capture_output=True,timeout=60)
    if p.returncode:raise ValueError("remote ledger retrieval failed: "+p.stderr[-400:])
    data=json.loads(p.stdout)
    if data.get("type")!="file" or data.get("path")!=PATH or data.get("encoding")!="base64":
        raise ValueError("unexpected remote ledger response")
    raw=base64.b64decode(data["content"],validate=False)
    blob="sha1" # GitHub blob ID computed independently
    expected_blob=hashlib.sha1(b"blob "+str(len(raw)).encode()+b"\0"+raw).hexdigest()
    if expected_blob!=data.get("sha"):raise ValueError("Git blob digest mismatch")
    return json.loads(raw),data["sha"],raw
def guarded_append(old,new,expected_sha,actual_sha,baseline):
    if expected_sha!=actual_sha:raise ValueError("stale Git blob SHA; reject")
    if old[:len(baseline)]!=baseline:raise ValueError("committed baseline rewritten")
    return enforce_append(old,new,check_chain(old))
def main():
    OUT.mkdir(parents=True,exist_ok=True)
    report={"experiment":49,"status":"BLOCKED_PENDING","challenge_eligible":0,
            "publication_gate":"BLOCKED","publishing_enabled":False,
            "persistent_ledger_modified":False,"append_committed":False}
    try:
        if os.environ.get("GITHUB_REF")!="refs/heads/"+BRANCH:
            raise ValueError("wrong branch")
        old,blob,raw=remote_file()
        local=pathlib.Path(PATH).read_bytes()
        if raw!=local:raise ValueError("remote and checkout ledger differ")
        anchor=json.loads(pathlib.Path("research/experiment44-ledger-anchor.json").read_text())
        tip=validate(old,anchor)
        if digest(old)!=anchor["ledger_sha256"]:raise ValueError("baseline anchor mismatch")
        proposed=make_new(old)
        new_tip=guarded_append(old,proposed,blob,blob,old)
        if new_tip!=proposed[-1]["entry_sha256"]:raise ValueError("valid append rejected")
        tests={}
        scenarios={
          "stale_blob_sha":(copy.deepcopy(proposed),"0"*40),
          "altered_baseline":(copy.deepcopy(proposed),blob),
          "deleted_baseline":(copy.deepcopy(proposed),blob),
          "reordered_baseline":(copy.deepcopy(proposed),blob),
          "duplicate_fixture":(copy.deepcopy(proposed),blob),
          "invalid_entry_hash":(copy.deepcopy(proposed),blob),
          "no_append":(copy.deepcopy(old),blob)}
        scenarios["altered_baseline"][0][0]["forecast_record_sha256"]="0"*64
        scenarios["deleted_baseline"][0].pop(0)
        scenarios["reordered_baseline"][0][0],scenarios["reordered_baseline"][0][1]=scenarios["reordered_baseline"][0][1],scenarios["reordered_baseline"][0][0]
        scenarios["duplicate_fixture"][0][-1]["fixture_identity"]=copy.deepcopy(old[0]["fixture_identity"])
        scenarios["invalid_entry_hash"][0][-1]["entry_sha256"]="f"*64
        for name,(attempt,sha) in scenarios.items():
            try:guarded_append(old,attempt,sha,blob,old)
            except ValueError:tests[name]="REJECTED"
            else:raise ValueError("unsafe append accepted: "+name)
        report.update(status="REMOTE_LEDGER_CAS_APPEND_PREFLIGHT_PASSED_READ_ONLY",
            baseline_entries=len(old),remote_blob_sha=blob,remote_ledger_sha256=digest(old),
            remote_bytes_sha256=hashlib.sha256(raw).hexdigest(),baseline_tip_sha256=tip,
            synthetic_append_tip_sha256=new_tip,negative_tests=tests,
            synthetic_append_accepted_in_memory=True,
            github_write_permission_tested=False,remote_compare_and_swap_committed=False,
            missing_requirements=["No actual append was attempted or committed",
              "GitHub branch history is not independently immutable",
              "Historical availability and model validation remain unverified"])
        (OUT/"synthetic-append-proposal.json").write_bytes(canonical(proposed)+b"\n")
    except Exception as exc:report.update(status="BLOCKED_AUDIT_ERROR",error=str(exc))
    finally:
        (OUT/"report.json").write_text(json.dumps(report,indent=2)+"\n")
        print(json.dumps({k:report.get(k) for k in ("status","remote_blob_sha","challenge_eligible","error")}))
    if report["status"]=="BLOCKED_AUDIT_ERROR":sys.exit(1)
if __name__=="__main__":main()
