#!/usr/bin/env python3
"""Ingest already-retained ORIGINAL tennis result bytes, no network or claims of authenticity.

The saved SHA-256 can validate byte consistency, not original observation timing,
publisher independence, or an authentic review decision. Never edits public data.
"""
import argparse
import json
import stat
from pathlib import Path

from capture_prospective_research import ROOT
from private_result_capture import MAX_BODY, PrivateCaptureError, PrivateResultCapture

def ingest(root, raw_path, prediction_id, secondary_path):
    store = PrivateResultCapture(root, ROOT)
    path = Path(raw_path).expanduser()
    if path.is_symlink() or not path.is_file():
        raise PrivateCaptureError("Original evidence must be an existing regular file")
    absolute = path.resolve(strict=True)
    if absolute == ROOT or ROOT in absolute.parents:
        raise PrivateCaptureError("Original evidence cannot be sourced from public checkout")
    info = path.stat()
    if not 0 < info.st_size <= MAX_BODY:
        raise PrivateCaptureError("Invalid original evidence size")
    if info.st_mode & (stat.S_IRWXG | stat.S_IRWXO):
        raise PrivateCaptureError("Original evidence file is not owner-only")
    secondary = json.loads(Path(secondary_path).read_text(encoding="utf-8"))
    if (secondary.get("schema_version") != 1
            or secondary.get("research_only") is not True
            or secondary.get("model_validation") != "UNVALIDATED"
            or secondary.get("publication_gate") != "BLOCKED"
            or not isinstance(secondary.get("observations"), list)):
        raise PrivateCaptureError("Unapproved secondary result archive")
    rows = [x for x in secondary["observations"] if
            isinstance(x, dict) and x.get("prediction_id") == prediction_id]
    if len(rows) != 1:
        raise PrivateCaptureError("Missing or duplicate tennis source record")
    record = rows[0]
    if record.get("sport") != "tennis":
        raise PrivateCaptureError("Not a tennis secondary record")
    return store.preserve_tennis_secondary_observation(record,path.read_bytes())

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--private-root",required=True)
    parser.add_argument("--source-file",required=True)
    parser.add_argument("--prediction-id",required=True)
    parser.add_argument("--secondary-archive",default=str(ROOT/"research/secondary-result-evidence.json"))
    args = parser.parse_args()
    status = ingest(args.private_root,args.source_file,args.prediction_id,args.secondary_archive)
    print(json.dumps(status,sort_keys=True))
