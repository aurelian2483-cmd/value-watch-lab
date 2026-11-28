# Batch 031 admission review

Parent: 970520956395887eb7cd65399e1b4662b445d3a6. Exact-parent CI: registry 45524285785 and full regression 45524285825 passed.

- Sherman–Morrison: Higham (2020), rank-one inverse identity and factorization discussion, inspected. Applying the identity to b gives y−z(vᵀy)/d with d=1+vᵀz. Direct multiplication cancels u(vᵀy) because d is nonzero. Distinguish base-factorization reuse from existing LU and iterative refinement; small denominator and failed residual are explicit failure conditions.
- Block orthogonal iteration: Bindel, Cornell CS 6210 (27 Oct 2025), section Subspaces and orthogonal iteration, inspected. With eigenbasis partition V₁,V₂, write Q₀=V₁C₁+V₂C₂. Nonsingular C₁ and the strict magnitude gap make the undesired block Λ₂^k C₂ C₁⁻¹ Λ₁⁻k shrink in exact arithmetic. Economy QR preserves the span. Classified as a power iteration variant with 1<p<n; residual alone does not prove dominance; related to full QR iteration.

Compared all existing reference headings, normalized equations and ledger IDs for collisions; checked relevant parent IDs. Not an exhaustive proof of mathematical novelty. Original provisional candidates preserved verbatim; reviewed records and admitted records identical. Four snapshots reconstructed from green baseline using the inspected catalogue.mjs renderer format; exact generator/registry CI still required. Next candidates are provisional and unregistered. No numerical implementation, empirical qualification, experiments, protected data access or publication authority claimed. Both gates remain closed.
