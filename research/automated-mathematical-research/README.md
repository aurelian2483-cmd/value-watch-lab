# Automated mathematical research — fixed numerical campaign v1

Based on accepted local hardware-kit PR #180 revision b5ccc67e2a2ceaaf63daf6e814b14a653d591592. The existing laboratory and acceptance branches are not modified. Local hardware review metadata records only fingerprints and aggregate conclusions from the supplied unsigned receipts, which were rechecked using the exact original kit verifier. Physical fixed CPU/GPU and read-only HTTP checks passed; no independent hardware attestation, production GPU quota or general speedup claim.

The catalogue on PR #171 at 0b4773cd00f009416587aee6e95f058fb53026e5 registers 331 specifications and zero qualified entries; the Phase 1/2/3 source pins remain historical and are not silently updated.

Campaign v1 executes 250 predetermined synthetic fixtures across four already implemented numerical methods: 64 bisection, 64 composite trapezoid, 64 composite Simpson, 58 symmetric power iteration. A separate Python exact-rational verifier independently reconstructs all inputs and reference answers; trapezoidal values use the exact discrete weighted sum. All verdicts and per-method counts are retained. The report is deterministic on the same environment and tied to a declared checkout revision; CI supplies the actual checked-out SHA. A failed test is not a qualified method. This is 250 cases, not 250 methods, and there are no sport predictions or real-data tests.

Run from repository root with Node 22 and Python 3.12:
1. node --test research/mathematical-testing-lab/*.test.mjs research/automated-mathematical-research/*.test.mjs
2. node research/automated-mathematical-research/campaign.mjs <full-checkout-sha> > campaign.json
3. python -B research/automated-mathematical-research/reference.py campaign.json > reference.json
4. Supply independently retained SHA-256 fingerprints of both files to record.mjs <campaign> <reference> <separate-existing-store> <campaign-byte-sha> <reference-byte-sha>.

The receipt validates exact replay and reference identities/counts and is content addressed; identical retries reuse existing bytes, and corrupt records are rejected without replacement. It is not a transactional database or cryptographic signature. If interrupted during write, retain the damaged evidence and review manually. CI runs the actual fixed batch and rejects mutated inputs, tolerance, flags, counts, false observations and altered records. No arbitrary code, external data, real queue dispatch, catalogue promotion or automatic repair. CPU is the fixed backend for scalar and small matrix fixtures. The existing RTX 4070 timings compare Python reference and CuPy with transfers; do not establish a fair optimized CPU/GPU routing crossover. Fair backend calibration and genuine empirical validation remain separate tasks. Research UNVALIDATED; execution/dispatch/publication BLOCKED.
