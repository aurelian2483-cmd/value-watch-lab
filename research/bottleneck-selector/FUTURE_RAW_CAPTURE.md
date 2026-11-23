# Bottleneck Lab — future original result-source preservation

This stage is **opt-in original primary-provider capture for future results**, not a recovery of historical source bytes or independent outcome verification. The earlier 36 review-ready observations contain recorded response SHA-256 values but the underlying original response bytes were not retained in the repository.

## Collector integration

The development-branch version of scripts/observe_pending_results.py now receives an ESPN response document, its SHA-256 digest, original response bytes and the actual UTC response-receipt timestamp. Its collector accepts legacy two-item injected test responses when private capture is OFF. If private capture is ON it requires matching original response bytes and a valid capture timestamp or rejects that provider observation.

No old observations are rewritten, and no event is declared independently settled.

## Private storage — OFF by default

The environment variable BOTTLENECK_PRIVATE_RESULT_CAPTURE_ROOT is NOT configured in public GitHub Actions or by this PR. Without it, normal collection proceeds without retaining original response bodies.

To enable only in a separately authorised local environment:

1. Prepare a local directory outside the Git checkout, owned by the current user, with permissions 0700 (Linux).
2. Explicitly set BOTTLENECK_PRIVATE_RESULT_CAPTURE_ROOT to the existing directory.
3. Run the pre-existing result collector against its allowlisted public ESPN endpoints.
4. For any new accepted final observation, the program stores the original response body in an immutable private file with mode 0600 and an exact per-prediction receipt. Identical repeats are idempotent; conflicting originals fail closed.
5. Retain and back up this private evidence only under applicable provider licence, privacy and data-retention permissions.

A temporary public GitHub Actions runner is NOT a durable private store. Raw source files must not be uploaded as public Actions artifacts or checked into the public repository.

The first version preserves only original **primary** ESPN responses. A separate authorised design is still required for second-source original response bytes.

## Existing byte auditor integration

On a machine with access to private retained responses:

~~~sh
python scripts/export_private_result_manifest.py /private/local/evidence > /private/local/private-manifest.json
node research/bottleneck-selector/raw-source-evidence-cli.mjs /private/local/bottleneck-source-dossier.json /private/local/private-manifest.json > /private/local/raw-audit.json
~~~

The manifest uses relative source paths, exact forecast IDs, source URLs and observation timestamps. Neither original response bytes nor private paths are committed to Git.

## Acceptance tests

~~~sh
python -m unittest discover -s tests -p 'test_private_result_capture.py' -v
python -m unittest discover -s tests -p 'test_result_observations.py' -v
python -m unittest discover -s tests -p 'test_result_reconciliation.py' -v
~~~

These tests use synthetic local responses and a private temporary directory outside the repository. The isolated CI workflow deliberately does not call a live provider, upload source bytes or alter outcome archives.

## Remaining release gates

- Original bytes can establish digest consistency, not independent source authenticity or real collection-time attestation.
- The original 36 review cases still have NO recovered original response bodies from this stage; newly fetched documents must not be falsely backdated.
- Second-source raw capture, original source licensing/retention, authentic human review, outcome settlement and source independence are still outstanding.
- Source model versions have not been independently tied to the six dropdown options; no prospective head-to-head engine validation exists.
- The 1,000-entry mathematical catalogue, quality review and later explicit approval rule remain unchanged.
- No model selection, betting recommendation, unverified ROI/EV, 250-method tournament, main branch update or website deployment is authorised.

Keep this branch/PR in draft until further review and a real persistent, legally permitted private evidence store are available.
