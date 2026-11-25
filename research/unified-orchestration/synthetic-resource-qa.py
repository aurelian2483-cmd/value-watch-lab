"""Linux-only fixed synthetic QA. No research queue dispatch, data inputs or arbitrary commands."""
import json
import os
import resource
import signal
import subprocess
import sys
import tempfile
import time
from pathlib import Path

MEMORY = 64 * 1024 * 1024
MODES = ("known-answer", "memory-limit", "cpu-limit", "wall-timeout")
FLAGS = {"researchOnly": True, "executionAuthorized": False,
         "dispatchAuthorized": False, "repairAuthorized": False,
         "accessAuthorized": False, "sourceMutationAuthorized": False,
         "validationAuthorized": False, "modelValidation": "UNVALIDATED",
         "publicationGate": "BLOCKED", "measurementFreshness": "UNKNOWN"}

def require(ok, message):
    if not ok:
        raise RuntimeError(message)

def child(mode):
    require(sys.platform == "linux" and mode in MODES, "Unsupported synthetic probe")
    allowed = os.sched_getaffinity(0)
    require(bool(allowed), "No available CPU")
    os.sched_setaffinity(0, {min(allowed)})
    resource.setrlimit(resource.RLIMIT_AS, (MEMORY, MEMORY))
    resource.setrlimit(resource.RLIMIT_CPU, (1, 2))
    resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
    resource.setrlimit(resource.RLIMIT_FSIZE, (0, 0))
    require(resource.getrlimit(resource.RLIMIT_AS) == (MEMORY, MEMORY), "Memory limit mismatch")
    require(resource.getrlimit(resource.RLIMIT_CPU) == (1, 2), "CPU time limit mismatch")
    require(len(os.sched_getaffinity(0)) == 1, "CPU affinity mismatch")
    if mode == "known-answer":
        print(json.dumps({"result": sum(i*i for i in range(1,101)), "cpuSlots": 1,
                          "addressSpaceBytes": MEMORY, "cpuSoftSeconds": 1,
                          "cpuHardSeconds": 2}), flush=True)
    elif mode == "memory-limit":
        try:
            bytearray(2 * MEMORY)
        except MemoryError:
            print("MEMORY_LIMIT_REJECTED", flush=True)
        else:
            raise RuntimeError("Oversized allocation unexpectedly succeeded")
    elif mode == "cpu-limit":
        signal.signal(signal.SIGXCPU, signal.SIG_DFL)
        while True:
            pass
    else:
        time.sleep(30)

def run(modes=MODES):
    require(sys.platform == "linux", "Linux resource QA required; no fallback")
    require(isinstance(modes, tuple) and 1 <= len(modes) <= len(MODES) and len(set(modes)) == len(modes) and all(m in MODES for m in modes), "Invalid fixed probes")
    rows = []
    script = str(Path(__file__).resolve())
    with tempfile.TemporaryDirectory(prefix="research-resource-qa-") as work:
        for mode in modes:
            started = time.monotonic()
            limit = 1 if mode == "wall-timeout" else 5
            cmd = [sys.executable, "-I", "-S", "-B", script, "--child", mode]
            try:
                p = subprocess.run(cmd, cwd=work, env={"LANG": "C", "LC_ALL": "C"},
                                   capture_output=True, text=True, timeout=limit, check=False)
            except subprocess.TimeoutExpired:
                require(mode == "wall-timeout", "Unexpected synthetic probe timeout")
                rows.append({"probe": mode, "status": "PASS", "observed": "PARENT_TIMEOUT_KILLED_AND_REAPED",
                             "elapsedSeconds": round(time.monotonic()-started, 3)})
                continue
            require(len(p.stdout) <= 4096 and len(p.stderr) <= 4096, "Unexpected probe output")
            if mode == "known-answer":
                require(p.returncode == 0 and json.loads(p.stdout) == {
                    "result": 338350, "cpuSlots": 1, "addressSpaceBytes": MEMORY,
                    "cpuSoftSeconds": 1, "cpuHardSeconds": 2}, "Known answer or resource limit mismatch")
                observed = "KNOWN_ANSWER_AND_LIMITS_MATCHED"
            elif mode == "memory-limit":
                require(p.returncode == 0 and p.stdout.strip() == "MEMORY_LIMIT_REJECTED", "Memory probe failed")
                observed = "OVERSIZED_ALLOCATION_REJECTED"
            elif mode == "cpu-limit":
                require(p.returncode in (-signal.SIGXCPU, -signal.SIGKILL), "CPU limit did not terminate probe")
                observed = "CPU_LIMIT_TERMINATED_PROCESS"
            else:
                raise RuntimeError("Wall-timeout probe exited unexpectedly")
            rows.append({"probe": mode, "status": "PASS", "observed": observed,
                         "elapsedSeconds": round(time.monotonic()-started, 3)})
    require(len(rows) == len(modes), "Incomplete resource test coverage")
    return {"kind": "FIXED_SYNTHETIC_RESOURCE_QA", "schemaVersion": 1,
            "platform": "linux", "checks": rows, "passed": len(rows),
            "limits": {"cpuAffinitySlots": 1, "addressSpaceMiB": 64, "cpuHardSeconds": 2,
                       "maximumParentTimeoutSeconds": 5},
            "limitations": ["Fixed trusted QA subprocesses only; not a sandbox for arbitrary code.",
                            "No research tasks, external datasets or producers executed.",
                            "Network and GPU are unused by fixed probes, not OS-isolated.",
                            "No Windows, GPU, production resource or scientific acceptance."], **FLAGS}

if __name__ == "__main__":
    if len(sys.argv) == 3 and sys.argv[1] == "--child":
        child(sys.argv[2])
    elif len(sys.argv) == 3 and sys.argv[1] == "--probe" and sys.argv[2] in MODES:
        print(json.dumps(run((sys.argv[2],)), indent=2))
    elif len(sys.argv) == 1:
        print(json.dumps(run(), indent=2))
    else:
        raise SystemExit("Usage: python3 synthetic-resource-qa.py")
