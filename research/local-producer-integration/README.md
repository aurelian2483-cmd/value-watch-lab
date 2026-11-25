# Local producer integration — fixed QA and read-only live view

Stacked on accepted PR #186 revision 4f6aab6bc5a545fe4323fd4f937eb3abdad00382. The original ten-section website and all source pins are unchanged. An eleventh panel displays newly produced local QA observations, separately from pinned evidence.

Five report paths reuse existing code: catalogue summary, 250-case numerical campaign with independent rational reference, 250-case forecast diagnostic campaign with independent reference, CPU acceptance receipt plus existing receipt verifier, and reference-library dashboard with current UTC review date. This is actual fixed software QA, not permission for scientific prediction or production workload dispatch. References remain REVIEW_REQUIRED. Live GPU, real historical data, continuous monitoring and external signed producer services are not connected. The Phase 2 signed report intake and approval system remain untouched; these new local receipts do not enter that state or assert producer identity.

## Local operation (development checkout, not a standalone installer)

Requires a trusted clean checkout of this branch, Git, Node 22 and Python 3.12 or the previously accepted compatible Windows runtime. Extract the accepted PR186 website package into a separate local directory. Keep it unchanged. Create a new empty operator-owned receipt directory outside the checkout. Run from the repository root:
- python -B research/local-producer-integration/producers.py --fixed-qa-only <receipt-directory> <exact-checkout-sha>
- python -B research/local-producer-integration/viewer.py <extracted-PR186-site> <receipt-directory>

Open http://127.0.0.1:8768. The root page refreshes reports on reload; the /live page refreshes the read-only view every 15 seconds. A refresh does not run a producer. To produce another fixed QA observation, invoke the first command again. There are at most 20 batches in a store; no scheduled tasks or auto restart. Ctrl+C stops the viewer. The original offline HTML can still be used without a server.

Each local cycle checks the declared checkout revision and tracked-file cleanliness, uses fixed commands and subprocess timeouts, writes an append-only sequence of aggregate receipts via an exclusive cooperating writer lock, and verifies the preceding hash chain. No raw host details, source datasets or protected partitions are read by these new report paths. A failed producer withholds metrics and retains its failure status. Receipt hashes are not signatures, externally trusted anchors or protection against a malicious local writer. Local filesystem ownership, trusted checkout and runtimes are required. Do not expose the loopback server. Interrupted locks require manual review. No automatic repair. A missing/invalid state is not a pass. Maximum 20 cycles, no deletion or eviction; use a new store for a new reviewed revision. No production deployment, scientific qualification or actual user PC test is claimed by hosted CI.

CI verifies original PR186 release bytes, runs existing producers twice, verifies browser display updates, responsive layout and mutation rejection, and retains aggregate evidence. Research UNVALIDATED, publication BLOCKED. No execution of real research jobs or source access authorized.
