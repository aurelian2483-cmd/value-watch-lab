# Independent implementation review — Phase3

Scope: phase3_ab.py, collect_research.py and test_phase3.py, before real model registration. No production files were edited. Test observations are explicitly synthetic and their temporary stores are removed.

## Confirmed pre-freeze issues

1. **Scheduled-start revisions inflated race coverage.** Executed two valid captures for the same synthetic race ID with start changed by ten minutes. The implementation reported two genuinely pre-event paired races although only one race ID existed. Preserve revised schedules as revisions or reject uncertain schedule changes; count distinct race identity, and do not silently score both as independent races.
2. **Numeric overflow bypassed strict JSON rejection.** `strict_json('{"overflow":1e9999}')` returned infinity. Python's parse_constant catches explicit NaN/Infinity tokens but not floating-point overflow. A finite-checking parse_float is required; otherwise later canonicalisation raises a plain ValueError rather than the intended structured ResearchError.
3. **Malformed nested object types could escape structured rejection.** The runner list and source list were checked, but individual runner/context/history/source objects were assumed dictionaries. A null runner triggered AttributeError rather than the structured exclusion event. Explicit object guards should precede field access.

`probe_results.json` preserves the original observed coverage/overflow probes. `test_review_fixes.py` provides independently written regressions for the repaired behavior plus an actual collection-receipt hash check. Run status is recorded separately; this document does not claim a repair passed before execution.

## Executed repair verification

The parent implementation now rejects exponent-overflow JSON, guards nested object types with structured errors/exclusion records, and withholds changed scheduled starts for the same race ID pending review. Four independently written targeted regressions executed successfully after those repairs:

```text
python work/phase3/software_review/test_review_fixes.py ReviewFixes
```

Result: **4 tests passed**, including direct execution of collect_research.py and exact Git blob hash verification of the known pinned source bytes. The earlier untargeted script invocation also passed 56 tests, comprising the imported 52-test parent suite plus these same four targeted tests; these are not 56 additional independent tests. Logs and source hashes are retained. No blocking discrepancy remained in this review scope.

## Retracted finding

The initial suggestion that the collector used a two-byte backslash-zero separator for Git blob hashing was incorrect. An escaped tool rendering was misread, and the first probe compared a deliberately incorrect variant instead of executing the collection expression. AST inspection of the actual source confirms a single NUL byte (hex00), which is correct. The old probe's two-byte comparison must not be interpreted as evidence of an actual collector defect. The targeted regression executes collect_research.py and inspects its stored receipt to check the actual path.

## Reviewed safeguards

- Source/parameter/protocol hashes and baseline-vector parity; explicit research gates and no automatic promotion.
- Aware timestamp parsing and pre-off buffer; original source cutoff preserved in recency; real IANA ZoneInfo or NodeIntl London conversion, never a silent UTC substitution.
- Complete canonical runner fields, no post-result withdrawal renormalisation, reviewed two-publisher result consistency and append-only amendment chains.
- Exclusive immutable object publication: complete fsynced temporary file; Windows rename rejects existing destination, POSIX link creation avoids overwrite. Reads verify content-addressed filenames.
- All CLI storage constrained to the isolated state directory, no production workflow/scheduler/recommendation writes, and HTTPS acquisition fixed to the declared public repository path with redirects disabled.
- Fixed zero-data score reporting uses unavailable means, not artificial zero loss.

## Boundaries and unexecuted checks

This is arithmetic/software review, not independent verification of the publisher facts or a trusted timestamp service. Manual extraction assertions and source independence still need human inspection. Local clocks and hashes do not prove first availability. A user with direct filesystem write access can modify both data and claimed provenance; external immutable receipts are required for stronger assurance.

The environment denies junction creation; no adversarial filesystem-link test was executed. Symlink/junction resistance is therefore not certified. No concurrency stress or actual power-failure/crash injection was performed. The rename/link strategy was reviewed and existing atomic/idempotence tests execute, but physical durability beyond fsync was not independently demonstrated.

No live prospective predictions, source outcomes or profitable betting claims were created by this review.
