#!/usr/bin/env python3
"""Print a private original-source manifest. DO NOT commit it to public Git."""
import json
import sys
from pathlib import Path
from private_result_capture import PrivateResultCapture
from capture_prospective_research import ROOT

if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python scripts/export_private_result_manifest.py /private/local/evidence")
    store = PrivateResultCapture(Path(sys.argv[1]), ROOT)
    print(json.dumps(store.manifest(), indent=2))
