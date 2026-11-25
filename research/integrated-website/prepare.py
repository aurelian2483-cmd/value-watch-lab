"""Acquire only pinned aggregate artifacts. Offline builds can use the exact retained ZIPs.

No collector, producer, dataset or protected partition is opened by this script.
"""
import argparse
import base64
import hashlib
import io
import json
import os
from pathlib import Path
import stat
import subprocess
import sys
import zipfile

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parents[1]
PINS = json.loads((HERE / "source-pins.json").read_text(encoding="utf-8"))
sys.path.insert(0, str(REPO_ROOT / "research" / "unified-orchestration"))
from release import verify as verify_phase3

def need(ok, msg):
    if not ok:
        raise ValueError(msg)

def sha(raw):
    return hashlib.sha256(raw).hexdigest()

def gh(endpoint):
    return subprocess.check_output(["gh", "api", endpoint], timeout=60)

def verify_run(repo, repo_id, run_id, head):
    run = json.loads(gh(f"repos/{repo}/actions/runs/{run_id}"))
    need(run["id"] == run_id and run["head_sha"] == head
         and run["conclusion"] == "success" and run["status"] == "completed"
         and run["repository"]["id"] == repo_id and run["head_repository"]["id"] == repo_id,
         "Source run identity or acceptance mismatch")

def collect(directory):
    repo = os.environ["GITHUB_REPOSITORY"]
    repo_id = int(os.environ["GITHUB_REPOSITORY_ID"])
    need(repo == "aurelian2483-cmd/value-watch-lab" and repo_id == 1440096185,
         "Unexpected repository")
    for pin in PINS["artifacts"]:
        ep = f"repos/{repo}/actions/artifacts/{pin['artifact']}"
        a = json.loads(gh(ep))
        w = a["workflow_run"]
        need(a["id"] == pin["artifact"] and a["name"] == pin["name"]
             and a["digest"] == "sha256:" + pin["sha256"] and not a["expired"]
             and 0 < a["size_in_bytes"] <= 16*1024*1024
             and w["id"] == pin["run"] and w["head_sha"] == pin["head"]
             and w["repository_id"] == repo_id and w["head_repository_id"] == repo_id,
             "Artifact source mismatch: " + pin["id"])
        verify_run(repo, repo_id, pin["run"], pin["head"])
        raw = gh(ep + "/zip")
        need(len(raw) == a["size_in_bytes"] and sha(raw) == pin["sha256"], "Artifact bytes mismatch")
        (directory / (pin["id"] + ".zip")).write_bytes(raw)
    c = PINS["catalogue"]
    verify_run(repo, repo_id, c["run"], c["head"])
    file = json.loads(gh(f"repos/{repo}/contents/{c['path']}?ref={c['head']}"))
    need(file["sha"] == c["blob"] and file["type"] == "file" and file["encoding"] == "base64",
         "Catalogue blob identity mismatch")
    raw = base64.b64decode(file["content"])
    (directory / "catalogue.json").write_bytes(raw)

def member(z, name, limit=4*1024*1024):
    entries = [i for i in z.infolist() if i.filename == name]
    need(len(entries) == 1, "Missing or duplicate archive member: " + name)
    i = entries[0]
    need(not i.is_dir() and not stat.S_ISLNK(i.external_attr >> 16) and 0 < i.file_size <= limit,
         "Unsafe archive member: " + name)
    raw = z.read(i)
    need(len(raw) == i.file_size, "Archive member length mismatch")
    return raw

def prepare(directory, target):
    need(directory.resolve() == directory.absolute() and directory.is_dir(), "Unsafe source directory")
    target.mkdir(exist_ok=False)
    receipts = []
    for p in PINS["artifacts"]:
        f = directory / (p["id"] + ".zip")
        need(f.is_file() and not f.is_symlink() and f.stat().st_size <= 16*1024*1024,
             "Unavailable source archive")
        raw = f.read_bytes()
        need(sha(raw) == p["sha256"], "Pinned archive SHA-256 mismatch: " + p["id"])
        dest = target / p["id"]
        dest.mkdir()
        with zipfile.ZipFile(io.BytesIO(raw)) as z:
            for name in p["members"]:
                data = member(z, name)
                (dest / name).write_bytes(data)
                receipts.append({"id": p["id"], "member": name, "sha256": sha(data), "bytes": len(data)})
        if p["id"] == "phase3":
            inner = (dest / "phase3-local-preview.zip").read_bytes()
            count = verify_phase3(inner, PINS["phase3PreviewSha256"])
            need(count == 19, "Original preview manifest mismatch")
            root = target / "preview"
            root.mkdir()
            # The original verifier enforces the exact member list, regular files and hashes.
            # Only the six state files are needed; no archived code is executed.
            with zipfile.ZipFile(io.BytesIO(inner)) as z:
                for name in ("evidence/current.json", "registry/registry.json", "registry/control.json",
                             "queue/queue.json", "orchestration-plan.json", "queue-plan.json"):
                    path = root / name
                    path.parent.mkdir(parents=True, exist_ok=True)
                    path.write_bytes(member(z, name))
    f = directory / "catalogue.json"
    need(f.is_file() and not f.is_symlink() and 0 < f.stat().st_size < 16384, "Invalid catalogue metadata")
    raw = f.read_bytes()
    git_blob = hashlib.sha1(("blob %d\0" % len(raw)).encode() + raw).hexdigest()
    need(git_blob == PINS["catalogue"]["blob"], "Pinned catalogue bytes mismatch")
    (target / "catalogue.json").write_bytes(raw)
    receipts.append({"id": "catalogue", "member": "catalogue.json", "sha256": sha(raw), "bytes": len(raw)})
    raw = (REPO_ROOT / PINS["hardware"]["path"]).read_bytes()
    (target / "hardware.json").write_bytes(raw)
    receipts.append({"id": "hardware", "member": "hardware.json", "sha256": sha(raw), "bytes": len(raw)})
    (target / "member-receipts.json").write_text(json.dumps(receipts, indent=2) + "\n", encoding="utf-8")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive_directory", type=Path)
    parser.add_argument("prepared_directory", type=Path)
    parser.add_argument("--download", action="store_true")
    args = parser.parse_args()
    try:
        if args.download:
            args.archive_directory.mkdir(exist_ok=False)
            collect(args.archive_directory)
        prepare(args.archive_directory.absolute(), args.prepared_directory.absolute())
        print("PASS five exact aggregate archives, original Phase 3 preview manifest, pinned catalogue blob")
    except (OSError, ValueError, KeyError, TypeError, zipfile.BadZipFile, subprocess.SubprocessError) as e:
        print("Source preparation failed: " + str(e), file=sys.stderr)
        sys.exit(1)
