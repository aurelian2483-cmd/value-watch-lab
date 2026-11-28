# Batch 029 admission review

Parent: ed0186d09b269e21d70035d997ce41b5a001b574. Exact-parent CI: regression 45498671124 and registry 45498671226 completed successfully.

- SOR: Netlib Templates §2.2.3, equation (2.7), Fig. 2.3 and convergence discussion, supports the signed triangular splitting after translating its minus-sign convention. SPD and 0<ω<2 suffice in exact arithmetic. Compare existing Gauss–Seidel: ω=1 yields identical updates. Admitted as a variant, not a distinct algorithm.
- Richardson: Cornell CS 4220 (8 April 2026), fixed-step quadratic gradient iteration, and direct spectral derivation. For f(x)=xᵀAx/2−bᵀx the gradient is Ax−b. The recurrence is identical to existing gradient-descent at the same step and start. The eigenvalues of the error map are 1−ωλ_i, so convergence requires 0<ω<2/λ_max for SPD A. Withheld as derivative; original candidates preserved separately.

Existing 330 IDs compared via index and ledger; relevant gradient descent, Gauss–Seidel and linear-algebra definitions inspected. Not an exhaustive proof of algebraic inequivalence. All existing ledger records unchanged; no implementation or empirical claims added. Four snapshots updated in the existing renderer format from the green baseline; exact fresh CI verification required. No protected data or prediction experiments accessed. Both gates remain closed.
