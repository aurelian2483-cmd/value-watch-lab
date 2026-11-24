# General Scientific CPU/GPU Compute — Phase 1

Separate stacked draft from laboratory acceptance commit be874dbd75164b4c25aeb11bc4f6dddf1e8c2a44. General numerical infrastructure, fixed synthetic inputs only. The existing Node laboratory remains unchanged.

Run from repository root:
```sh
python -B -m unittest discover -s research/scientific-compute -p 'test_*.py'
python -B research/scientific-compute/compute.py cpu
```

The CPU reference uses Python standard-library compensated summation and three small analytic matrix products, A=I+J and B=2I-J, with exact answer 2I+(1-n)J. Float64 error checks are fixed before execution. Host CPU capability metadata is informational.

Optional explicit local GPU smoke test, only where a compatible CuPy/CUDA installation already exists:
```sh
python -B research/scientific-compute/compute.py gpu
```

No dependency installation or driver changes performed. The optional adapter attempts device enumeration and float64 matrix products on device zero, synchronizes and checks copied results against the same analytic answer. Missing runtime, missing device, backend error or wrong results fail GPU mode; CPU success cannot hide a GPU failure. Hosted CI runs CPU only; GPU code is unverified on physical hardware. No GPU acceleration or performance advantage claimed.

Next: isolated process deadlines and resource ceilings, richer hardware/driver inventory, numerical stress and precision tests, authenticated local acceptance receipts, read-only reporting integration. No sports data, predictive workloads, arbitrary submitted code, production deployment, or qualification of the catalogue.

## Phase 2 — fixed-process supervision

Run `python -B research/scientific-compute/supervisor.py cpu` from the repository root. This invokes only the trusted local fixed smoke suite in a separate Python interpreter, with a 30-second default deadline, exit-code checks, report validation and no shell. Linux CPU children request CPU-time and address-space ceilings (10 seconds and 512 MiB, or stricter inherited limits). GPU mode requires explicit selection and does not apply CPU address-space limits to the CUDA runtime. Other platforms have no OS memory ceilings yet. The process boundary is not a security sandbox; output is bounded after capture, not during it. Timeout tests simulate the subprocess timeout exception; real CPU child acceptance runs in CI. No physical GPU or Windows acceptance yet.

## Phase 3 — hardware inventory

CPU mode now reports logical CPU count, affinity or available process slots where supported, OS-reported physical memory before and after the workload, and explicit unknowns for unavailable readings. Linux uses /proc/meminfo; Windows uses GlobalMemoryStatusEx. Explicit GPU mode samples the selected device's name, compute capability, raw runtime and driver version codes, and available/total device memory before and after the fixed smoke suite. GPU metadata failures remain partial, not invented; actual numeric smoke verdict remains separate. GPU and CPU fixtures now share input fingerprints. No polling, hardware changes, peak memory claims, compatibility guarantees, or device serial numbers. Windows and Linux CPU CI jobs are configured; physical GPU acceptance still requires an actual compatible local runtime. These snapshots are neither reservations nor resource quotas, and hosted CPU tests do not establish performance on a user's PC.

## Phase 4 — repeated fixed numerical benchmarks

Run `python -B research/scientific-compute/benchmark.py cpu` (or explicitly `gpu` with an existing compatible local CuPy installation). Three structured cases and one mixed-sign dyadic case have analytic or exact rational reference outputs. One warmup and three recorded repetitions per case must all pass. CPU uses float64 Python fsum; optional GPU uses float32 and float64 with predefined separate absolute/relative tolerances. The report records every check, input fingerprints, median/range wall-clock timings and timing scope. No optimized CPU BLAS baseline or fair speedup claim; these are small numerical diagnostics, not maximum-load stress tests. GPU mode is not exercised on hosted CI. This benchmark CLI is not yet integrated into the supervised subprocess contract; use only the fixed local cases. CI adds CPU-only repeated reports on both supported hosted operating systems.

## Phase 5 — supervised repeated benchmarks and local acceptance receipts

The supervisor now accepts the fixed `smoke` or `benchmark` workload, with existing subprocess deadlines and platform-specific resource policy. The repeated report contract checks expected fixture identities, fingerprints, precision, warmups, timings and every recorded verdict. Run `python -B research/scientific-compute/acceptance_receipt.py cpu <full-declared-revision>` for a content-addressed local receipt, or explicitly select `gpu` only on a machine with a compatible already-installed CuPy runtime. Both supervised workloads must pass; CPU results cannot satisfy GPU mode. The receipt contains both process reports and their fingerprints and can be checked with verify_receipt. It is unsigned, not independent hardware attestation; a valid receipt does not authorize other workloads. Hosted CI generates CPU receipts for Windows and Linux only. No physical GPU acceptance claimed.

## Phase 6 — read-only control-centre reporting

`python -B research/scientific-compute/status.py <artifact-directory> <expected-revision> json|html` reads the fixed optional `local-cpu-receipt.json` and `local-gpu-receipt.json` names only. It checks revision, mode, receipt integrity and existing report contracts; missing values remain unavailable. No workloads are started. CPU and GPU claims are displayed separately, with no comparison across hosts and no independent hardware verification claim. CI emits compute-status.json and compute-status.html using actual CPU receipts. This is a standalone reporting adapter, not an integrated deployed control centre. Browser acceptance, GPU runtime execution and final quality audit remain outstanding.
