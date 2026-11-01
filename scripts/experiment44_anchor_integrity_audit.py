#!/usr/bin/env python3
"""Experiment 44: fixed committed anchor and adversarial ledger integrity checks.
Review only. A Git commit is not immutable absent protected refs or independent witness.
"""
import copy,json,pathlib,sys
from experiment43_proposed_evidence_ledger import main as run43,OUT as P43,digest
from experiment39_training_inclusion_audit import canonical
OUT=pathlib.Path("/tmp/experiment44")
ANCHOR=pathlib.Path("research/experiment44-ledger-anchor.json")
def validate(rows,anchor):
    if not isinstance(rows,list) or len(rows)!=anchor["expected_entries"]:
        raise ValueError("entry deletion/addition or count mismatch")
    if digest(rows)!=anchor["ledger_sha256"]:raise ValueError("fixed anchor mismatch")
    previous="0"*64
    identities=set()
    for i,e in enumerate(rows):
        if not isinstance(e,dict) or e.get("sequence")!=i+1 or e.get("previous_entry_sha256")!=previous:
            raise ValueError("sequence or previous hash invalid")
        body={k:v for k,v in e.items() if k!="entry_sha256"}
        if digest(body)!=e.get("entry_sha256"):raise ValueError("entry hash invalid")
        key=tuple(e.get("fixture_identity",[]))
        if len(key)!=4 or key in identities:raise ValueError("duplicate fixture")
        identities.add(key)
        if e.get("record_type")!="REVIEW_ONLY_NOT_COMMITTED" or e.get("challenge_eligible")!=0 or e.get("publication_gate")!="BLOCKED":
            raise ValueError("publication safety fields invalid")
        if e.get("experiment41_run_id")!=anchor["source_experiment41_run_id"] or e.get("experiment41_commit_sha")!=anchor["source_experiment41_head_sha"]:
            raise ValueError("upstream witness changed")
        previous=e["entry_sha256"]
    return previous
def rewrite_chain(entries):
    """Change a forecast and recompute every dependent hash, simulating a rewrite."""
    entries[0]["forecast_record_sha256"]="f"*64
    previous="0"*64
    for entry in entries:
        entry["previous_entry_sha256"]=previous
        entry["entry_sha256"]=digest({k:v for k,v in entry.items() if k!="entry_sha256"})
        previous=entry["entry_sha256"]

def main():
    OUT.mkdir(parents=True,exist_ok=True)
    report={"experiment":44,"status":"BLOCKED_PENDING","challenge_eligible":0,
        "publishing_enabled":False,"publication_gate":"BLOCKED",
        "committed_anchor_is_immutable":False,"persistent_ledger_modified":False}
    try:
        anchor=json.loads(ANCHOR.read_text())
        if anchor.get("schema")!="experiment44-ledger-anchor-v1" or anchor.get("challenge_eligible")!=0 or anchor.get("publication_gate")!="BLOCKED":
            raise ValueError("invalid anchor policy")
        run43()
        upstream=json.loads((P43/"report.json").read_text())
        if upstream.get("status")!="FOUR_HASH_CHAINED_LEDGER_ENTRIES_PROPOSED_REVIEW_ONLY":
            raise ValueError("Experiment 43 did not pass")
        rows=json.loads((P43/"proposed-ledger-review.json").read_text())
        tip=validate(rows,anchor)
        if upstream.get("ledger_sha256")!=anchor["ledger_sha256"] or upstream.get("chain_tip_sha256")!=tip:
            raise ValueError("upstream report inconsistent")
        tests={}
        for label,mutate in (
            ("altered_forecast_hash",lambda a:a[0].__setitem__("forecast_record_sha256","0"*64)),
            ("deleted_entry",lambda a:a.pop()),
            ("duplicated_entry",lambda a:a.append(copy.deepcopy(a[-1]))),
            ("rewritten_chain",rewrite_chain),
            ("reordered_entries",lambda a:a.reverse())):
            modified=copy.deepcopy(rows)
            mutate(modified)
            try:validate(modified,anchor)
            except ValueError:tests[label]="REJECTED"
            else:raise ValueError("negative test unexpectedly accepted: "+label)
        report.update(status="FIXED_COMMIT_ANCHOR_MATCHED_TAMPERING_REJECTED_REVIEW_ONLY",
            anchor_path=str(ANCHOR),anchor_sha256=digest(anchor),
            ledger_sha256=digest(rows),chain_tip_sha256=tip,entries_verified=len(rows),
            negative_tests=tests,commit_reference_is_protected=False,
            missing_requirements=["Anchor commit/branch is not independently protected against rewriting",
              "No durable append-only committed forecast ledger or external timestamp witness",
              "Historical first-available result times and model validation remain unverified"])
        (OUT/"verified-ledger-review.json").write_bytes(canonical(rows)+b"\n")
    except Exception as exc:
        report["status"]="BLOCKED_AUDIT_ERROR";report["error"]=str(exc)
    finally:
        (OUT/"report.json").write_text(json.dumps(report,indent=2)+"\n")
        print(json.dumps({k:report.get(k) for k in ("status","entries_verified","challenge_eligible","error")}))
    if report["status"]=="BLOCKED_AUDIT_ERROR":sys.exit(1)
if __name__=="__main__":main()
