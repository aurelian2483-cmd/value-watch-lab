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
