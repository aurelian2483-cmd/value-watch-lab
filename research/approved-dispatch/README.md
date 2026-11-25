# Approved dispatch — Linux fixed-QA acceptance pilot

Stacked on accepted PR #188 f7fbd37bede25eeef0f8e60b85cf3390233af37c. No existing producer, browser, Phase 3 registry or production code changes. This is the next dispatch foundation, **not production research authorization**.

An operator-owned plan specifies the exact trusted checkout revision, ordered unique job identifiers, a fixed allowlisted job type, backend and time budget. Supported types: cpu-probe (15 seconds, existing resource known-answer probe), local-qa (180 seconds, existing PR188 five-producer cycle), gpu-qa (blocked, no launch or fallback). No arbitrary commands or user input datasets. Maximum six jobs; one CPU job at a time, one logical CPU affinity on Linux inherited by fixed workers. The probe additionally applies its existing 64 MiB address-space and CPU-time limits; the five-producer cycle has no enforced aggregate memory quota. Timeout and Ctrl+C/SIGTERM attempt to kill and reap the fixed Linux process group. This is not an OS sandbox or proof of termination of arbitrary detached processes. No Windows job object, GPU VRAM quota, driver cancellation or production acceptance.

Initialize an empty separate operator-owned store, with the plan outside the store and checkout. Retain the exact SHA-256 of the reviewed plan separately:
- python -B research/approved-dispatch/dispatch.py init STORE PLAN PLAN_SHA
- python -B research/approved-dispatch/dispatch.py status STORE PLAN PLAN_SHA
- python -B research/approved-dispatch/dispatch.py advance STORE PLAN PLAN_SHA NEW_OR_PREVIOUS_EVENT_SHA
- python -B research/approved-dispatch/dispatch.py cancel STORE PLAN PLAN_SHA NEW_OR_PREVIOUS_EVENT_SHA JOB_ID

Run commands only in a trusted clean Linux checkout at the plan revision. Every advance checks the explicitly supplied prior anchor. Journal events retain start and terminal states, bind successful output bytes and revalidate actual producer receipts. Pending cancellation is recorded; blocked GPU requests never run. If interruption leaves an active event or writer lock, stop for manual review; do not delete evidence or retry automatically. Retain the latest event hash independently to detect rollback; local hashes are not signatures. No automatic job polling, no browser mutation routes, no real data or protected evaluation. CI runs actual CPU jobs, checks the existing 500 fixed cases, GPU gate, cancellation and tamper handling.

Production dispatch, deployment, hardware GPU routing and scientific validation remain BLOCKED. A separate authorization, physical host acceptance, resource isolation and independently reviewed data and research protocols are required before real research execution.
