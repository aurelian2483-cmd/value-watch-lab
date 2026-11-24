# Batch 027 admission review

Date: 2026-11-24. Pinned base: 53ce0b33d88e547cccc78796f34a2668b2669074. Full research regression 45467328809 and experiment registry validation 45467328981 both reported success. Draft PR 171 only.

- Jacobi eigensolver: checked UT Austin ALAFF §11.3.2; explicitly initialize V and use maximum off-diagonal pivot, bounded stopping. Distinct two-sided similarity iteration, not Jacobi stationary solve or one-sided QR rotation.
- Golub–Kahan: checked Netlib equations (112)–(116), with beta index shifted one position. Explicit termination before division by zero. Related to symmetric Lanczos, distinct coupled rectangular recurrence versus dense Householder bidiagonalization; not independent scientific evidence.
- BiCGSTAB: checked Netlib 1993 reverse-communication routine, identity-preconditioner specialization; fixed initial residual as shadow, initial and intermediate residual stopping and guarded divisions. Distinct short recurrence from GMRES and CG. True residual check is a conservative specification requirement, not a claim about the source implementation.

Reviewed all 325 IDs via the complete reference and ledger, examined relevant definitions for semantic overlap, and checked normalized names/equations against reference. Preserved original candidate file, all prior IDs and all historical snapshots' existing records; regenerated all four snapshots by appending reviewed reference/ledger records and updating affected index and count lines according to the catalogue generator. Full repository validator and byte-for-byte snapshot tests are pending CI; no local Node execution claimed. Source passages checked, original cited textbooks/papers not independently read. Existing sport tags are schema metadata only, not evidence of applicability. No experiments, implementation, protected data, empirical evidence, or qualification. 1000-entry gate and independent review remain closed. Next batch remains provisional.

## Admission archive reconciliation — 2026-11-24

Registry workflow 45478903256 at commit 7605291b31707a4e20ea588f2a4c212d44d3cba4 failed only the reviewed-candidate equality assertion (65/66 tests passed; all four generated snapshots matched). The provisional candidate was retained at the canonical reviewed-candidate path rather than recording the final reviewed version there. Preserve its exact original bytes as `candidate-batch-027.provisional.json` (original Git blob `982dddf0fc778e043af097c565a7a21092be51e7`), and store the exact already-registered reviewed specifications at `candidate-batch-027.json` (Git blob `48b2e6029392ffdeb26fdf1909a6cb8a5e19762f`). The strict existing equality test and all other safeguards are unchanged. Candidate IDs, ordering, registered records, manifest, next candidates and all four catalogue snapshots are unchanged; no additional entry is admitted. This corrects documentation consistency only, not mathematical or empirical qualification.

Changed fields between provisional and reviewed records:
- `jacobi-symmetric-eigensolver`: definition, assumptions, source, mechanism_note
- `bidiagonal-golub-kahan-recurrence`: definition, assumptions, source, mechanism_note
- `bicgstab-linear-system`: definition, assumptions, failure_conditions, source, mechanism_note

The prior admission review records the rationale for these refinements. This reconciliation verifies the two records against each other, not a fresh independent mathematical source review. Full CI must pass before the next admission.
