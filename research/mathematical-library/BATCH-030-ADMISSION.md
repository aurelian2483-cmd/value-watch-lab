# Batch 030 admission review

Parent: 0b4773cd00f009416587aee6e95f058fb53026e5. Exact-parent CI: full regression 45516508956 and registry 45516508970 passed.

- SSOR: Netlib Templates §2.2.4 and equation (2.9), checked against the forward/backward splitting. Reversing the triangular order changes the operator; SPD and 0<ω<2 give the classical convergent regime. Count as SOR variant only.
- Chebyshev: Darve's Numerical Linear Algebra chapter on Chebyshev iteration and Cornell CS 6210 (17 Nov 2025) polynomial convergence analysis. Verified normalization q_k(0)=1 and positive denominator for t>1. With ρ_k=T_(k−1)(t)/T_k(t), the three-term polynomial identity gives ρ_(k+1)=1/(2t−ρ_k); substituting Ae_k=−r_k and α_k d=1+β_k yields the documented iterate. Distinguish predetermined spectral coefficients from fixed gradient descent and adaptive CG. Source: https://www.cs.cornell.edu/courses/cs6210/2025fa/lec/2025-11-17.html .

Compared existing index IDs, ledger IDs, and numerical-method names; no matching SSOR or Chebyshev record found. This is not an exhaustive algebraic equivalence proof. Original provisional candidates preserved. Reviewed definitions match admitted records exactly. All existing ledger records unchanged; no implementation or empirical claims added. Four snapshots reconstructed incrementally from green baseline in renderer format; exact generator/registry CI remains required. No protected data or prediction experiments accessed. Gates remain closed.
