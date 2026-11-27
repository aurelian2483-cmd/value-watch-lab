"""Coverage of the original 76 inspected development forecasts."""
import json
from collections import Counter
from pathlib import Path
root=Path(__file__).resolve().parents[2]
development=json.loads((root/"horse-v3plus-phase2-20261115/inputs/derived_inputs.json").read_text())["races"]
expected={r["race_id"]:r["forecast_sha"] for r in development}
rows=[json.loads(p.read_bytes()) for p in sorted((root/"horse-ab-phase3-master-20261115/audit/raw76").glob("*.json"))]
assert len(expected)==len(rows)==76 and {r["race_id"]:r["record_sha256"] for r in rows}==expected
runner_keys=sorted({k for r in rows for runner in r["runners"] for k in runner})
print(json.dumps(dict(races=len(rows),runners=sum(len(r["runners"]) for r in rows),
    going_present=sum(bool(r.get("going")) for r in rows),going_basis=Counter(r.get("going_basis","not_recorded") for r in rows),
    kind=Counter(r["run_type"] for r in rows),target_runner_fields=runner_keys,
    context_fields=sorted({k for r in rows for runner in r["runners"] for k in runner["context_features"]}),
    race_fields=sorted({k for r in rows for k in r}),
    timestamp_attested=sum(r["independent_timestamp_attested"] for r in rows),
    first_availability_verified=sum(r["historical_first_availability_verified"] for r in rows)),indent=2))
