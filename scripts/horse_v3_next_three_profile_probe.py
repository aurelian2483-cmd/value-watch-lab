#!/usr/bin/env python3
"""Nine-horse V3 historical profile source capture.

Diagnostic only: original archive/models untouched. Never automatically
promote scraped results to training or treat retrospective pages as pre-race.
"""
import json
from pathlib import Path
import horse_v3_profile_recovery_probe as probe

MANIFEST=Path(__file__).resolve().parents[1]/"research/horse-v3/next-three-recovery-manifest.json"
OUT=Path("/tmp/horse-v3-profile-recovery")
def main():
    m=json.loads(MANIFEST.read_text())
    targets=m["targets"]
    if (m.get("publication_gate")!="BLOCKED" or m.get("training_eligible") is not False
            or len(targets)!=9 or len({t["horse_id"] for t in targets})!=9):
        raise SystemExit("Unsafe or incomplete recovery manifest")
    for t in targets:
        if not t["target_date"].startswith("2025-") or t["missing_usable_flat_finishes"]!=3:
            raise SystemExit("Unexpected manifest target")
    probe.TARGETS=[{k:t[k] for k in ("target_race_id","target_date","horse_id","horse_name")} for t in targets]
    probe.main()
    report=json.loads((OUT/"profile-probe.json").read_text())
    if len(report["profiles"])!=9 or report["verified_training_rows"]!=0:
        raise SystemExit("Unexpected output or training-row promotion")
    summary={"target_horses":9,"captured_profiles":sum("source_sha256" in p for p in report["profiles"]),
             "source_failures":sum(p["status"]=="FETCH_FAILED" for p in report["profiles"]),
             "structured_candidates_unverified":sum(p.get("structured_candidate_count",0) for p in report["profiles"]),
             "training_rows_approved":0,"publication_gate":"BLOCKED",
             "limitations":"A source capture is not a verified previous race result or pre-event proof."}
    (OUT/"nine-horse-summary.json").write_text(json.dumps(summary,indent=2)+"\n")
    print(json.dumps(summary))
    if summary["source_failures"]:
        raise SystemExit("Some sources could not be captured; inspect audit artifact")
if __name__=="__main__":main()
