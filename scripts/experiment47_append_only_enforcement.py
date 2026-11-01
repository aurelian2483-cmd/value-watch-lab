#!/usr/bin/env python3
"""Experiment 47: offline append-only ledger enforcement tests, review only.
No repository write, no production storage, no challenge eligibility.
"""
import copy,json,pathlib,sys
from experiment44_anchor_integrity_audit import main as verify44,OUT as OUT44,validate
from experiment43_proposed_evidence_ledger import digest
from experiment39_training_inclusion_audit import canonical
OUT=pathlib.Path("/tmp/experiment47")
ANCHOR=pathlib.Path("research/experiment44-ledger-anchor.json")
def check_chain(rows):
    if not isinstance(rows,list) or not rows:raise ValueError("ledger empty or invalid")
    previous="0"*64;seen=set()
    for index,e in enumerate(rows):
        if not isinstance(e,dict) or e.get("sequence")!=index+1 or e.get("previous_entry_sha256")!=previous:
            raise ValueError("invalid sequence or chain")
        if e.get("entry_sha256")!=digest({k:v for k,v in e.items() if k!="entry_sha256"}):
            raise ValueError("entry digest mismatch")
        key=tuple(e.get("fixture_identity",[]))
        if len(key)!=4 or key in seen:raise ValueError("duplicate fixture identity")
        if e.get("challenge_eligible")!=0 or e.get("publication_gate")!="BLOCKED":
            raise ValueError("publication policy violation")
        seen.add(key);previous=e["entry_sha256"]
    return previous
def enforce_append(previous,proposed,expected_tip):
    if check_chain(previous)!=expected_tip:raise ValueError("optimistic concurrency mismatch")
    if not isinstance(proposed,list) or len(proposed)<=len(previous):
        raise ValueError("not an append operation")
    if proposed[:len(previous)]!=previous:raise ValueError("prior history replaced")
    check_chain(proposed)
    return proposed[-1]["entry_sha256"]
def make_new(rows):
    e=copy.deepcopy(rows[-1])
    e["sequence"]=len(rows)+1
    e["previous_entry_sha256"]=rows[-1]["entry_sha256"]
    e["fixture_identity"]=["RESEARCH_TEST_ONLY","TEST_AWAY","2099-01-01T00:00:00Z","synthetic"]
    e["forecast_record_sha256"]="a"*64
    e["record_type"]="REVIEW_ONLY_NOT_COMMITTED"
    e["entry_sha256"]=digest({k:v for k,v in e.items() if k!="entry_sha256"})
    return rows+[e]
def main():
    OUT.mkdir(parents=True,exist_ok=True)
    report={"experiment":47,"status":"BLOCKED_PENDING","challenge_eligible":0,
            "publication_gate":"BLOCKED","publishing_enabled":False,
            "persistent_ledger_modified":False,"append_only_storage_enforced":False}
    try:
        verify44()
        prior=json.loads((OUT44/"report.json").read_text())
        if prior.get("status")!="FIXED_COMMIT_ANCHOR_MATCHED_TAMPERING_REJECTED_REVIEW_ONLY":
            raise ValueError("upstream verification failed")
        rows=json.loads((OUT44/"verified-ledger-review.json").read_text())
        anchor=json.loads(ANCHOR.read_text())
        tip=validate(rows,anchor)
        proposed=make_new(rows)
        if enforce_append(rows,proposed,tip)!=proposed[-1]["entry_sha256"]:
            raise ValueError("valid synthetic append rejected")
        tests={}
        cases={
            "modified_history":lambda x:x[0].__setitem__("forecast_record_sha256","0"*64),
            "deleted_history":lambda x:x.pop(0),
            "reordered_history":lambda x:x.reverse(),
            "duplicate_history":lambda x:x.append(copy.deepcopy(x[0])),
            "stale_expected_tip":None,
            "unchanged_ledger":lambda x:x.pop(),
            "invalid_new_entry_hash":lambda x:x[-1].__setitem__("entry_sha256","f"*64),
            "duplicate_new_fixture":lambda x:x[-1].__setitem__("fixture_identity",copy.deepcopy(x[0]["fixture_identity"]))
        }
        for name,mutator in cases.items():
            attempt=copy.deepcopy(proposed)
            if mutator is not None:mutator(attempt)
            try:enforce_append(rows,attempt,"f"*64 if name=="stale_expected_tip" else tip)
            except ValueError:tests[name]="REJECTED"
            else:raise ValueError("unsafe append accepted: "+name)
        report.update(status="APPEND_ONLY_ENFORCEMENT_TESTS_PASSED_SIMULATION_ONLY",
            baseline_entries=len(rows),synthetic_appended_entries=1,
            accepted_synthetic_append=True,negative_tests=tests,
            baseline_ledger_sha256=digest(rows),baseline_tip_sha256=tip,
            synthetic_tip_sha256=proposed[-1]["entry_sha256"],
            missing_requirements=["Tests are local simulation, not enforced GitHub storage permissions",
              "No persistent append-only ledger, independent write-once witness or branch protection",
              "Historical data availability and model validation not established"])
        (OUT/"synthetic-append-review.json").write_bytes(canonical(proposed)+b"\n")
    except Exception as exc:
        report.update(status="BLOCKED_AUDIT_ERROR",error=str(exc))
    finally:
        (OUT/"report.json").write_text(json.dumps(report,indent=2)+"\n")
        print(json.dumps({k:report.get(k) for k in ("status","accepted_synthetic_append","challenge_eligible","error")}))
    if report["status"]=="BLOCKED_AUDIT_ERROR":sys.exit(1)
if __name__=="__main__":main()
