"""Deterministic, code-only Phase 2 preview with a verified historical summary state.
No raw reports, private keys, credentials, dependency installation or autostart."""
import argparse
import hashlib
import io
import json
from pathlib import Path
import stat
import zipfile

ROOT = Path(__file__).resolve().parents[1]
FILES = [
    "unified-live/sync.mjs", "unified-live/authentication.mjs",
    "unified-live/producer-intake.mjs", "unified-live/viewer.mjs",
    "unified-live/collector.mjs", "unified-live/revision-review.mjs",
    "unified-live/revision-activate.mjs", "unified-live/activation-verify.mjs",
    "unified-live/README.md", "unified-control-centre/overview.mjs",
    "unified-control-centre/website.mjs", "unified-control-centre/source-pins.json",
    "scientific-reference/digest.mjs",
]
STATE = "state/current.json"
GUIDE = "START-HERE.txt"
MANIFEST = "manifest.json"
GUIDE_BYTES = b"""Unified Research Control Centre Phase 2 -- historical software preview
Requires Node.js 22 installed locally. No npm packages required.
Extract the complete ZIP into a new local directory. From that directory run:
  node research/unified-live/sync.mjs status state
  node research/unified-live/viewer.mjs state 8766
Open http://127.0.0.1:8766 in your browser. Ctrl+C stops the viewer.
The included state is a historical manual-digest-approved CI summary snapshot.
No signing identities, producer services, network fetching, or scheduled collection are configured.
Receipt freshness is not measurement freshness; measurement freshness UNKNOWN.
Research UNVALIDATED; publication BLOCKED. Do not deploy or use for betting.
Keep this directory operator-owned. Review the CI archive fingerprint before extraction.
"""
def require(ok, message):
    if not ok:
        raise ValueError(message)

def sha(raw):
    return hashlib.sha256(raw).hexdigest()

def bounded(path, limit=16 * 1024 * 1024):
    require(path.is_file() and not path.is_symlink() and path.resolve() == path.absolute(), "Unsafe file")
    require(0 < path.stat().st_size <= limit, "Invalid file size")
    raw = path.read_bytes()
    require(0 < len(raw) <= limit, "Invalid file size")
    return raw

def payload(state_path):
    data = {"research/" + name: bounded(ROOT / name) for name in FILES}
    raw = bounded(state_path.resolve() if not state_path.is_symlink() else state_path)
    state = json.loads(raw)
    require(state["kind"] == "CONTROLLED_SUMMARY_STATE" and state["sequence"] == 1
            and state["authentication"] is None and state["modelValidation"] == "UNVALIDATED"
            and state["publicationGate"] == "BLOCKED" and state["executionAuthorized"] is False
            and state["snapshot"]["counts"]["available"] == 6, "Unexpected release state")
    data[STATE] = raw
    data[GUIDE] = GUIDE_BYTES
    return data

def build(state_path):
    data = payload(state_path)
    manifest = {"kind": "PHASE2_HISTORICAL_PREVIEW", "schemaVersion": 1,
                "modelValidation": "UNVALIDATED", "publicationGate": "BLOCKED",
                "executionAuthorized": False, "measurementFreshness": "UNKNOWN",
                "files": [{"path": k, "sha256": sha(v), "bytes": len(v)} for k,v in sorted(data.items())]}
    data[MANIFEST] = (json.dumps(manifest, indent=2, sort_keys=True) + "\n").encode()
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_STORED) as z:
        for name, raw in sorted(data.items()):
            info = zipfile.ZipInfo(name, (2020,1,1,0,0,0))
            info.create_system = 3
            info.external_attr = (stat.S_IFREG | 0o600) << 16
            z.writestr(info, raw)
    return output.getvalue()

def verify(archive, expected_sha):
    require(len(expected_sha) == 64 and sha(archive) == expected_sha, "Archive fingerprint mismatch")
    expected = {"research/" + p for p in FILES} | {STATE, GUIDE, MANIFEST}
    with zipfile.ZipFile(io.BytesIO(archive)) as z:
        info = z.infolist()
        require(len(info) == len(expected) and {x.filename for x in info} == expected, "Unexpected archive inventory")
        require(all(not x.is_dir() and 0 < x.file_size <= 16*1024*1024 and
                    stat.S_IFMT(x.external_attr >> 16) == stat.S_IFREG for x in info), "Unsafe archive member")
        manifest = json.loads(z.read(MANIFEST))
        require(manifest.get("kind") == "PHASE2_HISTORICAL_PREVIEW" and manifest.get("schemaVersion") == 1
                and manifest.get("modelValidation") == "UNVALIDATED" and manifest.get("publicationGate") == "BLOCKED"
                and manifest.get("executionAuthorized") is False and manifest.get("measurementFreshness") == "UNKNOWN", "Unsafe manifest")
        rows = manifest["files"]
        require(len(rows) == len(expected)-1 and {r["path"] for r in rows} == expected-{MANIFEST}, "Manifest coverage mismatch")
        for row in rows:
            raw = z.read(row["path"])
            require(sha(raw) == row["sha256"] and len(raw) == row["bytes"], "Member fingerprint mismatch")
        return manifest

def main():
    p = argparse.ArgumentParser()
    p.add_argument("state", type=Path)
    p.add_argument("out", type=Path)
    args = p.parse_args()
    require(args.out.is_dir(), "Output directory must exist")
    raw = build(args.state.absolute())
    require(raw == build(args.state.absolute()), "Non-deterministic build")
    fingerprint = sha(raw)
    manifest = verify(raw, fingerprint)
    try:
        verify(raw + b"tampered", fingerprint)
    except ValueError:
        pass
    else:
        raise ValueError("Tampered archive accepted")
    with (args.out / "phase2-local-preview.zip").open("xb") as f:
        f.write(raw)
    with (args.out / "phase2-release-receipt.json").open("x", encoding="utf-8") as f:
        json.dump({"archiveSha256": fingerprint, "filesVerified": len(manifest["files"]),
                   "deterministic": True, "tamperRejected": True,
                   "modelValidation": "UNVALIDATED", "publicationGate": "BLOCKED",
                   "executionAuthorized": False}, f, indent=2)
    print("PASS deterministic Phase 2 preview and archive tamper rejection")

if __name__ == "__main__":
    main()
